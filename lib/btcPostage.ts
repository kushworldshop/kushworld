export type BtcPostagePackageType =
  | 'Parcel'
  | 'FlatRateEnvelope'
  | 'FlatRateLegalEnvelope'
  | 'SmallFlatRateBox'
  | 'MediumFlatRateBox'
  | 'LargeFlatRateBox'
  | 'Letter';

export interface BtcPostageAddress {
  name: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}

export interface BtcPostageDimensions {
  weightLbs: number;
  weightOz: number;
  heightInches: number;
  widthInches: number;
  depthInches: number;
}

export interface BtcPostageRate {
  service: string;
  serviceDisplay: string;
  rate: number;
  carrier: string;
  estDeliveryDays: string;
  currency: string;
}

export interface BtcPostagePurchaseItem {
  shipmentId: string;
  carrier: string;
  service: string;
  fromName: string;
  toName: string;
  price: string;
  currency: string;
  filename: string;
  trackingNo: string;
}

export interface BtcPostagePurchase {
  orderTimestamp: string;
  orderId: string;
  items: BtcPostagePurchaseItem[];
}

export interface BtcPostageRetrieveOrderItem {
  from: string;
  to: string;
  trackingNo: string;
  shipmentId: string;
  carrier: string;
}

const DEFAULT_API_ROOT = 'https://bitcoinpostage.info/api/';
const INVALID_CREDENTIALS = 'Could not verify API key. Please check key and secret.';
const NO_RATES = 'No valid price quotes found. Please check your request and try again, or please contact support.';

function carrierFromPackage(packageType: BtcPostagePackageType): 'usps' | 'fedex' | 'ups' {
  if (packageType.startsWith('FlatRate') || packageType === 'Parcel' || packageType === 'Letter') {
    return 'usps';
  }
  return 'usps';
}

export function getBtcPostageConfig() {
  const apiKey = process.env.BTCPOSTAGE_API_KEY || '';
  const apiSecret = process.env.BTCPOSTAGE_API_SECRET || '';
  const apiUrl = (process.env.BTCPOSTAGE_API_URL || DEFAULT_API_ROOT).replace(/\/?$/, '/');

  const shipFrom: BtcPostageAddress = {
    name: process.env.SHIP_FROM_NAME || 'Kush World',
    street: process.env.SHIP_FROM_ADDRESS || '',
    street2: process.env.SHIP_FROM_ADDRESS2 || undefined,
    city: process.env.SHIP_FROM_CITY || '',
    state: process.env.SHIP_FROM_STATE || '',
    zip: process.env.SHIP_FROM_ZIP || '',
    country: process.env.SHIP_FROM_COUNTRY || 'US',
    phone: process.env.SHIP_FROM_PHONE || '',
  };

  const defaultDimensions: BtcPostageDimensions = {
    weightLbs: Number(process.env.DEFAULT_PACKAGE_WEIGHT_LBS || '0'),
    weightOz: Number(process.env.DEFAULT_PACKAGE_WEIGHT_OZ || '16'),
    heightInches: Number(process.env.DEFAULT_PACKAGE_HEIGHT_IN || '6'),
    widthInches: Number(process.env.DEFAULT_PACKAGE_WIDTH_IN || '8'),
    depthInches: Number(process.env.DEFAULT_PACKAGE_DEPTH_IN || '4'),
  };

  const defaultPackageType =
    (process.env.DEFAULT_PACKAGE_TYPE as BtcPostagePackageType | undefined) || 'Parcel';

  return {
    apiKey,
    apiSecret,
    apiUrl,
    shipFrom,
    defaultDimensions,
    defaultPackageType,
    testMode: process.env.BTCPOSTAGE_TEST_MODE === 'true',
    isConfigured: Boolean(apiKey && apiSecret && shipFrom.street && shipFrom.city && shipFrom.state && shipFrom.zip),
  };
}

export function getBtcPostageLabelUrl(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = (process.env.BTCPOSTAGE_LABEL_BASE_URL || 'https://bitcoinpostage.info').replace(/\/$/, '');
  return `${base}/${trimmed.replace(/^\//, '')}`;
}

function buildAddressFields(prefix: 'from' | 'to', address: BtcPostageAddress): Record<string, string> {
  return {
    [`${prefix}_name`]: address.name,
    [`${prefix}_street`]: address.street,
    [`${prefix}_street2`]: address.street2 || '',
    [`${prefix}_city`]: address.city,
    [`${prefix}_state`]: address.state,
    [`${prefix}_zip`]: address.zip,
    [`${prefix}_country`]: address.country || 'US',
    [`${prefix}_phone`]: address.phone || '',
  };
}

function buildPackageFields(
  packageType: BtcPostagePackageType,
  dimensions: BtcPostageDimensions,
  service?: string,
  serviceOption?: string
): Record<string, string> {
  const carrier = carrierFromPackage(packageType);
  const fields: Record<string, string> = {
    package_type: packageType,
    carrier,
    weight_lbs: String(Math.max(0, Math.floor(dimensions.weightLbs))),
    weight_oz: String(Math.max(0, dimensions.weightOz)),
    height: String(dimensions.heightInches),
    width: String(dimensions.widthInches),
    depth: String(dimensions.depthInches),
  };

  if (service) fields.service = service;
  if (serviceOption) fields.serviceoption = serviceOption;

  return fields;
}

async function btcPostageRequest<T>(
  endpoint: string,
  body: Record<string, string>
): Promise<T> {
  const config = getBtcPostageConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new Error('BTC Postage API credentials are not configured');
  }

  const payload = new URLSearchParams({
    key: config.apiKey,
    secret: config.apiSecret,
    ...body,
  });

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
    cache: 'no-store',
  });

  const text = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(text || `BTC Postage request failed (${response.status})`);
  }
  if (text === INVALID_CREDENTIALS) {
    throw new Error('Invalid BTC Postage API key or secret');
  }
  if (text === NO_RATES) {
    throw new Error('No shipping rates found for this package and destination');
  }

  const insufficientCredits = text.match(
    /Error: insufficient credits\. Label would cost ([\d.]+), but only ([\d.]+) available\./
  );
  if (insufficientCredits) {
    throw new Error(
      `Insufficient BTC Postage credits (need $${insufficientCredits[1]}, have $${insufficientCredits[2]})`
    );
  }

  if (!text) {
    throw new Error('Empty response from BTC Postage');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

function normalizeRate(raw: Record<string, unknown>): BtcPostageRate {
  return {
    service: String(raw.service ?? ''),
    serviceDisplay: String(raw.serviceDisplay ?? raw.service_display ?? raw.service ?? ''),
    rate: Number(raw.rate ?? 0),
    carrier: String(raw.carrier ?? 'usps').toLowerCase(),
    estDeliveryDays: String(raw.estDeliveryDays ?? raw.est_delivery_days ?? ''),
    currency: String(raw.currency ?? 'USD'),
  };
}

function normalizePurchaseItem(raw: Record<string, unknown>): BtcPostagePurchaseItem {
  return {
    shipmentId: String(raw.shipmentId ?? raw.shipment_id ?? ''),
    carrier: String(raw.carrier ?? ''),
    service: String(raw.service ?? ''),
    fromName: String(raw.fromName ?? raw.from_name ?? ''),
    toName: String(raw.toName ?? raw.to_name ?? ''),
    price: String(raw.price ?? ''),
    currency: String(raw.currency ?? 'USD'),
    filename: String(raw.filename ?? ''),
    trackingNo: String(raw.trackingNo ?? raw.tracking_no ?? ''),
  };
}

export async function getBtcPostageCredits(): Promise<{ credits: number }> {
  const result = await btcPostageRequest<{ credits?: string | number }>('get-credits', {});
  return { credits: Number(result.credits ?? 0) };
}

export async function getBtcPostageRates(input: {
  from: BtcPostageAddress;
  to: BtcPostageAddress;
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
  service?: string;
}): Promise<BtcPostageRate[]> {
  const body = {
    ...buildAddressFields('from', input.from),
    ...buildAddressFields('to', input.to),
    ...buildPackageFields(input.packageType, input.dimensions, input.service),
  };

  const result = await btcPostageRequest<Record<string, unknown>[] | Record<string, unknown>>(
    'get-rates',
    body
  );

  const rows = Array.isArray(result) ? result : [result];
  return rows.map((row) => normalizeRate(row as Record<string, unknown>)).filter((rate) => rate.service);
}

export async function purchaseBtcPostageLabel(input: {
  from: BtcPostageAddress;
  to: BtcPostageAddress;
  packageType: BtcPostagePackageType;
  dimensions: BtcPostageDimensions;
  service: string;
  testMode?: boolean;
}): Promise<BtcPostagePurchase> {
  const config = getBtcPostageConfig();
  const body: Record<string, string> = {
    ...buildAddressFields('from', input.from),
    ...buildAddressFields('to', input.to),
    ...buildPackageFields(input.packageType, input.dimensions, input.service),
  };

  if (input.testMode ?? config.testMode) {
    body.test_mode = 'true';
  }

  const result = await btcPostageRequest<Record<string, unknown>>('create-purchase', body);
  const itemsRaw = Array.isArray(result.items) ? result.items : [];

  return {
    orderTimestamp: String(result.orderTimestamp ?? result.order_timestamp ?? ''),
    orderId: String(result.orderId ?? result.order_id ?? ''),
    items: itemsRaw.map((item) => normalizePurchaseItem(item as Record<string, unknown>)),
  };
}

export async function retrieveBtcPostageOrder(orderId: string): Promise<BtcPostageRetrieveOrderItem[]> {
  const result = await btcPostageRequest<Record<string, unknown>[] | Record<string, unknown>>(
    'retrieve-order',
    { order_id: orderId }
  );
  const rows = Array.isArray(result) ? result : [result];

  return rows.map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      from: String(raw.from ?? ''),
      to: String(raw.to ?? ''),
      trackingNo: String(raw.trackingNo ?? raw.tracking_no ?? ''),
      shipmentId: String(raw.shipmentId ?? raw.shipment_id ?? ''),
      carrier: String(raw.carrier ?? ''),
    };
  });
}

export async function retrieveBtcPostagePurchase(orderId: string): Promise<BtcPostagePurchase> {
  const result = await btcPostageRequest<Record<string, unknown>>('retrieve-purchase', {
    order_id: orderId,
  });
  const itemsRaw = Array.isArray(result.items) ? result.items : [];

  return {
    orderTimestamp: String(result.orderTimestamp ?? result.order_timestamp ?? ''),
    orderId: String(result.orderId ?? result.order_id ?? orderId),
    items: itemsRaw.map((item) => normalizePurchaseItem(item as Record<string, unknown>)),
  };
}

export function orderToBtcPostageAddress(order: {
  customer?: {
    name?: string;
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
}): BtcPostageAddress {
  const customer = order.customer || {};
  return {
    name: customer.name || order.name || 'Customer',
    street: customer.address || order.address || '',
    street2: customer.address2 || order.address2 || undefined,
    city: customer.city || order.city || '',
    state: customer.state || order.state || '',
    zip: customer.zip || order.zip || '',
    country: 'US',
    phone: customer.phone || order.phone || '',
  };
}

export function btcPostageCarrierToTrackingCarrier(carrier?: string): 'usps' | 'ups' | 'fedex' | 'auto' {
  const normalized = carrier?.toLowerCase().trim();
  if (normalized === 'ups') return 'ups';
  if (normalized === 'fedex') return 'fedex';
  if (normalized === 'usps') return 'usps';
  return 'auto';
}