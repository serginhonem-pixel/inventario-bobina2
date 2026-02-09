import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { subscribeToasts } from './toast';

const typeConfig = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/30 text-emerald-200 bg-emerald-500/10'
  },
  error: {
    icon: AlertCircle,
    className: 'border-rose-500/30 text-rose-200 bg-rose-500/10'
  },
  warning: {
    icon: AlertCircle,
    className: 'border-amber-500/30 text-amber-200 bg-amber-500/10'
  },
  info: {
    icon: Info,
    className: 'border-sky-500/30 text-sky-200 bg-sky-500/10'
  }
};

const ToastHost = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      const duration = Number(toast.duration ?? 4000);
      if (duration > 0) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        }, duration);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] space-y-3">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type] || typeConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 max-w-sm p-4 rounded-2xl border shadow-xl backdrop-blur ${config.className}`}
          >
            <Icon size={18} className="mt-0.5" />
            <div className="text-sm font-semibold">{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
