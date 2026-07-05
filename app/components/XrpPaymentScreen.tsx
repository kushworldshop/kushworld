'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface XrpPaymentScreenProps {
  orderId: string;
  orderAccessToken: string;
  payment: {
    address: string;
    amountXrp: number;
    amountUsd: number;
    rateUsd: number;
    destinationTag: number;
    expiresAt: string;
    qrUrl: string;
  };
  onPaid: () => void;
}

export default function XrpPaymentScreen({
  orderId,
  orderAccessToken,
  payment,
  onPaid,
}: XrpPaymentScreenProps) {
  const [status, setStatus] = useState<'awaiting' | 'confirming' | 'paid' | 'expired'>('awaiting');
  const [confirmations, setConfirmations] = useState(0);
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState<'address' | 'amount' | 'tag' | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(payment.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        setStatus('expired');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [payment.expiresAt]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/payments/xrp/status?orderId=${encodeURIComponent(orderId)}&orderAccessToken=${encodeURIComponent(orderAccessToken)}`
        );
        const data = await res.json();
        if (!active || !res.ok) return;

        if (data.status === 'paid') {
          setStatus('paid');
          setTxid(data.txid || '');
          setConfirmations(data.confirmations || 1);
          onPaid();
          return;
        }

        if (data.status === 'expired') {
          setStatus('expired');
          return;
        }

        if (data.status === 'confirming') {
          setStatus('confirming');
          setTxid(data.txid || '');
          setConfirmations(data.confirmations || 0);
        } else {
          setStatus('awaiting');
        }
      } catch {
        // keep polling
      }
    };

    poll();
    const interval = setInterval(poll, 12000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderId, orderAccessToken, onPaid]);

  const copyText = async (value: string, key: 'address' | 'amount' | 'tag') => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-lg w-full bg-zinc-900 border border-[#00ff9d]/30 rounded-3xl p-8">
      <div className="text-center mb-6">
        <p className="text-[#00ff9d] text-sm uppercase tracking-widest mb-2">XRP Payment</p>
        <h2 className="text-3xl font-bold mb-2">Send Exact Amount</h2>
        <p className="text-zinc-400 text-sm">
          Order <span className="font-mono text-white">{orderId}</span>
        </p>
      </div>

      <div className="bg-black rounded-2xl p-6 text-center mb-6 border border-zinc-800">
        <p className="text-4xl font-bold text-[#00ff9d] mb-1">{payment.amountXrp.toFixed(6)} XRP</p>
        <p className="text-zinc-400">${payment.amountUsd.toFixed(2)} USD</p>
        <p className="text-xs text-zinc-500 mt-2">Rate: ${payment.rateUsd.toLocaleString()} / XRP</p>
      </div>

      <div className="flex justify-center mb-6">
        <Image
          src={payment.qrUrl}
          alt="XRP QR code"
          width={280}
          height={280}
          className="rounded-2xl border border-zinc-700"
          unoptimized
        />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-xs text-zinc-500 mb-2">XRP address</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={payment.address}
              className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-xs font-mono"
            />
            <button
              onClick={() => copyText(payment.address, 'address')}
              className="px-4 py-3 bg-zinc-800 rounded-xl text-sm"
            >
              {copied === 'address' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">Destination tag (required)</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={String(payment.destinationTag)}
              className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono"
            />
            <button
              onClick={() => copyText(String(payment.destinationTag), 'tag')}
              className="px-4 py-3 bg-zinc-800 rounded-xl text-sm"
            >
              {copied === 'tag' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">Amount (XRP)</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={payment.amountXrp.toFixed(6)}
              className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono"
            />
            <button
              onClick={() => copyText(payment.amountXrp.toFixed(6), 'amount')}
              className="px-4 py-3 bg-zinc-800 rounded-xl text-sm"
            >
              {copied === 'amount' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 mb-6 text-sm text-zinc-400 space-y-2">
        <p>1. Open your XRP wallet (Xaman, Trust Wallet, Coinbase, etc.) and scan the QR code.</p>
        <p>
          2. Send the <strong className="text-white">exact XRP amount</strong> and include the{' '}
          <strong className="text-white">destination tag</strong>.
        </p>
        <p>3. Payment is detected automatically on the XRP Ledger.</p>
        <p className="text-yellow-400">Send only XRP on the XRP Ledger. Wrong network or missing tag may delay matching.</p>
      </div>

      <div className="text-center">
        {status === 'paid' && (
          <p className="text-green-400 font-semibold mb-2">Payment received. Thank you!</p>
        )}
        {status === 'confirming' && (
          <p className="text-yellow-400 font-semibold mb-2">
            Payment detected — waiting for confirmation ({confirmations})
          </p>
        )}
        {status === 'awaiting' && (
          <p className="text-[#00ff9d] font-semibold mb-2 animate-pulse">Waiting for XRP payment...</p>
        )}
        {status === 'expired' && (
          <p className="text-red-400 font-semibold mb-2">
            This invoice expired. Contact support with order {orderId}.
          </p>
        )}
        {status !== 'expired' && (
          <p className="text-xs text-zinc-500">Invoice expires in {timeLeft}</p>
        )}
        {txid && <p className="text-xs text-zinc-500 mt-2 font-mono break-all">Tx: {txid}</p>}
      </div>
    </div>
  );
}