import React, { useState } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';

export default function QuickAdd({ menuItems = [], onAdd }) {
  const [selectedCategory, setSelectedCategory] = useState('All');


  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const filtered = selectedCategory === 'All' ? menuItems : menuItems.filter(i => i.category === selectedCategory);

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);

  return (
    <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-5 shadow-xl">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <LayoutGrid size={16} />
        Quick Add Menu
      </h3>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {menuItems.length === 0 ? (
        <div className="text-slate-500 text-center py-6 text-sm font-medium">Loading menu...</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map(item => (
            <button
              key={item._id}
              onClick={() => onAdd({
                menuItemId: item._id,
                name: item.name,
                quantity: 1,
                unitPrice: item.price,
                totalPrice: item.price
              })}
              className="bg-slate-800/60 hover:bg-indigo-500/10 border border-slate-700/50 hover:border-indigo-500/30 p-3 rounded-xl text-left transition-all group"
            >
              <p className="font-bold text-slate-200 text-xs leading-tight truncate">{item.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-indigo-400 font-bold text-xs">{formatCurrency(item.price)}</span>
                <Plus size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
