import React from 'react';
import { X, AlertCircle, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isDanger = toast.type === 'danger';
        const isWarning = toast.type === 'warning';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-slide-up flex items-start gap-3 transition-all ${
              isDanger
                ? 'bg-rose-950/95 border-rose-500 text-rose-100 glow-rose'
                : isWarning
                ? 'bg-amber-950/95 border-amber-500 text-amber-100 glow-amber'
                : isSuccess
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 glow-emerald'
                : 'bg-slate-900/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isDanger && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isWarning && <ShieldAlert className="w-5 h-5 text-amber-400" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {!isDanger && !isWarning && !isSuccess && <Info className="w-5 h-5 text-cyan-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight">{toast.title}</div>
              <div className="text-xs opacity-90 mt-0.5 leading-snug">{toast.message}</div>
              <div className="text-[10px] opacity-60 font-mono mt-1">{toast.timestamp}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/20 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
