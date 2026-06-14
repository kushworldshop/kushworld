'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import type { FreeEighthRecipient } from '@/lib/firstOrderBonusServer';

export default function FirstOrderBonusTab() {
  const [recipients, setRecipients] = useState<FreeEighthRecipient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadRecipients = async (query = search) => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const res = await adminFetch(`/api/admin/first-order-bonuses?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRecipients(data.recipients || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load free 1/8th recipients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients('');
  }, []);

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <h2 className="text-2xl font-bold mb-2">Free 1/8th — First Orders</h2>
        <p className="text-zinc-400 text-sm max-w-3xl">
          New customers with hemp in their cart automatically receive a free 1/8th at checkout. This
          list tracks every client who received the bonus.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRecipients(search)}
            placeholder="Search email, name, or order #"
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <button
            onClick={() => loadRecipients(search)}
            className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-medium"
          >
            Search
          </button>
          <button
            onClick={() => {
              setSearch('');
              loadRecipients('');
            }}
            className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl text-sm"
          >
            Refresh
          </button>
        </div>

        {message && <p className="text-sm text-red-400 mb-4">{message}</p>}

        {loading ? (
          <p className="text-center py-16 text-zinc-400">Loading recipients...</p>
        ) : recipients.length === 0 ? (
          <p className="text-center py-16 text-zinc-500">No free 1/8th bonuses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Order status</th>
                  <th className="pb-3 pr-4">Order total</th>
                  <th className="pb-3 pr-2">Granted</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((entry) => (
                  <tr key={`${entry.orderId}-${entry.email}`} className="border-b border-zinc-800/80">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{entry.name || '—'}</p>
                      <p className="text-zinc-500">{entry.email}</p>
                      {entry.userId && <p className="text-xs text-zinc-600 font-mono">{entry.userId}</p>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[#00ff9d]">#{entry.orderId}</td>
                    <td className="py-3 pr-4 capitalize text-zinc-400">{entry.orderStatus || 'pending'}</td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {entry.orderTotal !== undefined ? `$${entry.orderTotal.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 pr-2 text-zinc-400 whitespace-nowrap">
                      {new Date(entry.grantedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}