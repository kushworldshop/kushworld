export interface BtcPaymentDetails {
  address: string;
  amountBtc: number;
  amountSatoshis: number;
  amountUsd: number;
  rateUsd: number;
  expiresAt: string;
  qrUrl: string;
  bitcoinUri: string;
  orderId: string;
}

export interface BtcPaymentRecord {
  address: string;
  amountBtc: number;
  amountSatoshis: number;
  amountUsd: number;
  rateUsd: number;
  expiresAt: string;
  createdAt: string;
  txid?: string;
  confirmations?: number;
  paidAt?: string;
}

export function getBtcWalletAddress(): string {
  return process.env.BTC_WALLET_ADDRESS || '32Un3zH14ovKpSyfLWtk6pVex69CmSYVjp';
}

export function getBtcPaymentExpiryMinutes(): number {
  const minutes = Number(process.env.BTC_PAYMENT_EXPIRY_MINUTES || 30);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
}

export function getBtcMinConfirmations(): number {
  const confirmations = Number(process.env.BTC_MIN_CONFIRMATIONS || 1);
  return Number.isFinite(confirmations) && confirmations > 0 ? confirmations : 1;
}

export async function fetchBtcUsdRate(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error('Unable to fetch Bitcoin exchange rate');
  }

  const data = (await res.json()) as { bitcoin?: { usd?: number } };
  const rate = data.bitcoin?.usd;
  if (!rate || rate <= 0) {
    throw new Error('Invalid Bitcoin exchange rate');
  }

  return rate;
}

/** Unique satoshi suffix so payments to one address can be matched to orders */
function getOrderSatoshiSuffix(orderId: string): number {
  const digits = orderId.replace(/\D/g, '').slice(-6);
  const numeric = parseInt(digits || '1', 10);
  return (numeric % 999) + 1;
}

export function calculateBtcPaymentAmount(usdTotal: number, orderId: string, rateUsd: number) {
  const baseSats = Math.ceil((usdTotal / rateUsd) * 100_000_000);
  const suffix = getOrderSatoshiSuffix(orderId);
  const amountSatoshis = baseSats + suffix;

  return {
    amountBtc: amountSatoshis / 100_000_000,
    amountSatoshis,
    suffixSatoshis: suffix,
    rateUsd,
  };
}

export function buildBitcoinUri(address: string, amountBtc: number, label: string, message: string): string {
  const params = new URLSearchParams({
    amount: amountBtc.toFixed(8),
    label,
    message,
  });
  return `bitcoin:${address}?${params.toString()}`;
}

export function buildBtcQrUrl(bitcoinUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(bitcoinUri)}`;
}

export async function createBtcPaymentDetails(
  orderId: string,
  usdTotal: number
): Promise<BtcPaymentDetails> {
  const address = getBtcWalletAddress();
  const rateUsd = await fetchBtcUsdRate();
  const { amountBtc, amountSatoshis } = calculateBtcPaymentAmount(usdTotal, orderId, rateUsd);
  const expiresAt = new Date(Date.now() + getBtcPaymentExpiryMinutes() * 60_000).toISOString();
  const label = `Kush World ${orderId}`;
  const message = orderId;
  const bitcoinUri = buildBitcoinUri(address, amountBtc, label, message);

  return {
    address,
    amountBtc,
    amountSatoshis,
    amountUsd: usdTotal,
    rateUsd,
    expiresAt,
    qrUrl: buildBtcQrUrl(bitcoinUri),
    bitcoinUri,
    orderId,
  };
}

interface BlockstreamTx {
  txid: string;
  status?: { confirmed?: boolean; block_height?: number; block_time?: number };
  vout?: { scriptpubkey_address?: string; value: number }[];
}

export async function checkBtcPaymentOnChain(
  address: string,
  expectedSatoshis: number,
  sinceIso: string
): Promise<{ found: boolean; txid?: string; confirmations: number; receivedSatoshis?: number }> {
  const sinceUnix = Math.floor(new Date(sinceIso).getTime() / 1000) - 120;

  const res = await fetch(`https://blockstream.info/api/address/${address}/txs`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return { found: false, confirmations: 0 };
  }

  const txs = (await res.json()) as BlockstreamTx[];

  for (const tx of txs) {
    const blockTime = tx.status?.block_time;
    if (blockTime && blockTime < sinceUnix) continue;

    for (const output of tx.vout || []) {
      if (output.scriptpubkey_address !== address) continue;
      if (output.value < expectedSatoshis) continue;

      const confirmations = tx.status?.confirmed ? 1 : 0;
      return {
        found: true,
        txid: tx.txid,
        confirmations,
        receivedSatoshis: output.value,
      };
    }
  }

  return { found: false, confirmations: 0 };
}

export function isBtcPaymentExpired(expiresAt: string): boolean {
  return Date.now() > new Date(expiresAt).getTime();
}