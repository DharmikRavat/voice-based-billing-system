import React from 'react';
import { X, Printer, CheckCircle, Receipt } from 'lucide-react';

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const items = order.items || [];
  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);
  const orderDate = new Date(order.createdAt || Date.now());

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200 print-modal">
        <div className="absolute top-4 right-4 flex gap-2 no-print">
          <button onClick={() => window.print()} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors">
            <Printer size={20} />
          </button>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 pb-6 text-center border-b border-dashed border-slate-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 no-print shadow-inner">
            <CheckCircle className="text-green-500" size={32} />
          </div>
          <div className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mx-auto mb-4 print-only hidden">
            <Receipt className="text-slate-800" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">VoicePOS Restaurant</h2>
          <p className="text-slate-500 font-medium mt-1 tracking-wide">Order successfully generated</p>
        </div>

        <div className="p-8 pt-6">
          <div className="flex justify-between text-sm mb-6 pb-6 border-b border-dashed border-slate-200">
            <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Order No</p>
              <p className="font-bold text-slate-800">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Date & Time</p>
              <p className="font-bold text-slate-800">
                {orderDate.toLocaleDateString('en-IN')} <span className="text-slate-400 mx-1">•</span> {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex justify-between text-sm mb-6 pb-6 border-b border-dashed border-slate-200">
             <div>
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Customer</p>
              <p className="font-bold text-slate-800">{order.customerName || 'Guest'}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Table</p>
              <p className="font-bold text-slate-800">{order.tableNumber}</p>
            </div>
          </div>

          <div className="mb-6 min-h-[150px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="text-left font-bold pb-2 uppercase tracking-wider text-xs">Item</th>
                  <th className="text-center font-bold pb-2 uppercase tracking-wider text-xs">Qty</th>
                  <th className="text-right font-bold pb-2 uppercase tracking-wider text-xs">Price</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-semibold pr-4 leading-tight">{item.name}</td>
                    <td className="py-3 text-center tabular-nums font-bold text-slate-500">{item.quantity}</td>
                    <td className="py-3 text-right tabular-nums font-bold text-slate-800">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-2 border border-slate-100 placeholder-slate-200">
            <div className="flex justify-between text-slate-500 mb-2 font-medium text-sm">
              <span>Subtotal</span>
              <span className="tabular-nums font-bold text-slate-700">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 mb-2 font-medium text-xs">
              <span>CGST (2.5%)</span>
              <span className="tabular-nums font-bold text-slate-700">{formatCurrency(order.taxAmount / 2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium text-xs pb-3 border-b border-slate-200">
              <span>SGST (2.5%)</span>
              <span className="tabular-nums font-bold text-slate-700">{formatCurrency(order.taxAmount / 2)}</span>
            </div>
            
            <div className="flex justify-between pt-3 items-end">
              <span className="font-black text-slate-800 uppercase tracking-widest text-sm">Grand Total</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                {formatCurrency(order.grandTotal)}
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-slate-400 font-bold bg-slate-50 py-2 rounded-lg">
            <span className="uppercase tracking-wider">Payment Mode: {order.paymentMethod}</span>
          </div>
        </div>

        {/* Decorative zig-zag bottom edge via css background */}
        <div className="h-4 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 0, transparent 10px, white 11px)', backgroundSize: '20px 20px', backgroundPosition: '-10px 0' }}></div>
      </div>
    </div>
  );
}
