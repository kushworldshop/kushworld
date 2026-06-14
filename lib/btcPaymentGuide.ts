export interface BtcPlatformGuide {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
  steps: string[];
  tips?: string[];
}

export const BTC_CHECKOUT_REMINDERS = [
  'Copy the exact BTC amount from your Kush World order — do not round up or down.',
  'Paste our Bitcoin address or scan the QR code on the payment screen.',
  'Send only Bitcoin (BTC). Sending other coins (ETH, USDT, etc.) can be lost.',
  'Payment is detected automatically — you do not need to email a screenshot.',
];

export const BTC_PLATFORM_GUIDES: BtcPlatformGuide[] = [
  {
    id: 'cashapp',
    name: 'Cash App',
    tagline: 'Most popular — great if you already use Cash App for everyday payments.',
    popular: true,
    steps: [
      'Open Cash App and make sure you are verified for Bitcoin (ID verification may be required).',
      'Tap the Bitcoin (₿) tab on the home screen.',
      'If your balance is too low, tap Buy → enter the USD amount you need → confirm purchase.',
      'Tap Send → Send Bitcoin.',
      'Paste the Kush World Bitcoin address from checkout (or tap Scan QR and scan our payment screen).',
      'Enter the exact BTC amount shown on your Kush World order — match every decimal.',
      'Review the network fee, then swipe or tap Pay to send.',
    ],
    tips: [
      'Cash App may show a network fee on top of your order total — that fee is separate from your Kush World payment.',
      'If Send Bitcoin is greyed out, finish Bitcoin verification under the Bitcoin tab first.',
    ],
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    tagline: 'Straightforward if you already hold BTC in Coinbase.',
    steps: [
      'Open the Coinbase app and sign in.',
      'Tap Send & Receive → Send.',
      'Select Bitcoin (BTC).',
      'Paste the Kush World address or scan the QR code from your order.',
      'Enter the exact BTC amount from your Kush World checkout.',
      'Confirm the transaction and complete any security prompts (2FA, etc.).',
    ],
    tips: ['Coinbase may hold new accounts for a short security period before sends are allowed.'],
  },
  {
    id: 'venmo',
    name: 'Venmo',
    tagline: 'Available in supported regions for users with crypto enabled.',
    steps: [
      'Open Venmo and go to the Crypto section (if you do not see it, crypto may not be available in your area yet).',
      'Select Bitcoin.',
      'Tap Send or Transfer out.',
      'Paste the Kush World Bitcoin address or scan our QR code.',
      'Enter the exact BTC amount from your order and confirm.',
    ],
    tips: ['Venmo crypto features vary by state — use Cash App or Coinbase if Bitcoin is not shown.'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    tagline: 'Works for PayPal users with crypto balances.',
    steps: [
      'Open PayPal → Finances or Crypto.',
      'Select Bitcoin → Send.',
      'Paste the Kush World address or scan the QR code.',
      'Enter the exact BTC amount from checkout and confirm.',
    ],
  },
  {
    id: 'strike',
    name: 'Strike',
    tagline: 'Low-fee sends for users already on Strike.',
    steps: [
      'Open Strike → Bitcoin.',
      'Choose Send.',
      'Paste the Kush World address or scan the QR code.',
      'Enter the exact BTC amount and confirm.',
    ],
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    tagline: 'For customers who bought BTC inside Robinhood.',
    steps: [
      'Open Robinhood → Crypto → Bitcoin.',
      'Tap Send (withdraw to an external wallet if prompted).',
      'Paste the Kush World Bitcoin address.',
      'Enter the exact BTC amount from your order and confirm.',
    ],
    tips: ['Robinhood may require enabling withdrawals to external wallets first.'],
  },
  {
    id: 'wallet',
    name: 'Any Bitcoin wallet',
    tagline: 'Exodus, BlueWallet, Ledger, Trezor, or any app that can send BTC.',
    steps: [
      'Open your wallet app and choose Send Bitcoin.',
      'Scan the QR code on the Kush World payment screen or paste the address manually.',
      'Enter the exact BTC amount — double-check decimals.',
      'Confirm and broadcast the transaction.',
    ],
  },
];

export const DEFAULT_BTC_GUIDE_YOUTUBE_URL =
  'https://www.youtube.com/results?search_query=how+to+send+bitcoin+cash+app';

export function normalizeYoutubeGuideUrl(url?: string): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) return trimmed;
  return null;
}