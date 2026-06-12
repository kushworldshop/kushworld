import fs from 'fs/promises';
import path from 'path';
import {
  getSignupVerificationChannel,
  isSignupChannelVerified,
  resolveSignupVerificationChannel,
} from '@/lib/signupBonus';
import { createOrGetReferral, getReferralByEmail } from '@/lib/referrals';
import { getSettings } from '@/lib/settings';
import type { SpinPrize } from '@/lib/spinWheelTypes';

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
  createdAt: string;
  idVerified?: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  signupBonusClaimed?: boolean;
  signupVerificationChannel?: 'email' | 'phone';
  pendingEmailCode?: string;
  pendingEmailCodeExp?: number;
  pendingPhoneCode?: string;
  pendingPhoneCodeExp?: number;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  socials?: UserSocials;
  loyaltyPoints: number;
  referralCode?: string;
  activeSpinPrize?: SpinPrize;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  idVerified?: boolean;
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
  referralCode?: string;
  referralLink?: string;
  activeSpinPrize?: SpinPrize | null;
  shippingAddress?: UserProfile['shippingAddress'];
  referralStats?: {
    clicks: number;
    conversions: number;
    pointsEarned: number;
    commissionEarned: number;
    pendingPoints: number;
    pendingCommission: number;
  };
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

export async function readUsers(): Promise<UserProfile[]> {
  await ensureUsersFile();
  const data = await fs.readFile(USERS_FILE, 'utf8');
  const users = JSON.parse(data) as UserProfile[];
  return users.map((user) => ({
    ...user,
    loyaltyPoints: user.loyaltyPoints ?? 0,
    socials: user.socials ?? {},
  }));
}

export async function writeUsers(users: UserProfile[]) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}): Promise<UserProfile> {
  const users = await readUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('User already exists');
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

  const available = users[index].loyaltyPoints ?? 0;
  const amount = Math.floor(points);

  if (amount <= 0) {
    return { success: false, remaining: available, error: 'Invalid points amount' };
  }

  if (amount > available) {
    return { success: false, remaining: available, error: 'Insufficient loyalty points' };
  }

  users[index].loyaltyPoints = available - amount;
  await writeUsers(users);

  return { success: true, remaining: users[index].loyaltyPoints };
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
    createdAt: user.createdAt,
    idVerified: user.idVerified,
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
    referralCode: user.referralCode,
    referralLink: user.referralCode ? `${base}/ref/${user.referralCode}` : undefined,
    activeSpinPrize: getActiveSpinPrizeForUser(user),
    shippingAddress: user.shippingAddress,
    referralStats,
  };
}

function getActiveSpinPrizeForUser(user: UserProfile): SpinPrize | null {
  const prize = user.activeSpinPrize;
  if (!prize || prize.usedAt) return null;
  if (new Date(prize.expiresAt).getTime() <= Date.now()) return null;
  return prize;
}

export async function setActiveSpinPrize(userId: string, prize: SpinPrize): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('User not found');
  users[index].activeSpinPrize = prize;
  await writeUsers(users);
}

export async function clearActiveSpinPrize(userId: string): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('User not found');
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);
}

export async function markUserSpinPrizeUsed(userId: string, prizeId: string): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return;

  const prize = users[index].activeSpinPrize;
  if (!prize || prize.id !== prizeId) return;

  users[index].activeSpinPrize = {
    ...prize,
    usedAt: new Date().toISOString(),
  };
  await writeUsers(users);
}

export async function getUserDashboard(userId: string): Promise<PublicUserProfile | null> {
  const user = await getUserById(userId);
  if (!user) return null;

  const referral = await getReferralByEmail(user.email);
  let referralStats: PublicUserProfile['referralStats'];

  if (referral) {
    const settings = await getSettings();
    const pointsEarned = referral.conversions * settings.referrerRewardPoints;
    const commissionEarned = referral.commissionEarned ?? 0;
    const claimedPoints = referral.pointsClaimed;
    const pendingPoints = Math.max(0, pointsEarned - claimedPoints);

    referralStats = {
      clicks: referral.clicks,
      conversions: referral.conversions,
      pointsEarned,
      commissionEarned,
      pendingPoints,
      pendingCommission: 0,
    };
  }

  return toPublicProfile(user, referralStats);
}