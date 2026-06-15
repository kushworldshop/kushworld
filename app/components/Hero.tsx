'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Bare animated mascot logo — pure black bg only, no borders, no extra color, no framing. Tight gen so mascot fills and blends seamlessly as the logo graphic in the hero. Exact original mascot appearance. */}
        <div className="flex justify-center mb-3 -mt-10">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[94%] max-w-[620px] md:max-w-[720px] h-auto"
          >
            <source src="/mascot-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Big headline text like before — just the logo + the words, fits the hero perfectly */}
        <div className="mt-4">
          <h1 className="text-white text-[48px] md:text-[64px] font-black tracking-[-0.04em] leading-[0.9]">Premium Goods,</h1>
          <h2 className="text-white text-[48px] md:text-[64px] font-black tracking-[-0.04em] leading-[0.9] -mt-2">Delivered Right</h2>
        </div>
      </div>
    </section>
  );
}