import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { sendInquiryEmail } from '@/lib/email';
import { saveInquiry } from '@/lib/inquiries';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, error: 'Name, email, and message are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json({ success: false, error: 'Message is too long.' }, { status: 400 });
    }

    const result = await sendInquiryEmail({ type: 'contact', name, email, message });
    await saveInquiry({
      type: 'contact',
      name,
      email,
      message,
      emailSent: result.sent,
    });

    if (!result.sent && !result.stub) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "Message received! We'll get back to you soon.",
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not send message.' }, { status: 500 });
  }
}