import { addLoyaltyPoints, getUserById, readUsers, writeUsers, type UserProfile } from '@/lib/users';
import { isEmailVerificationConfigured, sendVerificationEmail } from '@/lib/email';
import { isSmsVerificationConfigured, sendVerificationSms } from '@/lib/sms';
import {
  getSignupVerificationChannel,
  isSignupChannelVerified,
  SIGNUP_BONUS_POINTS,
} from '@/lib/signupBonus';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export type VerificationSendResult = {
  success: boolean;
  error?: string;
  stub?: boolean;
  /** Shown only in non-production when delivery is stubbed (no provider configured). */
  devCode?: string;
};

function resolveStubSendResult(code: string, channel: 'email' | 'phone'): VerificationSendResult {
  if (process.env.NODE_ENV === 'production') {
    const provider =
      channel === 'email'
        ? 'RESEND_API_KEY and EMAIL_FROM'
        : 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER';
    return {
      success: false,
      error: `Verification ${channel} is not configured (${provider}). Contact support.`,
    };
  }

  return { success: true, stub: true, devCode: code };
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length === 10;
}

async function updateUserRecord(
  userId: string,
  updater: (user: UserProfile) => UserProfile
): Promise<UserProfile | null> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;
  users[index] = updater(users[index]);
  await writeUsers(users);
  return users[index];
}

export type { SignupVerificationChannel } from '@/lib/signupBonus';

export function isEmailVerified(user: UserProfile): boolean {
  return !!user.emailVerifiedAt;
}

export function isPhoneVerified(user: UserProfile): boolean {
  return !!user.phoneVerifiedAt;
}

export async function tryClaimSignupBonus(userId: string): Promise<{
  claimed: boolean;
  pointsAwarded: number;
}> {
  const user = await getUserById(userId);
  if (!user || user.signupBonusClaimed) {
    return { claimed: false, pointsAwarded: 0 };
  }

  if (!isSignupChannelVerified(user)) {
    return { claimed: false, pointsAwarded: 0 };
  }

  await addLoyaltyPoints(userId, SIGNUP_BONUS_POINTS);
  await updateUserRecord(userId, (u) => ({
    ...u,
    signupBonusClaimed: true,
    lockedLoyaltyPoints: (u.lockedLoyaltyPoints ?? 0) + SIGNUP_BONUS_POINTS,
  }));

  return { claimed: true, pointsAwarded: SIGNUP_BONUS_POINTS };
}

export async function sendEmailVerificationCode(userId: string): Promise<VerificationSendResult> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  if (user.emailVerifiedAt) return { success: false, error: 'Email already verified' };

  if (
    user.pendingEmailCodeExp &&
    Date.now() < user.pendingEmailCodeExp - CODE_TTL_MS + RESEND_COOLDOWN_MS
  ) {
    return { success: false, error: 'Please wait a minute before requesting another code' };
  }

  const code = generateCode();
  const exp = Date.now() + CODE_TTL_MS;

  await updateUserRecord(userId, (u) => ({
    ...u,
    pendingEmailCode: code,
    pendingEmailCodeExp: exp,
  }));

  if (!isEmailVerificationConfigured()) {
    return resolveStubSendResult(code, 'email');
  }

  const result = await sendVerificationEmail(user.email, code);
  if (result.stub) {
    return resolveStubSendResult(code, 'email');
  }
  if (!result.sent) {
    return { success: false, error: result.error || 'Failed to send verification email' };
  }

  return { success: true, stub: false };
}

export async function sendPhoneVerificationCode(userId: string): Promise<VerificationSendResult> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  if (!user.phone?.trim()) return { success: false, error: 'Add a phone number to your profile first' };
  if (!isValidPhone(user.phone)) return { success: false, error: 'Enter a valid 10-digit US phone number' };
  if (user.phoneVerifiedAt) return { success: false, error: 'Phone already verified' };

  if (
    user.pendingPhoneCodeExp &&
    Date.now() < user.pendingPhoneCodeExp - CODE_TTL_MS + RESEND_COOLDOWN_MS
  ) {
    return { success: false, error: 'Please wait a minute before requesting another code' };
  }

  const code = generateCode();
  const exp = Date.now() + CODE_TTL_MS;

  await updateUserRecord(userId, (u) => ({
    ...u,
    pendingPhoneCode: code,
    pendingPhoneCodeExp: exp,
  }));

  if (!isSmsVerificationConfigured()) {
    return resolveStubSendResult(code, 'phone');
  }

  const result = await sendVerificationSms(user.phone!, code);
  if (result.stub) {
    return resolveStubSendResult(code, 'phone');
  }
  if (!result.sent) {
    return { success: false, error: result.error || 'Failed to send verification SMS' };
  }

  return { success: true, stub: false };
}

export async function confirmEmailCode(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string; bonusClaimed?: boolean; pointsAwarded?: number }> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  if (user.emailVerifiedAt) return { success: true, bonusClaimed: !!user.signupBonusClaimed };

  if (!user.pendingEmailCode || !user.pendingEmailCodeExp) {
    return { success: false, error: 'Request a verification code first' };
  }
  if (Date.now() > user.pendingEmailCodeExp) {
    return { success: false, error: 'Code expired — request a new one' };
  }
  if (user.pendingEmailCode !== code.trim()) {
    return { success: false, error: 'Invalid code' };
  }

  await updateUserRecord(userId, (u) => ({
    ...u,
    emailVerifiedAt: new Date().toISOString(),
    pendingEmailCode: undefined,
    pendingEmailCodeExp: undefined,
  }));

  const bonus = await tryClaimSignupBonus(userId);
  return {
    success: true,
    bonusClaimed: bonus.claimed,
    pointsAwarded: bonus.pointsAwarded || undefined,
  };
}

export async function confirmPhoneCode(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string; bonusClaimed?: boolean; pointsAwarded?: number }> {
  const user = await getUserById(userId);
  if (!user) return { success: false, error: 'User not found' };
  if (user.phoneVerifiedAt) return { success: true, bonusClaimed: !!user.signupBonusClaimed };

  if (!user.pendingPhoneCode || !user.pendingPhoneCodeExp) {
    return { success: false, error: 'Request a verification code first' };
  }
  if (Date.now() > user.pendingPhoneCodeExp) {
    return { success: false, error: 'Code expired — request a new one' };
  }
  if (user.pendingPhoneCode !== code.trim()) {
    return { success: false, error: 'Invalid code' };
  }

  await updateUserRecord(userId, (u) => ({
    ...u,
    phoneVerifiedAt: new Date().toISOString(),
    pendingPhoneCode: undefined,
    pendingPhoneCodeExp: undefined,
  }));

  const bonus = await tryClaimSignupBonus(userId);
  return {
    success: true,
    bonusClaimed: bonus.claimed,
    pointsAwarded: bonus.pointsAwarded || undefined,
  };
}

export async function handlePhoneChange(userId: string, newPhone: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;

  const normalized = normalizePhone(newPhone);
  const previous = user.phone ? normalizePhone(user.phone) : '';

  if (normalized !== previous) {
    const trimmed = newPhone.trim();
    const canSwitchToPhone =
      !user.signupBonusClaimed &&
      !user.emailVerifiedAt &&
      user.signupVerificationChannel === 'email' &&
      getSignupVerificationChannel(trimmed) === 'phone';

    await updateUserRecord(userId, (u) => ({
      ...u,
      phone: trimmed,
      phoneVerifiedAt: undefined,
      pendingPhoneCode: undefined,
      pendingPhoneCodeExp: undefined,
      ...(canSwitchToPhone ? { signupVerificationChannel: 'phone' as const } : {}),
    }));
  }
}