'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface BtcPaymentScreenProps {
  orderId: string;
  orderAccessToken: string;
  payment: {
    address: string;
    amountBtc: number;
    amountUsd: number;
    rateUsd: number;
    expiresAt: string;
    qrUrl: string;
  };
  onPaid: () => void;
}

export default function BtcPaymentScreen({
  orderId,
  orderAccessToken,
  payment,
  onPaid,
}: BtcPaymentScreenProps) {
  const [status, setStatus] = useState<'awaiting' | 'confirming' | 'paid' | 'expired'>('awaiting');
  const [confirmations, setConfirmations] = useState(0);
  const [txid, setTxid] = useState('');
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null);
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
          `/api/payments/btc/status?orderId=${encodeURIComponent(orderId)}&orderAccessToken=${encodeURIComponent(orderAccessToken)}`
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

  const copyText = async (value: string, key: 'address' | 'amount') => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-lg w-full bg-zinc-900 border border-[#00ff9d]/30 rounded-3xl p-8">
      <div className="text-center mb-6">
        <p className="text-[#00ff9d] text-sm uppercase tracking-widest mb-2">Bitcoin Payment</p>
        <h2 className="text-3xl font-bold mb-2">Send Exact Amount</h2>
        <p className="text-zinc-400 text-sm">
          Order <span className="font-mono text-white">{orderId}</span>
        </p>
      </div>

      <div className="bg-black rounded-2xl p-6 text-center mb-6 border border-zinc-800">
        <p className="text-4xl font-bold text-[#00ff9d] mb-1">{payment.amountBtc.toFixed(8)} BTC</p>
        <p className="text-zinc-400">${payment.amountUsd.toFixed(2)} USD</p>
        <p className="text-xs text-zinc-500 mt-2">Rate: ${payment.rateUsd.toLocaleString()} / BTC</p>
      </div>

      <div className="flex justify-center mb-6">
        <Image
          src={payment.qrUrl}
          alt="Bitcoin QR code"
          width={280}
          height={280}
          className="rounded-2xl border border-zinc-700"
          unoptimized
        />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-xs text-zinc-500 mb-2">Bitcoin address</p>
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
          <p className="text-xs text-zinc-500 mb-2">Amount (BTC)</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={payment.amountBtc.toFixed(8)}
              className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono"
            />
            <button
              onClick={() => copyText(payment.amountBtc.toFixed(8), 'amount')}
              className="px-4 py-3 bg-zinc-800 rounded-xl text-sm"
            >
              {copied === 'amount' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 mb-6 text-sm text-zinc-400 space-y-2">
        <p>1. Open your Bitcoin wallet and scan the QR code.</p>
        <p>2. Send the <strong className="text-white">exact BTC amount</strong> shown above.</p>
        <p>3. Payment is detected automatically — no need to email us.</p>
        <p className="text-yellow-400">Send only BTC. Other coins sent to this address may be lost.</p>
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
          <p className="text-[#00ff9d] font-semibold mb-2 animate-pulse">Waiting for Bitcoin payment...</p>
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