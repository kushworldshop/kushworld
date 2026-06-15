'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Static mascot logo - reverted to pre-video version. Centered logo graphic on black with the headline text below. Clean, no animation, no video element, no borders or surrounding issues. */}
        <div className="flex justify-center mb-2 -mt-12">
          <img
            src="/logo.png"
            alt="Kush World Mascot"
            className="w-[96%] max-w-[680px] md:max-w-[780px] h-auto"
          />
        </div>

        {/* Big headline text like before — just the logo + the words, perfectly balanced in hero */}
        <div className="mt-3">
          <h1 className="text-white text-[48px] md:text-[64px] font-black tracking-[-0.04em] leading-[0.9]">Premium Goods,</h1>
          <h2 className="text-white text-[48px] md:text-[64px] font-black tracking-[-0.04em] leading-[0.9] -mt-2">Delivered Right</h2>
        </div>
      </div>
    </section>
  );
}