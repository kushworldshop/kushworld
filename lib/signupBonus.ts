export const SIGNUP_BONUS_POINTS = 1000;
export const SIGNUP_BONUS_DOLLARS = 10;

export type SignupVerificationChannel = 'email' | 'phone';

export interface SignupVerificationUser {
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  signupVerificationChannel?: SignupVerificationChannel;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function isValidPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}

export function getSignupVerificationChannel(phone?: string): SignupVerificationChannel {
  if (phone?.trim() && isValidPhone(phone)) return 'phone';
  return 'email';
}

export function resolveSignupVerificationChannel(user: SignupVerificationUser): SignupVerificationChannel {
  return user.signupVerificationChannel ?? 'email';
}

export function isSignupChannelVerified(user: SignupVerificationUser): boolean {
  const channel = resolveSignupVerificationChannel(user);
  return channel === 'phone' ? !!user.phoneVerifiedAt : !!user.emailVerifiedAt;
}