'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SHOP_VIBES } from '@/lib/productVibes';
import { useSiteContent } from '@/lib/useSiteContent';

const VIBE_PROMPTS = [
  'I want something relaxing for sleep',
  'I need focus for work',
  'Something social for hanging out',
  'Help me pick a flower strain',
];

export default function GrokVibePicker() {
  const { content } = useSiteContent();
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!content.features.grokAssistant.enabled) return null;

  const ask = async (message: string) => {
    const text = message.trim();
    if (!text || loading) return;

    setLoading(true);
    setError('');
    setReply('');

    try {
      const res = await fetch('/api/grok/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'shop', message: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not reach Grok');
        return;
      }
      setReply(String(data.reply || ''));
      setInput('');
    } catch {
      setError('Could not reach Grok. Try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mb-10 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6">
      <div className="text-center mb-5">
        <p className="text-[#00ff9d] text-xs uppercase tracking-[0.25em] mb-2">Find Your Vibe</p>
        <h3 className="text-2xl font-bold">What do you want to feel?</h3>
        <p className="text-sm text-zinc-400 mt-2">Ask Grok for strain picks from our live catalog.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {SHOP_VIBES.map((vibe) => (
          <button
            key={vibe.id}
            type="button"
            onClick={() => ask(`Recommend hemp products for ${vibe.label.toLowerCase()}`)}
            className="px-3 py-1.5 rounded-full text-xs bg-zinc-800 hover:bg-zinc-700 transition"
          >
            {vibe.emoji} {vibe.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="e.g. indica for sleep, exotic flower under $100..."
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#00ff9d]"
        />
        <button
          type="button"
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-[#00ff9d] text-black font-bold rounded-2xl disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {VIBE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            className="text-xs text-zinc-500 hover:text-[#00ff9d] transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      {reply && (
        <div className="mt-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-sm text-zinc-300 whitespace-pre-wrap">
          {reply}
          <div className="mt-3">
            <Link href="/shop/flower" className="text-[#00ff9d] font-semibold hover:underline">
              Browse flower →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}