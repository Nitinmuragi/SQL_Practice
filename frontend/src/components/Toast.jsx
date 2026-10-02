import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-800 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-800 dark:text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-800 dark:text-indigo-200',
      icon: <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
    },
  }[type] || typeConfig.info;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-in">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${typeConfig.bg}`}
      >
        {typeConfig.icon}
        <div className="flex-1 text-sm font-medium pr-2 leading-relaxed">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
