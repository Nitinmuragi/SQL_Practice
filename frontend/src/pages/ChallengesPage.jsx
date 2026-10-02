import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Filter,
  ArrowLeft,
  Lightbulb,
  Play,
  RotateCcw,
  Check,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronUp,
  BarChart2,
  GitMerge,
  Zap,
  Trophy,
  Compass,
  ArrowRight,
  Layers,
  BookOpen,
  Lock,
} from 'lucide-react';
import { challengeService } from '../services/challengeService';
import { SqlEditor } from '../components/SqlEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { DailyChallengeWidget } from '../components/DailyChallengeWidget';

export const ChallengesPage = () => {
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [viewMode, setViewMode] = useState('tracks'); // 'tracks' | 'catalog'
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, beginner, intermediate, advanced
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Solver State
  const [userSql, setUserSql] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedHint, setExpandedHint] = useState(null); // 1, 2, 3

  const fetchChallenges = async () => {
    try {
      const results = await Promise.allSettled([
        challengeService.getChallenges(),
        challengeService.getLearningStats(),
        challengeService.getLearningTracks(),
        challengeService.getDailyChallenge(),
      ]);

      const [res, sRes, tRes, dRes] = results.map(r => (r.status === 'fulfilled' ? r.value : null));

      if (res && (res.success || Array.isArray(res.data))) {
        setChallenges(res.data || []);
      }
      if (sRes && (sRes.success || sRes.data)) {
        setStats(sRes.data || sRes);
      }
      if (tRes && (tRes.success || Array.isArray(tRes.data))) {
        setTracks(tRes.data || []);
      }
      if (dRes && (dRes.success || dRes.data)) {
        setDailyData(dRes.data || dRes);
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectChallenge = async (ch) => {
    if (!ch) return;

    // Immediately display the selected question with available data
    const initialChallenge = {
      ...ch,
      is_locked: Boolean(ch.is_locked),
      required_xp: ch.required_xp || 0,
      user_xp: ch.user_xp || 0,
    };
    setSelectedChallenge(initialChallenge);
    setUserSql(ch.submitted_sql || ch.starter_sql || '');
    setSubmissionResult(null);
    setExpandedHint(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (ch.is_locked) {
      setToast({
        type: 'warning',
        message: `🔒 Level Locked: ${ch.difficulty?.toUpperCase()} challenges require ${ch.required_xp} XP to submit solutions (Current: ${ch.user_xp || 0} XP). You can review the problem and schema now!`
      });
    }

    // Refresh with fresh sample rows from database in background
    try {
      setIsSelecting(true);
      const res = await challengeService.getChallenge(ch.id);
      if (res && (res.success || res.data)) {
        const payload = res.data || res;
        setSelectedChallenge((prev) => ({
          ...prev,
          ...payload,
          is_locked: payload.is_locked !== undefined ? payload.is_locked : ch.is_locked,
          required_xp: payload.required_xp || ch.required_xp || 0,
          user_xp: payload.user_xp !== undefined ? payload.user_xp : (ch.user_xp || 0),
        }));
      }
    } catch (err) {
      console.warn('Could not load sample rows for challenge:', err);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedChallenge || !userSql.trim()) return;

    if (selectedChallenge.is_locked) {
      setToast({
        type: 'warning',
        message: `🔒 Level Locked: You need ${selectedChallenge.required_xp} XP to submit solutions for ${selectedChallenge.difficulty} level (Current XP: ${selectedChallenge.user_xp || 0}). Earn XP in Beginner challenges or Sunday Contests!`
      });
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await challengeService.submitSolution(selectedChallenge.id, userSql);
      setSubmissionResult(res);
      if (res.passed) {
        setToast({ type: 'success', message: `🎉 Challenge Solved! +${res.xp_reward || selectedChallenge.xp_reward} XP Earned!` });
        // Refresh challenge completion status in background
        fetchChallenges();
      } else {
        setToast({ type: 'error', message: res.diff_reason || 'Query output did not match expected solution.' });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setSubmissionResult({
        success: true,
        passed: false,
        error: msg,
      });
      setToast({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !selectedChallenge) {
    return <LoadingSpinner size="lg" text="Loading practice challenges..." />;
  }

  // Filter challenges
  const filteredChallenges = challenges.filter((c) => {
    const matchDiff = activeTab === 'all' || c.difficulty === activeTab;
    const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchDiff && matchCat;
  });

  const categories = ['all', ...Array.from(new Set(challenges.map((c) => c.category)))];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* TOP LEARNING DASHBOARD STATS */}
      {!selectedChallenge && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                SQL Interview & Practice Arena
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Master SQL with Real Challenges
            </h1>
            <p className="text-sm text-indigo-100 max-w-xl">
              Solve real-world business scenarios from beginner queries to advanced Window Functions. Verify your output instantly against canonical solutions.
            </p>
          </div>

          {stats && (
            <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div className="text-center px-3 border-r border-white/20">
                <span className="text-xs text-indigo-200 block">Solved</span>
                <span className="text-2xl font-black text-white">
                  {stats.solved_challenges} / {stats.total_challenges}
                </span>
              </div>
              <div className="text-center px-3 border-r border-white/20">
                <span className="text-xs text-indigo-200 block">Total XP</span>
                <span className="text-2xl font-black text-amber-300">
                  ⚡ {stats.total_xp}
                </span>
              </div>
              <div className="text-center px-3">
                <span className="text-xs text-indigo-200 block">Streak</span>
                <span className="text-2xl font-black text-orange-400 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5 fill-orange-400 text-orange-400" />
                  <span>{stats.streak_days}d</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* XP LEVEL PROGRESSION CARD */}
      {!selectedChallenge && stats && (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> XP Level Progression & Unlocks
              </span>
              <p className="text-[11px] text-slate-400">
                Beginner is free for all. Earn 500 XP to unlock Intermediate and 1,000 XP for Advanced!
              </p>
            </div>
            <Link
              to="/contests"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <Trophy className="w-3.5 h-3.5" /> Join Sunday Contest (+150 XP)
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Beginner */}
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">Beginner Level</span>
                <span className="text-[11px] text-emerald-400 font-medium">Free for All (0 XP)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                UNLOCKED
              </span>
            </div>

            {/* Intermediate */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              stats.total_xp >= 500
                ? 'bg-indigo-950/30 border-indigo-800/40'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div>
                <span className="font-bold text-white block">Intermediate Level</span>
                <span className="text-[11px] text-slate-400">
                  {stats.total_xp >= 500 ? 'Unlocked (500 XP)' : `${stats.total_xp} / 500 XP`}
                </span>
              </div>
              {stats.total_xp >= 500 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  UNLOCKED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> LOCKED
                </span>
              )}
            </div>

            {/* Advanced */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              stats.total_xp >= 1000
                ? 'bg-purple-950/30 border-purple-800/40'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div>
                <span className="font-bold text-white block">Advanced Level</span>
                <span className="text-[11px] text-slate-400">
                  {stats.total_xp >= 1000 ? 'Unlocked (1,000 XP)' : `${stats.total_xp} / 1,000 XP`}
                </span>
              </div>
              {stats.total_xp >= 1000 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  UNLOCKED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> LOCKED
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY CHALLENGE STREAK WIDGET */}
      {!selectedChallenge && dailyData && (
        <DailyChallengeWidget
          dailyData={dailyData}
          onSelectChallenge={handleSelectChallenge}
        />
      )}

      {/* VIEW A: CHALLENGES CATALOG OR TRACKS */}
      {!selectedChallenge ? (
        <div className="space-y-6">
          {/* View Mode Bar & Certification Assessment Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('tracks')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'tracks'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Curated Pathways ({tracks.length})</span>
              </button>
              <button
                onClick={() => setViewMode('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'catalog'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Challenges ({challenges.length})</span>
              </button>
            </div>

            <Link
              to="/assessment"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Take Skill Assessment & Certify</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* VIEW: TRACKS / PATHWAYS */}
          {viewMode === 'tracks' ? (
            <div className="space-y-6">
              {tracks.map((track) => {
                const getIcon = () => {
                  switch (track.icon) {
                    case 'BookOpen': return BookOpen;
                    case 'BarChart2': return BarChart2;
                    case 'GitMerge': return GitMerge;
                    case 'Zap': return Zap;
                    default: return Compass;
                  }
                };
                const IconComponent = getIcon();

                return (
                  <div
                    key={track.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Track Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {track.title}
                            </h3>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                              {track.difficulty}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {track.estimated_time}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                            {track.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Status */}
                      <div className="w-full md:w-64 space-y-2 shrink-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {track.solved_challenges} / {track.total_challenges} Solved
                          </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {track.progress_percent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              track.is_completed
                                ? 'bg-emerald-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${track.progress_percent}%` }}
                          />
                        </div>
                        {track.is_completed && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Track Completed!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step-by-Step Challenges List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {track.challenges.map((ch, idx) => (
                        <div
                          key={ch.id}
                          onClick={() => handleSelectChallenge(ch)}
                          className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                ch.is_solved
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {ch.is_solved ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : idx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {ch.title}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {ch.category} • {ch.dataset_name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              +{ch.xp_reward} XP
                            </span>
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                ch.is_solved
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              }`}
                            >
                              {ch.is_solved ? 'Practice Again' : 'Solve'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW: ALL CHALLENGES CATALOG */
            <div className="space-y-6">
              {/* Filters & Tiers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* Difficulty Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {['all', 'beginner', 'intermediate', 'advanced'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                        activeTab === t
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Category Selector */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'all' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChallenges.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                <Database className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">No challenges found</h3>
                <p className="text-xs text-slate-500">Try changing your difficulty or category filter.</p>
                <button
                  type="button"
                  onClick={() => { setActiveTab('all'); setSelectedCategory('all'); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredChallenges.map((ch) => {
              const diffColors = {
                beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
                intermediate: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
                advanced: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
              };

              return (
                <div
                  key={ch.id}
                  onClick={() => handleSelectChallenge(ch)}
                  className={`group cursor-pointer rounded-2xl p-5 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
                    ch.is_locked
                      ? 'border-slate-800 opacity-75 hover:border-amber-500/50'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/80 hover:shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${diffColors[ch.difficulty] || diffColors.beginner}`}>
                        {ch.difficulty}
                      </span>
                      {ch.is_locked ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40">
                          <Lock className="w-3 h-3" />
                          <span>Unlock at {ch.required_xp} XP</span>
                        </span>
                      ) : ch.is_solved ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Solved</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          +{ch.xp_reward} XP
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {ch.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {ch.category}
                    </span>
                    {ch.is_locked ? (
                      <span className="text-amber-500 font-bold inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {ch.required_xp} XP Needed
                      </span>
                    ) : (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-1 transition inline-flex items-center gap-1">
                        Solve ➔
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}
    </div>
  ) : (
    /* VIEW B: CHALLENGE SOLVER INTERFACE */
        <div className="space-y-6 animate-fade-in">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedChallenge(null)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Challenges</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {selectedChallenge.difficulty} • {selectedChallenge.category}
              </span>
              <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                +{selectedChallenge.xp_reward} XP
              </span>
            </div>
          </div>

          {/* Solver Two-Column Grid — on mobile: Editor first, Problem second */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Pane (5 Cols): Scenario, Schema, Hints — order-2 on mobile so editor shows first */}
            <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
              {/* Problem Statement Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {selectedChallenge.title}
                </h2>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Business Objective:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {selectedChallenge.description}
                  </p>
                </div>

                {selectedChallenge.business_context && (
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Real-World Analytics Context:
                    </span>
                    <p>{selectedChallenge.business_context}</p>
                  </div>
                )}
              </div>

              {/* Schema Preview */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>Table: `{selectedChallenge.target_table}`</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Sample Rows</span>
                </div>

                {selectedChallenge.sample_rows && selectedChallenge.sample_rows.length > 0 ? (
                  <div className="overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-xl w-full">
                    <table className="min-w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                        <tr>
                          {selectedChallenge.sample_columns?.map((c) => (
                            <th key={c} className="p-2 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                        {selectedChallenge.sample_rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            {selectedChallenge.sample_columns?.map((c) => (
                              <td key={c} className="p-2 whitespace-nowrap">
                                {String(row[c] !== null ? row[c] : 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Preview not available</p>
                )}
              </div>

              {/* Progressive Hints Accordion */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Need Help? Progressive Hints
                  </h4>
                </div>

                <div className="space-y-2">
                  {/* Hint 1 */}
                  {selectedChallenge.hint_1 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedHint(expandedHint === 1 ? null : 1)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 transition"
                      >
                        <span>Hint 1: Concept & Clauses</span>
                        {expandedHint === 1 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {expandedHint === 1 && (
                        <div className="p-3 text-xs text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          {selectedChallenge.hint_1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hint 2 */}
                  {selectedChallenge.hint_2 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedHint(expandedHint === 2 ? null : 2)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 transition"
                      >
                        <span>Hint 2: Query Skeleton</span>
                        {expandedHint === 2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {expandedHint === 2 && (
                        <div className="p-3 text-xs font-mono text-indigo-600 dark:text-indigo-400 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 whitespace-pre-wrap">
                          {selectedChallenge.hint_2}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hint 3 */}
                  {selectedChallenge.hint_3 && (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedHint(expandedHint === 3 ? null : 3)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-left bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 transition"
                      >
                        <span>Hint 3: Full Solution & Explanation</span>
                        {expandedHint === 3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {expandedHint === 3 && (
                        <div className="p-3 text-xs font-mono text-slate-800 dark:text-slate-200 border-t border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-slate-900 whitespace-pre-wrap">
                          {selectedChallenge.hint_3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Pane (7 Cols): SqlEditor, Verification, and Diff Results — order-1 on mobile so it appears first */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              {/* Level Lock Warning if not enough XP */}
              {selectedChallenge.is_locked && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 shadow-sm animate-fade-in">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-amber-200">
                      Level Locked ({selectedChallenge.difficulty?.toUpperCase()} Level)
                    </div>
                    <p className="text-amber-300/90 leading-relaxed">
                      This level requires <strong>{selectedChallenge.required_xp} XP</strong> to submit solutions and earn points. Your current XP is <strong>{selectedChallenge.user_xp || 0} XP</strong>. 
                      You can study the scenario, schema, and hints. To unlock solution submissions, earn XP by solving <span className="text-white font-semibold">Beginner Challenges</span> or ranking in our <Link to="/contests" className="underline font-bold text-amber-200 hover:text-white">Sunday Contests</Link>!
                    </p>
                  </div>
                </div>
              )}

              {/* SQL Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Write Your Solution
                  </h3>
                  <button
                    type="button"
                    onClick={() => setUserSql(selectedChallenge.starter_sql || '')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Code</span>
                  </button>
                </div>

                <SqlEditor
                  value={userSql}
                  onChange={setUserSql}
                  onRun={handleSubmitSolution}
                  isRunning={isSubmitting}
                  placeholder={`-- Write your query for ${selectedChallenge.target_table}`}
                  height="h-64 sm:h-80"
                  extraActions={
                    selectedChallenge.is_locked ? (
                      <button
                        type="button"
                        onClick={() => setToast({
                          type: 'warning',
                          message: `🔒 Level Locked: You need ${selectedChallenge.required_xp} XP to submit solutions for ${selectedChallenge.difficulty} level (Current XP: ${selectedChallenge.user_xp || 0}).`
                        })}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-extrabold text-amber-400 bg-amber-950/60 border border-amber-800/60 rounded-lg shadow-sm cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Locked ({selectedChallenge.required_xp} XP Required)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitSolution}
                        disabled={isSubmitting || !userSql.trim()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-sans font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-lg shadow-md transition"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Submit & Verify</span>
                          </>
                        )}
                      </button>
                    )
                  }
                />
              </div>

              {/* Submission Verification Results */}
              {submissionResult && (
                <div className="space-y-4 animate-fade-in">
                  {submissionResult.passed ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg space-y-2">
                      <div className="flex items-center gap-2 text-lg font-black">
                        <CheckCircle2 className="w-6 h-6 fill-white text-emerald-600" />
                        <span>Success! All Test Cases Passed!</span>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-100">
                        {submissionResult.message} You earned +{submissionResult.xp_reward || selectedChallenge.xp_reward} XP!
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                      <div className="flex items-center gap-2 text-base font-bold text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Output Mismatch - Review Differences Below</span>
                      </div>
                      <p className="text-xs text-rose-800 dark:text-rose-300 font-sans">
                        {submissionResult.diff_reason || submissionResult.error || 'Your output did not match expected benchmark rows.'}
                      </p>
                    </div>
                  )}

                  {/* Output Tables Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Your Query Output */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Your Query Output
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {submissionResult.user_row_count ?? 0} rows
                        </span>
                      </div>
                      {submissionResult.user_rows && submissionResult.user_rows.length > 0 ? (
                        <div className="overflow-x-auto max-h-56 text-xs font-mono">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 uppercase">
                              <tr>
                                {submissionResult.user_columns?.map((c) => (
                                  <th key={c} className="p-1.5">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {submissionResult.user_rows.slice(0, 10).map((r, i) => (
                                <tr key={i}>
                                  {submissionResult.user_columns?.map((c) => (
                                    <td key={c} className="p-1.5 whitespace-nowrap">
                                      {String(r[c] !== undefined ? r[c] : 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3">No rows returned</p>
                      )}
                    </div>

                    {/* Expected Canonical Output */}
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Expected Output
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {submissionResult.expected_row_count ?? 0} rows
                        </span>
                      </div>
                      {submissionResult.expected_rows && submissionResult.expected_rows.length > 0 ? (
                        <div className="overflow-x-auto max-h-56 text-xs font-mono">
                          <table className="w-full text-left">
                            <thead className="bg-emerald-50 dark:bg-emerald-950/40 text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">
                              <tr>
                                {submissionResult.expected_columns?.map((c) => (
                                  <th key={c} className="p-1.5">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {submissionResult.expected_rows.slice(0, 10).map((r, i) => (
                                <tr key={i}>
                                  {submissionResult.expected_columns?.map((c) => (
                                    <td key={c} className="p-1.5 whitespace-nowrap">
                                      {String(r[c] !== undefined ? r[c] : 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic p-3">Benchmark not loaded</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
