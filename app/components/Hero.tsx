'use client';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {
  return (
    <section className="hero-bg min-h-[75vh] flex items-center relative">
      <div className="max-w-4xl mx-auto px-6 text-center py-20">
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-6">
          {merchOnly ? 'Kush World Studio' : 'Kush World'}
        </p>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
          {merchOnly ? (
            <>Official<br />Studio Merch</>
          ) : (
            <>Premium Goods,<br />Delivered Right</>
          )}
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          {merchOnly
            ? 'Custom apparel and accessories from Kush World Studio.'
            : 'Lab-tested hemp products and official Kush World Studio merch. Discreet shipping nationwide.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#merch"
            className="px-10 py-5 bg-[#00ff9d] text-black text-lg font-semibold rounded-2xl hover:scale-[1.02] transition"
          >
            Shop Merch
          </a>
          {!merchOnly && (
            <a
              href="/shop"
              className="px-10 py-5 border border-zinc-600 text-zinc-200 text-lg font-semibold rounded-2xl hover:border-[#00ff9d] hover:text-[#00ff9d] transition"
            >
              Full Catalog
            </a>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-xs text-zinc-500 uppercase tracking-wider">
          {merchOnly ? (
            <>
              <span>Custom Made</span>
              <span>Studio Quality</span>
              <span>Made to Order</span>
            </>
          ) : (
            <>
              <span>Lab Tested + COAs</span>
              <span>Free Shipping $200+</span>
              <span>21+ Only</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}