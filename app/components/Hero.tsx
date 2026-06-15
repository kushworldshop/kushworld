'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-black overflow-hidden">
      {/* Subtle background effect if you want */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-zinc-950/40 to-black/80"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated Mascot Video - Centered, larger to be visible, raised with negative margin, black border/ring to pop on dark bg, no white borders */}
        <div className="flex justify-center mb-6 -mt-8">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[92%] max-w-[620px] md:max-w-[720px] h-auto rounded-3xl border-4 border-zinc-800 shadow-2xl ring-1 ring-[#00ff9d]/30"
          >
            <source src="/mascot-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Optional Tagline Below Logo */}
        <p className="text-[#00ff9d] text-xl md:text-2xl font-medium tracking-widest mt-4">
          PREMIUM GOODS • DISCREET DELIVERY
        </p>


      </div>
    </section>
  );
}