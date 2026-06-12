'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {
  if (merchOnly) {
    return (
      <section className="hero-bg h-screen flex items-center relative">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 bg-black/70 px-8 py-3 rounded-full mb-8 text-sm font-medium">
            👕 KUSH WORLD STUDIO MERCH
          </div>

          <h1 className="text-6xl md:text-7xl font-bold leading-none mb-6">
            OFFICIAL<br />STUDIO MERCH
          </h1>
          <p className="text-2xl text-zinc-300 max-w-2xl mx-auto mb-10">
            Apparel, accessories &amp; more from Kush World Studio. Free shipping on orders $100+.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="/#merch" className="px-16 py-7 bg-[#00ff9d] text-black text-2xl font-semibold rounded-3xl hover:scale-105 transition">
              SHOP MERCH
            </a>
            <a href="/#shop" className="px-16 py-7 border border-[#00ff9d] text-[#00ff9d] text-2xl font-semibold rounded-3xl hover:bg-[#00ff9d]/10 transition">
              VIEW ALL ITEMS
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm">
            <div className="flex items-center gap-2"><i className="fa-solid fa-shirt text-[#00ff9d]"></i> STUDIO APPAREL</div>
            <div className="flex items-center gap-2"><i className="fa-solid fa-truck text-[#00ff9d]"></i> FREE SHIPPING $100+</div>
            <div className="flex items-center gap-2"><i className="fa-solid fa-palette text-[#00ff9d]"></i> CUSTOM PRINTED</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-bg h-screen flex items-center relative">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-3 bg-black/70 px-8 py-3 rounded-full mb-8 text-sm font-medium">
          🌿 LAB-TESTED • COAs ON EVERY PRODUCT
        </div>

        <h1 className="text-6xl md:text-7xl font-bold leading-none mb-6">PREMIUM HEMP,<br />DELIVERED RIGHT</h1>
        <p className="text-2xl text-zinc-300 max-w-2xl mx-auto mb-10">
          Premium merch, glass &amp; hemp goods. Lab-tested. Discreet insured shipping. 21+ only.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/#shop" className="px-16 py-7 bg-[#00ff9d] text-black text-2xl font-semibold rounded-3xl hover:scale-105 transition">
            SHOP NOW — GET FREE 8TH ON FIRST ORDER
          </a>
          <a href="#loyalty" className="px-16 py-7 border border-[#00ff9d] text-[#00ff9d] text-2xl font-semibold rounded-3xl hover:bg-[#00ff9d]/10 transition">
            REWARDS PROGRAM
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm">
          <div className="flex items-center gap-2"><i className="fa-solid fa-flask text-[#00ff9d]"></i> LAB TESTED + COAs</div>
          <div className="flex items-center gap-2"><i className="fa-solid fa-truck text-[#00ff9d]"></i> FREE SHIPPING $200+</div>
          <div className="flex items-center gap-2"><i className="fa-solid fa-shield-halved text-[#00ff9d]"></i> INSURED &amp; DISCREET</div>
        </div>
      </div>
    </section>
  );
}