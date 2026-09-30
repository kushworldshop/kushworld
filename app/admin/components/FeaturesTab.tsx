'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import { DEFAULT_SITE_FEATURES, type FeaturePatch, type SiteFeatures } from '@/lib/featureTypes';
import {
  applyDropClockDuration,
  applyDropClockEndAt,
  applyLiveDropClock,
  applyStartDropClock,
  applyStopDropClock,
  DROP_CLOCK_PRESETS,
  formatDropClockRemaining,
  fromDatetimeLocalValue,
  getDropClockRemainingMs,
  isDropClockLive,
  toDatetimeLocalValue,
  type DropHeroConfig,
} from '@/lib/dropClock';

type FeatureSection = 'homepage' | 'shop' | 'account' | 'checkout' | 'compliance' | 'comingSoon';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer bg-black border border-zinc-800 rounded-2xl p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-1 accent-[#00ff9d]"
      />
      <span>
        <span className="font-medium block">{label}</span>
        {description && <span className="text-xs text-zinc-500">{description}</span>}
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-2">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      )}
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

function DropClockStatus({ drop }: { drop: DropHeroConfig }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!drop.clockRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [drop.clockRunning, drop.clockEndsAt]);

  const remaining = getDropClockRemainingMs(drop, now);
  const live = isDropClockLive(drop, now);
  let status = 'Clock hidden';
  if (!drop.enabled) status = 'Drop block hidden from the site';
  else if (!drop.clockEnabled) status = 'Drop is on · clock hidden';
  else if (live) status = 'Live on site';
  else if (drop.clockRunning) status = `Running · ${formatDropClockRemaining(remaining)} left`;
  else if (remaining > 0) status = `Stopped · ${formatDropClockRemaining(remaining)} frozen`;
  else status = 'Clock on · set an end time to start';

  return <p className="text-sm text-[#00ff9d] font-medium">{status}</p>;
}

export default function FeaturesTab({
  content,
  onContentChange,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
}) {
  const [section, setSection] = useState<FeatureSection>('homepage');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const features = content.features;

  const patchFeatures = (patch: FeaturePatch) => {
    const next = { ...features } as SiteFeatures;
    (Object.keys(patch) as (keyof SiteFeatures)[]).forEach((key) => {
      const value = patch[key];
      if (value !== undefined) {
        (next as unknown as Record<string, unknown>)[key as string] = { ...features[key], ...value };
      }
    });
    onContentChange({ ...content, features: next });
  };

  const drop: DropHeroConfig = { ...DEFAULT_SITE_FEATURES.dropHero, ...features.dropHero };

  const save = async (nextFeatures = content.features, successMessage = 'Feature settings saved — live on site.') => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/site-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: nextFeatures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onContentChange({ ...content, features: data.content.features });
      invalidateSiteContentCache();
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveDropHero = async (nextDrop: DropHeroConfig, successMessage: string) => {
    const nextFeatures = { ...features, dropHero: nextDrop };
    onContentChange({ ...content, features: nextFeatures });
    await save(nextFeatures, successMessage);
  };

  const sections: { key: FeatureSection; label: string }[] = [
    { key: 'homepage', label: 'Homepage' },
    { key: 'shop', label: 'Shop' },
    { key: 'account', label: 'Account & Loyalty' },
    { key: 'checkout', label: 'Payments' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'comingSoon', label: 'Coming Soon' },
  ];

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <h2 className="text-2xl font-bold mb-2">Feature Controls</h2>
        <p className="text-zinc-400 text-sm">
          Turn site features on or off and customize how they appear. Changes apply immediately after
          saving.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              section === item.key ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl max-w-4xl space-y-6">
        {section === 'homepage' && (
          <>
            <p className="text-sm text-zinc-400">
              Edit section titles and copy under Site Content → Homepage Sections.
            </p>

            <div className="border border-[#00ff9d]/30 rounded-3xl p-5 space-y-4 bg-black/40">
              <div>
                <h3 className="text-lg font-bold">Drop clock</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Start, stop, and edit the countdown when you drop new items. Hide the clock without
                  hiding the drop, or hide the whole drop block. Start / stop / hide / presets save
                  immediately. Copy fields need Save.
                </p>
              </div>
              <DropClockStatus drop={drop} />

              <div className="grid sm:grid-cols-2 gap-3">
                <Toggle
                  label="Show drop on homepage"
                  description="The drop block itself. Off hides the product and the clock."
                  checked={drop.enabled}
                  onChange={(enabled) =>
                    void saveDropHero(
                      { ...drop, enabled },
                      enabled ? 'Drop is on the site.' : 'Drop hidden from the site.'
                    )
                  }
                />
                <Toggle
                  label="Show countdown"
                  description="Independent of the drop product. Off hides only the timer."
                  checked={drop.clockEnabled}
                  onChange={(clockEnabled) =>
                    void saveDropHero(
                      {
                        ...drop,
                        clockEnabled,
                        enabled: clockEnabled ? true : drop.enabled,
                      },
                      clockEnabled ? 'Countdown showing on the drop.' : 'Countdown hidden.'
                    )
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || drop.clockRunning}
                  onClick={() => {
                    const result = applyStartDropClock(drop);
                    if (result.error) {
                      setMessage(result.error);
                      return;
                    }
                    void saveDropHero(result.drop, 'Drop clock started — live on site.');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-[#00ff9d] text-black disabled:opacity-50"
                >
                  Start clock
                </button>
                <button
                  type="button"
                  disabled={saving || !drop.clockRunning}
                  onClick={() =>
                    void saveDropHero(applyStopDropClock(drop), 'Drop clock stopped. Time is frozen.')
                  }
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-zinc-800 disabled:opacity-50"
                >
                  Stop clock
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void saveDropHero(applyLiveDropClock(drop), 'Marked live — on the board now.')
                  }
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-[#00ff9d]/40 disabled:opacity-50"
                >
                  It&apos;s live
                </button>
              </div>

              <Field
                label="End time"
                type="datetime-local"
                value={toDatetimeLocalValue(drop.clockEndsAt)}
                onChange={(v) =>
                  patchFeatures({
                    dropHero: applyDropClockEndAt(drop, fromDatetimeLocalValue(v)),
                  })
                }
                hint="Your local time. Start or Save after you change this."
              />

              <div>
                <p className="text-sm text-zinc-400 mb-2">Quick duration</p>
                <div className="flex flex-wrap gap-2">
                  {DROP_CLOCK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void saveDropHero(
                          applyDropClockDuration(drop, preset.ms),
                          `Clock set to ${preset.label}.`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field
                label="Clock label"
                value={drop.clockLabel}
                onChange={(v) => patchFeatures({ dropHero: { clockLabel: v } })}
                hint='Shown above the timer, e.g. "Goes live in"'
              />
              <Field
                label="Drop product slug"
                value={drop.productSlug}
                onChange={(v) => patchFeatures({ dropHero: { productSlug: v } })}
                hint="Matches the product URL, e.g. custom-dosi-banana"
              />
              <Field
                label="Eyebrow"
                value={drop.eyebrow}
                onChange={(v) => patchFeatures({ dropHero: { eyebrow: v } })}
              />
              <Field
                label="Headline"
                value={drop.headline}
                onChange={(v) => patchFeatures({ dropHero: { headline: v } })}
              />
              <Toggle
                label="Discord early access note"
                checked={drop.discordEarlyAccess}
                onChange={(discordEarlyAccess) => patchFeatures({ dropHero: { discordEarlyAccess } })}
              />
            </div>

            <Toggle
              label="Best Sellers section"
              description="Shows top products on the homepage."
              checked={features.bestSellers.enabled}
              onChange={(enabled) => patchFeatures({ bestSellers: { enabled } })}
            />
            {features.bestSellers.enabled && (
              <div className="space-y-4 pl-2 border-l border-zinc-800">
                <Field
                  label="Max products"
                  value={features.bestSellers.limit}
                  type="number"
                  onChange={(v) => patchFeatures({ bestSellers: { limit: Number(v) || 8 } })}
                />
                <Field
                  label="Pinned product IDs (comma separated)"
                  value={features.bestSellers.pinnedProductIds.join(', ')}
                  onChange={(v) =>
                    patchFeatures({
                      bestSellers: {
                        pinnedProductIds: v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  hint="Optional. These show first in order."
                />
              </div>
            )}

            <Toggle
              label="How It Works section"
              checked={features.howItWorks.enabled}
              onChange={(enabled) => patchFeatures({ howItWorks: { enabled } })}
            />
            <Toggle
              label="Community links block"
              checked={features.communityBlock.enabled}
              onChange={(enabled) => patchFeatures({ communityBlock: { enabled } })}
            />
            <Toggle label="Merch section" checked={features.merchSection.enabled} onChange={(enabled) => patchFeatures({ merchSection: { enabled } })} />
            <Toggle label="Reviews section" checked={features.reviewsSection.enabled} onChange={(enabled) => patchFeatures({ reviewsSection: { enabled } })} />
            <Toggle label="Loyalty section" checked={features.loyaltySection.enabled} onChange={(enabled) => patchFeatures({ loyaltySection: { enabled } })} />
            <Toggle label="FAQ section" checked={features.faqSection.enabled} onChange={(enabled) => patchFeatures({ faqSection: { enabled } })} />
          </>
        )}

        {section === 'shop' && (
          <>
            <Toggle label="Wishlist hearts" checked={features.wishlist.enabled} onChange={(enabled) => patchFeatures({ wishlist: { enabled } })} />
            <Toggle label="COA links on products" checked={features.coaLinks.enabled} onChange={(enabled) => patchFeatures({ coaLinks: { enabled } })} />
            <Toggle label="Product search" checked={features.productSearch.enabled} onChange={(enabled) => patchFeatures({ productSearch: { enabled } })} />
            <Toggle label="Star ratings on products" checked={features.starRatings.enabled} onChange={(enabled) => patchFeatures({ starRatings: { enabled } })} />
            <Toggle
              label="Show SALE badge on product cards"
              checked={features.onSale.showBadge}
              onChange={(showBadge) => patchFeatures({ onSale: { showBadge } })}
            />
          </>
        )}

        {section === 'account' && (
          <>
            <Toggle label="Loyalty points program" checked={features.loyaltyProgram.enabled} onChange={(enabled) => patchFeatures({ loyaltyProgram: { enabled } })} />
            <Toggle label="Spin wheel" checked={features.spinWheel.enabled} onChange={(enabled) => patchFeatures({ spinWheel: { enabled } })} />
            {features.spinWheel.enabled && (
              <Field
                label="Points cost per spin"
                value={features.spinWheel.spinCost}
                type="number"
                onChange={(v) => patchFeatures({ spinWheel: { spinCost: Number(v) || 150 } })}
              />
            )}
            <Toggle label="Referral / promo codes" checked={features.referrals.enabled} onChange={(enabled) => patchFeatures({ referrals: { enabled } })} />
            <Toggle
              label="Customer product reviews"
              checked={features.customerReviews.enabled}
              onChange={(enabled) => patchFeatures({ customerReviews: { enabled } })}
            />
            {features.customerReviews.enabled && (
              <div className="space-y-4 pl-2 border-l border-zinc-800">
                <Toggle
                  label="Require verified purchase to review"
                  checked={features.customerReviews.requirePurchase}
                  onChange={(requirePurchase) => patchFeatures({ customerReviews: { requirePurchase } })}
                />
                <Field
                  label="Loyalty points reward per review"
                  value={features.customerReviews.rewardPoints}
                  type="number"
                  onChange={(v) => patchFeatures({ customerReviews: { rewardPoints: Number(v) || 0 } })}
                />
              </div>
            )}
          </>
        )}

        {section === 'checkout' && (
          <p className="text-sm text-zinc-400">
            Payment method toggles and checkout copy (labels, pay-to info, Bitcoin guide) are edited under{' '}
            <strong className="text-zinc-200">Site Content → Checkout Payments</strong>.
          </p>
        )}

        {section === 'compliance' && (
          <>
            <Toggle label="21+ age gate modal" checked={features.ageGate.enabled} onChange={(enabled) => patchFeatures({ ageGate: { enabled } })} />
            <Toggle
              label="ID verification for new hemp customers"
              description="Requires government ID upload at checkout for first-time hemp buyers."
              checked={features.idVerification.enabled}
              onChange={(enabled) => patchFeatures({ idVerification: { enabled } })}
            />
            <Toggle
              label="Grok AI assistant"
              description="Support chat on Contact, product Q&A, admin tools, and content drafting. Requires XAI_API_KEY on server."
              checked={features.grokAssistant.enabled}
              onChange={(enabled) => patchFeatures({ grokAssistant: { enabled } })}
            />
          </>
        )}

        {section === 'comingSoon' && (
          <>
            <p className="text-sm text-zinc-400">
              These are BLifted-style features you can flag on now. Full functionality can be built when you are ready.
            </p>
            <Toggle label="Auctions (coming soon)" checked={features.auctions.enabled} onChange={(enabled) => patchFeatures({ auctions: { enabled } })} />
            <Toggle label="Raffles / giveaways (coming soon)" checked={features.raffles.enabled} onChange={(enabled) => patchFeatures({ raffles: { enabled } })} />
            <Toggle label="Mystery boxes (coming soon)" checked={features.mysteryBoxes.enabled} onChange={(enabled) => patchFeatures({ mysteryBoxes: { enabled } })} />
            <Toggle
              label="Monthly subscriptions (Kush Club)"
              description="Off by default until payment processor is connected. Shows /subscribe and account membership tab when on."
              checked={features.subscriptions.enabled}
              onChange={(enabled) => patchFeatures({ subscriptions: { enabled } })}
            />
            {features.subscriptions.enabled && (
              <div className="space-y-4 pl-2 border-l border-zinc-800">
                <Field
                  label="Plan name"
                  value={features.subscriptions.label}
                  onChange={(v) => patchFeatures({ subscriptions: { label: v } })}
                />
                <Field
                  label="Tagline"
                  value={features.subscriptions.tagline}
                  onChange={(v) => patchFeatures({ subscriptions: { tagline: v } })}
                  multiline
                />
                <Field
                  label="Monthly price (USD)"
                  value={features.subscriptions.monthlyPrice}
                  type="number"
                  onChange={(v) => patchFeatures({ subscriptions: { monthlyPrice: Number(v) || 49.99 } })}
                />
                <Field
                  label="Perks section headline"
                  value={features.subscriptions.perksHeadline}
                  onChange={(v) => patchFeatures({ subscriptions: { perksHeadline: v } })}
                />
              </div>
            )}
          </>
        )}

        <button
          onClick={() => void save()}
          disabled={saving}
          className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Feature Settings'}
        </button>
        {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
      </div>
    </div>
  );
}