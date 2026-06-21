'use client';

import type { PublicUserProfile } from '@/lib/users';

export default function DiscordSocialLink({
  user,
  enabled,
}: {
  user: PublicUserProfile;
  enabled: boolean;
}) {
  if (!enabled) return null;

  const linkHref = '/api/auth/discord?mode=link&returnTo=/account%3Ftab%3Dprofile';

  return (
    <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/20 text-[#5865F2]">
            <i className="fa-brands fa-discord text-lg" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Discord</p>
            {user.discordLinked ? (
              <p className="text-sm text-[#00ff9d] truncate">
                Linked as @{user.discordUsername || 'connected'}
                {user.discordServerVerified ? ' · server verified' : ''}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">Connect for community access & order perks</p>
            )}
          </div>
        </div>

        {user.discordLinked ? (
          <a
            href={linkHref}
            className="text-sm text-zinc-400 hover:text-[#00ff9d] transition shrink-0"
          >
            Re-link
          </a>
        ) : (
          <a
            href={linkHref}
            className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shrink-0"
          >
            <i className="fa-brands fa-discord" aria-hidden />
            Link Discord
          </a>
        )}
      </div>
    </div>
  );
}