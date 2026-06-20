'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { normalizeTrackingCarrier, type TrackingCarrier } from '@/lib/orderShipping';
import type { BtcPostagePackageType } from '@/lib/btcPostage';
import { formatShipFromLine, isShipFromComplete, normalizeShipFromInput } from '@/lib/shipFromAddress';

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
};

type ShipFromForm = {
  name: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

type ShipFromPreset = {
  id: string;
  label: string;
  address: ShipFromForm;
};

const PACKAGE_TYPES: { id: BtcPostagePackageType; label: string }[] = [
  { id: 'Parcel', label: 'USPS Parcel' },
  { id: 'FlatRateEnvelope', label: 'Flat Rate Envelope' },
  { id: 'FlatRateLegalEnvelope', label: 'Flat Rate Legal Envelope' },
  { id: 'SmallFlatRateBox', label: 'Small Flat Rate Box' },
  { id: 'MediumFlatRateBox', label: 'Medium Flat Rate Box' },
  { id: 'LargeFlatRateBox', label: 'Large Flat Rate Box' },
];

const PRESETS_KEY = 'kushworld-ship-from-presets';
const LAST_FROM_KEY = 'kushworld-ship-from-last';

const EMPTY_FROM: ShipFromForm = {
  name: 'Kush World',
  street: '',
  street2: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
};

function loadPresets(): ShipFromPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) as ShipFromPreset[]) : [];
  } catch {
    return [];
  }
}

function loadLastFrom(): ShipFromForm | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_FROM_KEY);
    return raw ? (JSON.parse(raw) as ShipFromForm) : null;
  } catch {
    return null;
  }
}

function saveLastFrom(form: ShipFromForm) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_FROM_KEY, JSON.stringify(form));
}

function shipToLine(order: OrderShippingControlsProps['order']) {
  const name = order.customer?.name || order.name || 'Customer';
  const street = order.customer?.address || order.address || '';
  const street2 = order.customer?.address2 || order.address2 || '';
  const city = order.customer?.city || order.city || '';
  const state = order.customer?.state || order.state || '';
  const zip = order.customer?.zip || order.zip || '';
  return `${name} — ${street}${street2 ? `, ${street2}` : ''}, ${city}, ${state} ${zip}`;
}

type OrderShippingControlsProps = {
  order: {
    id: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    shipping?: number;
    shippingMethod?: string;
    shippingCarrier?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    shippedAt?: string;
    shippingNotificationSentAt?: string;
    trackingNotificationSentAt?: string;
    btcPostageOrderId?: string;
    btcPostageLabelUrl?: string;
    btcPostagePostageCost?: number;
    btcPostageService?: string;
    items?: Array<{ name?: string; quantity?: number; category?: string }>;
    customer?: {
      name?: string;
      email?: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
    };
    name?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  };
  onUpdated: () => void;
};

export default function OrderShippingControls({ order, onUpdated }: OrderShippingControlsProps) {
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

  const [shipFrom, setShipFrom] = useState<ShipFromForm>(EMPTY_FROM);
  const [presets, setPresets] = useState<ShipFromPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetLabel, setPresetLabel] = useState('');

  const [selectedRate, setSelectedRate] = useState<BtcPostageRate | null>(null);
  const [manualApproved, setManualApproved] = useState(false);
  const [runGrokOnPurchase, setRunGrokOnPurchase] = useState(true);

  const shipFromPayload = useMemo(() => normalizeShipFromInput(shipFrom), [shipFrom]);
  const shipFromReady = isShipFromComplete(shipFromPayload);

  useEffect(() => {
    setTrackingNumber(order.trackingNumber || '');
    setTrackingCarrier(normalizeTrackingCarrier(order.trackingCarrier));
    setSelectedRate(null);
    setManualApproved(false);
  }, [order.id, order.trackingNumber, order.trackingCarrier]);

  useEffect(() => {
    const savedPresets = loadPresets();
    setPresets(savedPresets);
    const last = loadLastFrom();
    if (last) {
      setShipFrom(last);
      return;
    }
    adminFetch('/api/shipping/config')
      .then((res) => res.json())
      .then((data) => {
        const defaults = data.defaultShipFrom;
        if (defaults?.street) {
          setShipFrom({
            name: defaults.name || 'Kush World',
            street: defaults.street || '',
            street2: defaults.street2 || '',
            city: defaults.city || '',
            state: defaults.state || '',
            zip: defaults.zip || '',
            phone: defaults.phone || '',
          });
        }
      })
      .catch(() => {});
  }, []);

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
    setSelectedRate(null);
    setManualApproved(false);
  };

  const dimensionsPayload = () => ({
    weightLbs: Number(weightLbs) || 0,
    weightOz: Number(weightOz) || 0,
    heightInches: Number(heightIn) || 1,
    widthInches: Number(widthIn) || 1,
    depthInches: Number(depthIn) || 1,
  });

  const updateShipFrom = (field: keyof ShipFromForm, value: string) => {
    setShipFrom((prev) => ({ ...prev, [field]: value }));
    setSelectedRate(null);
    setManualApproved(false);
    setBtcRates([]);
    setGrokPrep(null);
  };

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((entry) => entry.id === presetId);
    if (!preset) return;
    setShipFrom(preset.address);
    setSelectedRate(null);
    setManualApproved(false);
    setBtcRates([]);
    setGrokPrep(null);
  };

  const savePreset = () => {
    if (!shipFromReady) {
      setMessage('Complete the ship-from address before saving a preset');
      return;
    }
    const label =
      presetLabel.trim() ||
      `${shipFrom.city}, ${shipFrom.state} — ${shipFrom.street.slice(0, 24)}`;
    const entry: ShipFromPreset = {
      id: `preset-${Date.now()}`,
      label,
      address: { ...shipFrom },
    };
    const next = [entry, ...presets.filter((p) => p.label !== label)].slice(0, 12);
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    setSelectedPresetId(entry.id);
    setPresetLabel('');
    setMessage(`Saved preset: ${label}`);
  };

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

  const grokPrepare = async () => {
    if (!shipFromReady) {
      setMessage('Enter a complete ship-from address first');
      return;
    }
    setBtcLoading(true);
    setMessage('');
    setGrokPrep(null);
    try {
      const res = await adminFetch('/api/shipping/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, fromAddress: shipFromPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grok prepare failed');
      applyPrep(data.prep);
      setMessage(data.prep.summary || 'Grok prepared suggestions — review before purchasing');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Grok prepare failed');
    } finally {
      setBtcLoading(false);
    }
  };

  const fetchRates = async () => {
    if (!shipFromReady) {
      setMessage('Enter a complete ship-from address first');
      return;
    }
    setBtcLoading(true);
    setMessage('');
    setSelectedRate(null);
    setManualApproved(false);
    try {
      const res = await adminFetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          fromAddress: shipFromPayload,
          packageType,
          dimensions: dimensionsPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch rates');
      setBtcRates(data.rates || []);
      if (!data.rates?.length) setMessage('No rates returned for this package');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to fetch rates');
    } finally {
      setBtcLoading(false);
    }
  };

  const confirmPurchase = async () => {
    if (!selectedRate) {
      setMessage('Select a rate to review first');
      return;
    }
    if (!manualApproved) {
      setMessage('Check the manual verification box before purchasing');
      return;
    }
    if (!shipFromReady) {
      setMessage('Ship-from address is incomplete');
      return;
    }

    setBuyingService(selectedRate.service);
    setMessage('');
    try {
      const res = await adminFetch('/api/shipping/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          service: selectedRate.service,
          packageType,
          dimensions: dimensionsPayload(),
          fromAddress: shipFromPayload,
          manualApproved: true,
          useGrokVerify: runGrokOnPurchase,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Label purchase failed');
      saveLastFrom(shipFrom);
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
      setSelectedRate(null);
      setManualApproved(false);
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to purchase label');
    } finally {
      setBuyingService(null);
    }
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
        <p className="text-sm font-semibold mb-1">BTC Postage — Manual Label Purchase</p>
        <p className="text-xs text-zinc-500 mb-3">
          Choose a ship-from address, let Grok suggest package details, review everything yourself, then confirm purchase. Labels are never bought automatically.
        </p>

        {btcConfigured === false && (
          <p className="text-xs text-amber-400">
            BTC Postage API is not configured. Add API key and secret in server env.
          </p>
        )}

        {btcConfigured && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mb-4">
              {btcCredits !== null && <span>Account credits: ${btcCredits.toFixed(2)}</span>}
              {order.btcPostageOrderId && (
                <span className="font-mono">Postage order: {order.btcPostageOrderId}</span>
              )}
              {grokPrep && (
                <span className={grokPrep.readyToShip ? 'text-[#00ff9d]' : 'text-amber-400'}>
                  Grok suggestion: {grokPrep.readyToShip ? 'looks good' : 'review carefully'} ({grokPrep.confidence})
                </span>
              )}
            </div>

            <div className="border border-zinc-800 rounded-xl p-4 mb-4 space-y-3">
              <p className="text-sm font-medium">Ship-from address (required — changes per order)</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <select
                  value={selectedPresetId}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm min-w-[220px]"
                >
                  <option value="">Load saved address...</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  value={presetLabel}
                  onChange={(e) => setPresetLabel(e.target.value)}
                  placeholder="Preset name (optional)"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm flex-1 min-w-[180px]"
                />
                <button
                  type="button"
                  onClick={savePreset}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm"
                >
                  Save as preset
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  value={shipFrom.name}
                  onChange={(e) => updateShipFrom('name', e.target.value)}
                  placeholder="Sender name"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={shipFrom.phone}
                  onChange={(e) => updateShipFrom('phone', e.target.value)}
                  placeholder="Sender phone"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={shipFrom.street}
                  onChange={(e) => updateShipFrom('street', e.target.value)}
                  placeholder="Street address"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm md:col-span-2"
                />
                <input
                  value={shipFrom.street2}
                  onChange={(e) => updateShipFrom('street2', e.target.value)}
                  placeholder="Apt / suite (optional)"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm md:col-span-2"
                />
                <input
                  value={shipFrom.city}
                  onChange={(e) => updateShipFrom('city', e.target.value)}
                  placeholder="City"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={shipFrom.state}
                  onChange={(e) => updateShipFrom('state', e.target.value.toUpperCase())}
                  placeholder="State"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={shipFrom.zip}
                  onChange={(e) => updateShipFrom('zip', e.target.value)}
                  placeholder="ZIP"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              {!shipFromReady && (
                <p className="text-xs text-amber-400">Complete ship-from street, city, state, and ZIP to continue.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={btcLoading || !shipFromReady}
                onClick={grokPrepare}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {btcLoading && !buyingService ? 'Grok working...' : 'Grok Suggest Package'}
              </button>
              <button
                type="button"
                disabled={btcLoading || !shipFromReady}
                onClick={fetchRates}
                className="px-4 py-2 bg-[#00ff9d]/20 text-[#00ff9d] hover:bg-[#00ff9d]/30 rounded-xl text-sm disabled:opacity-50"
              >
                {btcLoading ? 'Loading...' : 'Get Rates'}
              </button>
            </div>

            {grokPrep?.summary && <p className="text-xs text-zinc-300 mb-3">{grokPrep.summary}</p>}

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
                onChange={(e) => {
                  setPackageType(e.target.value as BtcPostagePackageType);
                  setSelectedRate(null);
                  setManualApproved(false);
                }}
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

            {btcRates.length > 0 && (
              <div className="space-y-2 mb-4">
                {btcRates.map((rate) => {
                  const isRecommended = grokPrep?.recommendedService === rate.service;
                  const isSelected = selectedRate?.service === rate.service;
                  return (
                    <div
                      key={rate.service}
                      className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-zinc-950/60 ${
                        isSelected
                          ? 'border-[#00ff9d]'
                          : isRecommended
                            ? 'border-[#00ff9d]/40'
                            : 'border-zinc-800'
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
                          onClick={() => {
                            setSelectedRate(rate);
                            setManualApproved(false);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium"
                        >
                          {isSelected ? 'Selected' : 'Review this rate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedRate && (
              <div className="border border-[#00ff9d]/30 bg-[#00ff9d]/5 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-sm font-semibold text-[#00ff9d]">Review before purchase</p>
                <div className="text-xs text-zinc-300 space-y-1">
                  <p><span className="text-zinc-500">From:</span> {formatShipFromLine(shipFromPayload)}</p>
                  <p><span className="text-zinc-500">To:</span> {shipToLine(order)}</p>
                  <p>
                    <span className="text-zinc-500">Service:</span> {selectedRate.serviceDisplay || selectedRate.service} — ${selectedRate.rate.toFixed(2)}
                  </p>
                  <p>
                    <span className="text-zinc-500">Package:</span> {packageType} · {weightLbs} lb {weightOz} oz · {heightIn}×{widthIn}×{depthIn} in
                  </p>
                  <p><span className="text-zinc-500">Order:</span> {order.id} · {order.paymentStatus || 'payment unknown'} · {order.shippingMethod || 'shipping n/a'}</p>
                </div>
                <label className="flex items-start gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualApproved}
                    onChange={(e) => setManualApproved(e.target.checked)}
                    className="mt-0.5 accent-[#00ff9d]"
                  />
                  <span>
                    I manually verified the ship-from address, recipient address, package size, and shipping rate. I approve purchasing this label.
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runGrokOnPurchase}
                    onChange={(e) => setRunGrokOnPurchase(e.target.checked)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <span>Run Grok double-check at purchase time (recommended)</span>
                </label>
                <button
                  type="button"
                  disabled={!manualApproved || Boolean(buyingService)}
                  onClick={confirmPurchase}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {buyingService ? 'Purchasing...' : 'Confirm & Purchase Label'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
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
            message.toLowerCase().includes('rejected') ||
            message.toLowerCase().includes('complete')
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