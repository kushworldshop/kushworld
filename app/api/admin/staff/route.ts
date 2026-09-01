import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import {
  createStaff,
  deleteStaff,
  listStaff,
  sanitizePermissionList,
  updateStaff,
} from '@/lib/adminStaff';

function requireOwner(request: NextRequest) {
  const session = getAdminSession(request);
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ success: false, error: 'Owner access required' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireOwner(request);
  if (denied) return denied;
  return NextResponse.json({ success: true, staff: listStaff() });
}

export async function POST(request: NextRequest) {
  const denied = requireOwner(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const staff = createStaff({
      name: String(body.name || ''),
      username: String(body.username || ''),
      passcode: String(body.passcode || ''),
      role: body.role === 'admin' ? 'admin' : 'mod',
      permissions: sanitizePermissionList(body.permissions),
    });
    return NextResponse.json({ success: true, staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create staff';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = requireOwner(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff id required' }, { status: 400 });
    }
    const staff = updateStaff(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      passcode: typeof body.passcode === 'string' ? body.passcode : undefined,
      role: body.role === 'admin' || body.role === 'mod' ? body.role : undefined,
      permissions: Array.isArray(body.permissions) ? sanitizePermissionList(body.permissions) : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    });
    return NextResponse.json({ success: true, staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update staff';
    const status = message === 'Staff not found' ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = requireOwner(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff id required' }, { status: 400 });
    }
    const removed = deleteStaff(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to remove staff' }, { status: 500 });
  }
}
