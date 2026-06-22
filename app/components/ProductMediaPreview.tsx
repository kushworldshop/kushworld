'use client';

import Image from 'next/image';
import type { ProductMediaItem } from '@/lib/productMedia';

export default function ProductMediaPreview({
  item,
  alt,
  fill = false,
  className = '',
  videoClassName = '',
}: {
  item: ProductMediaItem;
  alt: string;
  fill?: boolean;
  className?: string;
  videoClassName?: string;
}) {
  if (item.type === 'video') {
    return (
      <video
        src={item.url}
        className={videoClassName || className || 'w-full h-full object-cover'}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  if (fill) {
    return <Image src={item.url} alt={alt} fill className={className || 'object-cover'} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt={alt} className={className || 'w-full h-full object-cover'} />
  );
}