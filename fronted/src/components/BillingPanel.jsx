import React from 'react';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';

export default function BillingPanel({ 
  orderItems, 
  billingTotals, 
  tableNumber, 
  setTableNumber, 
  customerName, 
  setCustomerName, 
  paymentMethod, 
  setPaymentMethod,
  onSubmitOrder,
  isSubmitting
}) {
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  return (
    <div className="bg-slate-800/80 rounded-3xl border border-slate-700/50 p-6 flex flex-col h-full shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center justify-between">
        Payment & Checkout
      </h3>
      
      <div className="space-y-4 mb-6 relative z-10 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Customer</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium shadow-inner"
              placeholder="Guest"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Table No</label>
            <input 
              type="number" 
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium tabular-nums shadow-inner"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block uppercase tracking-wide">Payment Method</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'Cash', icon: Banknote },
              { id: 'Card', icon: CreditCard },
              { id: 'UPI', icon: Smartphone }
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`py-3 rounded-xl flex flex-col items-center gap-2 border transition-all ${
                  paymentMethod === method.id 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-inner scale-[1.02]' 
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 shadow-sm'
                }`}
              >
                <method.icon size={20} />
                <span className="text-xs font-bold">{method.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700/50 mb-6 shadow-inner">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 font-medium">Subtotal</span>
          <span className="text-slate-200 font-semibold tabular-nums">{formatCurrency(billingTotals.subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-400 font-medium">GST (5%)</span>
          <span className="text-slate-200 font-semibold tabular-nums">{formatCurrency(billingTotals.taxAmount)}</span>
        </div>
        
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4"></div>
        
        <div className="flex justify-between items-end">
          <span className="text-slate-300 font-bold tracking-wide uppercase text-sm">Total</span>
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tabular-nums tracking-tight drop-shadow-sm">
            {formatCurrency(billingTotals.grandTotal)}
          </span>
        </div>
      </div>

      <div className="mt-auto relative z-10 w-full">
        <button 
          onClick={onSubmitOrder}
          disabled={orderItems.length === 0 || isSubmitting}
          className={`w-full font-extrabold py-4 px-6 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 decoration-0 ${
            orderItems.length === 0 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
              : isSubmitting
              ? 'bg-indigo-800 text-indigo-300 cursor-wait border border-indigo-700/50'
              : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white hover:-translate-y-1 hover:shadow-indigo-500/25 border border-indigo-500/50'
          }`}
        >
          {isSubmitting ? 'Processing...' : 'Generate Invoice'}
        </button>
      </div>
    </div>
  );
}
