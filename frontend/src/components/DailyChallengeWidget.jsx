import React from 'react';
import { Flame, Sparkles, CheckCircle2, ArrowRight, Calendar, Trophy } from 'lucide-react';

export const DailyChallengeWidget = ({ dailyData, onSelectChallenge }) => {
  if (!dailyData || !dailyData.challenge) return null;

  const { challenge, is_solved_today, streak_days, bonus_xp, date } = dailyData;

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'beginner':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
      case 'intermediate':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'advanced':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6 shadow-sm backdrop-blur-sm">
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              Daily SQL Challenge
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              +{bonus_xp} Streak Bonus XP
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {challenge.title}
              </h3>
              <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getDifficultyBadge(challenge.difficulty)}`}>
                {challenge.difficulty}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
              {challenge.description}
            </p>
          </div>
        </div>

        {/* Action & Streak stats */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/80 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-sm">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Streak</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {streak_days} {streak_days === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {is_solved_today ? (
            <button
              onClick={() => onSelectChallenge(challenge)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Solved Today!</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectChallenge(challenge)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm shadow-md hover:shadow-orange-500/20 transition-all cursor-pointer group"
            >
              <span>Solve Challenge</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
