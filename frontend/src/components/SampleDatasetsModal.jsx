import React, { useState } from 'react';
import { ShoppingBag, Film, Briefcase, Activity, Sparkles, X, Check, ArrowRight, Database } from 'lucide-react';
import { datasetService } from '../services/datasetService';

const SAMPLE_PRESETS = [
  {
    key: 'ecommerce',
    title: 'E-Commerce Global Store',
    tagline: 'Retail, Orders & Inventory',
    icon: ShoppingBag,
    color: 'from-indigo-600 to-violet-600',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'A realistic global retail database containing customers, orders, and product catalog items.',
    tables: ['customers (5 rows)', 'orders (6 rows)', 'products (5 rows)'],
    idealFor: 'Practicing INNER JOIN, LEFT JOIN, customer LTV, and category sales aggregates.',
  },
  {
    key: 'streaming',
    title: 'Streaming & Entertainment Media',
    tagline: 'Movies & Watch History',
    icon: Film,
    color: 'from-rose-600 to-pink-600',
    badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'A Netflix-style media catalog tracking blockbuster movies, IMDB-style ratings, and user viewing sessions.',
    tables: ['movies (6 rows)', 'watch_history (5 rows)'],
    idealFor: 'Filtering by genre and rating, finding most watched titles, and completion percentages.',
  },
  {
    key: 'tech_hr',
    title: 'Tech Enterprise & Payroll',
    tagline: 'Employees & Department Budgets',
    icon: Briefcase,
    color: 'from-amber-600 to-orange-600',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Corporate organizational structure with staff hierarchy, engineering roles, salaries, and departmental budgets.',
    tables: ['employees (6 rows)', 'departments (4 rows)'],
    idealFor: 'Calculating average departmental salaries, salary ranking, and budget variance.',
  },
  {
    key: 'healthcare',
    title: 'Healthcare & Patient Care',
    tagline: 'Hospital Patients & Appointments',
    icon: Activity,
    color: 'from-emerald-600 to-teal-600',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Medical clinic database with patient demographics, doctor consultations, fees, and appointment statuses.',
    tables: ['patients (5 rows)', 'appointments (6 rows)'],
    idealFor: 'Counting appointments per doctor, status filtering, and average consultation fees.',
  },
];

export const SampleDatasetsModal = ({ isOpen, onClose, onSuccess }) => {
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoad = async (preset) => {
    setLoadingKey(preset.key);
    setError('');

    try {
      const res = await datasetService.loadSampleDataset(preset.key);
      if (res.success) {
        onSuccess(preset.title);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load sample dataset.');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Pre-Built Sample Datasets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Load multi-table relational databases into your isolated account with one click
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Dataset Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isLoading = loadingKey === preset.key;

            return (
              <div
                key={preset.key}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-600 transition flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${preset.color} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {preset.title}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {preset.tagline}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor} uppercase tracking-wider`}>
                      Multi-Table
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Included Tables */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Included Tables:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {preset.tables.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[11px] font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ideal For */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Practice Focus: </span>
                    {preset.idealFor}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!!loadingKey}
                  onClick={() => handleLoad(preset)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-sm"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Load into Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
