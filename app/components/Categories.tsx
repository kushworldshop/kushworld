'use client';

const categories = [
  { label: 'Studio Merch', icon: 'fa-shirt', id: 'merch' },
  { label: 'Vapes & Disposables', icon: 'fa-bolt', id: 'vapes' },
  { label: 'Concentrates', icon: 'fa-fire', id: 'concentrates' },
  { label: 'Exotic Flower', icon: 'fa-leaf', id: 'flower' },
  { label: 'Mushrooms', icon: 'fa-seedling', id: 'mushrooms' },
];

export default function Categories() {
  const scrollToCategory = (categoryId: string) => {
    const shop = document.getElementById('shop');
    shop?.scrollIntoView({ behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('filter-category', { detail: categoryId }));
  };

  return (
    <section id="categories" className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-5xl font-bold text-center mb-12">SHOP BY CATEGORY</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="group bg-zinc-900 rounded-3xl p-8 text-center cursor-pointer hover:bg-zinc-800 transition" 
              onClick={() => scrollToCategory(cat.id)}
            >
              <i className={`fa-solid ${cat.icon} text-7xl text-[#00ff9d] mb-6 group-hover:scale-110 transition`}></i>
              <h3 className="text-2xl font-semibold">{cat.label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}