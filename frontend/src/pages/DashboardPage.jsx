import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Database,
  Table,
  Terminal,
  Activity,
  Plus,
  Upload,
  Play,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Flame,
  Compass,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { challengeService } from '../services/challengeService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UploadModal } from '../components/UploadModal';
import { TableModal } from '../components/TableModal';
import { Toast } from '../components/Toast';
import { DailyChallengeWidget } from '../components/DailyChallengeWidget';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [learningStats, setLearningStats] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchStats = async () => {
    try {
      const [res, lRes, dRes] = await Promise.all([
        datasetService.getDashboardStats(),
        challengeService.getLearningStats(),
        challengeService.getDailyChallenge(),
      ]);
      if (res.success && res.data) {
        setStats(res.data);
      }
      if (lRes.success && lRes.data) {
        setLearningStats(lRes.data);
      }
      if (dRes.success && dRes.data) {
        setDailyData(dRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleModalSuccess = (msg) => {
    setToast({ type: 'success', message: msg });
    fetchStats();
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard metrics..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-600/10">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Developer SQL Dashboard
          </h1>
          <p className="text-sm text-indigo-100 max-w-xl">
            Visually construct SQL queries, run queries against real MySQL tables, and analyze results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/sql-practice"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs sm:text-sm rounded-xl transition shadow-md active:scale-95 flex-1 sm:flex-none justify-center"
          >
            <Play className="w-4 h-4 fill-indigo-700" />
            <span>Quick Start Practice</span>
          </Link>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 border border-white/20 font-semibold text-xs sm:text-sm rounded-xl transition flex-1 sm:flex-none justify-center"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Data</span>
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 border border-white/20 font-semibold text-xs sm:text-sm rounded-xl transition flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Table</span>
          </button>
        </div>
      </div>

      {/* Daily SQL Challenge Widget */}
      {dailyData && (
        <DailyChallengeWidget
          dailyData={dailyData}
          onSelectChallenge={() => navigate('/challenges')}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Databases
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.total_datasets || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Tables
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.total_tables || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Table className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Queries Executed
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats?.queries_executed || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Terminal className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Activity
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {(stats?.recent_queries?.length || 0) + (stats?.recent_datasets?.length || 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SQL Skill Mastery & Challenges Progress Tracker */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>SQL Skill Mastery & Progress</span>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Interactive Arena
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your real-world SQL problem-solving progress across fundamental and advanced categories.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/cheatsheet"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Visual Cheatsheet</span>
            </Link>
            <Link
              to="/challenges"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Solve Challenges</span>
            </Link>
          </div>
        </div>

        {/* Learning Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Challenges Solved</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {learningStats?.solved_challenges || 0} / {learningStats?.total_challenges || 8}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Experience</span>
              <span className="text-2xl font-black text-amber-500">
                ⚡ {learningStats?.total_xp || 0} XP
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Practice Streak</span>
              <span className="text-2xl font-black text-orange-500 flex items-center gap-1">
                <span>{learningStats?.streak_days || 1} Days</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-500 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-orange-500" />
            </div>
          </div>
        </div>

        {/* Category Progress Bars */}
        {learningStats?.category_breakdown && learningStats.category_breakdown.length > 0 && (
          <div className="pt-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Competency Breakdown
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {learningStats.category_breakdown.map((cat, i) => (
                <div key={i} className="p-3 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.category}</span>
                    <span className="font-mono text-slate-400">{cat.solved} / {cat.total} solved ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(cat.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Recent Datasets & Recent Query Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Datasets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Datasets
            </h2>
            <Link
              to="/databases"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!stats?.recent_datasets || stats.recent_datasets.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-4">No datasets found. Create or upload one.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recent_datasets.map((ds) => (
                <div key={ds.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {ds.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {ds.table_count || 0} table{ds.table_count !== 1 ? 's' : ''} • Source: {ds.source_type}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/databases/${ds.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition"
                  >
                    Explore
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Queries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Queries
            </h2>
            <Link
              to="/history"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!stats?.recent_queries || stats.recent_queries.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-4">No queries executed yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_queries.map((q) => (
                <div
                  key={q.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {q.dataset_name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        q.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {q.status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {q.status}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-indigo-600 dark:text-indigo-300 truncate bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {q.query_text}
                  </pre>
                  {q.execution_time !== null && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{q.execution_time} ms</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => handleModalSuccess('Dataset uploaded and created successfully!')}
      />
      <TableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onCreateSuccess={() => handleModalSuccess('Dataset and table created successfully!')}
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
