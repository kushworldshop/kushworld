import {
  getBtcPostageConfig,
  getBtcPostageRates,
  type BtcPostageAddress,
  type BtcPostageDimensions,
  type BtcPostagePackageType,
  type BtcPostageRate,
} from '@/lib/btcPostage';
import { selectGrokShipFrom } from '@/lib/grokShipFrom';
import { isShipFromComplete, normalizeShipFromInput } from '@/lib/shipFromAddress';
import {
  summarizeOrderForGrok,
  validateOrderForShipping,
  type OrderForShippingValidation,
  type ShippingCheck,
} from '@/lib/shippingOrderValidation';
import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';

const PACKAGE_TYPES: BtcPostagePackageType[] = [
  'Parcel',
  'FlatRateEnvelope',
  'FlatRateLegalEnvelope',
  'SmallFlatRateBox',
  'MediumFlatRateBox',
  'LargeFlatRateBox',
  'Letter',
];

export interface GrokShippingPrepResult {
  readyToShip: boolean;
  confidence: 'high' | 'medium' | 'low';
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
  recommendedService: string | null;
  recommendedServiceDisplay: string | null;
  summary: string;
  checks: ShippingCheck[];
  grokChecks: Array<{ label: string; passed: boolean; note?: string }>;
  rates: BtcPostageRate[];
  shipFrom: BtcPostageAddress;
  shipFromId: string;
  shipFromLabel: string;
  shipFromReason: string;
  autofilledFrom: 'grok' | 'defaults';
}

interface GrokPackageSuggestion {
  readyToShip?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  packageType?: string;
  weightLbs?: number;
  weightOz?: number;
  heightInches?: number;
  widthInches?: number;
  depthInches?: number;
  recommendedServiceHint?: string;
  summary?: string;
  checks?: Array<{ label: string; passed: boolean; note?: string }>;
  addressCorrections?: string[];
}

interface GrokRatePick {
  approved?: boolean;
  service?: string;
  reason?: string;
  checks?: Array<{ label: string; passed: boolean; note?: string }>;
}

function parseJsonFromContent<T>(content: string | null): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function normalizePackageType(value?: string): BtcPostagePackageType {
  const match = PACKAGE_TYPES.find((type) => type.toLowerCase() === String(value || '').toLowerCase());
  return match || 'Parcel';
}

function clampDimensions(dimensions: BtcPostageDimensions): BtcPostageDimensions {
  return {
    weightLbs: Math.max(0, Math.floor(dimensions.weightLbs || 0)),
    weightOz: Math.max(0.1, Number(dimensions.weightOz || 1)),
    heightInches: Math.max(0.5, Number(dimensions.heightInches || 1)),
    widthInches: Math.max(0.5, Number(dimensions.widthInches || 1)),
    depthInches: Math.max(0.5, Number(dimensions.depthInches || 1)),
  };
}

function pickRateByHint(rates: BtcPostageRate[], hint?: string | null): BtcPostageRate | null {
  if (!rates.length) return null;
  if (!hint) return rates[0];

  const normalized = hint.toLowerCase();
  const exact = rates.find(
    (rate) =>
      rate.service.toLowerCase() === normalized ||
      rate.serviceDisplay.toLowerCase().includes(normalized)
  );
  if (exact) return exact;

  if (normalized.includes('priority')) {
    return rates.find((rate) => /priority/i.test(rate.serviceDisplay)) || rates[0];
  }
  if (normalized.includes('ground') || normalized.includes('parcel')) {
    return rates.find((rate) => /ground|parcel/i.test(rate.serviceDisplay)) || rates[0];
  }

  return rates[0];
}

async function grokSuggestPackage(
  order: OrderForShippingValidation,
  shipFrom: BtcPostageAddress
): Promise<GrokPackageSuggestion | null> {
  const orderSummary = summarizeOrderForGrok(order);
  const validation = validateOrderForShipping(order);

  const prompt = `You are a Kush World fulfillment assistant preparing a BTC Postage shipping label.

Analyze this order and return ONLY valid JSON (no markdown) with this shape:
{
  "readyToShip": boolean,
  "confidence": "high" | "medium" | "low",
  "packageType": one of ${PACKAGE_TYPES.join('|')},
  "weightLbs": integer,
  "weightOz": number,
  "heightInches": number,
  "widthInches": number,
  "depthInches": number,
  "recommendedServiceHint": "usps_ground or usps_priority or similar service id string",
  "summary": "one sentence for admin",
  "checks": [{"label": string, "passed": boolean, "note": string optional}],
  "addressCorrections": ["optional list of address concerns"]
}

Rules:
- Hemp / merch orders: estimate realistic weight from item names and quantities.
- Default to Parcel for mixed hemp orders; SmallFlatRateBox or MediumFlatRateBox for merch-only when appropriate.
- weight_oz is remainder ounces, not total ounces (e.g. 1 lb 4 oz => weightLbs:1, weightOz:4).
- Flag PO boxes, incomplete addresses, restricted-looking destinations, or unpaid orders in checks.
- Match service hint to what customer likely paid for using shippingMethod when present.
- Ship from: ${shipFrom.street}, ${shipFrom.city}, ${shipFrom.state} ${shipFrom.zip}

Deterministic validation already run:
${JSON.stringify(validation.checks, null, 2)}

Order:
${JSON.stringify(orderSummary, null, 2)}`;

  const content = await xaiChatCompletion({
    messages: [
      { role: 'system', content: 'You return only JSON for shipping label preparation. Be conservative on readiness.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 900,
  });

  return parseJsonFromContent<GrokPackageSuggestion>(content);
}

async function grokVerifyRatePurchase(input: {
  order: OrderForShippingValidation;
  rates: BtcPostageRate[];
  selectedService: string;
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
}): Promise<GrokRatePick | null> {
  const orderSummary = summarizeOrderForGrok(input.order);
  const selected = input.rates.find((rate) => rate.service === input.selectedService);

  const prompt = `You are double-checking a Kush World BTC Postage label purchase before it is executed.

Return ONLY JSON:
{
  "approved": boolean,
  "service": "must equal the selected service if approved",
  "reason": "short explanation",
  "checks": [{"label": string, "passed": boolean, "note": string optional}]
}

Verify:
- Recipient address matches order and looks deliverable
- Package weight/dimensions are plausible for the items
- Selected rate is appropriate vs what customer paid (shippingMethod/shippingPaid)
- No duplicate label risk
- Service exists in the rates list

Order:
${JSON.stringify(orderSummary, null, 2)}

Package: ${input.packageType}
Dimensions: ${JSON.stringify(input.dimensions)}
Selected service: ${input.selectedService}
Selected rate: ${selected ? JSON.stringify(selected) : 'NOT FOUND'}
All rates: ${JSON.stringify(input.rates.map((r) => ({ service: r.service, display: r.serviceDisplay, rate: r.rate, carrier: r.carrier })))}`;

  const content = await xaiChatCompletion({
    messages: [
      { role: 'system', content: 'You are a cautious shipping verifier. Reject if anything looks wrong. JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 700,
  });

  return parseJsonFromContent<GrokRatePick>(content);
}

async function resolveShipFromForOrder(
  order: OrderForShippingValidation,
  fromAddressInput?: Partial<BtcPostageAddress> | null
): Promise<{ address: BtcPostageAddress; id: string; label: string; reason: string } | { error: string }> {
  const explicit = normalizeShipFromInput(fromAddressInput);
  if (isShipFromComplete(explicit)) {
    return {
      address: explicit,
      id: 'manual',
      label: 'Manual override',
      reason: 'Ship-from provided in request',
    };
  }

  const grokPick = await selectGrokShipFrom(order);
  if (grokPick.error || !grokPick.result) {
    return { error: grokPick.error || 'Could not select ship-from address' };
  }

  return {
    address: grokPick.result.address,
    id: grokPick.result.addressId,
    label: grokPick.result.label,
    reason: grokPick.result.reason,
  };
}

export async function prepareGrokShippingLabel(
  order: OrderForShippingValidation,
  fromAddressInput?: Partial<BtcPostageAddress> | null
): Promise<{ error?: string; prep?: GrokShippingPrepResult }> {
  const config = getBtcPostageConfig();
  if (!config.isConfigured) {
    return { error: 'BTC Postage is not configured (API key and secret required)' };
  }

  const shipFromResolved = await resolveShipFromForOrder(order, fromAddressInput);
  if ('error' in shipFromResolved) {
    return { error: shipFromResolved.error };
  }
  const shipFrom = shipFromResolved;

  const validation = validateOrderForShipping(order);
  const grokSuggestion = isXaiConfigured()
    ? await grokSuggestPackage(order, shipFrom.address)
    : null;

  const packageType = normalizePackageType(grokSuggestion?.packageType || config.defaultPackageType);
  const dimensions = clampDimensions({
    weightLbs: grokSuggestion?.weightLbs ?? config.defaultDimensions.weightLbs,
    weightOz: grokSuggestion?.weightOz ?? config.defaultDimensions.weightOz,
    heightInches: grokSuggestion?.heightInches ?? config.defaultDimensions.heightInches,
    widthInches: grokSuggestion?.widthInches ?? config.defaultDimensions.widthInches,
    depthInches: grokSuggestion?.depthInches ?? config.defaultDimensions.depthInches,
  });

  let rates: BtcPostageRate[] = [];
  try {
    rates = await getBtcPostageRates({
      from: shipFrom.address,
      to: validation.address,
      packageType,
      dimensions,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch BTC Postage rates',
    };
  }

  const recommended = pickRateByHint(rates, grokSuggestion?.recommendedServiceHint);
  const grokReady = grokSuggestion?.readyToShip !== false;
  const grokChecks = grokSuggestion?.checks || [];

  return {
    prep: {
      readyToShip: validation.ready && grokReady && Boolean(recommended),
      confidence: grokSuggestion?.confidence || (validation.ready ? 'medium' : 'low'),
      packageType,
      dimensions,
      recommendedService: recommended?.service || null,
      recommendedServiceDisplay: recommended?.serviceDisplay || null,
      summary:
        grokSuggestion?.summary ||
        (validation.ready
          ? 'Order passed validation. Review rates and buy label.'
          : 'Order failed one or more shipping checks.'),
      checks: validation.checks,
      grokChecks,
      rates: rates.sort((a, b) => a.rate - b.rate),
      shipFrom: shipFrom.address,
      shipFromId: shipFrom.id,
      shipFromLabel: shipFrom.label,
      shipFromReason: shipFrom.reason,
      autofilledFrom: grokSuggestion ? 'grok' : 'defaults',
    },
  };
}

export async function resolveShipFromForLabel(
  order: OrderForShippingValidation,
  fromAddressInput?: Partial<BtcPostageAddress> | null
) {
  return resolveShipFromForOrder(order, fromAddressInput);
}

export async function verifyGrokShippingPurchase(input: {
  order: OrderForShippingValidation;
  service: string;
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
  fromAddress?: Partial<BtcPostageAddress> | null;
}): Promise<{ approved: boolean; reason: string; checks: ShippingCheck[]; grokChecks: GrokRatePick['checks'] }> {
  const validation = validateOrderForShipping(input.order);
  const deterministicFailed = validation.checks.filter((check) => !check.passed);

  if (deterministicFailed.length > 0) {
    return {
      approved: false,
      reason: `Failed checks: ${deterministicFailed.map((c) => c.label).join('; ')}`,
      checks: validation.checks,
      grokChecks: [],
    };
  }

  const shipFromResolved = await resolveShipFromForOrder(input.order, input.fromAddress);
  if ('error' in shipFromResolved) {
    return {
      approved: false,
      reason: shipFromResolved.error,
      checks: validation.checks,
      grokChecks: [],
    };
  }

  let rates: BtcPostageRate[] = [];
  try {
    rates = await getBtcPostageRates({
      from: shipFromResolved.address,
      to: validation.address,
      packageType: input.packageType,
      dimensions: input.dimensions,
    });
  } catch (error) {
    return {
      approved: false,
      reason: error instanceof Error ? error.message : 'Could not verify rate at purchase time',
      checks: validation.checks,
      grokChecks: [],
    };
  }

  const rateExists = rates.some((rate) => rate.service === input.service);
  if (!rateExists) {
    return {
      approved: false,
      reason: 'Selected service is no longer available for this package/address',
      checks: validation.checks,
      grokChecks: [],
    };
  }

  if (!isXaiConfigured()) {
    return {
      approved: true,
      reason: 'Deterministic checks passed (Grok not configured for second verification)',
      checks: validation.checks,
      grokChecks: [],
    };
  }

  const grokVerify = await grokVerifyRatePurchase({
    order: input.order,
    rates,
    selectedService: input.service,
    packageType: input.packageType,
    dimensions: input.dimensions,
  });

  if (!grokVerify) {
    return {
      approved: false,
      reason: 'Grok verification failed to respond — try again',
      checks: validation.checks,
      grokChecks: [],
    };
  }

  const grokChecks = grokVerify.checks || [];
  const grokFailed = grokChecks.some((check) => check.passed === false);

  return {
    approved: Boolean(grokVerify.approved) && !grokFailed,
    reason: grokVerify.reason || (grokVerify.approved ? 'Grok approved label purchase' : 'Grok rejected label purchase'),
    checks: validation.checks,
    grokChecks,
  };
}