'use client';

import { useState } from 'react';
import type { PublicUserProfile } from '@/lib/users';

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg/48HmtfDgQp';

export default function DiscordCommunityAccess({
  user,
  onUpdated,
}: {
  user: PublicUserProfile;
  onUpdated: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const idVerified =
    user.idVerified || user.idVerification?.status === 'verified';
  const idPending = user.idVerification?.status === 'uploaded';
  const idRejected = user.idVerification?.status === 'rejected';

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/users/discord-sync', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Discord Verified role applied. Refresh Discord to see unlocked channels.');
        onUpdated();
      } else if (data.reason === 'not_in_guild') {
        setError('Join the Discord server first, then tap Sync again.');
      } else if (data.reason === 'not_id_verified') {
        setError('Staff must approve your government ID on the site before Discord unlocks.');
      } else if (data.reason === 'no_discord_linked') {
        setError('Link your Discord account using Continue with Discord above.');
      } else {
        setError(data.message || data.error || 'Could not sync Discord access.');
      }
    } catch {
      setError('Could not sync Discord access.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Discord community access</h3>
        <p className="text-sm text-zinc-400 mt-1">
          Link Discord here and get staff ID approval on the site. When you join the Discord server, Verified is
          applied automatically — no button needed in most cases.
        </p>
      </div>

      <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
        <li>
          <span className={user.discordLinked ? 'text-[#00ff9d]' : ''}>
            Link Discord {user.discordLinked ? '✓' : '— use Link Discord under Social Links'}
          </span>
        </li>
        <li>
          <span className={idVerified ? 'text-[#00ff9d]' : idPending ? 'text-yellow-400' : ''}>
            Upload government ID {idVerified ? '✓ verified' : idPending ? '— pending staff review' : idRejected ? '— rejected, re-upload' : '— required'}
          </span>
        </li>
        <li>
          <span className={user.discordServerVerified ? 'text-[#00ff9d]' : ''}>
            Join Discord — Verified applies automatically {user.discordServerVerified ? '✓' : ''}
          </span>
        </li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white px-5 py-3 rounded-xl font-semibold text-sm"
        >
          <i className="fa-brands fa-discord" aria-hidden />
          Join Discord
        </a>
        {user.discordLinked && idVerified && (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : user.discordServerVerified ? 'Re-sync' : 'Sync now (backup)'}
          </button>
        )}
      </div>

      {user.discordVerifySyncPending && !user.discordServerVerified && (
        <p className="text-sm text-yellow-400">
          You are ID-verified on the site. Join the Discord server — Verified should apply within seconds. If
          channels stay locked, use Sync now (backup).
        </p>
      )}
      {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}