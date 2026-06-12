'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface PaymentConfig {
  configured: boolean;
  apiLoginId: string;
  clientKey: string;
  acceptJsUrl: string;
  environment: string;
}

interface CreditCardFormProps {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cardCode: string;
  onCardNumberChange: (value: string) => void;
  onExpMonthChange: (value: string) => void;
  onExpYearChange: (value: string) => void;
  onCardCodeChange: (value: string) => void;
  onReadyChange: (ready: boolean) => void;
}

export function tokenizeCard(
  config: PaymentConfig,
  cardData: { cardNumber: string; expMonth: string; expYear: string; cardCode: string }
): Promise<AcceptOpaqueData> {
  return new Promise((resolve, reject) => {
    if (!window.Accept) {
      reject(new Error('Payment system is still loading. Please wait a moment.'));
      return;
    }

    window.Accept.dispatchData(
      {
        authData: {
          clientKey: config.clientKey,
          apiLoginID: config.apiLoginId,
        },
        cardData: {
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          month: cardData.expMonth,
          year: cardData.expYear,
          cardCode: cardData.cardCode,
        },
      },
      (response) => {
        if (response.messages.resultCode === 'Error') {
          reject(new Error(response.messages.message[0]?.text || 'Card validation failed'));
          return;
        }
        if (!response.opaqueData) {
          reject(new Error('Failed to tokenize card'));
          return;
        }
        resolve(response.opaqueData);
      }
    );
  });
}

export default function CreditCardForm({
  cardNumber,
  expMonth,
  expYear,
  cardCode,
  onCardNumberChange,
  onExpMonthChange,
  onExpYearChange,
  onCardCodeChange,
  onReadyChange,
}: CreditCardFormProps) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/payments/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        if (!data.configured) {
          setError('Credit card payments are not configured yet.');
          onReadyChange(false);
        }
      })
      .catch(() => {
        setError('Unable to load payment configuration.');
        onReadyChange(false);
      });
  }, [onReadyChange]);

  useEffect(() => {
    onReadyChange(Boolean(config?.configured && scriptLoaded && window.Accept));
  }, [config, scriptLoaded, onReadyChange]);

  if (!config) {
    return <p className="text-sm text-zinc-400">Loading secure payment form...</p>;
  }

  if (!config.configured) {
    return (
      <div className="p-4 bg-zinc-900 border border-yellow-600/40 rounded-2xl text-sm text-yellow-400">
        Credit card payments are not set up yet. Add your Authorize.net API keys to enable card checkout.
      </div>
    );
  }

  return (
    <>
      <Script
        src={config.acceptJsUrl}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => {
          setError('Failed to load secure payment library.');
          onReadyChange(false);
        }}
      />

      <div className="space-y-4">
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">CARD NUMBER</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4111 1111 1111 1111"
            value={cardNumber}
            onChange={(e) => onCardNumberChange(e.target.value)}
            className="w-full bg-zinc-900 p-4 rounded-2xl"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">MONTH</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              placeholder="MM"
              value={expMonth}
              onChange={(e) => onExpMonthChange(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full bg-zinc-900 p-4 rounded-2xl"
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">YEAR</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              placeholder="YYYY"
              value={expYear}
              onChange={(e) => onExpYearChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full bg-zinc-900 p-4 rounded-2xl"
              maxLength={4}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">CVV</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={cardCode}
              onChange={(e) => onCardCodeChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full bg-zinc-900 p-4 rounded-2xl"
              maxLength={4}
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Secured by Authorize.net • {config.environment === 'sandbox' ? 'Sandbox mode' : 'Live payments'}
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </>
  );
}