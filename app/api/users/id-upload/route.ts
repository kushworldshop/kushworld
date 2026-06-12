import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getSiteContent } from '@/lib/siteContent';
import { isFeatureEnabled } from '@/lib/featureTypes';
import { getUserById, readUsers, writeUsers } from '@/lib/users';
import {
  MAX_ID_SIZE_BYTES,
  ensureDataDirs,
  resolveIdMimeType,
  saveUserIdImage,
} from '@/lib/verification';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const content = await getSiteContent();
  if (!isFeatureEnabled(content.features, 'idVerification')) {
    return NextResponse.json({ success: false, error: 'ID verification is currently disabled' }, { status: 403 });
  }

  try {
    await ensureDataDirs();
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.idVerified || user.idVerification?.status === 'verified') {
      return NextResponse.json({ success: false, error: 'Your ID is already verified' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('idImage');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'ID image required' }, { status: 400 });
    }

    const mimeType = resolveIdMimeType(file);
    if (!mimeType) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, or WEBP image of your government-issued ID' },
        { status: 400 }
      );
    }

    if (file.size > MAX_ID_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'Image must be under 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUserIdImage(userId, buffer, mimeType);

    const users = await readUsers();
    const index = users.findIndex((entry) => entry.id === userId);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    users[index] = {
      ...users[index],
      idVerified: false,
      idVerification: {
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        rejectedAt: undefined,
        rejectionReason: undefined,
        verifiedAt: undefined,
      },
    };
    await writeUsers(users);

    return NextResponse.json({
      success: true,
      message: 'ID uploaded. We will review it and verify your account for faster checkout.',
      idVerification: {
        status: 'uploaded',
        uploadedAt: users[index].idVerification?.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Account ID upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload ID' }, { status: 500 });
  }
}