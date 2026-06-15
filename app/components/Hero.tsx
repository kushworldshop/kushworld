'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated Mascot Logo — position perfect per feedback. Integrated as premium brand mark (not a boxed video player): soft glow + elegant thin neon accent line below for site design lockup. New render uses actual mouth + realistic smoke. */}
        <div className="flex justify-center mb-5 -mt-14">
          <div className="relative">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-[96%] max-w-[740px] md:max-w-[900px] h-auto rounded-3xl bg-black"
              style={{ filter: 'contrast(1.06) brightness(1.03)', boxShadow: '0 25px 70px -20px rgba(0,0,0,0.9), 0 0 55px -8px rgba(0,255,157,0.18)' }}
            >
              <source src="/mascot-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Thin elegant neon accent line — turns the animated mascot into a designed logo lockup, not a YouTube-style video embed */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-[#00ff9d]/65 to-transparent rounded-full" />
          </div>
        </div>

        {/* Tagline — part of the logo lockup */}
        <p className="text-[#00ff9d] text-lg md:text-xl font-medium tracking-[0.2em] mt-2">
          PREMIUM GOODS • DISCREET DELIVERY
        </p>
      </div>
    </section>
  );
}