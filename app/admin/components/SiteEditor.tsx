'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import FeaturesTab from '@/app/admin/components/FeaturesTab';
import SiteContentTab from '@/app/admin/components/SiteContentTab';
import HomepageCustomizer from '@/app/admin/components/HomepageCustomizer';

type FeatureKey = 'drop' | 'shop' | 'account' | 'compliance' | 'grok' | 'comingSoon';
type ContentKey =
  | 'brand'
  | 'announcement'
  | 'hero'
  | 'footer'
  | 'contact'
  | 'homepage'
  | 'homepage-sections'
  | 'payments'
  | 'ageGate'
  | 'shipping'
  | 'policies'
  | 'shop';

type SiteItem = {
  id: string;
  label: string;
  blurb: string;
  feature?: FeatureKey;
  content?: ContentKey;
  homepageCustomizer?: boolean;
};

const GROUPS: Array<{ label: string; items: SiteItem[] }> = [
  {
    label: 'Home',
    items: [
      {
        id: 'home-layout',
        label: 'Homepage',
        blurb: 'Click a section to edit words and images. Drag, hide, or add your own blocks.',
        homepageCustomizer: true,
      },
      { id: 'drop', label: 'Drop clock', blurb: 'Start, stop, or hide a drop', feature: 'drop' },
      { id: 'banner', label: 'Top banner', blurb: 'Announcement bar across the site', content: 'announcement' },
      { id: 'hero', label: 'Hero', blurb: 'Big headline at the top of the homepage', content: 'hero' },
      {
        id: 'home-titles',
        label: 'Section titles',
        blurb: 'Headlines for best sellers, how it works, community',
        content: 'homepage-sections',
      },
      {
        id: 'home-copy',
        label: 'Merch, reviews & FAQ',
        blurb: 'Copy for those homepage sections',
        content: 'homepage',
      },
    ],
  },
  {
    label: 'Shop',
    items: [
      { id: 'shop-menu', label: 'Shop menu', blurb: 'Categories and sub-sections', content: 'shop' },
      {
        id: 'shop-cards',
        label: 'Product cards',
        blurb: 'Hearts, COA links, search, sale badge',
        feature: 'shop',
      },
    ],
  },
  {
    label: 'Checkout',
    items: [
      { id: 'payments', label: 'Payments', blurb: 'Card, BTC, Zelle, and the rest', content: 'payments' },
      { id: 'shipping', label: 'Shipping', blurb: 'Free shipping thresholds', content: 'shipping' },
      {
        id: 'age',
        label: 'Age gate & ID',
        blurb: '21+ modal and hemp ID check',
        feature: 'compliance',
        content: 'ageGate',
      },
    ],
  },
  {
    label: 'Pages',
    items: [
      { id: 'contact', label: 'Contact & social', blurb: 'Email, Discord, X, and the rest', content: 'contact' },
      { id: 'footer', label: 'Footer', blurb: 'Tagline and copyright', content: 'footer' },
      { id: 'policies', label: 'Policies', blurb: 'Privacy, terms, shipping, returns', content: 'policies' },
    ],
  },
  {
    label: 'Brand',
    items: [{ id: 'brand', label: 'Logo & name', blurb: 'Brand name, tagline, logo, hero image', content: 'brand' }],
  },
  {
    label: 'Switches',
    items: [
      { id: 'loyalty', label: 'Loyalty & wheel', blurb: 'Points, spin, referrals, reviews', feature: 'account' },
      { id: 'grok', label: 'Grok', blurb: 'AI assistant on the site and in admin', feature: 'grok' },
      { id: 'soon', label: 'Coming soon', blurb: 'Auctions, raffles, club', feature: 'comingSoon' },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((group) => group.items);

export default function SiteEditor({
  content,
  onContentChange,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
}) {
  const [panelId, setPanelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const panel = ALL_ITEMS.find((item) => item.id === panelId) ?? null;

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/site-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onContentChange(data.content);
      invalidateSiteContentCache();
      setMessage('Saved — live on the site.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-zinc-800 px-4 lg:px-6 py-3 bg-zinc-950">
        <p className="font-semibold">Edit the site</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Pick what shoppers see. Products, orders, and TDs stay in their own tabs.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className="shrink-0 lg:w-56 border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-x-auto lg:overflow-y-auto bg-zinc-950">
          <div className="flex lg:flex-col gap-4 p-3 lg:p-4 min-w-max lg:min-w-0">
            <button
              type="button"
              onClick={() => setPanelId(null)}
              className={`text-left text-xs font-medium px-2 py-1.5 rounded-lg ${
                panelId === null ? 'bg-[#00ff9d] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All sections
            </button>
            {GROUPS.map((group) => (
              <div key={group.label} className="flex lg:flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-2 pt-1">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPanelId(item.id);
                      setMessage('');
                    }}
                    className={`text-left text-xs px-2 py-1.5 rounded-lg whitespace-nowrap ${
                      panelId === item.id
                        ? 'bg-[#00ff9d] text-black font-medium'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className={panel?.homepageCustomizer ? 'p-3 lg:p-4 max-w-none' : 'p-4 lg:p-6 max-w-4xl'}>
            {!panel && (
              <div className="space-y-8">
                {GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">{group.label}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPanelId(item.id);
                            setMessage('');
                          }}
                          className="text-left rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-[#00ff9d]/40 p-4 transition"
                        >
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs text-zinc-500 mt-1">{item.blurb}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panel && (
              <div className="space-y-8">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                    {GROUPS.find((group) => group.items.some((item) => item.id === panel.id))?.label}
                  </p>
                  <h2 className="text-xl font-bold mt-1">{panel.label}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{panel.blurb}</p>
                </div>
                {panel.homepageCustomizer && (
                  <HomepageCustomizer content={content} onContentChange={onContentChange} />
                )}
                {panel.feature && (
                  <FeaturesTab
                    content={content}
                    onContentChange={onContentChange}
                    forcedSection={panel.feature}
                    hideShell
                  />
                )}
                {panel.content && (
                  <SiteContentTab
                    content={content}
                    onContentChange={onContentChange}
                    forcedSection={panel.content}
                    hideShell
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="bg-[#00ff9d] text-black px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save site'}
        </button>
        <p className="text-xs text-zinc-500">
          {panel?.homepageCustomizer
            ? 'Homepage edits save as you type. Open a section on the right to change words and images.'
            : 'Drop clock start/stop saves on its own. Everything else uses this Save.'}
        </p>
        {message && (
          <p className={`text-xs ${/fail|error/i.test(message) ? 'text-red-300' : 'text-[#00ff9d]'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
