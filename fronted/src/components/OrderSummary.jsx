import React from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function OrderSummary({ orderItems, updateQuantity, removeItem }) {
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);

  if (!orderItems || orderItems.length === 0) {
    return (
      <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-6 flex flex-col h-full items-center justify-center text-center text-slate-500 min-h-[300px] shadow-xl">
        <ShoppingBag size={48} className="mb-4 opacity-20" />
        <p className="font-bold text-lg text-slate-400">Cart is Empty</p>
        <p className="text-sm mt-2 max-w-[200px]">Speak into the mic to add items to your real-time order.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-0 flex flex-col h-full overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
        <h3 className="font-bold text-slate-200 flex justify-between items-center text-lg">
          Current Order
          <span className="bg-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold shadow-inner">
            {orderItems.reduce((acc, item) => acc + item.quantity, 0)} Items
          </span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {orderItems.map((item) => {
          const id = item.menuItemId || item._id;
          return (
            <div key={id} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-slate-700/50 transition-colors shadow-sm animate-in slide-in-from-bottom-2">
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-slate-100 text-[15px] leading-tight">{item.name}</h3>
                <div className="text-sm font-medium text-slate-400 mt-1 flex gap-2 items-center">
                  <span>{formatCurrency(item.unitPrice)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-900/80 rounded-xl p-1 mr-4 border border-slate-700/50 shadow-inner">
                <button onClick={() => updateQuantity(id, -1)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-bold text-slate-100 tabular-nums">{item.quantity}</span>
                <button onClick={() => updateQuantity(id, 1)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="font-extrabold text-[#F8FAFC] tracking-tight">{formatCurrency(item.totalPrice)}</span>
                <button onClick={() => removeItem(id)} className="text-slate-500 hover:text-red-400 p-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-red-500/10">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
