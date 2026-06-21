import fs from 'fs/promises';
import path from 'path';
import {
  getSignupVerificationChannel,
  isSignupChannelVerified,
  resolveSignupVerificationChannel,
} from '@/lib/signupBonus';
import {
  createOrGetReferral,
  getReferralByEmail,
  resolveReferralCommissionPercent,
  resolveReferralRewardPoints,
} from '@/lib/referrals';
import {
  getReferralNotificationsForEmail,
  getUnreadReferralNotificationCount,
  type ReferralNotification,
} from '@/lib/referralNotifications';
import { getSettings } from '@/lib/settings';
import { markSpinHistoryUsed } from '@/lib/spinWheelHistory';
import {
  getActiveSavedSpinCoupons,
  getSpinCouponSlot,
  isSpinPrizeActive,
  type SpinPrize,
} from '@/lib/spinWheelTypes';
import type { UserIdVerification } from '@/lib/verification';
import { normalizePhone } from '@/lib/accountVerification';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export interface UserSocials {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  password: string;
  discordId?: string;
  discordUsername?: string;
  discordVerifiedAt?: string;
  discordVerifySyncPending?: boolean;
  authProvider?: 'email' | 'discord' | 'both';
  createdAt: string;
  idVerified?: boolean;
  idVerification?: UserIdVerification;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  signupBonusClaimed?: boolean;
  signupVerificationChannel?: 'email' | 'phone';
  pendingEmailCode?: string;
  pendingEmailCodeExp?: number;
  pendingPhoneCode?: string;
  pendingPhoneCodeExp?: number;
  passwordResetTokenHash?: string;
  passwordResetExp?: number;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  socials?: UserSocials;
  loyaltyPoints: number;
  lockedLoyaltyPoints?: number;
  referralCode?: string;
  blocked?: boolean;
  blockedAt?: string;
  blockReason?: string;
  pendingSpinPrize?: SpinPrize;
  /** @deprecated Migrated into savedSpinCoupons */
  activeSpinPrize?: SpinPrize;
  savedSpinCoupons?: SpinPrize[];
  freeEighthReceivedAt?: string;
  freeEighthOrderId?: string;
  shippingAddress?: {
    address: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  discordLinked?: boolean;
  discordServerVerified?: boolean;
  discordVerifySyncPending?: boolean;
  createdAt: string;
  idVerified?: boolean;
  idVerification?: Pick<UserIdVerification, 'status' | 'uploadedAt' | 'rejectionReason'>;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  signupBonusClaimed?: boolean;
  signupBonusEligible?: boolean;
  signupVerificationChannel?: 'email' | 'phone';
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  socials?: UserSocials;
  loyaltyPoints: number;
  redeemableLoyaltyPoints: number;
  lockedLoyaltyPoints: number;
  referralCode?: string;
  referralLink?: string;
  pendingSpinPrize?: SpinPrize | null;
  savedSpinCoupons: SpinPrize[];
  /** @deprecated Use savedSpinCoupons */
  activeSpinPrize?: SpinPrize | null;
  freeEighthReceivedAt?: string;
  freeEighthOrderId?: string;
  shippingAddress?: UserProfile['shippingAddress'];
  referralStats?: {
    clicks: number;
    conversions: number;
    pointsEarned: number;
    commissionEarned: number;
    commissionPercent: number;
    pendingPoints: number;
    pendingCommission: number;
  };
  referralNotifications?: ReferralNotification[];
  unreadReferralNotificationCount?: number;
}

async function ensureUsersFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
  }
}

function normalizeUserSpinCoupons(user: UserProfile): UserProfile {
  const coupons = [...(user.savedSpinCoupons ?? [])];
  if (user.activeSpinPrize) {
    const legacy = user.activeSpinPrize;
    if (!coupons.some((coupon) => coupon.id === legacy.id)) {
      coupons.push(legacy);
    }
  }
  return {
    ...user,
    savedSpinCoupons: coupons.length > 0 ? coupons : undefined,
  };
}

export function resolveSavedSpinCoupons(user: UserProfile): SpinPrize[] {
  const normalized = normalizeUserSpinCoupons(user);
  return getActiveSavedSpinCoupons(normalized.savedSpinCoupons);
}

export async function readUsers(): Promise<UserProfile[]> {
  await ensureUsersFile();
  const data = await fs.readFile(USERS_FILE, 'utf8');
  const users = JSON.parse(data) as UserProfile[];
  return users.map((user) =>
    normalizeUserSpinCoupons({
      ...user,
      loyaltyPoints: user.loyaltyPoints ?? 0,
      lockedLoyaltyPoints: user.lockedLoyaltyPoints ?? 0,
      socials: user.socials ?? {},
    })
  );
}

export function getRedeemableLoyaltyPoints(user: Pick<UserProfile, 'loyaltyPoints' | 'lockedLoyaltyPoints'>): number {
  const total = user.loyaltyPoints ?? 0;
  const locked = user.lockedLoyaltyPoints ?? 0;
  return Math.max(0, total - locked);
}

export async function writeUsers(users: UserProfile[]) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export function isUserBlocked(user: Pick<UserProfile, 'blocked'> | null | undefined): boolean {
  return !!user?.blocked;
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const users = await readUsers();
  const next = users.filter((user) => user.id !== userId);
  if (next.length === users.length) return false;
  await writeUsers(next);
  return true;
}

export async function setUserBlocked(
  userId: string,
  blocked: boolean,
  blockReason?: string
): Promise<UserProfile | null> {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    blocked,
    blockedAt: blocked ? new Date().toISOString() : undefined,
    blockReason: blocked ? blockReason?.trim() || undefined : undefined,
  };

  await writeUsers(users);
  return users[index];
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function getUserByDiscordId(discordId: string): Promise<UserProfile | null> {
  const normalized = discordId.trim();
  const users = await readUsers();
  return users.find((u) => u.discordId === normalized) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}): Promise<UserProfile> {
  const users = await readUsers();
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : null;

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('User already exists');
  }
  if (normalizedPhone && users.some((u) => u.phone && normalizePhone(u.phone) === normalizedPhone)) {
    throw new Error('Account with this phone number already exists');
  }

  const name = input.name?.trim() || normalizedEmail.split('@')[0];
  const referral = await createOrGetReferral(name, normalizedEmail);
  const phone = input.phone?.trim() || undefined;
  const signupVerificationChannel = getSignupVerificationChannel(phone);

  const newUser: UserProfile = {
    id: `user_${Date.now()}`,
    email: normalizedEmail,
    name,
    password: input.password,
    createdAt: new Date().toISOString(),
    loyaltyPoints: 0,
    referralCode: referral.code,
    socials: {},
    phone,
    signupVerificationChannel,
  };

  users.push(newUser);
  await writeUsers(users);
  return newUser;
}

export async function updateUser(
  id: string,
  updates: Partial<
    Pick<UserProfile, 'name' | 'phone' | 'bio' | 'avatarUrl' | 'socials' | 'shippingAddress' | 'loyaltyPoints' | 'referralCode'>
  >
): Promise<UserProfile | null> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates,
    socials: updates.socials ?? users[index].socials,
  };

  await writeUsers(users);
  return users[index];
}

export async function addLoyaltyPoints(userId: string, points: number): Promise<number> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return 0;

  users[index].loyaltyPoints = (users[index].loyaltyPoints ?? 0) + Math.floor(points);
  await writeUsers(users);
  return users[index].loyaltyPoints;
}

export async function redeemLoyaltyPoints(
  userId: string,
  points: number
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, remaining: 0, error: 'User not found' };
  }

  const total = users[index].loyaltyPoints ?? 0;
  const locked = users[index].lockedLoyaltyPoints ?? 0;
  const available = Math.max(0, total - locked);
  const amount = Math.floor(points);

  if (amount <= 0) {
    return { success: false, remaining: available, error: 'Invalid points amount' };
  }

  if (amount > available) {
    return {
      success: false,
      remaining: available,
      error:
        locked > 0
          ? 'Signup bonus points unlock after your first purchase'
          : 'Insufficient loyalty points',
    };
  }

  users[index].loyaltyPoints = total - amount;
  await writeUsers(users);

  return { success: true, remaining: getRedeemableLoyaltyPoints(users[index]) };
}

export async function unlockLoyaltyPoints(
  userId: string,
  points?: number
): Promise<{ success: boolean; unlocked: number; remainingLocked: number; error?: string }> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, unlocked: 0, remainingLocked: 0, error: 'User not found' };
  }

  const locked = users[index].lockedLoyaltyPoints ?? 0;
  if (locked <= 0) {
    return { success: true, unlocked: 0, remainingLocked: 0 };
  }

  const unlockAmount =
    points === undefined || points === null
      ? locked
      : Math.min(locked, Math.max(0, Math.floor(points)));

  users[index].lockedLoyaltyPoints = locked - unlockAmount;
  await writeUsers(users);

  return {
    success: true,
    unlocked: unlockAmount,
    remainingLocked: users[index].lockedLoyaltyPoints ?? 0,
  };
}

export async function unlockLoyaltyPointsAfterPurchase(userId: string): Promise<void> {
  await unlockLoyaltyPoints(userId);
}

export async function markUserFreeEighthGranted(
  userId: string,
  orderId: string,
  grantedAt = new Date().toISOString()
): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1 || users[index].freeEighthReceivedAt) return;

  users[index].freeEighthReceivedAt = grantedAt;
  users[index].freeEighthOrderId = orderId;
  await writeUsers(users);
}

export async function markUserFreeEighthGrantedByEmail(
  email: string,
  orderId: string,
  grantedAt = new Date().toISOString()
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  const index = users.findIndex((user) => user.email.trim().toLowerCase() === normalized);
  if (index === -1 || users[index].freeEighthReceivedAt) return;

  users[index].freeEighthReceivedAt = grantedAt;
  users[index].freeEighthOrderId = orderId;
  await writeUsers(users);
}

export function toPublicProfile(user: UserProfile, referralStats?: PublicUserProfile['referralStats']): PublicUserProfile {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kushworld.shop';
  const emailVerified = !!user.emailVerifiedAt;
  const phoneVerified = !!user.phoneVerifiedAt;
  const signupVerificationChannel = resolveSignupVerificationChannel(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    discordLinked: Boolean(user.discordId),
    discordServerVerified: Boolean(user.discordVerifiedAt),
    discordVerifySyncPending: Boolean(user.discordVerifySyncPending),
    createdAt: user.createdAt,
    idVerified: user.idVerified,
    idVerification: user.idVerification
      ? {
          status: user.idVerification.status,
          uploadedAt: user.idVerification.uploadedAt,
          rejectionReason: user.idVerification.rejectionReason,
        }
      : user.idVerified
        ? { status: 'verified' as const }
        : { status: 'none' as const },
    emailVerified,
    phoneVerified,
    signupBonusClaimed: !!user.signupBonusClaimed,
    signupBonusEligible: !user.signupBonusClaimed && !isSignupChannelVerified(user),
    signupVerificationChannel,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    socials: user.socials,
    loyaltyPoints: user.loyaltyPoints ?? 0,
    redeemableLoyaltyPoints: getRedeemableLoyaltyPoints(user),
    lockedLoyaltyPoints: user.lockedLoyaltyPoints ?? 0,
    referralCode: user.referralCode,
    referralLink: user.referralCode ? `${base}/ref/${user.referralCode}` : undefined,
    pendingSpinPrize: user.pendingSpinPrize ?? null,
    savedSpinCoupons: resolveSavedSpinCoupons(user),
    activeSpinPrize: resolveSavedSpinCoupons(user)[0] ?? null,
    freeEighthReceivedAt: user.freeEighthReceivedAt,
    freeEighthOrderId: user.freeEighthOrderId,
    shippingAddress: user.shippingAddress,
    referralStats,
  };
}

export async function setPendingSpinPrize(userId: string, prize: SpinPrize): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('User not found');
  users[index].pendingSpinPrize = prize;
  await writeUsers(users);
}

export async function clearPendingSpinPrize(userId: string): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('User not found');
  users[index].pendingSpinPrize = undefined;
  await writeUsers(users);
}

function getAllStoredCoupons(user: UserProfile): SpinPrize[] {
  return [...(user.savedSpinCoupons ?? [])];
}

export async function upsertSavedSpinCoupon(userId: string, coupon: SpinPrize): Promise<SpinPrize[]> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('User not found');

  const slot = getSpinCouponSlot(coupon.type);
  const stored = getAllStoredCoupons(users[index]);
  const active = stored.filter(isSpinPrizeActive);
  const inactive = stored.filter((item) => !isSpinPrizeActive(item));

  const withoutSlot =
    slot === null
      ? active
      : active.filter((item) => getSpinCouponSlot(item.type) !== slot);

  users[index].savedSpinCoupons = [...inactive, ...withoutSlot, coupon];
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);
  return getActiveSavedSpinCoupons(users[index].savedSpinCoupons);
}

export async function removeSavedSpinCoupon(userId: string, prizeId: string): Promise<boolean> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  const stored = getAllStoredCoupons(users[index]);
  const next = stored.filter((coupon) => coupon.id !== prizeId);
  if (next.length === stored.length) return false;

  users[index].savedSpinCoupons = next.length > 0 ? next : undefined;
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);
  return true;
}

export async function extendUserSpinPrizeExpiry(
  userId: string,
  prizeId: string,
  expiresAt: string
): Promise<boolean> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  const stored = getAllStoredCoupons(users[index]);
  const couponIndex = stored.findIndex((coupon) => coupon.id === prizeId && !coupon.usedAt);
  if (couponIndex === -1) return false;

  stored[couponIndex] = { ...stored[couponIndex], expiresAt };
  users[index].savedSpinCoupons = stored;
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);
  return true;
}

export async function markUserSpinPrizeUsed(
  userId: string,
  prizeId: string,
  meta?: { orderId?: string; orderTotal?: number }
): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return;

  const stored = getAllStoredCoupons(users[index]);
  const couponIndex = stored.findIndex((coupon) => coupon.id === prizeId);
  if (couponIndex === -1) return;

  const usedAt = new Date().toISOString();
  stored[couponIndex] = { ...stored[couponIndex], usedAt };
  users[index].savedSpinCoupons = stored;
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);
  await markSpinHistoryUsed(prizeId, meta);
}

export async function getUserDashboard(userId: string): Promise<PublicUserProfile | null> {
  const user = await getUserById(userId);
  if (!user || isUserBlocked(user)) return null;

  const referral = await getReferralByEmail(user.email);
  let referralStats: PublicUserProfile['referralStats'];

  if (referral) {
    const settings = await getSettings();
    const rewardPoints = resolveReferralRewardPoints(referral, settings.referrerRewardPoints);
    const pointsEarned = referral.conversions * rewardPoints;
    const commissionEarned = referral.commissionEarned ?? 0;
    const claimedPoints = referral.pointsClaimed;
    const pendingPoints = Math.max(0, pointsEarned - claimedPoints);

    referralStats = {
      clicks: referral.clicks,
      conversions: referral.conversions,
      pointsEarned,
      commissionEarned,
      commissionPercent: resolveReferralCommissionPercent(referral, settings.referrerCommissionPercent),
      pendingPoints,
      pendingCommission: 0,
    };
  }

  const [referralNotifications, unreadReferralNotificationCount] = await Promise.all([
    getReferralNotificationsForEmail(user.email),
    getUnreadReferralNotificationCount(user.email),
  ]);

  const profile = toPublicProfile(user, referralStats);
  return {
    ...profile,
    referralNotifications,
    unreadReferralNotificationCount,
  };
}