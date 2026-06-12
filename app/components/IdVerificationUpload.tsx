'use client';

import { useRef, useState } from 'react';
import type { PublicUserProfile } from '@/lib/users';

export default function IdVerificationUpload({
  user,
  onUpdated,
}: {
  user: PublicUserProfile;
  onUpdated: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const status = user.idVerification?.status ?? (user.idVerified ? 'verified' : 'none');

  const handleUpload = async (file: File) => {
    setUploading(true);
    setMessage('');
    setError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const type = file.type || 'image/jpeg';
    if (!allowedTypes.includes(type)) {
      setError('Upload a JPG, PNG, or WEBP image of your government-issued ID.');
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError('Image must be under 5MB. Try a smaller photo or lower your camera resolution.');
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('idImage', file);

    try {
      const res = await fetch('/api/users/id-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const raw = await res.text();
      let data: {
        error?: string;
        message?: string;
        idVerification?: { status?: string; rejectionReason?: string };
      } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        if (res.status === 413) {
          setError('Image is too large for the server. Use a photo under 5MB.');
          return;
        }
        setError('Upload failed. Please try again.');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        if (data.idVerification?.status === 'rejected') {
          onUpdated();
        }
        return;
      }
      setMessage(data.message || 'ID uploaded successfully.');
      onUpdated();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-lg font-semibold mb-2">21+ ID Verification</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Upload a clear photo of your government-issued ID now to speed up future hemp orders. Images are
        encrypted at rest and only reviewed by Kush World staff.
      </p>

      {status === 'verified' || user.idVerified ? (
        <div className="flex items-center gap-3 text-sm text-green-400 bg-green-950/30 border border-green-900 rounded-xl px-4 py-3">
          <span className="text-lg">✓</span>
          <span>Your ID is verified. You can checkout hemp products without re-uploading.</span>
        </div>
      ) : status === 'uploaded' ? (
        <div className="space-y-3">
          <div className="text-sm text-yellow-400 bg-yellow-950/30 border border-yellow-900 rounded-xl px-4 py-3">
            ID submitted — pending review. We typically verify within 1 business day.
            {user.idVerification?.uploadedAt && (
              <span className="block text-xs text-zinc-500 mt-1">
                Uploaded {new Date(user.idVerification.uploadedAt).toLocaleString()}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Replace ID photo'}
          </button>
        </div>
      ) : status === 'rejected' ? (
        <div className="space-y-3">
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-xl px-4 py-3">
            Your ID was not approved.
            {user.idVerification?.rejectionReason && (
              <span className="block mt-1">Reason: {user.idVerification.rejectionReason}</span>
            )}
            Please upload a clearer photo.
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-[#00ff9d] text-black px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload New ID'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-[#00ff9d] text-black px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload ID Photo'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      <p className="text-xs text-zinc-600 mt-3">JPG, PNG, or WEBP · Max 5MB · 21+ only</p>
      {message && <p className="text-sm text-[#00ff9d] mt-3">{message}</p>}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );
}