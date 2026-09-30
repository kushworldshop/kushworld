'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import {
  applyHomepageSectionEnabled,
  applyHomepageSectionOrder,
  HOMEPAGE_SECTION_META,
  mergeHomepageLayout,
  type HomepageSection,
} from '@/lib/homepageLayout';

export default function HomepageCustomizer({
  content,
  onContentChange,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
}) {
  const sections = mergeHomepageLayout(content.homepageLayout?.sections, content.features);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const persist = async (next: SiteContent, success: string) => {
    onContentChange(next);
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/site-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homepageLayout: next.homepageLayout,
          features: next.features,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onContentChange(data.content);
      invalidateSiteContentCache();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save homepage');
    } finally {
      setSaving(false);
    }
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void persist(applyHomepageSectionOrder(content, next), 'Homepage order saved.');
  };

  const toggleSection = (section: HomepageSection) => {
    const next = applyHomepageSectionEnabled(content, section.id, !section.enabled);
    void persist(next, section.enabled ? `${HOMEPAGE_SECTION_META[section.id].label} hidden.` : `${HOMEPAGE_SECTION_META[section.id].label} showing.`);
  };

  const visible = sections.filter((item) => item.enabled);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400">
            Same idea as Shopify&apos;s theme editor: hide, show, and drag sections. This saves as soon as you
            change it — no extra Save click.
          </p>
        </div>

        {message && (
          <p className={`text-xs ${/fail|error/i.test(message) ? 'text-red-300' : 'text-[#00ff9d]'}`}>
            {saving ? 'Saving...' : message}
          </p>
        )}

        <div className="space-y-2">
          {sections.map((section, index) => {
            const meta = HOMEPAGE_SECTION_META[section.id];
            const isDragging = draggingIndex === index;
            const isOver = overIndex === index && draggingIndex !== null && draggingIndex !== index;
            return (
              <div
                key={section.id}
                draggable={!saving}
                onDragStart={(event) => {
                  setDraggingIndex(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(index));
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const fromIndex = draggingIndex ?? Number(event.dataTransfer.getData('text/plain'));
                  if (Number.isFinite(fromIndex)) moveSection(fromIndex, index);
                  setDraggingIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDraggingIndex(null);
                  setOverIndex(null);
                }}
                className={`rounded-2xl border bg-zinc-950 px-3 py-3 transition ${
                  section.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'
                } ${isDragging ? 'opacity-40' : ''} ${
                  isOver ? 'ring-2 ring-[#00ff9d] ring-offset-2 ring-offset-zinc-950' : ''
                } ${saving ? '' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-sm select-none" aria-hidden>
                    ⋮⋮
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{meta.label}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{meta.blurb}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable={false}
                      disabled={saving || index === 0}
                      onClick={() => moveSection(index, index - 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-200 text-sm disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      draggable={false}
                      disabled={saving || index === sections.length - 1}
                      onClick={() => moveSection(index, index + 1)}
                      className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-200 text-sm disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      draggable={false}
                      disabled={saving}
                      onClick={() => toggleSection(section)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-40 ${
                        section.enabled
                          ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                          : 'bg-[#00ff9d]/15 text-[#00ff9d]'
                      }`}
                    >
                      {section.enabled ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:sticky lg:top-4 h-fit">
        <div className="rounded-[2rem] border border-zinc-800 bg-black p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Shopper view</p>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#00ff9d] hover:underline"
            >
              Open homepage
            </a>
          </div>
          <div className="space-y-1.5">
            {visible.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">Every section is hidden.</p>
            ) : (
              visible.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
                >
                  {HOMEPAGE_SECTION_META[section.id].label}
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-3">
          Hero words, merch copy, and FAQ text still live in the other Home items. This list is the
          layout.
        </p>
      </div>
    </div>
  );
}
