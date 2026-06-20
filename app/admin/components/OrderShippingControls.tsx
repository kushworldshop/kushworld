'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { normalizeTrackingCarrier, type TrackingCarrier } from '@/lib/orderShipping';
import type { BtcPostagePackageType } from '@/lib/btcPostage';
import { formatShipFromLine } from '@/lib/shipFromAddress';

type BtcPostageRate = {
  service: string;
  serviceDisplay: string;
  rate: number;
  carrier: string;
  estDeliveryDays: string;
  currency: string;
};

type ShippingCheck = {
  id?: string;
  label: string;
  passed: boolean;
  note?: string;
};

type GrokPrep = {
  readyToShip: boolean;
  confidence: 'high' | 'medium' | 'low';
  packageType: BtcPostagePackageType;
  dimensions: {
    weightLbs: number;
    weightOz: number;
    heightInches: number;
    widthInches: number;
    depthInches: number;
  };
  recommendedService: string | null;
  recommendedServiceDisplay: string | null;
  summary: string;
  checks: ShippingCheck[];
  grokChecks: ShippingCheck[];
  rates: BtcPostageRate[];
  shipFrom?: {
    name: string;
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
  };
  shipFromId?: string;
  shipFromLabel?: string;
  shipFromReason?: string;
};

const PACKAGE_TYPES: { id: BtcPostagePackageType; label: string }[] = [
  { id: 'Parcel', label: 'USPS Parcel' },
  { id: 'FlatRateEnvelope', label: 'Flat Rate Envelope' },
  { id: 'FlatRateLegalEnvelope', label: 'Flat Rate Legal Envelope' },
  { id: 'SmallFlatRateBox', label: 'Small Flat Rate Box' },
  { id: 'MediumFlatRateBox', label: 'Medium Flat Rate Box' },
  { id: 'LargeFlatRateBox', label: 'Large Flat Rate Box' },
];

export default function OrderShippingControls({
  order,
  onUpdated,
}: {
  order: {
    id: string;
    status?: string;
    paymentStatus?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    shippedAt?: string;
    shippingNotificationSentAt?: string;
    btcPostageOrderId?: string;
    btcPostageLabelUrl?: string;
    btcPostagePostageCost?: number;
    btcPostageService?: string;
    items?: unknown[];
    customer?: {
      name?: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    name?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  onUpdated: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingCarrier, setTrackingCarrier] = useState<TrackingCarrier>(
    normalizeTrackingCarrier(order.trackingCarrier)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [btcConfigured, setBtcConfigured] = useState<boolean | null>(null);
  const [btcCredits, setBtcCredits] = useState<number | null>(null);
  const [btcLoading, setBtcLoading] = useState(false);
  const [btcRates, setBtcRates] = useState<BtcPostageRate[]>([]);
  const [grokPrep, setGrokPrep] = useState<GrokPrep | null>(null);
  const [packageType, setPackageType] = useState<BtcPostagePackageType>('Parcel');
  const [weightLbs, setWeightLbs] = useState('0');
  const [weightOz, setWeightOz] = useState('16');
  const [heightIn, setHeightIn] = useState('6');
  const [widthIn, setWidthIn] = useState('8');
  const [depthIn, setDepthIn] = useState('4');
  const [buyingService, setBuyingService] = useState<string | null>(null);

  useEffect(() => {
    setTrackingNumber(order.trackingNumber || '');
    setTrackingCarrier(normalizeTrackingCarrier(order.trackingCarrier));
  }, [order.id, order.trackingNumber, order.trackingCarrier]);

  useEffect(() => {
    adminFetch('/api/shipping/config')
      .then((res) => res.json())
      .then((data) => {
        setBtcConfigured(Boolean(data.configured));
        if (typeof data.credits === 'number') setBtcCredits(data.credits);
        if (data.defaultPackageType) setPackageType(data.defaultPackageType);
      })
      .catch(() => setBtcConfigured(false));
  }, []);

  const applyPrep = (prep: GrokPrep) => {
    setGrokPrep(prep);
    setPackageType(prep.packageType);
    setWeightLbs(String(prep.dimensions.weightLbs));
    setWeightOz(String(prep.dimensions.weightOz));
    setHeightIn(String(prep.dimensions.heightInches));
    setWidthIn(String(prep.dimensions.widthInches));
    setDepthIn(String(prep.dimensions.depthInches));
    setBtcRates(prep.rates || []);
  };

  const dimensionsPayload = () => ({
    weightLbs: Number(weightLbs) || 0,
    weightOz: Number(weightOz) || 0,
    heightInches: Number(heightIn) || 1,
    widthInches: Number(widthIn) || 1,
    depthInches: Number(depthIn) || 1,
  });

  const fromAddressPayload = () => grokPrep?.shipFrom;

  const grokPrepare = useCallback(async () => {
    setBtcLoading(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/shipping/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grok prepare failed');
      applyPrep(data.prep);
      setMessage(data.prep.summary || 'Grok prepared label details');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Grok prepare failed');
    } finally {
      setBtcLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    if (btcConfigured && order.id && !order.btcPostageOrderId && !order.trackingNumber) {
      grokPrepare();
    }
  }, [btcConfigured, order.id, order.btcPostageOrderId, order.trackingNumber, grokPrepare]);

  const patchOrder = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      if (data.shippingEmailSent) {
        setMessage('Saved — shipping email sent to customer');
      } else if (data.shippingEmailError) {
        setMessage(`Saved, but email failed: ${data.shippingEmailError}`);
      } else {
        setMessage('Saved');
      }
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fetchRates = async () => {
    setBtcLoading(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          fromAddress: fromAddressPayload(),
          packageType,
          dimensions: dimensionsPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch rates');
      setBtcRates(data.rates || []);
      if (data.shipFrom && grokPrep) {
        setGrokPrep({
          ...grokPrep,
          shipFrom: data.shipFrom,
          shipFromId: data.shipFromId,
          shipFromLabel: data.shipFromLabel,
          shipFromReason: data.shipFromReason,
        });
      }
      if (!data.rates?.length) setMessage('No rates returned for this package');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to fetch rates');
    } finally {
      setBtcLoading(false);
    }
  };

  const buyLabel = async (service: string, useGrokVerify = false) => {
    setBuyingService(service);
    setMessage('');
    try {
      const res = await adminFetch('/api/shipping/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          service,
          packageType,
          dimensions: dimensionsPayload(),
          fromAddress: fromAddressPayload(),
          useGrokVerify,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Label purchase failed');
      setTrackingNumber(data.order?.trackingNumber || '');
      setTrackingCarrier(normalizeTrackingCarrier(data.order?.trackingCarrier));
      if (data.shippingEmailSent) {
        setMessage('Label purchased — tracking saved and customer emailed');
      } else if (data.shippingEmailError) {
        setMessage(`Label purchased, but email failed: ${data.shippingEmailError}`);
      } else {
        setMessage('Label purchased and tracking saved');
      }
      setGrokPrep(null);
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to purchase label');
    } finally {
      setBuyingService(null);
    }
  };

  const grokVerifyAndBuy = async () => {
    const service = grokPrep?.recommendedService;
    if (!service) {
      setMessage('Grok has not picked a rate yet — run prepare or refresh rates');
      return;
    }
    await buyLabel(service, true);
  };

  const syncTracking = async () => {
    setBtcLoading(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/shipping/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMessage(data.message || 'Tracking synced');
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to sync tracking');
    } finally {
      setBtcLoading(false);
    }
  };

  const allChecks = [...(grokPrep?.checks || []), ...(grokPrep?.grokChecks || [])];

  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-5">
      <div>
        <p className="text-sm font-semibold mb-1">BTC Postage + Grok — Smart Labels</p>
        <p className="text-xs text-zinc-500 mb-3">
          Grok auto-picks a real outgoing address, suggests package details, fetches rates, and verifies before purchase.
        </p>

        {btcConfigured === false && (
          <p className="text-xs text-amber-400">
            BTC Postage API is not configured. Add API key and secret in server env.
          </p>
        )}

        {btcConfigured && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mb-3">
              {btcCredits !== null && <span>Account credits: ${btcCredits.toFixed(2)}</span>}
              {order.btcPostageOrderId && (
                <span className="font-mono">Postage order: {order.btcPostageOrderId}</span>
              )}
              {grokPrep && (
                <span className={grokPrep.readyToShip ? 'text-[#00ff9d]' : 'text-amber-400'}>
                  Grok: {grokPrep.readyToShip ? 'ready' : 'needs review'} ({grokPrep.confidence})
                </span>
              )}
            </div>

            {grokPrep?.shipFrom && (
              <div className="border border-zinc-800 rounded-xl p-3 mb-4 text-xs">
                <p className="text-zinc-500 mb-1">Outgoing address (Grok auto-selected)</p>
                <p className="text-zinc-200">{formatShipFromLine(grokPrep.shipFrom)}</p>
                {grokPrep.shipFromLabel && (
                  <p className="text-zinc-500 mt-1">
                    {grokPrep.shipFromLabel}
                    {grokPrep.shipFromReason ? ` — ${grokPrep.shipFromReason}` : ''}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={btcLoading}
                onClick={grokPrepare}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {btcLoading && !buyingService ? 'Grok working...' : 'Grok Prepare Label'}
              </button>
              {grokPrep?.readyToShip && grokPrep.recommendedService && (
                <button
                  type="button"
                  disabled={Boolean(buyingService)}
                  onClick={grokVerifyAndBuy}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {buyingService ? 'Buying...' : 'Grok Verify & Buy Recommended'}
                </button>
              )}
            </div>

            {grokPrep?.summary && (
              <p className="text-xs text-zinc-300 mb-3">{grokPrep.summary}</p>
            )}

            {allChecks.length > 0 && (
              <div className="mb-4 space-y-1">
                {allChecks.map((check, index) => (
                  <div key={`${check.label}-${index}`} className="flex items-start gap-2 text-xs">
                    <span className={check.passed ? 'text-[#00ff9d]' : 'text-red-400'}>
                      {check.passed ? '✓' : '✗'}
                    </span>
                    <span className="text-zinc-300">
                      {check.label}
                      {check.note ? <span className="text-zinc-500"> — {check.note}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <select
                value={packageType}
                onChange={(e) => setPackageType(e.target.value as BtcPostagePackageType)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              >
                {PACKAGE_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                placeholder="Weight lbs"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={weightOz}
                onChange={(e) => setWeightOz(e.target.value)}
                placeholder="Weight oz"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                placeholder="Height in"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={widthIn}
                onChange={(e) => setWidthIn(e.target.value)}
                placeholder="Width in"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={depthIn}
                onChange={(e) => setDepthIn(e.target.value)}
                placeholder="Depth in"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                disabled={btcLoading}
                onClick={fetchRates}
                className="px-4 py-2 bg-[#00ff9d]/20 text-[#00ff9d] hover:bg-[#00ff9d]/30 rounded-xl text-sm disabled:opacity-50"
              >
                {btcLoading ? 'Loading...' : 'Refresh Rates'}
              </button>
              {order.btcPostageOrderId && (
                <button
                  type="button"
                  disabled={btcLoading}
                  onClick={syncTracking}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm disabled:opacity-50"
                >
                  Sync Tracking
                </button>
              )}
              {order.btcPostageLabelUrl && (
                <a
                  href={order.btcPostageLabelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm"
                >
                  Download Label
                </a>
              )}
            </div>

            {btcRates.length > 0 && (
              <div className="space-y-2 mb-2">
                {btcRates.map((rate) => {
                  const isRecommended = grokPrep?.recommendedService === rate.service;
                  return (
                    <div
                      key={rate.service}
                      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-zinc-950/60 ${
                        isRecommended ? 'border-[#00ff9d]/50' : 'border-zinc-800'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {rate.serviceDisplay || rate.service}
                          {isRecommended && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[#00ff9d]">
                              Grok pick
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {rate.carrier.toUpperCase()}
                          {rate.estDeliveryDays ? ` · ${rate.estDeliveryDays} days` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#00ff9d]">
                          ${rate.rate.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={Boolean(buyingService)}
                          onClick={() => buyLabel(rate.service, isRecommended)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          {buyingService === rate.service
                            ? 'Buying...'
                            : isRecommended
                              ? 'Verify & Buy'
                              : 'Buy Label'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <p className="text-sm font-semibold mb-3">Manual Tracking</p>
        {order.shippedAt && (
          <p className="text-xs text-zinc-500 mb-3">
            Shipped {new Date(order.shippedAt).toLocaleString()}
          </p>
        )}
        <div className="grid md:grid-cols-[1fr_160px] gap-3 mb-3">
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Tracking number"
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono"
          />
          <select
            value={trackingCarrier}
            onChange={(e) => setTrackingCarrier(e.target.value as TrackingCarrier)}
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm"
          >
            <option value="auto">Auto-detect carrier</option>
            <option value="usps">USPS</option>
            <option value="ups">UPS</option>
            <option value="fedex">FedEx</option>
            <option value="other">Other (no track link)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              patchOrder({
                status: 'shipped',
                trackingNumber: trackingNumber.trim(),
                trackingCarrier,
              })
            }
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Mark Shipped & Save Tracking'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              patchOrder({
                trackingNumber: trackingNumber.trim(),
                trackingCarrier,
              })
            }
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm disabled:opacity-50"
          >
            Save Tracking Only
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`text-xs ${
            message.toLowerCase().includes('failed') ||
            message.toLowerCase().includes('not configured') ||
            message.toLowerCase().includes('rejected')
              ? 'text-red-400'
              : 'text-[#00ff9d]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}