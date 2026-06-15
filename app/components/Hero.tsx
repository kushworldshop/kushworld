'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center bg-black overflow-hidden pt-2">
      {/* Very light gradient — only subtle top/bottom fade so mascot stays bright and visible, not dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated mascot as pure site design element — no video thumbnail look, no frames, no shadows, no accent lines, no rounded box. Black merges with hero bg so only the character graphic appears directly in the layout like the original logo. New render: correct joint movement from exact logo grip/angle + tight frame fill. Position kept as preferred. */}
        <div className="flex justify-center mb-5 -mt-14">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-[96%] max-w-[740px] md:max-w-[900px] h-auto bg-black"
          >
            <source src="/mascot-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Tagline below as part of the overall branding lockup */}
        <p className="text-[#00ff9d] text-lg md:text-xl font-medium tracking-[0.2em] mt-2">
          PREMIUM GOODS • DISCREET DELIVERY
        </p>
      </div>
    </section>
  );
}