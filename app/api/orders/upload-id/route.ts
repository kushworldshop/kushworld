import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { buildAutoRejectionMessage, validateIdPhoto } from '@/lib/idPhotoValidation';
import {
  MAX_ID_SIZE_BYTES,
  ensureDataDirs,
  getIdStoragePath,
  resolveIdMimeType,
} from '@/lib/verification';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export async function POST(request: NextRequest) {
  try {
    await ensureDataDirs();
    const formData = await request.formData();
    const orderId = String(formData.get('orderId') || '').trim();
    const file = formData.get('idImage');

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'ID image required' }, { status: 400 });
    }

    const mimeType = resolveIdMimeType(file);
    if (!mimeType) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, or WEBP image of your ID' },
        { status: 400 }
      );
    }

    if (file.size > MAX_ID_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image must be under 5MB' },
        { status: 400 }
      );
    }

    const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(ordersData);
    const orderIndex = orders.findIndex((order: { id: string }) => order.id === orderId);

    if (orderIndex === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const ext = EXT_BY_TYPE[mimeType] || '.jpg';
    const storagePath = getIdStoragePath(orderId, ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const validation = await validateIdPhoto(buffer, mimeType);
    const now = new Date().toISOString();

    if (!validation.accepted) {
      orders[orderIndex].idVerification = {
        status: 'rejected',
        uploadedAt: now,
        rejectedAt: now,
        rejectionReason: validation.reason,
        fileName: path.basename(storagePath),
        mimeType,
        autoRejected: validation.method !== 'skipped',
      };
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

      return NextResponse.json(
        {
          success: false,
          error: buildAutoRejectionMessage(validation.reason),
          idVerification: orders[orderIndex].idVerification,
        },
        { status: 400 }
      );
    }

    orders[orderIndex].idVerification = {
      status: 'uploaded',
      uploadedAt: now,
      fileName: path.basename(storagePath),
      mimeType,
      autoRejected: false,
    };

    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({
      success: true,
      message: 'ID uploaded successfully. We will verify and process your order.',
    });
  } catch (error) {
    console.error('ID upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload ID' }, { status: 500 });
  }
}