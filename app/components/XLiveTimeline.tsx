'use client';

import { useEffect, useRef } from 'react';
import { KUSH_WORLD_X_HANDLE } from '@/lib/xHandle';

declare global {
  interface Window {
    twttr?: { widgets?: { load: (el?: HTMLElement) => void } };
  }
}

export default function XLiveTimeline({
  title = `@${KUSH_WORLD_X_HANDLE} live`,
}: {
  title?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kw-x-widgets="1"]');
    const load = () => window.twttr?.widgets?.load(boxRef.current || undefined);

    if (existing) {
      load();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.dataset.kwXWidgets = '1';
    script.onload = load;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="bg-zinc-900 border border-[#00ff9d]/20 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <a
          href={`https://x.com/${KUSH_WORLD_X_HANDLE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#00ff9d] hover:underline"
        >
          Open on X
        </a>
      </div>
      <div ref={boxRef} className="min-h-[420px] overflow-hidden rounded-xl bg-black">
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter noborders transparent"
          data-tweet-limit="8"
          href={`https://x.com/${KUSH_WORLD_X_HANDLE}`}
        >
          Posts from @{KUSH_WORLD_X_HANDLE}
        </a>
      </div>
    </div>
  );
}
