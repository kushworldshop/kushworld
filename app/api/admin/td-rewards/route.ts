import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { listAllTdSubmissions, revokeTdSubmission } from '@/lib/tdRewards';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 200);
    const data = await listAllTdSubmissions(limit);
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load TD posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
    if (!submissionId || body.action !== 'revoke') {
      return NextResponse.json(
        { success: false, error: 'submissionId and action: revoke are required' },
        { status: 400 }
      );
    }

    const result = await revokeTdSubmission(submissionId, body.reason);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const list = await listAllTdSubmissions(200);
    return NextResponse.json({
      success: true,
      submission: result.submission,
      ...list,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Revoke failed' }, { status: 500 });
  }
}
