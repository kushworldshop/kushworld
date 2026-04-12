'use client';

export default function Categories() {
  return (
    <section id="categories" className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl font-bold text-center mb-12">SHOP BY CATEGORY</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {['Bongs & Water Pipes', 'Pipes & Dab Rigs', 'Hemp & Accessories', 'Merch & Apparel'].map((cat, i) => (
            <div 
              key={i} 
              className="group bg-zinc-900 rounded-3xl p-8 text-center cursor-pointer hover:bg-zinc-800 transition" 
              onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i className={`fa-solid ${['fa-bong','fa-fire','fa-leaf','fa-tshirt'][i]} text-7xl text-[#00ff9d] mb-6 group-hover:scale-110 transition`}></i>
              <h3 className="text-2xl font-semibold">{cat}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}