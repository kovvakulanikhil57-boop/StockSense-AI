import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ notification, onClose }) {
  if (!notification) return null;

  const { message, type = 'info' } = notification;

  const bgStyles = {
    success: 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50 shadow-emerald-950/40',
    error: 'bg-rose-900/90 text-rose-100 border-rose-500/50 shadow-rose-950/40',
    warning: 'bg-amber-900/90 text-amber-100 border-amber-500/50 shadow-amber-950/40',
    info: 'bg-slate-900/90 text-slate-100 border-slate-700 shadow-slate-950/40'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-xl ${bgStyles[type]}`}>
        {icons[type]}
        <div className="text-sm font-medium leading-snug pt-0.5">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
