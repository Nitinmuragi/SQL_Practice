import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Code2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';
import { analyzeSqlError } from '../utils/sqlErrorAnalyzer';

export const ErrorReasonModal = ({
  isOpen,
  onClose,
  error,
  queryText = '',
}) => {
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !error) return null;

  const diagnosis = analyzeSqlError(error, queryText);

  const handleCopyCorrect = () => {
    if (diagnosis?.correctExample) {
      navigator.clipboard.writeText(diagnosis.correctExample);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleOpenGuide = () => {
    onClose();
    navigate('/error-guide');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                  {diagnosis?.code || 'SQL Error'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  {diagnosis?.category || 'General'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {diagnosis?.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick summary banner */}
        <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs sm:text-sm text-rose-900 dark:text-rose-200 flex items-start gap-2.5 leading-relaxed">
          <Lightbulb className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{diagnosis?.summary}</span>
            {diagnosis?.extractedDetail && (
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 font-mono">
                👉 {diagnosis.extractedDetail.message}
              </p>
            )}
          </div>
        </div>

        {/* Section 1: Why this happened */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Why Did This Error Happen?</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {diagnosis?.whyItHappens}
          </p>
        </div>

        {/* Section 2: How to overcome */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>How to Overcome & Fix It</span>
          </div>
          <div className="space-y-2">
            {diagnosis?.howToOvercome?.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-200"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Code Comparison */}
        {(diagnosis?.wrongExample || diagnosis?.correctExample) && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-500" />
                <span>Example: Broken vs Corrected SQL</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCorrect}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Solution</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* Broken */}
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  ❌ Incorrect Syntax
                </span>
                <pre className="text-rose-900 dark:text-rose-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {diagnosis?.wrongExample}
                </pre>
              </div>

              {/* Correct */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                   Corrected Query
                </span>
                <pre className="text-emerald-900 dark:text-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {diagnosis?.correctExample}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible raw error text */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition text-left"
          >
            <span>Raw Database Error Message</span>
            {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showRaw && (
            <div className="p-3 bg-slate-950 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border-t border-slate-200 dark:border-slate-800">
              {error}
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Full SQL Error Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
