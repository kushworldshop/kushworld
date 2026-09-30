'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminClient';

export default function AdminMediaField({
  label,
  value,
  onChange,
  kind = 'image',
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: 'image' | 'video' | 'any';
  hint?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const accept =
    kind === 'video' ? 'video/mp4,video/webm' : kind === 'any' ? 'image/*,video/mp4,video/webm' : 'image/*';

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', 'asset');
      const res = await adminFetch('/api/admin/site-content/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-2">{label}</label>
      {value && kind !== 'video' && !value.match(/\.(mp4|webm)(\?|$)/i) && (
        <div className="mb-2 h-24 w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {value && (kind === 'video' || value.match(/\.(mp4|webm)(\?|$)/i)) && (
        <video src={value} className="mb-2 h-24 w-full rounded-xl object-cover border border-zinc-800" muted />
      )}
      <input
        value={value}
        disabled={disabled || uploading}
        onChange={(event) => onChange(event.target.value)}
        placeholder={kind === 'video' ? '/site-uploads/clip.mp4' : '/site-uploads/photo.webp'}
        className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <label className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 cursor-pointer">
          {uploading ? 'Uploading...' : kind === 'video' ? 'Upload video' : 'Upload image'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-400"
          >
            Remove
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-zinc-500 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-300 mt-1">{error}</p>}
    </div>
  );
}
