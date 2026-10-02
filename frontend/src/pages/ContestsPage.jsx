import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Clock,
  Sparkles,
  Users,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Lock,
  ExternalLink,
  ChevronRight,
  Flame,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { contestService } from '../services/contestService';
import { useAuth } from '../hooks/useAuth';
import { ContestRegistrationModal } from '../components/ContestRegistrationModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';

export const ContestsPage = () => {
  const { user } = useAuth();
  const [contestsData, setContestsData] = useState({ upcoming: [], active: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed' | 'rules'
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await contestService.getContests();
      if (res.success && res.data) {
        setContestsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  // Next upcoming contest for hero section
  const nextContest = contestsData.active[0] || contestsData.upcoming[0];

  // Countdown timer for next contest
  useEffect(() => {
    if (!nextContest || !nextContest.start_time) return;

    const interval = setInterval(() => {
      const target = new Date(nextContest.start_time).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextContest]);

  const handleOpenRegister = (contest) => {
    setSelectedContest(contest);
    setShowRegModal(true);
  };

  const handleRegisteredSuccess = (res) => {
    setToast({
      type: 'success',
      message: res.message || 'Successfully registered for the contest!'
    });
    fetchContests();
  };

  return (
    <div className="text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto bg-slate-950 rounded-2xl min-h-[calc(100vh-8rem)]">
      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Hero Banner with Next Sunday Championship */}
      {nextContest ? (
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 shadow-2xl p-6 md:p-10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" /> Next Sunday Championship
                </span>
                {nextContest.status === 'active' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> LIVE NOW
                  </span>
                ) : nextContest.is_registration_open ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Registration Open
                  </span>
                ) : nextContest.is_registration_upcoming ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Registration Opens Soon
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-700">
                    Registration Closed
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {nextContest.title}
              </h1>

              <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
                {nextContest.description}
              </p>

              {/* Registration & Timeline Milestone Alert */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>
                  <strong>Registration Cutoff:</strong> {nextContest.registration_deadline ? new Date(nextContest.registration_deadline).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Strict Deadline'} (No entries accepted after cutoff).
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {nextContest.is_registered || user?.is_admin ? (
                  <div className="flex items-center gap-3">
                    {nextContest.is_registered ? (
                      <span className="px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> You Are Registered
                      </span>
                    ) : (
                      <span className="px-4 py-2.5 rounded-xl bg-purple-950/50 border border-purple-700/60 text-purple-300 text-xs font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400" /> Admin Access
                      </span>
                    )}
                    <Link
                      to={`/contests/${nextContest.id}/arena`}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
                    >
                      Enter Exam Arena
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : nextContest.is_registration_open ? (
                  <button
                    onClick={() => handleOpenRegister(nextContest)}
                    className="px-7 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-xl shadow-indigo-500/25 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-300" /> Register for Contest
                  </button>
                ) : nextContest.is_registration_upcoming ? (
                  <span className="px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" /> Registration Opens at {nextContest.registration_start_time ? new Date(nextContest.registration_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                  </span>
                ) : nextContest.status === 'active' || nextContest.is_test_link_open ? (
                  <span className="px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-medium">
                    Exam in Progress (Registration Closed)
                  </span>
                ) : (
                  <span className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium">
                    Registration Closed
                  </span>
                )}

                <Link
                  to={`/contests/${nextContest.id}/leaderboard`}
                  className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition flex items-center gap-2"
                >
                  View Leaderboard & Rules
                </Link>
              </div>
            </div>

            {/* Live Countdown & Podium Perks Card */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Contest Countdown
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                    <span className="text-2xl font-black text-white block">{timeRemaining.days}</span>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Days</span>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                    <span className="text-2xl font-black text-white block">{timeRemaining.hours}</span>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Hours</span>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                    <span className="text-2xl font-black text-white block">{timeRemaining.minutes}</span>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Mins</span>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                    <span className="text-2xl font-black text-amber-400 block">{timeRemaining.seconds}</span>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Secs</span>
                  </div>
                </div>
              </div>

              {/* Ranker Prize Structure */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Top 3 Ranker Rewards
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <span className="font-semibold text-white">Rank 1 Champion</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-400 font-bold block">+150 XP</span>
                      <span className="text-[10px] text-slate-400">Gold Certificate</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 font-bold flex items-center justify-center text-xs">
                        2
                      </span>
                      <span className="font-semibold text-white">Rank 2 Runner Up</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-300 font-bold block">+100 XP</span>
                      <span className="text-[10px] text-slate-400">Silver Certificate</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/10 border border-amber-900/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-900/30 text-amber-500 font-bold flex items-center justify-center text-xs">
                        3
                      </span>
                      <span className="font-semibold text-white">Rank 3 2nd Runner Up</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-500 font-bold block">+75 XP</span>
                      <span className="text-[10px] text-slate-400">Bronze Certificate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Upcoming & Live Contests
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" /> Past Contests & Podium ({contestsData.completed.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" /> XP Tiers & Progression
          </button>
        </div>
      </div>

      {/* Tab 1: Upcoming & Live Contests */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Scheduled Competitions</h2>
            <span className="text-xs text-slate-400">Weekly on Sundays</span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : contestsData.upcoming.length === 0 && contestsData.active.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No upcoming contests scheduled right now</h3>
              <p className="text-xs text-slate-400 mt-1">Please check back soon! Contests are announced weekly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...contestsData.active, ...contestsData.upcoming].map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {c.questions_count} Problems • {c.total_marks} Marks
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {c.registrations_count} Registered
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{c.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>

                    <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs text-slate-300">
                      <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Contest Schedule Milestones
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">1. Reg. Cutoff:</span>
                          <span className="font-semibold text-amber-300 block truncate">
                            {c.registration_deadline ? new Date(c.registration_deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">2. Test Link Opens:</span>
                          <span className="font-semibold text-blue-300 block truncate">
                            {c.lobby_open_time ? new Date(c.lobby_open_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '20m before start'}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">3. Live Exam:</span>
                          <span className="font-semibold text-emerald-300 block truncate">
                            {c.start_time ? new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'} - {c.end_time ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">4. Podium Reveal:</span>
                          <span className="font-semibold text-pink-300 block truncate">
                            {c.results_publish_time ? new Date(c.results_publish_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '5m after end'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      to={`/contests/${c.id}/leaderboard`}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Rules & Overview
                    </Link>

                    {c.is_registered || user?.is_admin ? (
                      <Link
                        to={`/contests/${c.id}/arena`}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        {user?.is_admin && !c.is_registered ? 'Enter Arena (Admin)' : 'Enter Arena'} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : c.is_registration_open ? (
                      <button
                        onClick={() => handleOpenRegister(c)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md flex items-center gap-1.5"
                      >
                        Register Now
                      </button>
                    ) : c.is_registration_upcoming ? (
                      <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Opens {c.registration_start_time ? new Date(c.registration_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                      </span>
                    ) : c.status === 'active' || c.is_test_link_open ? (
                      <span className="text-xs text-rose-400 font-medium">Exam in Progress (Reg Closed)</span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Registration Closed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Past Contests & Podium */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Past Sunday Competitions</h2>
            <span className="text-xs text-slate-400">View Final Leaderboards & Top 3 Ranker Certificates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contestsData.completed.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Completed Edition
                  </span>
                  <span className="text-xs text-slate-400">
                    {c.start_time ? new Date(c.start_time).toLocaleDateString() : ''}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{c.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" /> Top 3 Celebrated
                  </span>
                  <span className="text-slate-400">150 XP • 100 XP • 75 XP</span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{c.registrations_count} Total Participants</span>
                  <Link
                    to={`/contests/${c.id}/leaderboard`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow flex items-center gap-1.5"
                  >
                    View Podium & Standings <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: XP Tiers & Progression Guide */}
      {activeTab === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Platform XP System & Level Gating
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Contest victories award large XP bonuses that unlock higher-difficulty Practice Challenges and Skill Assessment Certifications!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Beginner Card */}
            <div className="bg-slate-950/60 border border-emerald-800/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Beginner Level
                </span>
                <span className="text-xs font-bold text-emerald-400">0 XP (Free)</span>
              </div>
              <h3 className="font-bold text-white text-sm">Foundational SQL</h3>
              <p className="text-xs text-slate-400">
                Open to all users immediately upon registration. Covers basic SELECT, WHERE, ORDER BY, and simple aggregate operations.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300">
                Unlocked for Everyone
              </div>
            </div>

            {/* Intermediate Card */}
            <div className="bg-slate-950/60 border border-indigo-800/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Intermediate Level
                </span>
                <span className="text-xs font-bold text-indigo-400">500 XP</span>
              </div>
              <h3 className="font-bold text-white text-sm">Relational Aggregations & Joins</h3>
              <p className="text-xs text-slate-400">
                Unlocks when your total XP reaches <strong>500 XP</strong>. Covers complex GROUP BY, HAVING, INNER/LEFT/SELF JOINs, and data modeling.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-indigo-300">
                Requires 500 XP in Challenges or Contests
              </div>
            </div>

            {/* Advanced Card */}
            <div className="bg-slate-950/60 border border-purple-800/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Advanced Level
                </span>
                <span className="text-xs font-bold text-purple-400">1,000 XP</span>
              </div>
              <h3 className="font-bold text-white text-sm">Analytical Windows & CTEs</h3>
              <p className="text-xs text-slate-400">
                Unlocks when your total XP reaches <strong>1,000 XP</strong>. Covers window functions (RANK, DENSE_RANK, LAG/LEAD), recursive CTEs, and senior interview problems.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-purple-300">
                Requires 1,000 XP in Challenges or Contests
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      <ContestRegistrationModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        contest={selectedContest}
        onRegistered={handleRegisteredSuccess}
      />
    </div>
  );
};
