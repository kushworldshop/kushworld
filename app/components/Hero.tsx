'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated mascot logo with transparent background (pure black fill removed in render, clean cutout edges, no white borders or framing). Bare element so it blends as native site graphic. Position kept perfect. */}
        <div className="flex justify-center mb-5 -mt-14">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[96%] max-w-[740px] md:max-w-[900px] h-auto"
          >
            <source src="/mascot-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Big headline text like before — just the logo + the words */}
        <div className="mt-6">
          <h1 className="text-white text-[52px] md:text-[68px] font-black tracking-[-0.04em] leading-[0.9]">Premium Goods,</h1>
          <h2 className="text-white text-[52px] md:text-[68px] font-black tracking-[-0.04em] leading-[0.9] -mt-2">Delivered Right</h2>
        </div>
      </div>
    </section>
  );
}