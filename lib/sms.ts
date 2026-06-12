const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

export function isSmsVerificationConfigured(): boolean {
  return !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
}

function parseTwilioError(body: string): string {
  try {
    const data = JSON.parse(body) as { message?: string; code?: number };
    if (data.message) {
      if (data.code === 21608) {
        return 'This number is not verified on your Twilio trial account. Add it under Verified Caller IDs in Twilio.';
      }
      if (data.code === 21610) {
        return 'This number is on the do-not-contact list and cannot receive SMS.';
      }
      return data.message;
    }
  } catch {
    // fall through
  }
  return 'Failed to send SMS';
}

export async function sendVerificationSms(
  to: string,
  code: string
): Promise<{ sent: boolean; stub?: boolean; error?: string }> {
  const body = `Your Kush World verification code is: ${code}. Expires in 15 minutes.`;

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[SMS stub] To: ${to}\n${body}`);
    return { sent: false, stub: true };
  }

  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizePhone(to),
          From: TWILIO_FROM,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Twilio error:', err);
      return { sent: false, error: parseTwilioError(err) };
    }

    return { sent: true };
  } catch (err) {
    console.error('SMS send error:', err);
    return { sent: false, error: 'Failed to send SMS' };
  }
}