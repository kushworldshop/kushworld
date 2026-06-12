'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { FaqItem, SiteContent } from '@/lib/siteContentTypes';

type SectionKey =
  | 'brand'
  | 'announcement'
  | 'hero'
  | 'footer'
  | 'contact'
  | 'homepage'
  | 'ageGate'
  | 'shipping'
  | 'policies';

function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-2">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      )}
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function SiteContentTab({
  content,
  onContentChange,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
}) {
  const [section, setSection] = useState<SectionKey>('brand');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

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
      setMessage('Saved — changes are live on the site.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (field: 'logoUrl' | 'heroBackgroundUrl', file: File) => {
    setUploading(field);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('field', field);
      const res = await adminFetch('/api/admin/site-content/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onContentChange({
        ...content,
        brand: {
          ...content.brand,
          [field]: data.imageUrl,
        },
      });
      invalidateSiteContentCache();
      setMessage(`${field === 'logoUrl' ? 'Logo' : 'Hero background'} uploaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const updateFaq = (index: number, patch: Partial<FaqItem>) => {
    const items = [...content.faq.items];
    items[index] = { ...items[index], ...patch };
    onContentChange({ ...content, faq: { ...content.faq, items } });
  };

  const sections: { key: SectionKey; label: string }[] = [
    { key: 'brand', label: 'Brand & Logo' },
    { key: 'announcement', label: 'Top Banner' },
    { key: 'hero', label: 'Hero' },
    { key: 'footer', label: 'Footer' },
    { key: 'contact', label: 'Contact' },
    { key: 'homepage', label: 'Homepage' },
    { key: 'ageGate', label: 'Age Gate' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'policies', label: 'Policies' },
  ];

  return (
    <div className="mb-10">
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
        {section === 'brand' && (
          <>
            <Field label="Brand name" value={content.brand.name} onChange={(v) => onContentChange({ ...content, brand: { ...content.brand, name: v } })} />
            <Field label="Tagline" value={content.brand.tagline} onChange={(v) => onContentChange({ ...content, brand: { ...content.brand, tagline: v } })} />
            <Field label="Logo URL" value={content.brand.logoUrl} onChange={(v) => onContentChange({ ...content, brand: { ...content.brand, logoUrl: v } })} />
            <Field label="Hero background URL" value={content.brand.heroBackgroundUrl} onChange={(v) => onContentChange({ ...content, brand: { ...content.brand, heroBackgroundUrl: v } })} />
            <div className="flex flex-wrap gap-4">
              <label className="bg-black border border-zinc-700 rounded-xl px-4 py-3 cursor-pointer text-sm">
                {uploading === 'logoUrl' ? 'Uploading logo...' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage('logoUrl', e.target.files[0])} />
              </label>
              <label className="bg-black border border-zinc-700 rounded-xl px-4 py-3 cursor-pointer text-sm">
                {uploading === 'heroBackgroundUrl' ? 'Uploading hero...' : 'Upload hero background'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage('heroBackgroundUrl', e.target.files[0])} />
              </label>
            </div>
          </>
        )}

        {section === 'announcement' && (
          <>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={content.announcementBar.enabled}
                onChange={(e) => onContentChange({ ...content, announcementBar: { ...content.announcementBar, enabled: e.target.checked } })}
                className="w-4 h-4 accent-[#00ff9d]"
              />
              <span>Show top announcement bar</span>
            </label>
            <Field label="Full access banner text" value={content.announcementBar.fullAccess} onChange={(v) => onContentChange({ ...content, announcementBar: { ...content.announcementBar, fullAccess: v } })} multiline />
            <Field label="Merch-only banner text" value={content.announcementBar.merchOnly} onChange={(v) => onContentChange({ ...content, announcementBar: { ...content.announcementBar, merchOnly: v } })} multiline />
          </>
        )}

        {section === 'hero' && (
          <>
            <h3 className="text-lg font-bold text-[#00ff9d]">Full catalog hero</h3>
            <Field label="Eyebrow" value={content.hero.fullAccess.eyebrow} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, eyebrow: v } } })} />
            <Field label="Headline (use Enter for line break)" value={content.hero.fullAccess.headline} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, headline: v } } })} multiline hint="Use a new line for a second headline line." />
            <Field label="Subtitle" value={content.hero.fullAccess.subtitle} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, subtitle: v } } })} multiline />
            <Field label="Primary button" value={content.hero.fullAccess.primaryCtaLabel} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, primaryCtaLabel: v } } })} />
            <Field label="Secondary button" value={content.hero.fullAccess.secondaryCtaLabel || ''} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, secondaryCtaLabel: v } } })} />
            <Field label="Badges (comma separated)" value={content.hero.fullAccess.badges.join(', ')} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, fullAccess: { ...content.hero.fullAccess, badges: v.split(',').map((s) => s.trim()).filter(Boolean) } } })} />

            <h3 className="text-lg font-bold text-[#00ff9d] pt-4">Merch-only hero</h3>
            <Field label="Eyebrow" value={content.hero.merchOnly.eyebrow} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, merchOnly: { ...content.hero.merchOnly, eyebrow: v } } })} />
            <Field label="Headline" value={content.hero.merchOnly.headline} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, merchOnly: { ...content.hero.merchOnly, headline: v } } })} multiline />
            <Field label="Subtitle" value={content.hero.merchOnly.subtitle} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, merchOnly: { ...content.hero.merchOnly, subtitle: v } } })} multiline />
            <Field label="Badges (comma separated)" value={content.hero.merchOnly.badges.join(', ')} onChange={(v) => onContentChange({ ...content, hero: { ...content.hero, merchOnly: { ...content.hero.merchOnly, badges: v.split(',').map((s) => s.trim()).filter(Boolean) } } })} />
          </>
        )}

        {section === 'footer' && (
          <>
            <Field label="Footer tagline" value={content.footer.tagline} onChange={(v) => onContentChange({ ...content, footer: { ...content.footer, tagline: v } })} multiline />
            <Field label="Copyright line" value={content.footer.copyright} onChange={(v) => onContentChange({ ...content, footer: { ...content.footer, copyright: v } })} />
          </>
        )}

        {section === 'contact' && (
          <>
            <Field label="Support email" value={content.contact.email} onChange={(v) => onContentChange({ ...content, contact: { ...content.contact, email: v } })} />
            <Field label="Response time" value={content.contact.responseTime} onChange={(v) => onContentChange({ ...content, contact: { ...content.contact, responseTime: v } })} />
            <Field label="Contact page title" value={content.contact.pageTitle} onChange={(v) => onContentChange({ ...content, contact: { ...content.contact, pageTitle: v } })} />
            <Field label="Contact page subtitle" value={content.contact.pageSubtitle} onChange={(v) => onContentChange({ ...content, contact: { ...content.contact, pageSubtitle: v } })} multiline />
            <h3 className="font-bold pt-2">Social links</h3>
            <Field label="X (Twitter) URL" value={content.social.twitterUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, twitterUrl: v } })} />
            <Field label="X handle label" value={content.social.twitterHandle} onChange={(v) => onContentChange({ ...content, social: { ...content.social, twitterHandle: v } })} />
            <Field label="Kush World Studio URL" value={content.social.studioUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, studioUrl: v } })} />
            <Field label="Discord URL" value={content.social.discordUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, discordUrl: v } })} />
            <Field label="TikTok URL" value={content.social.tiktokUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, tiktokUrl: v } })} />
            <Field label="Facebook URL" value={content.social.facebookUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, facebookUrl: v } })} />
            <Field label="WhatsApp URL" value={content.social.whatsappUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, whatsappUrl: v } })} />
            <Field label="Instagram URL" value={content.social.instagramUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, instagramUrl: v } })} />
            <Field label="Twitch URL" value={content.social.twitchUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, twitchUrl: v } })} />
            <Field label="Linktree URL" value={content.social.linktreeUrl} onChange={(v) => onContentChange({ ...content, social: { ...content.social, linktreeUrl: v } })} />
          </>
        )}

        {section === 'homepage' && (
          <>
            <h3 className="font-bold">Merch section</h3>
            <Field label="Eyebrow" value={content.merchSection.eyebrow} onChange={(v) => onContentChange({ ...content, merchSection: { ...content.merchSection, eyebrow: v } })} />
            <Field label="Title" value={content.merchSection.title} onChange={(v) => onContentChange({ ...content, merchSection: { ...content.merchSection, title: v } })} />
            <Field label="Subtitle" value={content.merchSection.subtitle} onChange={(v) => onContentChange({ ...content, merchSection: { ...content.merchSection, subtitle: v } })} multiline />

            <h3 className="font-bold pt-4">Loyalty section</h3>
            <Field label="Title" value={content.loyaltySection.title} onChange={(v) => onContentChange({ ...content, loyaltySection: { ...content.loyaltySection, title: v } })} />
            <Field label="Subtitle" value={content.loyaltySection.subtitle} onChange={(v) => onContentChange({ ...content, loyaltySection: { ...content.loyaltySection, subtitle: v } })} multiline />
            <Field label="CTA button" value={content.loyaltySection.ctaLabel} onChange={(v) => onContentChange({ ...content, loyaltySection: { ...content.loyaltySection, ctaLabel: v } })} />

            <h3 className="font-bold pt-4">Reviews section</h3>
            <Field label="Eyebrow" value={content.reviewsSection.eyebrow} onChange={(v) => onContentChange({ ...content, reviewsSection: { ...content.reviewsSection, eyebrow: v } })} />
            <Field label="Title" value={content.reviewsSection.title} onChange={(v) => onContentChange({ ...content, reviewsSection: { ...content.reviewsSection, title: v } })} />

            <h3 className="font-bold pt-4">FAQ</h3>
            <Field label="FAQ title" value={content.faq.title} onChange={(v) => onContentChange({ ...content, faq: { ...content.faq, title: v } })} />
            <Field label="FAQ subtitle" value={content.faq.subtitle} onChange={(v) => onContentChange({ ...content, faq: { ...content.faq, subtitle: v } })} multiline />
            {content.faq.items.map((faq, index) => (
              <div key={index} className="border border-zinc-800 rounded-2xl p-4 space-y-3">
                <Field label={`Question ${index + 1}`} value={faq.question} onChange={(v) => updateFaq(index, { question: v })} />
                <Field label="Answer" value={faq.answer} onChange={(v) => updateFaq(index, { answer: v })} multiline />
              </div>
            ))}
            <button
              onClick={() => onContentChange({ ...content, faq: { ...content.faq, items: [...content.faq.items, { question: 'New question', answer: 'New answer' }] } })}
              className="px-4 py-2 bg-zinc-800 rounded-xl text-sm"
            >
              + Add FAQ
            </button>
          </>
        )}

        {section === 'ageGate' && (
          <>
            <Field label="Title" value={content.ageGate.title} onChange={(v) => onContentChange({ ...content, ageGate: { ...content.ageGate, title: v } })} />
            <Field label="Body" value={content.ageGate.body} onChange={(v) => onContentChange({ ...content, ageGate: { ...content.ageGate, body: v } })} multiline />
            <Field label="Confirm button" value={content.ageGate.confirmLabel} onChange={(v) => onContentChange({ ...content, ageGate: { ...content.ageGate, confirmLabel: v } })} />
            <Field label="Merch-only button" value={content.ageGate.merchOnlyLabel} onChange={(v) => onContentChange({ ...content, ageGate: { ...content.ageGate, merchOnlyLabel: v } })} />
          </>
        )}

        {section === 'shipping' && (
          <>
            <Field label="Free shipping threshold — hemp ($)" value={content.shipping.freeShippingThresholdHemp} onChange={(v) => onContentChange({ ...content, shipping: { ...content.shipping, freeShippingThresholdHemp: Number(v) || 0 } })} />
            <Field label="Free shipping threshold — merch ($)" value={content.shipping.freeShippingThresholdMerch} onChange={(v) => onContentChange({ ...content, shipping: { ...content.shipping, freeShippingThresholdMerch: Number(v) || 0 } })} hint="Also updates merch section free shipping mention." />
          </>
        )}

        {section === 'policies' && (
          <>
            {(['privacy', 'terms', 'shipping', 'returns'] as const).map((key) => (
              <div key={key} className="space-y-3 border border-zinc-800 rounded-2xl p-4">
                <h3 className="font-bold capitalize">{key} policy</h3>
                <Field
                  label="Page title"
                  value={content.policies[key].title}
                  onChange={(v) => onContentChange({ ...content, policies: { ...content.policies, [key]: { ...content.policies[key], title: v } } })}
                />
                <Field
                  label="Page body"
                  value={content.policies[key].body}
                  onChange={(v) => onContentChange({ ...content, policies: { ...content.policies, [key]: { ...content.policies[key], body: v } } })}
                  multiline
                  hint="Separate paragraphs with a blank line. Use ## Heading for section headings."
                />
              </div>
            ))}
          </>
        )}

        <button onClick={save} disabled={saving} className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Site Content'}
        </button>
        {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
      </div>
    </div>
  );
}