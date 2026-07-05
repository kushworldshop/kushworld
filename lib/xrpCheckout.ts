export interface XrpPaymentDetails {
  address: string;
  amountXrp: number;
  amountDrops: number;
  amountUsd: number;
  rateUsd: number;
  destinationTag: number;
  expiresAt: string;
  qrUrl: string;
  xrpUri: string;
  orderId: string;
}

export interface XrpPaymentRecord {
  address: string;
  amountXrp: number;
  amountDrops: number;
  amountUsd: number;
  rateUsd: number;
  destinationTag: number;
  expiresAt: string;
  createdAt: string;
  txid?: string;
  confirmations?: number;
  paidAt?: string;
}

const DROPS_PER_XRP = 1_000_000;
const RIPPLE_EPOCH_OFFSET = 946_684_800;

export function getXrpWalletAddress(): string {
  return process.env.XRP_WALLET_ADDRESS || '';
}

export function getXrpPaymentExpiryMinutes(): number {
  const minutes = Number(process.env.XRP_PAYMENT_EXPIRY_MINUTES || 30);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
}

export function getXrpMinConfirmations(): number {
  const confirmations = Number(process.env.XRP_MIN_CONFIRMATIONS || 1);
  return Number.isFinite(confirmations) && confirmations > 0 ? confirmations : 1;
}

export async function fetchXrpUsdRate(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd',
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error('Unable to fetch XRP exchange rate');
  }

  const data = (await res.json()) as { ripple?: { usd?: number } };
  const rate = data.ripple?.usd;
  if (!rate || rate <= 0) {
    throw new Error('Invalid XRP exchange rate');
  }

  return rate;
}

function getOrderDropsSuffix(orderId: string): number {
  const digits = orderId.replace(/\D/g, '').slice(-6);
  const numeric = parseInt(digits || '1', 10);
  return (numeric % 999) + 1;
}

export function getOrderDestinationTag(orderId: string): number {
  let hash = 0;
  for (const ch of orderId) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const digits = orderId.replace(/\D/g, '');
  if (digits) {
    hash = (hash + parseInt(digits.slice(-8) || '0', 10)) >>> 0;
  }
  return (hash % 4_294_967_295) || 1;
}

export function calculateXrpPaymentAmount(usdTotal: number, orderId: string, rateUsd: number) {
  const baseDrops = Math.ceil((usdTotal / rateUsd) * DROPS_PER_XRP);
  const suffix = getOrderDropsSuffix(orderId);
  const amountDrops = baseDrops + suffix;

  return {
    amountXrp: amountDrops / DROPS_PER_XRP,
    amountDrops,
    suffixDrops: suffix,
    rateUsd,
    destinationTag: getOrderDestinationTag(orderId),
  };
}

export function buildXrpUri(address: string, amountXrp: number, destinationTag: number): string {
  const params = new URLSearchParams({
    amount: amountXrp.toFixed(6),
    dt: String(destinationTag),
  });
  return `xrp:${address}?${params.toString()}`;
}

export function buildXrpQrUrl(xrpUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(xrpUri)}`;
}

export async function createXrpPaymentDetails(
  orderId: string,
  usdTotal: number
): Promise<XrpPaymentDetails> {
  const address = getXrpWalletAddress();
  if (!address) {
    throw new Error('XRP wallet address is not configured');
  }

  const rateUsd = await fetchXrpUsdRate();
  const { amountXrp, amountDrops, destinationTag } = calculateXrpPaymentAmount(
    usdTotal,
    orderId,
    rateUsd
  );
  const expiresAt = new Date(Date.now() + getXrpPaymentExpiryMinutes() * 60_000).toISOString();
  const xrpUri = buildXrpUri(address, amountXrp, destinationTag);

  return {
    address,
    amountXrp,
    amountDrops,
    amountUsd: usdTotal,
    rateUsd,
    destinationTag,
    expiresAt,
    qrUrl: buildXrpQrUrl(xrpUri),
    xrpUri,
    orderId,
  };
}

interface XrplAccountTx {
  tx?: {
    TransactionType?: string;
    Destination?: string;
    Amount?: string | { currency?: string; value?: string };
    DestinationTag?: number;
    date?: number;
    hash?: string;
  };
  meta?: { TransactionResult?: string };
  validated?: boolean;
}

function isoToRippleEpoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000) - RIPPLE_EPOCH_OFFSET;
}

async function xrplAccountTransactions(address: string): Promise<XrplAccountTx[]> {
  const res = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'account_tx',
      params: [
        {
          account: address,
          binary: false,
          forward: true,
          limit: 40,
        },
      ],
    }),
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as { result?: { transactions?: XrplAccountTx[] } };
  return data.result?.transactions ?? [];
}

export async function checkXrpPaymentOnChain(
  address: string,
  expectedDrops: number,
  destinationTag: number,
  sinceIso: string
): Promise<{ found: boolean; txid?: string; confirmations: number; receivedDrops?: number }> {
  const sinceRipple = isoToRippleEpoch(sinceIso) - 120;
  const txs = await xrplAccountTransactions(address);

  for (const entry of txs) {
    const tx = entry.tx;
    if (!tx || tx.TransactionType !== 'Payment') continue;
    if (tx.Destination !== address) continue;
    if (entry.meta?.TransactionResult !== 'tesSUCCESS') continue;
    if (tx.date && tx.date < sinceRipple) continue;

    if (typeof tx.DestinationTag === 'number' && tx.DestinationTag !== destinationTag) continue;

    const amount = tx.Amount;
    if (typeof amount !== 'string') continue;

    const receivedDrops = parseInt(amount, 10);
    if (!Number.isFinite(receivedDrops) || receivedDrops < expectedDrops) continue;

    return {
      found: true,
      txid: tx.hash,
      confirmations: entry.validated ? 1 : 0,
      receivedDrops,
    };
  }

  return { found: false, confirmations: 0 };
}

export function isXrpPaymentExpired(expiresAt: string): boolean {
  return Date.now() > new Date(expiresAt).getTime();
}