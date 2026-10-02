import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size] || 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-3">
      <div
        className={`${sizeClasses} border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{text}</p>
      )}
    </div>
  );
};
