import { NextRequest, NextResponse } from 'next/server';
import {
  getReferralByCode,
  getReferralByEmail,
  createOrGetReferral,
  recordReferralClick,
  claimReferralPoints,
  getReferralLink,
  calculateReferralDiscount,
  resolveReferralCommissionPercent,
  REFERRER_REWARD_POINTS,
} from '@/lib/referrals';
import { getSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const email = searchParams.get('email');
  const subtotal = Number(searchParams.get('subtotal') || 0);
  const isFirstOrder = searchParams.get('isFirstOrder') === 'true';

  if (code) {
    const referral = await getReferralByCode(code);
    if (!referral) {
      return NextResponse.json({ valid: false, error: 'Invalid referral code' }, { status: 404 });
    }

    const settings = await getSettings();
    const discountResult = await calculateReferralDiscount(subtotal, isFirstOrder);

    return NextResponse.json({
      valid: true,
      code: referral.code,
      referrerName: referral.referrerName,
      discount: settings.promoCustomerDiscount,
      discountResult,
      commissionPercent: resolveReferralCommissionPercent(referral, settings.referrerCommissionPercent),
    });
  }

  if (email) {
    const referral = await getReferralByEmail(email);
    if (!referral) {
      return NextResponse.json({ exists: false });
    }

    const { pointsToAdd } = await claimReferralPoints(email);

    return NextResponse.json({
      exists: true,
      code: referral.code,
      referrerName: referral.referrerName,
      link: getReferralLink(referral.code),
      clicks: referral.clicks,
      conversions: referral.conversions,
      rewardPerReferral: (await getSettings()).referrerRewardPoints,
      pointsToAdd,
    });
  }

  return NextResponse.json({ error: 'code or email required' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, email, code } = body;

    if (action === 'click' && code) {
      const referral = await recordReferralClick(code);
      if (!referral) {
        return NextResponse.json({ success: false, error: 'Invalid referral code' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        referrerName: referral.referrerName,
        code: referral.code,
      });
    }

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const referral = await createOrGetReferral(name, email);

    return NextResponse.json({
      success: true,
      code: referral.code,
      referrerName: referral.referrerName,
      link: getReferralLink(referral.code),
      clicks: referral.clicks,
      conversions: referral.conversions,
      rewardPerReferral: (await getSettings()).referrerRewardPoints,
    });
  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process referral' }, { status: 500 });
  }
}