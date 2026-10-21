export interface ParsedBitcoinWallet {
  address: string;
  httpLink: string;
}

const ADDRESS_RE = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/i;
const ADDRESS_IN_TEXT_RE = /(?:^|[^a-zA-Z0-9])((?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90})(?:$|[^a-zA-Z0-9])/i;

function extractAddress(value: string): string {
  const trimmed = value.trim();
  if (ADDRESS_RE.test(trimmed)) return trimmed;
  const match = trimmed.match(ADDRESS_IN_TEXT_RE);
  return match?.[1] || '';
}

/** Accept a raw BTC address, bitcoin: URI, or https wallet/explorer link. */
export function parseBitcoinWalletInput(raw: string): ParsedBitcoinWallet {
  const value = String(raw || '').trim();
  if (!value) return { address: '', httpLink: '' };

  if (/^https?:\/\//i.test(value)) {
    return { address: extractAddress(value), httpLink: value };
  }

  if (value.toLowerCase().startsWith('bitcoin:')) {
    const rest = value.slice('bitcoin:'.length).replace(/^\/\//, '');
    const address = decodeURIComponent(rest.split('?')[0] || '').trim();
    return { address: extractAddress(address) || address, httpLink: '' };
  }

  return { address: extractAddress(value) || value, httpLink: '' };
}

export function isLikelyBitcoinAddress(address: string): boolean {
  return ADDRESS_RE.test(address.trim());
}
