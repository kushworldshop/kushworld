'use client';

import React, { useState, useEffect } from 'react';
import {
  KUSH_TRACKER_STEPS,
  getTrackerProgress,
  getStepStatus,
  getFreeEighthCallout,
  getEstimatedDelivery,
  getSuggestedNextStatus,
  getSuggestedNextLabel,
} from '@/lib/orderTracker';
import { getTrackingUrl, normalizeTrackingCarrier } from '@/lib/orderShipping';

interface OrderForTracker {
  id: string;
  status?: string;
  createdAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  items?: Array<{ name: string; quantity: number }>;
  freeEighthBonus?: boolean;
  freeEighthNote?: string;
  total?: number;
}

interface OrderTrackerProps {
  order: OrderForTracker;
  showHeader?: boolean;
  compact?: boolean;
  /** If provided, enables live "Refresh" that calls the public /api/orders/track */
  refreshWith?: { orderId: string; token?: string };
  onRefresh?: () => void;
}

export default function OrderTracker({ order: initialOrder, showHeader = true, compact = false, refreshWith, onRefresh }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderForTracker>(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [livePolling, setLivePolling] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number; x: number; emoji: string}>>([]);

  const progress = getTrackerProgress(order);
  const { current, currentIndex, progressPercent, etaText, isComplete } = progress;
  const trackingUrl = order.trackingNumber
    ? getTrackingUrl(order.trackingNumber, normalizeTrackingCarrier(order.trackingCarrier))
    : null;
  const freeEighthText = getFreeEighthCallout(order);
  const estimated = getEstimatedDelivery(order);

  const itemsSummary = (order.items || []).slice(0, 4).map((i, idx) => (
    <span key={idx} className="inline-block bg-black/60 text-xs px-2 py-0.5 rounded mr-1 mb-1">
      {i.name} ×{i.quantity}
    </span>
  ));

  async function handleLiveRefresh() {
    if (!refreshWith?.orderId) {
      if (onRefresh) onRefresh();
      else if (typeof window !== 'undefined') window.location.reload();
      return;
    }
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ id: refreshWith.orderId });
      if (refreshWith.token) params.set('token', refreshWith.token);
      const res = await fetch(`/api/orders/track?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.order) {
          setOrder(json.order);
        }
      }
    } catch {
      // silent fail, user can still reload
    } finally {
      setRefreshing(false);
    }
    if (onRefresh) onRefresh();
  }

  // Live polling (every 18s when enabled) - great for customers watching their order "grow"
  useEffect(() => {
    if (!livePolling || !refreshWith?.orderId) return;
    const id = setInterval(() => {
      handleLiveRefresh();
    }, 18000);
    return () => clearInterval(id);
  }, [livePolling, refreshWith?.orderId, refreshWith?.token]);

  // Trigger tiny celebration when hitting delivered
  useEffect(() => {
    if (isComplete && particles.length === 0) {
      const emojis = ['🌿', '🍃', '✅', '🏡'];
      const newParts = Array.from({ length: 7 }).map((_, i) => ({
        id: Date.now() + i,
        x: 10 + Math.random() * 80,
        emoji: emojis[i % emojis.length],
      }));
      setParticles(newParts);
      // auto clear
      setTimeout(() => setParticles([]), 1600);
    }
  }, [isComplete]);

  // === Inline SVG components for the enhancements (no extra files) ===
  function GrowingLeaf({ progressPercent, currentStep }: { progressPercent: number; currentStep: number }) {
    const grow = Math.min(1, Math.max(0.15, progressPercent / 100));
    const leafScale = 0.4 + grow * 0.6;
    const stemH = 18 + grow * 22;

    return (
      <svg width="92" height="78" viewBox="0 0 92 78" className="kush-growing-leaf" aria-hidden>
        {/* Stem */}
        <rect
          x="44" y={52 - stemH} width="4" height={stemH}
          rx="2" fill="#166534" className="stem"
          style={{ transform: `scaleY(${Math.min(1, grow + 0.1)})` }}
        />
        {/* Main leaf shape */}
        <g className="leaf" style={{ transform: `scale(${leafScale})` }}>
          <path
            d="M46 18 Q 24 32 28 52 Q 46 62 64 50 Q 70 30 46 18"
            fill="#166534" stroke="#052e16" strokeWidth="1.5"
          />
          {/* Leaf highlight */}
          <path d="M46 22 Q 32 33 34 48" fill="none" stroke="#4ade80" strokeWidth="2.5" opacity="0.45" />
        </g>
        {/* Veins - animated draw */}
        <g className="veins" style={{ animationDelay: `${currentStep * 60}ms` }}>
          <path d="M46 20 Q 36 30 38 46" fill="none" stroke="#052e16" strokeWidth="1.2" />
          <path d="M46 24 Q 54 32 56 44" fill="none" stroke="#052e16" strokeWidth="1" />
          <path d="M46 28 Q 40 38 42 48" fill="none" stroke="#052e16" strokeWidth="0.8" />
        </g>
        {/* Small accent leaf for later stages */}
        {currentStep >= 2 && (
          <path d="M62 42 Q 72 36 74 46" fill="#4ade80" opacity={0.7 + (currentStep - 2) * 0.1} />
        )}
      </svg>
    );
  }

  function DiscreetRouteMap({ progressPercent, currentStep, hasFreeEighth }: { progressPercent: number; currentStep: number; hasFreeEighth?: boolean }) {
    const travel = Math.max(0, Math.min(98, progressPercent - 2)); // slight start delay
    const milestones = [0, 22, 45, 68, 92];

    return (
      <svg width="100%" height="62" viewBox="0 0 590 62" className="kush-route" aria-hidden>
        {/* Background discreet path (winding road) */}
        <path
          d="M 30 42 Q 120 18 210 42 Q 310 65 390 35 Q 480 55 560 30"
          fill="none" stroke="#27272a" strokeWidth="9" strokeLinecap="round"
        />
        {/* Traveled portion (green) */}
        <path
          d="M 30 42 Q 120 18 210 42 Q 310 65 390 35 Q 480 55 560 30"
          fill="none" stroke="#00ff9d" strokeWidth="5" strokeLinecap="round"
          strokeDasharray="520"
          strokeDashoffset={520 * (1 - travel / 100)}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />

        {/* Milestones */}
        {milestones.map((pos, idx) => {
          const isActive = currentStep >= idx;
          const x = 30 + (pos / 100) * 530;
          return (
            <g key={idx} className={`milestone ${isActive ? 'active' : ''}`}>
              <circle cx={x} cy="38" r="7" fill={isActive ? '#052e16' : '#18181b'} stroke={isActive ? '#00ff9d' : '#3f3f46'} strokeWidth="1.5" />
              <text x={x} y="42" textAnchor="middle" fontSize="8" fill={isActive ? '#4ade80' : '#52525b'}>
                {idx === 0 ? '🌱' : idx === 1 ? '🪴' : idx === 2 ? '📦' : idx === 3 ? '🔬' : '🏡'}
              </text>
            </g>
          );
        })}

        {/* Traveler (simple leaf on the path) - positioned by % along the approximated route */}
        <g
          className="traveler"
          style={{
            // Fallback positioning using left % on a positioned container would be better, but for SVG we nudge via transform
            transform: `translate(${travel * 5.1}px, ${Math.sin(travel / 18) * 6}px)`
          }}
        >
          <g>
            {/* Tiny van/leaf courier */}
            <circle cx="0" cy="0" r="5" fill="#00ff9d" opacity="0.9" />
            <text x="-3.5" y="3" fontSize="7" fill="#052e16">🍃</text>
          </g>
        </g>

        {/* Bonus leaf marker if free eighth */}
        {hasFreeEighth && currentStep >= 1 && (
          <g>
            <text x={210 + (travel * 0.8)} y="18" fontSize="9" fill="#fde047">🌿</text>
            <text x="205" y="14" fontSize="6" fill="#a3a3a3">BONUS</text>
          </g>
        )}

        {/* Labels */}
        <text x="32" y="58" fontSize="7" fill="#52525b">GARDEN</text>
        <text x="555" y="58" fontSize="7" fill="#52525b" textAnchor="end">YOUR SPOT</text>
      </svg>
    );
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden ${compact ? 'p-5' : 'p-6 md:p-8'}`}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="uppercase tracking-[3px] text-[10px] text-zinc-500 mb-1">KUSH WORLD</div>
            <h2 className="text-3xl font-bold tracking-tight">Kush Tracker</h2>
            <p className="text-sm text-zinc-400 mt-1 font-mono">Order #{order.id}</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-zinc-500">Current status</div>
            <div className="text-xl font-semibold text-[#00ff9d] flex items-center justify-end gap-2">
              {current.icon} {current.label}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{etaText}</div>
          </div>
        </div>
      )}

      {/* === NEW: Animated growing leaf + discreet route map (garden-to-door) === */}
      {!compact && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Animated Growing Leaf - progress driven */}
          <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 self-start">FROM OUR GARDEN</div>
            <GrowingLeaf progressPercent={progressPercent} currentStep={currentIndex} />
            <div className="text-xs text-zinc-400 mt-1">Your order is taking root</div>
          </div>

          {/* Discreet Route map-like graphic with traveling element */}
          <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">DISCREET ROUTE</div>
            <DiscreetRouteMap progressPercent={progressPercent} currentStep={currentIndex} hasFreeEighth={!!order.freeEighthBonus} />
            <div className="text-xs text-zinc-400 mt-1 text-center">Low-profile path • no logos • plain packaging</div>
          </div>
        </div>
      )}

      {/* Big current status callout */}
      <div className="mb-6 rounded-2xl bg-black/60 border border-[#00ff9d]/30 p-5">
        <div className="flex items-start gap-4">
          <div className="text-5xl leading-none mt-0.5 select-none">{current.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="uppercase text-xs tracking-widest text-[#00ff9d] mb-1">NOW HAPPENING</div>
            <div className="text-2xl font-bold leading-tight">{current.label}</div>
            <p className="mt-2 text-sm text-zinc-300">{current.description}</p>

            {freeEighthText && (
              <div className="mt-3 inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs px-3 py-1.5 rounded-full">
                🌿 {freeEighthText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual progress bar + steps */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 mb-2 px-1">
          <div>Progress</div>
          <div>{progressPercent}% • {currentIndex + 1} of {progress.totalSteps}</div>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00ff9d] to-emerald-400 transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Timeline steps */}
      <div className={`mt-6 ${compact ? 'space-y-3' : 'space-y-4'}`}>
        {KUSH_TRACKER_STEPS.map((step, i) => {
          const status = getStepStatus(i, currentIndex);
          const isCurrent = status === 'current';
          const isCompleteStep = status === 'complete';

          return (
            <div key={step.key} className="flex gap-4 group">
              {/* Icon / node */}
              <div className="relative flex-shrink-0 pt-0.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xl border transition-all ${
                    isCurrent
                      ? 'border-[#00ff9d] bg-[#00ff9d]/10 scale-110 shadow-[0_0_0_4px_rgba(0,255,157,0.1)]'
                      : isCompleteStep
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 bg-zinc-950'
                  }`}
                >
                  {isCompleteStep ? '✓' : step.icon}
                </div>
                {/* Connecting line */}
                {i < KUSH_TRACKER_STEPS.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-9 -translate-x-1/2 w-[2px] h-5 ${
                      isCompleteStep ? 'bg-emerald-500/70' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </div>

              {/* Text */}
              <div className={`flex-1 pb-1 ${isCurrent ? 'text-white' : isCompleteStep ? 'text-zinc-200' : 'text-zinc-400'}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${isCurrent ? 'text-[#00ff9d]' : ''}`}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-px rounded bg-[#00ff9d] text-black font-medium">CURRENT</span>
                  )}
                  {isCompleteStep && <span className="text-emerald-400 text-xs">DONE</span>}
                </div>
                {!compact && (
                  <p className="text-xs leading-snug mt-0.5 text-zinc-400">{step.description}</p>
                )}
                <div className="text-[10px] text-zinc-500 mt-0.5">{step.eta}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Meta row */}
      <div className="mt-7 pt-5 border-t border-zinc-800 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-zinc-500 text-xs block">ESTIMATED DELIVERY</span>
          <span className="font-medium">{estimated}</span>
        </div>

        {order.createdAt && (
          <div>
            <span className="text-zinc-500 text-xs block">ORDER PLACED</span>
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className="flex-1 min-w-[180px]">
            <span className="text-zinc-500 text-xs block mb-1">IN THIS ORDER</span>
            <div className="flex flex-wrap">{itemsSummary}</div>
            {order.items.length > 4 && (
              <span className="text-xs text-zinc-500">+{order.items.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Tracking block */}
      {order.trackingNumber && (
        <div className="mt-5 bg-black/50 border border-zinc-800 rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">CARRIER TRACKING</div>
          <div className="font-mono text-lg text-[#00ff9d] break-all">{order.trackingNumber}</div>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm underline hover:text-[#00ff9d] transition"
            >
              Track on carrier site <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      )}

      {/* Actions + live toggle */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <button
          onClick={handleLiveRefresh}
          disabled={refreshing}
          className="text-xs px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>

        {refreshWith?.orderId && (
          <button
            onClick={() => setLivePolling(!livePolling)}
            className={`text-xs px-3 py-2 rounded-xl border transition ${livePolling ? 'bg-[#00ff9d] text-black border-[#00ff9d]' : 'border-zinc-700 hover:bg-zinc-800'}`}
          >
            {livePolling ? '⏸ Pause live updates' : '▶ Enable live (auto 18s)'}
          </button>
        )}

        <a
          href="/account?tab=orders"
          className="text-xs px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition"
        >
          View in account
        </a>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 transition"
          >
            Open carrier tracking
          </a>
        )}
      </div>

      {/* Delivered celebration particles overlay */}
      {particles.length > 0 && isComplete && (
        <div className="relative h-0">
          {particles.map((p, i) => (
            <div
              key={p.id}
              className="delivered-celebration text-lg"
              style={{
                left: `${p.x}%`,
                top: -10 - (i % 3) * 8,
                animationDelay: `${i * 40}ms`,
                position: 'absolute',
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Footer flavor text */}
      {!compact && (
        <p className="mt-6 text-center text-[10px] text-zinc-500">
          This is a live view of your order’s journey from our garden to your door. Updates automatically as we work.
          21+ only. Enjoy responsibly.
        </p>
      )}
    </div>
  );
}
