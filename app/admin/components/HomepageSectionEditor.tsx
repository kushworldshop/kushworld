'use client';

import type { FeaturePatch, SiteFeatures } from '@/lib/featureTypes';
import type { CustomHomepageBlock, HomepageCopy } from '@/lib/homepageCopy';
import { CUSTOM_BLOCK_META, isCustomHomepageSectionId } from '@/lib/homepageCopy';
import { isBuiltInHomepageSectionId } from '@/lib/homepageLayout';
import type { HeroVariant, SiteContent } from '@/lib/siteContentTypes';
import AdminMediaField from '@/app/admin/components/AdminMediaField';

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
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
        />
      )}
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

function patchFeatures(content: SiteContent, patch: FeaturePatch): SiteContent {
  const features = { ...content.features } as SiteFeatures;
  (Object.keys(patch) as (keyof SiteFeatures)[]).forEach((key) => {
    const value = patch[key];
    if (value !== undefined) {
      (features as unknown as Record<string, unknown>)[key as string] = { ...content.features[key], ...value };
    }
  });
  return { ...content, features };
}

function patchCopy<K extends keyof HomepageCopy>(
  content: SiteContent,
  key: K,
  patch: Partial<HomepageCopy[K]>
): SiteContent {
  return {
    ...content,
    homepageCopy: {
      ...content.homepageCopy,
      [key]: { ...content.homepageCopy[key], ...patch },
    },
  };
}

function patchHero(content: SiteContent, which: 'fullAccess' | 'merchOnly', patch: Partial<HeroVariant>): SiteContent {
  return {
    ...content,
    hero: {
      ...content.hero,
      [which]: { ...content.hero[which], ...patch },
    },
  };
}

function patchBlock(content: SiteContent, id: string, patch: Partial<CustomHomepageBlock>): SiteContent {
  return {
    ...content,
    homepageBlocks: content.homepageBlocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
  };
}

function HeroFields({
  title,
  variant,
  onChange,
}: {
  title: string;
  variant: HeroVariant;
  onChange: (patch: Partial<HeroVariant>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{title}</p>
      <Field label="Eyebrow" value={variant.eyebrow} onChange={(value) => onChange({ eyebrow: value })} />
      <Field
        label="Headline"
        value={variant.headline}
        onChange={(value) => onChange({ headline: value })}
        multiline
        hint="New line = line break on the site."
      />
      <Field label="Subtitle" value={variant.subtitle} onChange={(value) => onChange({ subtitle: value })} multiline />
      <Field
        label="Primary button"
        value={variant.primaryCtaLabel}
        onChange={(value) => onChange({ primaryCtaLabel: value })}
      />
      <Field
        label="Primary button link"
        value={variant.primaryCtaHref || ''}
        onChange={(value) => onChange({ primaryCtaHref: value })}
        hint="e.g. /shop/flower"
      />
      <Field
        label="Second button"
        value={variant.secondaryCtaLabel || ''}
        onChange={(value) => onChange({ secondaryCtaLabel: value })}
      />
      <Field
        label="Second button link"
        value={variant.secondaryCtaHref || ''}
        onChange={(value) => onChange({ secondaryCtaHref: value })}
      />
      <Field
        label="Badges"
        value={variant.badges.join('\n')}
        onChange={(value) =>
          onChange({
            badges: value
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean),
          })
        }
        multiline
        hint="One per line."
      />
    </div>
  );
}

export default function HomepageSectionEditor({
  content,
  sectionId,
  onChange,
}: {
  content: SiteContent;
  sectionId: string;
  onChange: (next: SiteContent) => void;
}) {
  const features = content.features;
  const drop = features.dropHero;
  const block = content.homepageBlocks.find((item) => item.id === sectionId);

  if (isCustomHomepageSectionId(sectionId) && block) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">{CUSTOM_BLOCK_META[block.kind].blurb}</p>
        <Field label="Eyebrow" value={block.eyebrow} onChange={(value) => onChange(patchBlock(content, sectionId, { eyebrow: value }))} />
        <Field label="Title" value={block.title} onChange={(value) => onChange(patchBlock(content, sectionId, { title: value }))} />
        <Field
          label="Body"
          value={block.body}
          onChange={(value) => onChange(patchBlock(content, sectionId, { body: value }))}
          multiline
        />
        {(block.kind === 'image' || block.kind === 'imageText') && (
          <>
            <AdminMediaField
              label="Image"
              value={block.imageUrl}
              onChange={(imageUrl) => onChange(patchBlock(content, sectionId, { imageUrl }))}
            />
            {block.kind === 'imageText' && (
              <div>
                <p className="text-sm text-zinc-400 mb-2">Image position</p>
                <div className="flex flex-wrap gap-2">
                  {(['left', 'right', 'top', 'background'] as const).map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => onChange(patchBlock(content, sectionId, { imagePosition: position }))}
                      className={`text-xs px-3 py-1.5 rounded-lg ${
                        block.imagePosition === position ? 'bg-[#00ff9d] text-black' : 'bg-zinc-800'
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {block.kind === 'video' && (
          <AdminMediaField
            label="Video"
            kind="video"
            value={block.videoUrl}
            onChange={(videoUrl) => onChange(patchBlock(content, sectionId, { videoUrl }))}
            hint="MP4 or WEBM under 50MB, or paste a URL."
          />
        )}
        {block.kind === 'image' && (
          <div>
            <p className="text-sm text-zinc-400 mb-2">Layout</p>
            <div className="flex flex-wrap gap-2">
              {(['background', 'top'] as const).map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => onChange(patchBlock(content, sectionId, { imagePosition: position }))}
                  className={`text-xs px-3 py-1.5 rounded-lg ${
                    block.imagePosition === position ? 'bg-[#00ff9d] text-black' : 'bg-zinc-800'
                  }`}
                >
                  {position === 'background' ? 'Words on image' : 'Image below words'}
                </button>
              ))}
            </div>
          </div>
        )}
        <Field
          label="Button label"
          value={block.ctaLabel}
          onChange={(value) => onChange(patchBlock(content, sectionId, { ctaLabel: value }))}
        />
        <Field
          label="Button link"
          value={block.ctaHref}
          onChange={(value) => onChange(patchBlock(content, sectionId, { ctaHref: value }))}
        />
      </div>
    );
  }

  if (!isBuiltInHomepageSectionId(sectionId)) {
    return <p className="text-sm text-zinc-500">This block is missing. Hide it or add a new one.</p>;
  }

  if (sectionId === 'hero') {
    return (
      <div className="space-y-8">
        <AdminMediaField
          label="Hero background"
          value={content.brand.heroBackgroundUrl}
          onChange={(heroBackgroundUrl) =>
            onChange({ ...content, brand: { ...content.brand, heroBackgroundUrl } })
          }
        />
        <AdminMediaField
          label="Logo"
          value={content.brand.logoUrl}
          onChange={(logoUrl) => onChange({ ...content, brand: { ...content.brand, logoUrl } })}
        />
        <HeroFields
          title="21+ shoppers"
          variant={content.hero.fullAccess}
          onChange={(patch) => onChange(patchHero(content, 'fullAccess', patch))}
        />
        <HeroFields
          title="Merch-only shoppers"
          variant={content.hero.merchOnly}
          onChange={(patch) => onChange(patchHero(content, 'merchOnly', patch))}
        />
      </div>
    );
  }

  if (sectionId === 'board') {
    const copy = content.homepageCopy.board;
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Product cards come from the live menu. This is the heading around them.</p>
        <Field label="Eyebrow" value={copy.eyebrow} onChange={(value) => onChange(patchCopy(content, 'board', { eyebrow: value }))} />
        <Field label="Title" value={copy.title} onChange={(value) => onChange(patchCopy(content, 'board', { title: value }))} />
        <Field label="Subtitle" value={copy.subtitle} onChange={(value) => onChange(patchCopy(content, 'board', { subtitle: value }))} multiline />
        <Field label="Button" value={copy.ctaLabel} onChange={(value) => onChange(patchCopy(content, 'board', { ctaLabel: value }))} />
        <Field label="Button link" value={copy.ctaHref} onChange={(value) => onChange(patchCopy(content, 'board', { ctaHref: value }))} />
      </div>
    );
  }

  if (sectionId === 'drop') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Start, stop, and the countdown live under Home → Drop clock.</p>
        <Field label="Eyebrow" value={drop.eyebrow} onChange={(value) => onChange(patchFeatures(content, { dropHero: { eyebrow: value } }))} />
        <Field label="Headline" value={drop.headline} onChange={(value) => onChange(patchFeatures(content, { dropHero: { headline: value } }))} />
        <Field
          label="Product slug"
          value={drop.productSlug}
          onChange={(value) => onChange(patchFeatures(content, { dropHero: { productSlug: value } }))}
          hint="Matches the product URL, e.g. custom-dosi-banana"
        />
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={drop.discordEarlyAccess}
            onChange={(event) =>
              onChange(patchFeatures(content, { dropHero: { discordEarlyAccess: event.target.checked } }))
            }
            className="accent-[#00ff9d]"
          />
          <span className="text-sm">Discord early access note</span>
        </label>
      </div>
    );
  }

  if (sectionId === 'categories') {
    const copy = content.homepageCopy.categories;
    return (
      <div className="space-y-4">
        <Field label="Title" value={copy.title} onChange={(value) => onChange(patchCopy(content, 'categories', { title: value }))} />
        <Field
          label="Merch-only title"
          value={copy.merchOnlyTitle}
          onChange={(value) => onChange(patchCopy(content, 'categories', { merchOnlyTitle: value }))}
        />
        {copy.items.map((item, index) => (
          <div key={`${item.href}-${index}`} className="rounded-2xl border border-zinc-800 p-3 space-y-3">
            <div className="flex justify-between">
              <p className="text-xs text-zinc-500">Shortcut {index + 1}</p>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    patchCopy(content, 'categories', {
                      items: copy.items.filter((_, itemIndex) => itemIndex !== index),
                    })
                  )
                }
                className="text-[11px] text-zinc-500"
              >
                Remove
              </button>
            </div>
            <Field
              label="Label"
              value={item.label}
              onChange={(value) => {
                const items = copy.items.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, label: value } : entry
                );
                onChange(patchCopy(content, 'categories', { items }));
              }}
            />
            <Field
              label="Icon class"
              value={item.icon}
              onChange={(value) => {
                const items = copy.items.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, icon: value } : entry
                );
                onChange(patchCopy(content, 'categories', { items }));
              }}
              hint="Font Awesome, e.g. fa-leaf"
            />
            <Field
              label="Link"
              value={item.href}
              onChange={(value) => {
                const items = copy.items.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, href: value } : entry
                );
                onChange(patchCopy(content, 'categories', { items }));
              }}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange(
              patchCopy(content, 'categories', {
                items: [...copy.items, { label: 'New', icon: 'fa-leaf', href: '/shop' }],
              })
            )
          }
          className="text-xs px-3 py-2 rounded-lg bg-zinc-800"
        >
          Add shortcut
        </button>
      </div>
    );
  }

  if (sectionId === 'vibes') {
    const copy = content.homepageCopy.vibes;
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Mood chips still come from the shop. This is the heading.</p>
        <Field label="Eyebrow" value={copy.eyebrow} onChange={(value) => onChange(patchCopy(content, 'vibes', { eyebrow: value }))} />
        <Field label="Title" value={copy.title} onChange={(value) => onChange(patchCopy(content, 'vibes', { title: value }))} />
      </div>
    );
  }

  if (sectionId === 'touchdowns') {
    const copy = content.homepageCopy.touchdowns;
    return (
      <div className="space-y-4">
        <Field label="Eyebrow" value={copy.eyebrow} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { eyebrow: value }))} />
        <Field label="Title" value={copy.title} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { title: value }))} />
        <Field label="Subtitle" value={copy.subtitle} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { subtitle: value }))} multiline />
        <Field label="Button" value={copy.ctaLabel} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { ctaLabel: value }))} />
        <Field label="Button link" value={copy.ctaHref} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { ctaHref: value }))} />
        <Field label="Empty title" value={copy.emptyTitle} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { emptyTitle: value }))} />
        <Field label="Empty body" value={copy.emptyBody} onChange={(value) => onChange(patchCopy(content, 'touchdowns', { emptyBody: value }))} multiline />
        <Field
          label="Empty button"
          value={copy.emptyCtaLabel}
          onChange={(value) => onChange(patchCopy(content, 'touchdowns', { emptyCtaLabel: value }))}
        />
      </div>
    );
  }

  if (sectionId === 'brands') {
    const copy = content.homepageCopy.brands;
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Brand chips still come from products in the catalog.</p>
        <Field label="Eyebrow" value={copy.eyebrow} onChange={(value) => onChange(patchCopy(content, 'brands', { eyebrow: value }))} />
        <Field label="Title" value={copy.title} onChange={(value) => onChange(patchCopy(content, 'brands', { title: value }))} />
      </div>
    );
  }

  if (sectionId === 'bestSellers' || sectionId === 'newArrivals' || sectionId === 'onSale') {
    const key = sectionId;
    const section = features[key];
    return (
      <div className="space-y-4">
        <Field label="Title" value={section.title} onChange={(value) => onChange(patchFeatures(content, { [key]: { title: value } }))} />
        <Field
          label="Subtitle"
          value={section.subtitle}
          onChange={(value) => onChange(patchFeatures(content, { [key]: { subtitle: value } }))}
          multiline
        />
        <Field
          label="Max products"
          value={section.limit}
          onChange={(value) => onChange(patchFeatures(content, { [key]: { limit: Number(value) || 8 } }))}
        />
        {key === 'bestSellers' && (
          <Field
            label="Pinned product IDs"
            value={features.bestSellers.pinnedProductIds.join(', ')}
            onChange={(value) =>
              onChange(
                patchFeatures(content, {
                  bestSellers: {
                    pinnedProductIds: value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              )
            }
            hint="Optional. These show first, in order."
          />
        )}
      </div>
    );
  }

  if (sectionId === 'howItWorks') {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={features.howItWorks.title}
          onChange={(value) => onChange(patchFeatures(content, { howItWorks: { title: value } }))}
        />
        {features.howItWorks.steps.map((step, index) => (
          <div key={index} className="rounded-2xl border border-zinc-800 p-3 space-y-3">
            <div className="flex justify-between">
              <p className="text-xs text-[#00ff9d]">Step {index + 1}</p>
              <button
                type="button"
                onClick={() => {
                  const steps = features.howItWorks.steps.filter((_, stepIndex) => stepIndex !== index);
                  onChange(patchFeatures(content, { howItWorks: { steps } }));
                }}
                className="text-[11px] text-zinc-500"
              >
                Remove
              </button>
            </div>
            <Field
              label="Icon"
              value={step.icon}
              onChange={(value) => {
                const steps = features.howItWorks.steps.map((entry, stepIndex) =>
                  stepIndex === index ? { ...entry, icon: value } : entry
                );
                onChange(patchFeatures(content, { howItWorks: { steps } }));
              }}
            />
            <Field
              label="Title"
              value={step.title}
              onChange={(value) => {
                const steps = features.howItWorks.steps.map((entry, stepIndex) =>
                  stepIndex === index ? { ...entry, title: value } : entry
                );
                onChange(patchFeatures(content, { howItWorks: { steps } }));
              }}
            />
            <Field
              label="Body"
              value={step.body}
              onChange={(value) => {
                const steps = features.howItWorks.steps.map((entry, stepIndex) =>
                  stepIndex === index ? { ...entry, body: value } : entry
                );
                onChange(patchFeatures(content, { howItWorks: { steps } }));
              }}
              multiline
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange(
              patchFeatures(content, {
                howItWorks: {
                  steps: [...features.howItWorks.steps, { icon: '✨', title: 'New step', body: '' }],
                },
              })
            )
          }
          className="text-xs px-3 py-2 rounded-lg bg-zinc-800"
        >
          Add step
        </button>
      </div>
    );
  }

  if (sectionId === 'merch') {
    return (
      <div className="space-y-4">
        <Field
          label="Eyebrow"
          value={content.merchSection.eyebrow}
          onChange={(value) => onChange({ ...content, merchSection: { ...content.merchSection, eyebrow: value } })}
        />
        <Field
          label="Title"
          value={content.merchSection.title}
          onChange={(value) => onChange({ ...content, merchSection: { ...content.merchSection, title: value } })}
        />
        <Field
          label="Subtitle"
          value={content.merchSection.subtitle}
          onChange={(value) =>
            onChange({ ...content, merchSection: { ...content.merchSection, subtitle: value } })
          }
          multiline
        />
        <Field
          label="Button"
          value={content.merchSection.ctaLabel}
          onChange={(value) => onChange({ ...content, merchSection: { ...content.merchSection, ctaLabel: value } })}
        />
        <Field
          label="Button link"
          value={content.merchSection.ctaHref || ''}
          onChange={(value) => onChange({ ...content, merchSection: { ...content.merchSection, ctaHref: value } })}
        />
        <Field
          label="Studio link label"
          value={content.merchSection.studioLinkLabel}
          onChange={(value) =>
            onChange({ ...content, merchSection: { ...content.merchSection, studioLinkLabel: value } })
          }
        />
      </div>
    );
  }

  if (sectionId === 'reviews') {
    return (
      <div className="space-y-4">
        <Field
          label="Eyebrow"
          value={content.reviewsSection.eyebrow}
          onChange={(value) =>
            onChange({ ...content, reviewsSection: { ...content.reviewsSection, eyebrow: value } })
          }
        />
        <Field
          label="Title"
          value={content.reviewsSection.title}
          onChange={(value) => onChange({ ...content, reviewsSection: { ...content.reviewsSection, title: value } })}
        />
        <Field
          label="Button"
          value={content.reviewsSection.ctaLabel}
          onChange={(value) =>
            onChange({ ...content, reviewsSection: { ...content.reviewsSection, ctaLabel: value } })
          }
        />
        <Field
          label="Button link"
          value={content.reviewsSection.ctaHref || ''}
          onChange={(value) =>
            onChange({ ...content, reviewsSection: { ...content.reviewsSection, ctaHref: value } })
          }
        />
        <Field
          label="Social button"
          value={content.reviewsSection.socialCtaLabel}
          onChange={(value) =>
            onChange({ ...content, reviewsSection: { ...content.reviewsSection, socialCtaLabel: value } })
          }
        />
      </div>
    );
  }

  if (sectionId === 'community') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Buttons come from Contact & social. This is the heading.</p>
        <Field
          label="Title"
          value={features.communityBlock.title}
          onChange={(value) => onChange(patchFeatures(content, { communityBlock: { title: value } }))}
        />
        <Field
          label="Body"
          value={features.communityBlock.body}
          onChange={(value) => onChange(patchFeatures(content, { communityBlock: { body: value } }))}
          multiline
        />
      </div>
    );
  }

  if (sectionId === 'loyalty') {
    return (
      <div className="space-y-4">
        <Field
          label="Title"
          value={content.loyaltySection.title}
          onChange={(value) => onChange({ ...content, loyaltySection: { ...content.loyaltySection, title: value } })}
        />
        <Field
          label="Subtitle"
          value={content.loyaltySection.subtitle}
          onChange={(value) =>
            onChange({ ...content, loyaltySection: { ...content.loyaltySection, subtitle: value } })
          }
          multiline
        />
        <Field
          label="Button"
          value={content.loyaltySection.ctaLabel}
          onChange={(value) =>
            onChange({ ...content, loyaltySection: { ...content.loyaltySection, ctaLabel: value } })
          }
        />
        <Field
          label="Button link"
          value={content.loyaltySection.ctaHref || ''}
          onChange={(value) =>
            onChange({ ...content, loyaltySection: { ...content.loyaltySection, ctaHref: value } })
          }
        />
        {content.loyaltySection.cards.map((card, index) => (
          <div key={index} className="rounded-2xl border border-zinc-800 p-3 space-y-3">
            <div className="flex justify-between">
              <p className="text-xs text-zinc-500">Card {index + 1}</p>
              <button
                type="button"
                onClick={() => {
                  const cards = content.loyaltySection.cards.filter((_, cardIndex) => cardIndex !== index);
                  onChange({ ...content, loyaltySection: { ...content.loyaltySection, cards } });
                }}
                className="text-[11px] text-zinc-500"
              >
                Remove
              </button>
            </div>
            <Field
              label="Icon"
              value={card.icon}
              onChange={(value) => {
                const cards = content.loyaltySection.cards.map((entry, cardIndex) =>
                  cardIndex === index ? { ...entry, icon: value } : entry
                );
                onChange({ ...content, loyaltySection: { ...content.loyaltySection, cards } });
              }}
            />
            <Field
              label="Title"
              value={card.title}
              onChange={(value) => {
                const cards = content.loyaltySection.cards.map((entry, cardIndex) =>
                  cardIndex === index ? { ...entry, title: value } : entry
                );
                onChange({ ...content, loyaltySection: { ...content.loyaltySection, cards } });
              }}
            />
            <Field
              label="Body"
              value={card.body}
              onChange={(value) => {
                const cards = content.loyaltySection.cards.map((entry, cardIndex) =>
                  cardIndex === index ? { ...entry, body: value } : entry
                );
                onChange({ ...content, loyaltySection: { ...content.loyaltySection, cards } });
              }}
              multiline
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...content,
              loyaltySection: {
                ...content.loyaltySection,
                cards: [...content.loyaltySection.cards, { icon: '✨', title: 'New perk', body: '' }],
              },
            })
          }
          className="text-xs px-3 py-2 rounded-lg bg-zinc-800"
        >
          Add card
        </button>
      </div>
    );
  }

  if (sectionId === 'faq') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">Hiding this only removes it from the homepage. The /faq page stays.</p>
        <Field
          label="Title"
          value={content.faq.title}
          onChange={(value) => onChange({ ...content, faq: { ...content.faq, title: value } })}
        />
        <Field
          label="Subtitle"
          value={content.faq.subtitle}
          onChange={(value) => onChange({ ...content, faq: { ...content.faq, subtitle: value } })}
          multiline
        />
        {content.faq.items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-zinc-800 p-3 space-y-3">
            <div className="flex justify-between">
              <p className="text-xs text-zinc-500">Question {index + 1}</p>
              <button
                type="button"
                onClick={() => {
                  const items = content.faq.items.filter((_, itemIndex) => itemIndex !== index);
                  onChange({ ...content, faq: { ...content.faq, items } });
                }}
                className="text-[11px] text-zinc-500"
              >
                Remove
              </button>
            </div>
            <Field
              label="Question"
              value={item.question}
              onChange={(value) => {
                const items = content.faq.items.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, question: value } : entry
                );
                onChange({ ...content, faq: { ...content.faq, items } });
              }}
            />
            <Field
              label="Answer"
              value={item.answer}
              onChange={(value) => {
                const items = content.faq.items.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, answer: value } : entry
                );
                onChange({ ...content, faq: { ...content.faq, items } });
              }}
              multiline
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...content,
              faq: {
                ...content.faq,
                items: [...content.faq.items, { question: 'New question', answer: '' }],
              },
            })
          }
          className="text-xs px-3 py-2 rounded-lg bg-zinc-800"
        >
          Add question
        </button>
      </div>
    );
  }

  return <p className="text-sm text-zinc-500">Nothing extra to edit on this block yet.</p>;
}
