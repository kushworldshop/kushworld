import fs from 'fs/promises';
import path from 'path';
import { notifyGlobalProgramUpdated } from '@/lib/referralNotifications';
import { readReferrals } from '@/lib/referrals';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface SiteSettings {
  referrerCommissionPercent: number;
  referrerRewardPoints: number;
  promoCustomerDiscount: number;
  promoFirstOrderOnly: boolean;
  promoMinOrder: number;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  referrerCommissionPercent: 5,
  referrerRewardPoints: 100,
  promoCustomerDiscount: 10,
  promoFirstOrderOnly: true,
  promoMinOrder: 25,
  updatedAt: new Date().toISOString(),
};

async function ensureSettingsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
}

export async function getSettings(): Promise<SiteSettings> {
  await ensureSettingsFile();
  const data = await fs.readFile(SETTINGS_FILE, 'utf8');
  return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
}

export async function updateSettings(
  updates: Partial<Omit<SiteSettings, 'updatedAt'>>
): Promise<SiteSettings> {
  const current = await getSettings();
  const next: SiteSettings = {
    ...current,
    ...updates,
    referrerCommissionPercent: clamp(
      updates.referrerCommissionPercent ?? current.referrerCommissionPercent,
      0,
      50
    ),
    referrerRewardPoints: clamp(
      updates.referrerRewardPoints ?? current.referrerRewardPoints,
      0,
      10000
    ),
    promoCustomerDiscount: clamp(
      updates.promoCustomerDiscount ?? current.promoCustomerDiscount,
      0,
      100
    ),
    promoMinOrder: clamp(updates.promoMinOrder ?? current.promoMinOrder, 0, 1000),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2));

  const commissionChanged =
    next.referrerCommissionPercent !== current.referrerCommissionPercent;
  const rewardPointsChanged = next.referrerRewardPoints !== current.referrerRewardPoints;

  if (commissionChanged || rewardPointsChanged) {
    const referrals = await readReferrals();
    for (const referral of referrals) {
      const usesDefaultCommission =
        referral.commissionPercent === undefined || referral.commissionPercent === null;
      const usesDefaultRewardPoints =
        referral.rewardPointsOverride === undefined || referral.rewardPointsOverride === null;

      if (commissionChanged && usesDefaultCommission) {
        await notifyGlobalProgramUpdated(
          referral.referrerEmail,
          `Site-wide referral commission changed from ${current.referrerCommissionPercent}% to ${next.referrerCommissionPercent}%. This applies to your promo code.`,
          {
            oldValue: current.referrerCommissionPercent,
            newValue: next.referrerCommissionPercent,
          }
        );
      }

      if (rewardPointsChanged && usesDefaultRewardPoints) {
        await notifyGlobalProgramUpdated(
          referral.referrerEmail,
          `Site-wide referral reward points changed from ${current.referrerRewardPoints} to ${next.referrerRewardPoints} per conversion. This applies to your promo code.`,
          {
            oldValue: current.referrerRewardPoints,
            newValue: next.referrerRewardPoints,
          }
        );
      }
    }
  }

  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateCommissionAmount(subtotal: number, percent: number): number {
  return Math.round(subtotal * (percent / 100) * 100) / 100;
}