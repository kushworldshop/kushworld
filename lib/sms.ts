const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

/** Internal ops inbox for phone verification codes — never shown on the site */
export function getSmsOpsInboxPhone(): string {
  const configured = process.env.SMS_OPS_INBOX_PHONE?.trim();
  if (configured) return normalizePhone(configured);
  return '+15627724106';
}

const DELIVERY_OK = new Set(['delivered', 'sent', 'accepted', 'queued', 'sending']);
const DELIVERY_FAILED = new Set(['undelivered', 'failed', 'canceled']);

type TwilioMessageRecord = {
  sid?: string;
  status?: string;
  error_code?: number | string;
  error_message?: string;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

function twilioAuthHeader(): string {
  return `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`;
}

export function isSmsVerificationConfigured(): boolean {
  return !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
}

function formatTwilioErrorCode(code?: number | string, fallback?: string): string {
  const numeric = typeof code === 'string' ? Number(code) : code;
  if (numeric === 21608) {
    return 'This number is not verified on your Twilio trial account. Add it under Verified Caller IDs in Twilio.';
  }
  if (numeric === 21610) {
    return 'This number is on the do-not-contact list and cannot receive SMS.';
  }
  if (numeric === 30034) {
    return 'Text verification is temporarily unavailable. Please verify with email instead, or contact support.';
  }
  return fallback || 'Failed to send SMS';
}

function parseTwilioError(body: string): string {
  try {
    const data = JSON.parse(body) as { message?: string; code?: number };
    if (data.message) {
      return formatTwilioErrorCode(data.code, data.message);
    }
  } catch {
    // fall through
  }
  return 'Failed to send SMS';
}

function parseTwilioDeliveryError(message: TwilioMessageRecord): string {
  return formatTwilioErrorCode(
    message.error_code,
    message.error_message || 'SMS could not be delivered to this number.'
  );
}

async function waitForTwilioDelivery(
  messageSid: string
): Promise<{ delivered: boolean; error?: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 600 : 1000));

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages/${messageSid}.json`,
      { headers: { Authorization: twilioAuthHeader() } }
    );

    if (!res.ok) continue;

    const message = (await res.json()) as TwilioMessageRecord;
    const status = message.status || '';

    if (DELIVERY_FAILED.has(status)) {
      console.error('[Twilio] SMS undelivered:', messageSid, message.error_code, message.error_message);
      return { delivered: false, error: parseTwilioDeliveryError(message) };
    }

    if (DELIVERY_OK.has(status) && status !== 'queued' && status !== 'sending') {
      return { delivered: true };
    }
  }

  return {
    delivered: false,
    error:
      'SMS could not be confirmed as delivered. Try email verification instead, or wait a minute and request another code.',
  };
}

export interface VerificationSmsContext {
  customerPhone: string;
  email?: string;
  purpose?: 'signup' | 'profile' | 'verify';
}

async function deliverSms(
  to: string,
  body: string
): Promise<{ sent: boolean; stub?: boolean; error?: string }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[SMS stub] To: ${to}\n${body}`);
    return { sent: false, stub: true };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
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

    const created = (await res.json()) as TwilioMessageRecord;
    if (!created.sid) {
      return { sent: false, error: 'SMS provider did not return a message id.' };
    }

    const delivery = await waitForTwilioDelivery(created.sid);
    if (!delivery.delivered) {
      return { sent: false, error: delivery.error };
    }

    return { sent: true };
  } catch (err) {
    console.error('SMS send error:', err);
    return { sent: false, error: 'Failed to send SMS' };
  }
}

export async function sendVerificationSms(
  context: VerificationSmsContext,
  code: string
): Promise<{ sent: boolean; stub?: boolean; error?: string }> {
  const opsInbox = getSmsOpsInboxPhone();
  const customerPhone = normalizePhone(context.customerPhone);
  const purposeLabel =
    context.purpose === 'signup'
      ? 'signup verification'
      : context.purpose === 'profile'
        ? 'profile phone update'
        : 'phone verification';

  const body = [
    'Kush World — phone code (ops)',
    context.email ? `Account: ${context.email}` : null,
    `Customer phone: ${customerPhone}`,
    `Type: ${purposeLabel}`,
    `Code: ${code}`,
    'Expires in 15 minutes.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return deliverSms(opsInbox, body);
}