import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { getSiteContent, updateSiteContent } from '@/lib/siteContent';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'site-uploads');
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/mp4') return 'mp4';
  return 'jpg';
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') ?? formData.get('image');
    const field = String(formData.get('field') || 'asset');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Image or video file required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, WEBP, GIF, MP4, or WEBM file' },
        { status: 400 }
      );
    }

    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: isVideo ? 'Video must be under 50MB' : 'Image must be under 5MB' },
        { status: 400 }
      );
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const safeField = field.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'asset';
    const filename = `${safeField}-${Date.now()}.${extensionFor(file.type)}`;
    const storagePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const imageUrl = `/site-uploads/${filename}`;

    if (field === 'heroBackgroundUrl' || field === 'logoUrl') {
      const content = await getSiteContent();
      await updateSiteContent({
        brand: {
          ...content.brand,
          [field]: imageUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      field,
      mediaType: isVideo ? 'video' : 'image',
    });
  } catch (error) {
    console.error('Site image upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}
