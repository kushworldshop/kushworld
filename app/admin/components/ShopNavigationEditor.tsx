'use client';

import type { ShopCategory, ShopNavigation, ShopSubsection } from '@/lib/shopNavigation';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function emptyCategory(): ShopCategory {
  return {
    id: '',
    label: '',
    description: '',
    productCategories: [],
    subsections: [],
    enabled: true,
  };
}

export default function ShopNavigationEditor({
  value,
  onChange,
}: {
  value: ShopNavigation;
  onChange: (next: ShopNavigation) => void;
}) {
  const updateCategory = (index: number, patch: Partial<ShopCategory>) => {
    const categories = [...value.categories];
    categories[index] = { ...categories[index], ...patch };
    onChange({ ...value, categories });
  };

  const updateSubsection = (categoryIndex: number, subsectionIndex: number, patch: Partial<ShopSubsection>) => {
    const categories = [...value.categories];
    const subsections = [...categories[categoryIndex].subsections];
    subsections[subsectionIndex] = { ...subsections[subsectionIndex], ...patch };
    categories[categoryIndex] = { ...categories[categoryIndex], subsections };
    onChange({ ...value, categories });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-2">Main shop page title</label>
          <input
            value={value.shopTitle}
            onChange={(e) => onChange({ ...value, shopTitle: e.target.value })}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-2">Merch shop page title</label>
          <input
            value={value.merchTitle}
            onChange={(e) => onChange({ ...value, merchTitle: e.target.value })}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 block mb-2">Main shop page subtitle</label>
          <textarea
            value={value.shopSubtitle}
            onChange={(e) => onChange({ ...value, shopSubtitle: e.target.value })}
            rows={2}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-zinc-400 block mb-2">Merch shop page subtitle</label>
          <textarea
            value={value.merchSubtitle}
            onChange={(e) => onChange({ ...value, merchSubtitle: e.target.value })}
            rows={2}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Shop categories</h3>
          <p className="text-xs text-zinc-500">
            These appear under Shop in the navbar and footer. Merch stays separate. Product category slug maps
            products into each section.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...value, categories: [...value.categories, emptyCategory()] })}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium"
        >
          + Add category
        </button>
      </div>

      {value.categories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={category.enabled}
                onChange={(e) => updateCategory(categoryIndex, { enabled: e.target.checked })}
                className="accent-[#00ff9d]"
              />
              Enabled in navigation
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  categories: value.categories.filter((_, i) => i !== categoryIndex),
                })
              }
              className="text-red-400 text-sm"
            >
              Remove category
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Nav label</label>
              <input
                value={category.label}
                onChange={(e) => {
                  const label = e.target.value;
                  updateCategory(categoryIndex, {
                    label,
                    id: category.id || slugify(label),
                  });
                }}
                placeholder="Vaporizers"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">URL slug</label>
              <input
                value={category.id}
                onChange={(e) => updateCategory(categoryIndex, { id: slugify(e.target.value) })}
                placeholder="vaporizers"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-500 block mb-1">Category page description</label>
              <textarea
                value={category.description}
                onChange={(e) => updateCategory(categoryIndex, { description: e.target.value })}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-500 block mb-1">Product category slugs (comma separated)</label>
              <input
                value={category.productCategories.join(', ')}
                onChange={(e) =>
                  updateCategory(categoryIndex, {
                    productCategories: e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="vapes, vaporizers"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sub-sections</p>
              <button
                type="button"
                onClick={() =>
                  updateCategory(categoryIndex, {
                    subsections: [...category.subsections, { id: '', label: '' }],
                  })
                }
                className="text-sm text-[#00ff9d]"
              >
                + Add sub-section
              </button>
            </div>
            {category.subsections.map((subsection, subsectionIndex) => (
              <div key={subsectionIndex} className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
                <input
                  value={subsection.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    updateSubsection(categoryIndex, subsectionIndex, {
                      label,
                      id: subsection.id || slugify(label),
                    });
                  }}
                  placeholder="Sub-section label"
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
                />
                <input
                  value={subsection.id}
                  onChange={(e) =>
                    updateSubsection(categoryIndex, subsectionIndex, { id: slugify(e.target.value) })
                  }
                  placeholder="slug"
                  className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCategory(categoryIndex, {
                      subsections: category.subsections.filter((_, i) => i !== subsectionIndex),
                    })
                  }
                  className="text-red-400 px-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}