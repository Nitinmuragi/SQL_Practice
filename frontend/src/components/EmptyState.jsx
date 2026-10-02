import React from 'react';
import { Database, Plus, Upload } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Database,
  title = 'No items found',
  description = 'Get started by creating or uploading your first dataset.',
  primaryAction,
  secondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-sm hover:shadow"
          >
            {primaryAction.icon || <Plus className="w-4 h-4" />}
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition"
          >
            {secondaryAction.icon || <Upload className="w-4 h-4" />}
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
