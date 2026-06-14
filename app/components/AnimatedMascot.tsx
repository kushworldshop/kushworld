'use client';

import React from 'react';

/**
 * Animated version of the Kush World mascot logo guy actually smoking his joint.
 * Uses a short looping video (generated from the static logo.png) for smooth animation:
 * - Joint to mouth puff motion
 * - Smoke puffs rising
 * - Glowing ember
 * - Subtle character movements
 * Seamless loop, muted, autoplay.
 * 
 * Drop-in replacement for static <Image src="/logo.png" ... />
 * Optimized for small sizes in nav/footer; larger for hero/feature.
 */
export default function AnimatedMascot({
  className = '',
  width = 48,
  height = 48,
  alt = 'Kush World mascot smoking',
}: {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}) {
  return (
    <video
      src="/mascot-smoking-loop.mp4"
      className={className}
      width={width}
      height={height}
      autoPlay
      loop
      muted
      playsInline
      aria-label={alt}
      style={{
        objectFit: 'contain',
        // Prevent layout shift
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
}
