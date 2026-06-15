import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastNotification({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(toast => (
        <div key={toast.id} className="animate-slide-up bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl flex items-start gap-3">
          {toast.type === 'success' ? <CheckCircle className="text-green-400 mt-0.5" size={20} /> :
           toast.type === 'error' ? <AlertCircle className="text-red-400 mt-0.5" size={20} /> :
           <Info className="text-blue-400 mt-0.5" size={20} />}
          <p className="flex-1 text-slate-200 text-sm font-medium">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
