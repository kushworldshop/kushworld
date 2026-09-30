'use client';

import { useState } from 'react';
import ProductMediaPreview from '@/app/components/ProductMediaPreview';
import { getProductCoverUrl, isProductMediaVideo, type ProductMediaItem } from '@/lib/productMedia';

function Preview({ item, alt }: { item: ProductMediaItem; alt: string }) {
  const isLocal = item.url.startsWith('blob:') || item.url.startsWith('data:');
  if (isProductMediaVideo(item)) {
    return (
      <video
        src={item.url}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          if (event.currentTarget.currentTime === 0) {
            event.currentTarget.currentTime = 0.05;
          }
        }}
      />
    );
  }
  if (isLocal) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={alt} className="w-full h-full object-cover" />;
  }
  return (
    <ProductMediaPreview
      item={item}
      alt={alt}
      fill
      className="object-cover"
      videoClassName="w-full h-full object-cover"
    />
  );
}

export default function ProductMediaSorter({
  media,
  onReorder,
  onRemove,
  onSetCover,
  disabled = false,
  emptyLabel = 'No photos or videos yet',
}: {
  media: ProductMediaItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onSetCover?: (index: number) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const coverUrl = getProductCoverUrl({ image: '', media });
  const canSort = !disabled && media.length > 1;

  if (media.length === 0) {
    return <p className="text-xs text-zinc-500 mb-3">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
      {media.map((item, index) => {
        const isCover = item.url === coverUrl;
        const isDragging = draggingIndex === index;
        const isOver = overIndex === index && draggingIndex !== null && draggingIndex !== index;
        return (
          <div
            key={`${item.url}-${index}`}
            draggable={canSort}
            onDragStart={(event) => {
              if (!canSort) return;
              setDraggingIndex(index);
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(index));
            }}
            onDragOver={(event) => {
              if (draggingIndex === null || disabled) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const fromIndex = draggingIndex ?? Number(event.dataTransfer.getData('text/plain'));
              if (Number.isFinite(fromIndex)) onReorder(fromIndex, index);
              setDraggingIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDraggingIndex(null);
              setOverIndex(null);
            }}
            className={`rounded-lg overflow-hidden border bg-zinc-950 transition-all ${
              isCover ? 'border-[#00ff9d]' : 'border-zinc-700'
            } ${isDragging ? 'opacity-40 scale-95' : ''} ${
              isOver ? 'ring-2 ring-[#00ff9d] ring-offset-2 ring-offset-zinc-950' : ''
            } ${canSort ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="flex items-center justify-between gap-1 px-1.5 py-1 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {index + 1}
                </span>
                {isCover && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00ff9d] text-black">
                    Shop
                  </span>
                )}
              </div>
              {canSort && (
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    draggable={false}
                    disabled={disabled || index === 0}
                    onClick={() => onReorder(index, index - 1)}
                    className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 text-sm disabled:opacity-30"
                    aria-label="Move left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    disabled={disabled || index === media.length - 1}
                    onClick={() => onReorder(index, index + 1)}
                    className="w-6 h-6 rounded bg-zinc-800 text-zinc-200 text-sm disabled:opacity-30"
                    aria-label="Move right"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <div className="relative aspect-square bg-black pointer-events-none">
              <Preview item={item} alt={`Media ${index + 1}`} />
            </div>
            <div className="flex gap-1 p-1.5">
              {onSetCover && !isCover && (
                <button
                  type="button"
                  draggable={false}
                  disabled={disabled}
                  onClick={() => onSetCover(index)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 disabled:opacity-40"
                >
                  Shop card
                </button>
              )}
              <button
                type="button"
                draggable={false}
                disabled={disabled}
                onClick={() => onRemove(index)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 ml-auto disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
