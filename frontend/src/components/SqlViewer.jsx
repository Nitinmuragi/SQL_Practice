import React, { useState } from 'react';
import { Copy, Check, Terminal, Play, RefreshCw } from 'lucide-react';

export const SqlViewer = ({ sql, onCopy, onRun, isRunning = false, title = "GENERATED SQL" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    if (onCopy) onCopy(sql);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Run Query button on the LEFT side of Copy SQL */}
          {onRun && (
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning || !sql}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Query</span>
                </>
              )}
            </button>
          )}

          {/* Copy SQL Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!sql}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 font-mono text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap leading-relaxed text-indigo-200 selection:bg-indigo-700 selection:text-white">
        {sql || '-- Build a query above to see generated SQL'}
      </div>
    </div>
  );
};
