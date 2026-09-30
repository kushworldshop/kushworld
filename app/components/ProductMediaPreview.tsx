'use client';

import Image from 'next/image';
import { isProductMediaVideo, type ProductMediaItem } from '@/lib/productMedia';

export default function ProductMediaPreview({
  item,
  url,
  alt,
  fill = false,
  className = '',
  videoClassName = '',
  autoPlay = false,
  loop = false,
  controls = false,
  sizes,
  priority = false,
}: {
  item?: ProductMediaItem;
  url?: string;
  alt: string;
  fill?: boolean;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const src = item?.url || url || '';
  const isVideo = isProductMediaVideo(item ?? src);

  if (!src) {
    return <div className={fill ? `absolute inset-0 bg-zinc-900 ${className}` : className} />;
  }

  if (isVideo) {
    const videoClasses = [
      fill ? 'absolute inset-0 w-full h-full' : '',
      videoClassName || className || 'object-cover',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <video
        src={src}
        className={videoClasses}
        muted
        playsInline
        preload={autoPlay ? 'auto' : 'metadata'}
        autoPlay={autoPlay}
        loop={loop}
        controls={controls}
        onLoadedMetadata={(event) => {
          if (!autoPlay && event.currentTarget.currentTime === 0) {
            event.currentTarget.currentTime = 0.05;
          }
        }}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className || 'object-cover'}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className || 'w-full h-full object-cover'} />
  );
}
