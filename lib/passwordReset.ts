import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { getSessionSecret } from '@/lib/security/secrets';
import { sendPasswordResetEmail } from '@/lib/email';
import { getUserByEmail, readUsers, writeUsers } from '@/lib/users';

const RESET_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

function hashResetToken(token: string): string {
  return createHash('sha256').update(`${token}:${getSessionSecret()}`).digest('hex');
}

export function getSiteUrl(): string {
  return (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://kushworld.shop'
  ).replace(/\/$/, '');
}

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
  devResetUrl?: string;
}> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { success: false, message: 'Email is required' };
  }

  const user = await getUserByEmail(normalized);
  const genericMessage =
    'If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.';

  if (!user || user.blocked) {
    return { success: true, message: genericMessage };
  }

  const requestedAt = user.passwordResetExp ? user.passwordResetExp - RESET_TTL_MS : 0;
  if (user.passwordResetExp && user.passwordResetExp > Date.now() && Date.now() - requestedAt < RESEND_COOLDOWN_MS) {
    return { success: true, message: genericMessage };
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(token);
  const exp = Date.now() + RESET_TTL_MS;

  const users = await readUsers();
  const index = users.findIndex((entry) => entry.id === user.id);
  if (index === -1) {
    return { success: true, message: genericMessage };
  }

  users[index] = {
    ...users[index],
    passwordResetTokenHash: tokenHash,
    passwordResetExp: exp,
  };
  await writeUsers(users);

  const resetUrl = `${getSiteUrl()}/account?reset=${encodeURIComponent(token)}`;
  const emailResult = await sendPasswordResetEmail(user.email, resetUrl);

  if (emailResult.stub && process.env.NODE_ENV !== 'production') {
    console.log(`[Password reset stub] ${user.email} → ${resetUrl}`);
    return {
      success: true,
      message: genericMessage,
      devResetUrl: resetUrl,
    };
  }

  if (!emailResult.sent && !emailResult.stub) {
    return {
      success: false,
      message: emailResult.error || 'Could not send reset email. Try again later.',
    };
  }

  return { success: true, message: genericMessage };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: 'Reset link is invalid' };
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  const tokenHash = hashResetToken(trimmed);
  const users = await readUsers();
  const index = users.findIndex(
    (user) =>
      user.passwordResetTokenHash === tokenHash &&
      user.passwordResetExp &&
      user.passwordResetExp > Date.now()
  );

  if (index === -1) {
    return { success: false, error: 'Reset link is invalid or expired. Request a new one.' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  users[index] = {
    ...users[index],
    password: hashedPassword,
    passwordResetTokenHash: undefined,
    passwordResetExp: undefined,
  };
  await writeUsers(users);

  return { success: true };
}

export async function buildAdminPasswordFields(
  newPassword: string
): Promise<
  | { success: true; password: string; passwordResetTokenHash: undefined; passwordResetExp: undefined }
  | { success: false; error: string }
> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return {
    success: true,
    password: await bcrypt.hash(newPassword, 10),
    passwordResetTokenHash: undefined,
    passwordResetExp: undefined,
  };
}

export async function adminSetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const passwordFields = await buildAdminPasswordFields(newPassword);
  if (!passwordFields.success) {
    return { success: false, error: passwordFields.error };
  }

  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  users[index] = {
    ...users[index],
    ...passwordFields,
  };
  await writeUsers(users);

  return { success: true };
}