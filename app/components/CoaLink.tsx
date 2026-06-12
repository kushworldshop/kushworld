'use client';

import { useEffect, useState } from 'react';

interface CoaLinkProps {
  coaPdf: string;
  productName: string;
}

export default function CoaLink({ coaPdf, productName }: CoaLinkProps) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(coaPdf, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setAvailable(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coaPdf]);

  if (available === null) {
    return (
      <p className="text-xs text-zinc-500 mt-3 flex items-center gap-2">
        <i className="fa-solid fa-file-pdf text-zinc-600" />
        Checking lab COA...
      </p>
    );
  }

  if (!available) {
    return (
      <p className="text-xs text-zinc-500 mt-3 flex items-center gap-2">
        <i className="fa-solid fa-file-pdf text-zinc-600" />
        Lab COA coming soon
      </p>
    );
  }

  return (
    <a
      href={coaPdf}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#00ff9d]/30 bg-black/40 text-sm text-[#00ff9d] hover:bg-[#00ff9d]/10 transition"
      aria-label={`View lab COA for ${productName}`}
    >
      <i className="fa-solid fa-file-pdf" />
      View Lab COA (PDF)
    </a>
  );
}