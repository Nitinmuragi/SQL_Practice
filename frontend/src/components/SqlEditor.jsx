import React, { useRef } from 'react';
import { Play, Copy, Check, Sparkles, Trash2, Terminal } from 'lucide-react';

import { formatSql } from '../utils/sqlFormatter';

export const SqlEditor = ({
  value = '',
  onChange,
  onRun,
  isRunning = false,
  placeholder = '-- Write your SQL query here...\nSELECT * FROM ...;',
  height = 'h-52 sm:h-64',
  extraActions = null,
}) => {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef(null);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (onChange) onChange('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleFormat = () => {
    if (!value || !value.trim()) return;
    const formatted = formatSql(value);
    if (onChange && formatted) onChange(formatted);
  };

  const handleKeyDown = (e) => {
    // Ctrl + Enter or Cmd + Enter to run query
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onRun && !isRunning) {
        onRun();
      }
    }

    // Tab key inserts 2 spaces instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (onChange) onChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Generate line numbers
  const lines = value ? value.split('\n') : [''];
  const lineCount = Math.max(lines.length, 6);

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-xl overflow-hidden flex flex-col font-mono">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Interactive SQL Editor
          </span>
          <span className="hidden sm:inline-block text-[11px] font-sans px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
            Ctrl + Enter to run
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {extraActions}

          {onRun && (
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning || !value.trim()}
              title="Run & Submit SQL Solution"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 text-xs font-sans font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-40 rounded-lg shadow-md transition cursor-pointer"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Run</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleFormat}
            disabled={!value.trim()}
            title="Auto-format SQL"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Format</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={!value.trim()}
            title="Clear editor"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-slate-300 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!value.trim()}
            title="Copy SQL to clipboard"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className={`relative flex ${height} bg-slate-900/90 text-sm overflow-hidden`}>
        {/* Line Numbers Gutter */}
        <div className="w-12 shrink-0 py-3.5 select-none bg-slate-950/60 text-slate-600 text-right pr-3 font-mono text-xs border-r border-slate-800/80 overflow-hidden leading-6">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 w-full p-3.5 font-mono text-xs sm:text-sm bg-transparent text-indigo-100 placeholder-slate-600 outline-none resize-none overflow-y-auto leading-6 selection:bg-indigo-600 selection:text-white"
        />
      </div>
    </div>
  );
};
