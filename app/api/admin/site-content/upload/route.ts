import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { getSiteContent, updateSiteContent } from '@/lib/siteContent';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'site-uploads');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const field = String(formData.get('field') || 'logoUrl');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Image file required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, WEBP, or GIF image' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'Image must be under 5MB' }, { status: 500 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
    const filename = `${field}-${Date.now()}.${ext}`;
    const storagePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const imageUrl = `/site-uploads/${filename}`;
    const content = await getSiteContent();

    if (field === 'heroBackgroundUrl') {
      await updateSiteContent({ brand: { ...content.brand, heroBackgroundUrl: imageUrl } });
    } else {
      await updateSiteContent({ brand: { ...content.brand, logoUrl: imageUrl } });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      field: field === 'heroBackgroundUrl' ? 'heroBackgroundUrl' : 'logoUrl',
    });
  } catch (error) {
    console.error('Site image upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
  }
}