'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { invalidateSiteContentCache } from '@/lib/useSiteContent';
import type { SiteContent } from '@/lib/siteContentTypes';
import {
  applyHomepageSectionEnabled,
  applyHomepageSectionOrder,
  getHomepageSectionMeta,
  isBuiltInHomepageSectionId,
  mergeHomepageLayout,
} from '@/lib/homepageLayout';
import {
  CUSTOM_BLOCK_META,
  createCustomHomepageBlock,
  isCustomHomepageSectionId,
  type CustomBlockKind,
} from '@/lib/homepageCopy';
import HomepageSectionEditor from '@/app/admin/components/HomepageSectionEditor';

export default function HomepageCustomizer({
  content,
  onContentChange,
}: {
  content: SiteContent;
  onContentChange: (content: SiteContent) => void;
}) {
  const sections = mergeHomepageLayout(
    content.homepageLayout?.sections,
    content.features,
    content.homepageBlocks.map((block) => block.id)
  );
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const persistTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, []);

  const sectionLabel = (id: string) => {
    if (isBuiltInHomepageSectionId(id)) return getHomepageSectionMeta(id).label;
    const block = content.homepageBlocks.find((item) => item.id === id);
    return block?.title || (block ? CUSTOM_BLOCK_META[block.kind].label : 'Custom block');
  };

  const persistNow = async (next: SiteContent, success: string, refreshPreview = true) => {
    onContentChange(next);
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/site-content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homepageLayout: next.homepageLayout,
          homepageCopy: next.homepageCopy,
          homepageBlocks: next.homepageBlocks,
          features: next.features,
          hero: next.hero,
          brand: next.brand,
          merchSection: next.merchSection,
          loyaltySection: next.loyaltySection,
          reviewsSection: next.reviewsSection,
          faq: next.faq,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onContentChange(data.content);
      invalidateSiteContentCache();
      if (refreshPreview) setPreviewKey((value) => value + 1);
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save homepage');
    } finally {
      setSaving(false);
    }
  };

  const persistDebounced = (next: SiteContent, success: string) => {
    onContentChange(next);
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      void persistNow(next, success);
    }, 700);
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void persistNow(applyHomepageSectionOrder(content, next), 'Homepage order saved.', false);
  };

  const toggleSection = (id: string, enabled: boolean) => {
    void persistNow(
      applyHomepageSectionEnabled(content, id, !enabled),
      enabled ? `${sectionLabel(id)} hidden.` : `${sectionLabel(id)} showing.`,
      false
    );
  };

  const addBlock = (kind: CustomBlockKind) => {
    const block = createCustomHomepageBlock(kind);
    const next: SiteContent = {
      ...content,
      homepageBlocks: [...content.homepageBlocks, block],
      homepageLayout: {
        sections: [...sections, { id: block.id, enabled: true }],
      },
    };
    setAdding(false);
    setSelectedId(block.id);
    void persistNow(next, `${CUSTOM_BLOCK_META[kind].label} added.`);
  };

  const removeBlock = (id: string) => {
    const next: SiteContent = {
      ...content,
      homepageBlocks: content.homepageBlocks.filter((block) => block.id !== id),
      homepageLayout: {
        sections: sections.filter((section) => section.id !== id),
      },
    };
    if (selectedId === id) setSelectedId(next.homepageLayout.sections[0]?.id ?? null);
    void persistNow(next, 'Custom block removed.');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Click a section to edit its words and images. Drag to reorder. Add your own text, photo, or video
        blocks. Changes save as you go.
      </p>
      {message && (
        <p className={`text-xs ${/fail|error/i.test(message) ? 'text-red-300' : 'text-[#00ff9d]'}`}>
          {saving ? 'Saving...' : message}
        </p>
      )}

      <div className="grid xl:grid-cols-[280px_minmax(0,1fr)_minmax(280px,340px)] gap-4 items-start">
        <div className="space-y-2">
          {sections.map((section, index) => {
            const selected = selectedId === section.id;
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
                className={`rounded-2xl border bg-zinc-950 px-2 py-2 transition ${
                  selected ? 'border-[#00ff9d]' : section.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'
                } ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-[#00ff9d]' : ''}`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-zinc-600 text-sm select-none px-1 cursor-grab" aria-hidden>
                    ⋮⋮
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(section.id)}
                    className="min-w-0 flex-1 text-left py-1"
                  >
                    <p className="text-sm font-medium truncate">{sectionLabel(section.id)}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {isCustomHomepageSectionId(section.id)
                        ? 'Custom'
                        : getHomepageSectionMeta(section.id).blurb}
                    </p>
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    disabled={saving}
                    onClick={() => toggleSection(section.id, section.enabled)}
                    className={`text-[11px] px-2 py-1 rounded-lg ${
                      section.enabled ? 'bg-zinc-800 text-zinc-200' : 'bg-[#00ff9d]/15 text-[#00ff9d]'
                    }`}
                  >
                    {section.enabled ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-dashed border-zinc-700 text-zinc-300 hover:border-[#00ff9d]"
            >
              + Add block
            </button>
            {adding && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(CUSTOM_BLOCK_META) as CustomBlockKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addBlock(kind)}
                    className="text-left rounded-xl border border-zinc-800 bg-zinc-900 p-3 hover:border-[#00ff9d]/40"
                  >
                    <p className="text-xs font-medium">{CUSTOM_BLOCK_META[kind].label}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{CUSTOM_BLOCK_META[kind].blurb}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden xl:block rounded-[1.5rem] border border-zinc-800 overflow-hidden bg-black min-h-[640px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Live homepage</p>
            <a href="/" target="_blank" rel="noreferrer" className="text-[11px] text-[#00ff9d]">
              Open in tab
            </a>
          </div>
          <iframe
            key={previewKey}
            title="Homepage preview"
            src={`/?preview=${previewKey}`}
            className="w-full h-[720px] bg-black"
          />
        </div>

        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
          {selectedId ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Editing</p>
                  <h3 className="text-lg font-bold">{sectionLabel(selectedId)}</h3>
                </div>
                {isCustomHomepageSectionId(selectedId) && (
                  <button
                    type="button"
                    onClick={() => removeBlock(selectedId)}
                    className="text-[11px] text-red-300 px-2 py-1 rounded-lg bg-red-950/40"
                  >
                    Delete
                  </button>
                )}
              </div>
              <HomepageSectionEditor
                content={content}
                sectionId={selectedId}
                onChange={(next) => persistDebounced(next, 'Homepage saved.')}
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Click a section to edit it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
