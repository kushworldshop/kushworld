'use client';

import React, { useState, useRef, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, threshold = 80, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);

    if (distance > 0) {
      // Only pull if at top
      e.preventDefault();
      const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(dampedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || disabled) return;

    isPulling.current = false;

    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold / 2); // keep indicator while refreshing

      try {
        await onRefresh();
      } finally {
        setPullDistance(0);
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  };

  const refreshProgress = Math.min((pullDistance / threshold) * 100, 100);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center h-12 bg-black/80 z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullDistance - 12, 40)}px)` }}
        >
          <div className="flex items-center gap-2 text-[#00ff9d] text-sm">
            {isRefreshing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Refreshing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-down" style={{ transform: `rotate(${refreshProgress * 1.8}deg)` }} />
                {pullDistance > threshold ? 'Release to refresh' : 'Pull to refresh'}
              </>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          transform: showIndicator && !isRefreshing ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling.current ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
