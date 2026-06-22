const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}

export function getTurnstileSiteKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || undefined;
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!token?.trim()) {
    return { ok: false, error: 'Security check required. Please complete the verification.' };
  }

  const body = new URLSearchParams({
    secret: secret!,
    response: token.trim(),
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    return {
      ok: false,
      error: 'Security verification failed. Refresh and try again.',
    };
  } catch {
    return { ok: false, error: 'Security verification unavailable. Try again shortly.' };
  }
}