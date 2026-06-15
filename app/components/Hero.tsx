'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated Mascot Video — raised high with big -mt, larger size for presence, centered, strong neon ring + outer black frame wrapper for pop + guaranteed black fill, no white anywhere */}
        <div className="flex justify-center mb-5 -mt-14">
          <div className="inline-block bg-black p-1 rounded-3xl border-4 border-black shadow-2xl ring-2 ring-[#00ff9d]/45 ring-offset-2 ring-offset-black">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-[94%] max-w-[680px] md:max-w-[820px] h-auto rounded-2xl bg-black block"
            >
              <source src="/mascot-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Tagline tight below mascot */}
        <p className="text-[#00ff9d] text-lg md:text-xl font-medium tracking-[0.2em] mt-3">
          PREMIUM GOODS • DISCREET DELIVERY
        </p>
      </div>
    </section>
  );
}