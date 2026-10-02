import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  Code2,
  Copy,
  Check,
  Play,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
} from 'lucide-react';
import { SQL_ERROR_CATALOG } from '../utils/sqlErrorAnalyzer';

export const SqlErrorGuidePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState({ [SQL_ERROR_CATALOG[0]?.id]: true });
  const [copiedId, setCopiedId] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(SQL_ERROR_CATALOG.map((item) => item.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredErrors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SQL_ERROR_CATALOG.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      const inTitle = item.title.toLowerCase().includes(q);
      const inCode = item.code.toLowerCase().includes(q);
      const inSummary = item.summary.toLowerCase().includes(q);
      const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      const inWhy = item.whyItHappens.toLowerCase().includes(q);
      return inTitle || inCode || inSummary || inKeywords || inWhy;
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all = {};
    SQL_ERROR_CATALOG.forEach((item) => {
      all[item.id] = true;
    });
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              SQL Error Guide & Troubleshooting Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Understand why SQL errors occur, inspect MySQL error codes, and study step-by-step
            solutions with side-by-side corrected query examples.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by error name, code (e.g. 1140, 1054), keyword, or paste an error message..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong>{filteredErrors.length}</strong> of {SQL_ERROR_CATALOG.length} documented error patterns
        </span>
        {searchQuery && (
          <span className="italic">
            Filtered by keyword: &ldquo;{searchQuery}&rdquo;
          </span>
        )}
      </div>

      {/* Error Cards Catalog */}
      <div className="space-y-4">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching SQL errors found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try searching with a different error code, keyword, or clear your search query.
            </p>
          </div>
        ) : (
          filteredErrors.map((item) => {
            const isExpanded = !!expandedIds[item.id];
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                          {item.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg text-slate-400 shrink-0 ml-2">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 pt-0 space-y-5 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Reason callout */}
                    <div className="space-y-2 pt-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>The Reason (Why Does This Error Happen?)</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                        {item.whyItHappens}
                      </p>
                    </div>

                    {/* How to overcome */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>How to Overcome & Fix It</span>
                      </div>
                      <div className="space-y-2">
                        {item.howToOvercome.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-start gap-2.5 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl text-xs sm:text-sm text-emerald-950 dark:text-emerald-200"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code Comparison */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Code2 className="w-4 h-4 text-indigo-500" />
                          <span>Code Example Comparison</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.id, item.correctExample)}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Solution</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/sql-practice')}
                            className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                          >
                            <Play className="w-3 h-3" />
                            <span>Try in Workspace</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        {/* Broken */}
                        <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-1.5">
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            ❌ Broken SQL Query
                          </span>
                          <pre className="text-rose-900 dark:text-rose-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {item.wrongExample}
                          </pre>
                        </div>

                        {/* Correct */}
                        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                             Corrected Query
                          </span>
                          <pre className="text-emerald-900 dark:text-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {item.correctExample}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Golden Rules Box */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Top 5 Golden Habits to Avoid SQL Errors
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              1. Qualify Multi-Table Columns
            </span>
            Always use <code className="font-mono">table.column</code> when joining tables so MySQL never complains about ambiguous column names.
          </div>
          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              2. Match GROUP BY with SELECT
            </span>
            Any column in your SELECT that is not inside an aggregate function (COUNT, SUM, AVG) MUST be listed in your GROUP BY clause.
          </div>
          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              3. Use HAVING for Aggregates
            </span>
            Never put <code className="font-mono">SUM()</code> or <code className="font-mono">COUNT()</code> in a WHERE clause. Filter aggregate results using HAVING instead.
          </div>
          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              4. Quote String Literals
            </span>
            Always wrap text and date values in single quotes (e.g. <code className="font-mono">&apos;active&apos;</code>). Unquoted text is interpreted as column names.
          </div>
          <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              5. Inspect Table Schemas
            </span>
            Use the Database Explorer on the left to confirm column spelling before writing complex queries.
          </div>
        </div>
      </div>
    </div>
  );
};
