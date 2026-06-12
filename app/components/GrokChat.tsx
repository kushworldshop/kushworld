'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import type { GrokChatMessage, GrokChatMode } from '@/lib/grokAssistant';

type GrokChatProps = {
  mode: GrokChatMode;
  title: string;
  subtitle?: string;
  placeholder?: string;
  productSlug?: string;
  adminTask?: string;
  adminContext?: Record<string, unknown>;
  contentType?: string;
  existingText?: string;
  suggestedPrompts?: string[];
  useAdminAuth?: boolean;
  onContentGenerated?: (text: string) => void;
};

export default function GrokChat({
  mode,
  title,
  subtitle,
  placeholder = 'Ask Grok...',
  productSlug,
  adminTask,
  adminContext,
  contentType,
  existingText,
  suggestedPrompts = [],
  useAdminAuth = false,
  onContentGenerated,
}: GrokChatProps) {
  const [history, setHistory] = useState<GrokChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;

    setLoading(true);
    setError('');

    try {
      const fetcher = useAdminAuth ? adminFetch : fetch;
      const res = await fetcher('/api/grok/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          message,
          history,
          productSlug,
          adminTask,
          adminContext,
          contentType,
          existingText,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Could not reach Grok');
        return;
      }

      const reply = String(data.reply || '');
      setHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: reply },
      ]);
      setInput('');
      if (mode === 'content' && onContentGenerated) {
        onContentGenerated(reply);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-[#00ff9d]">✦</span> {title}
        </h3>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>

      {history.length > 0 && (
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
          {history.map((entry, index) => (
            <div
              key={`${entry.role}-${index}`}
              className={`text-sm rounded-xl px-4 py-3 whitespace-pre-wrap ${
                entry.role === 'user'
                  ? 'bg-black border border-zinc-800 text-zinc-200 ml-8'
                  : 'bg-[#00ff9d]/10 border border-[#00ff9d]/20 text-zinc-100 mr-8'
              }`}
            >
              {entry.content}
            </div>
          ))}
        </div>
      )}

      {suggestedPrompts.length > 0 && history.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              disabled={loading}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full px-3 py-1.5 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-[#00ff9d] text-black px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );
}