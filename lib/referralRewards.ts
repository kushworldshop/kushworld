import { getReferralByCode, type Referral } from '@/lib/referrals';
import { getSettings } from '@/lib/settings';
import { addLoyaltyPoints, getUserByEmail } from '@/lib/users';
import fs from 'fs/promises';
import path from 'path';

const REFERRALS_FILE = path.join(process.cwd(), 'data', 'referrals.json');

async function markReferralPointsClaimed(referral: Referral) {
  const data = await fs.readFile(REFERRALS_FILE, 'utf8');
  const referrals = JSON.parse(data) as Referral[];
  const index = referrals.findIndex((r) => r.code === referral.code);
  if (index === -1) return;

  const settings = await getSettings();
  referrals[index].pointsClaimed = referrals[index].conversions * settings.referrerRewardPoints;
  await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
}

export async function creditReferrerForConversion(code: string): Promise<void> {
  const referral = await getReferralByCode(code);
  if (!referral) return;

  const user = await getUserByEmail(referral.referrerEmail);
  if (!user) return;

  const settings = await getSettings();
  const earned = referral.conversions * settings.referrerRewardPoints;
  const pending = Math.max(0, earned - referral.pointsClaimed);
  if (pending <= 0) return;

  await addLoyaltyPoints(user.id, pending);
  await markReferralPointsClaimed(referral);
}