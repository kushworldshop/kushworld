'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import type { FeaturePatch, SiteFeatures } from '@/lib/featureTypes';

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

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/site-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: content.features }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onContentChange({ ...content, features: data.content.features });
      invalidateSiteContentCache();
      setMessage('Feature settings saved — live on site.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
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
              label="New Arrivals section"
              checked={features.newArrivals.enabled}
              onChange={(enabled) => patchFeatures({ newArrivals: { enabled } })}
            />
            {features.newArrivals.enabled && (
              <Field
                label="Max products"
                value={features.newArrivals.limit}
                type="number"
                onChange={(v) => patchFeatures({ newArrivals: { limit: Number(v) || 8 } })}
              />
            )}

            <Toggle
              label="On Sale section"
              checked={features.onSale.enabled}
              onChange={(enabled) => patchFeatures({ onSale: { enabled } })}
            />
            {features.onSale.enabled && (
              <Toggle
                label="Show SALE badge on product cards"
                checked={features.onSale.showBadge}
                onChange={(showBadge) => patchFeatures({ onSale: { showBadge } })}
              />
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
          <>
            <Toggle label="Credit / debit card (Authorize.net)" checked={features.paymentCard.enabled} onChange={(enabled) => patchFeatures({ paymentCard: { enabled } })} />
            <Toggle label="Bitcoin" checked={features.paymentBitcoin.enabled} onChange={(enabled) => patchFeatures({ paymentBitcoin: { enabled } })} />
            <Toggle label="Zelle" checked={features.paymentZelle.enabled} onChange={(enabled) => patchFeatures({ paymentZelle: { enabled } })} />
            <Toggle label="PayPal" checked={features.paymentPaypal.enabled} onChange={(enabled) => patchFeatures({ paymentPaypal: { enabled } })} />
            <Toggle label="Chime" checked={features.paymentChime.enabled} onChange={(enabled) => patchFeatures({ paymentChime: { enabled } })} />
          </>
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
          </>
        )}

        <button
          onClick={save}
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