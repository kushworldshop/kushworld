'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteContent } from '@/lib/useSiteContent';
import { normalizeDiscordInviteUrl } from '@/lib/discordInvite';

export default function HitTheShop() {
  const pathname = usePathname();
  const { content } = useSiteContent();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith('/admin')) return null;

  const discordUrl = normalizeDiscordInviteUrl(content.social.discordUrl);
  const whatsappUrl = content.social.whatsappUrl?.trim();
  if (!discordUrl && !whatsappUrl) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[45] flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 bg-zinc-950 border border-zinc-700 rounded-3xl p-4 shadow-2xl">
          <p className="text-xs uppercase tracking-widest text-[#00ff9d] mb-1">Hit the Shop</p>
          <p className="text-sm text-zinc-400 mb-4">Drops, tracking, what&apos;s on the board.</p>
          <div className="space-y-2">
            {discordUrl && (
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-zinc-900 hover:border-[#00ff9d] border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-medium transition"
              >
                <i className="fa-brands fa-discord text-[#00ff9d]" />
                Discord
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-zinc-900 hover:border-[#00ff9d] border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-medium transition"
              >
                <i className="fa-brands fa-whatsapp text-[#00ff9d]" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-14 w-14 rounded-full bg-[#00ff9d] text-black shadow-lg shadow-[#00ff9d]/20 hover:scale-105 active:scale-95 transition flex items-center justify-center"
        aria-expanded={open}
        aria-label={open ? 'Close shop chat' : 'Hit the Shop'}
      >
        <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-comments'} text-xl`} />
      </button>
    </div>
  );
}
