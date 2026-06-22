import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { sendInquiryEmail } from '@/lib/email';
import { saveInquiry } from '@/lib/inquiries';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`wholesale:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const body = await request.json();
    const businessName = String(body.businessName || '').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!businessName || !name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Business name, contact name, email, and message are required.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid business email.' }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json({ success: false, error: 'Message is too long.' }, { status: 400 });
    }

    const result = await sendInquiryEmail({
      type: 'wholesale',
      businessName,
      name,
      email,
      phone: phone || undefined,
      message,
    });

    await saveInquiry({
      type: 'wholesale',
      businessName,
      name,
      email,
      phone: phone || undefined,
      message,
      emailSent: result.sent,
    });

    if (!result.sent && !result.stub) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "Application received! We'll contact you within 2 business days.",
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not submit application.' }, { status: 500 });
  }
}