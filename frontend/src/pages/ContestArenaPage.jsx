import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Play,
  Check,
  ChevronRight,
  Database,
  ArrowLeft,
  Sparkles,
  Trophy,
  ShieldAlert,
  Send,
  RotateCcw,
  FileText,
  Table,
  HelpCircle,
  CheckSquare,
  Layers,
  Maximize2
} from 'lucide-react';
import { contestService } from '../services/contestService';
import { SqlEditor } from '../components/SqlEditor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { EerDiagramViewer } from '../components/EerDiagramViewer';

export const ContestArenaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [arenaData, setArenaData] = useState(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [sqlCodes, setSqlCodes] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [activeTab, setActiveTab] = useState('description'); // 'description' | 'schema'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState('problem'); // 'problem' | 'workspace'

  // Test completion & countdown states
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionSource, setCompletionSource] = useState('manual'); // 'manual' | 'timeout'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showExamStartedModal, setShowExamStartedModal] = useState(false);
  const [lobbyCountdown, setLobbyCountdown] = useState(0);
  const [startCountdown, setStartCountdown] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionSummary, setCompletionSummary] = useState(null);

  const fetchArena = async () => {
    try {
      setLoading(true);
      const res = await contestService.getContestExamRoom(id);
      if (res.success) {
        setArenaData(res);
        setTimeRemaining(res.time_remaining_seconds || 0);
        setLobbyCountdown(res.seconds_until_lobby || 0);
        setStartCountdown(res.seconds_until_start || 0);

        if (res.is_completed || res.status === 'ended') {
          setIsCompleted(true);
        } else {
          setIsCompleted(false);
          // If entering active exam, show Exam Started announcement once per session
          if (res.status === 'active') {
            const hasSeen = sessionStorage.getItem(`contest_start_modal_${id}`);
            if (!hasSeen) {
              setShowExamStartedModal(true);
              try {
                sessionStorage.setItem(`contest_start_modal_${id}`, 'true');
              } catch (_) {}
            }
          }
        }

        // Pre-fill starter SQLs and previous answers
        const initialSqls = {};
        const initialOptions = {};
        res.questions?.forEach((q) => {
          const prevAns = res.user_answers?.[q.id];
          if (prevAns) {
            if (prevAns.submitted_sql) initialSqls[q.id] = prevAns.submitted_sql;
            if (prevAns.selected_option !== null && prevAns.selected_option !== undefined) {
              initialOptions[q.id] = prevAns.selected_option;
            }
          }
          if (!initialSqls[q.id]) {
            initialSqls[q.id] = q.starter_sql || (q.target_table ? `-- Write solution for ${q.title}\nSELECT * FROM \`${q.target_table}\` LIMIT 10;` : `-- Write SQL solution here\n`);
          }
        });
        setSqlCodes(initialSqls);
        setSelectedOptions(initialOptions);
      } else {
        setToast({ type: 'error', message: res.message || 'Unable to access exam room.' });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Access denied. You may need to register first.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExamCompletion = async (source = 'manual') => {
    setCompletionSource(source);
    setIsCompleted(true);
    setShowConfirmModal(false);
    setShowThankYouModal(true);
    try {
      localStorage.removeItem(`contest_completed_${id}`);
    } catch (_) {}

    try {
      setIsFinishing(true);
      const res = await contestService.finishContestAttempt(id);
      if (res && res.success) {
        setCompletionSummary(res);
      }
    } catch (err) {
      console.warn('Could not post finish contest attempt:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  useEffect(() => {
    fetchArena();
  }, [id]);

  // 1. Live countdown for Waiting Lobby Activates In (link_not_open)
  useEffect(() => {
    if (lobbyCountdown <= 0) return;

    const timer = setInterval(() => {
      setLobbyCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchArena(); // Automatically transition to waiting lobby
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lobbyCountdown]);

  // 2. Live countdown for Time Until Questions Unlock (waiting_lobby)
  useEffect(() => {
    if (startCountdown <= 0) return;

    const timer = setInterval(() => {
      setStartCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchArena(); // Automatically transition to active exam & unlock questions
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [startCountdown]);

  // 3. Synchronized active exam duration countdown timer
  useEffect(() => {
    if (timeRemaining <= 0 || isCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExamCompletion('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isCompleted]);

  const totalQuestions = arenaData?.questions?.length || 0;
  const solvedCount = arenaData?.solved_question_ids?.length || 0;
  const unansweredCount = Math.max(0, totalQuestions - solvedCount);
  const earnedMarks = arenaData?.earned_marks || 0;
  const totalMarks = arenaData?.contest?.total_marks || 0;

  const activeQuestion = arenaData?.questions?.[activeQuestionIdx];

  // EER diagram state for active question
  const [showEerStudio, setShowEerStudio] = useState(false);
  const [eerData, setEerData] = useState(null);
  const [isEerLoading, setIsEerLoading] = useState(false);
  const [eerError, setEerError] = useState(null);

  useEffect(() => {
    if ((activeTab === 'eer' || showEerStudio) && activeQuestion?.id) {
      const fetchEer = async () => {
        setIsEerLoading(true);
        setEerError(null);
        try {
          const res = await contestService.getContestQuestionEer(id, activeQuestion.id);
          if (res.success && res.data) {
            setEerData(res.data);
          } else {
            setEerError(res.message || 'No schema found for this question');
          }
        } catch (err) {
          setEerError(err.response?.data?.message || err.message || 'Failed to load EER diagram');
        } finally {
          setIsEerLoading(false);
        }
      };
      fetchEer();
    }
  }, [activeTab, showEerStudio, activeQuestion?.id, id]);

  const handleSubmitSolution = async () => {
    if (!activeQuestion) return;
    const isTech = activeQuestion.question_type === 'technical';
    const currentSql = !isTech ? (sqlCodes[activeQuestion.id] || '') : '';
    const currentOption = isTech ? selectedOptions[activeQuestion.id] : null;

    if (isTech && (currentOption === null || currentOption === undefined)) {
      setToast({ type: 'warning', message: 'Please select one option before submitting.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionResult(null);
      const res = await contestService.submitContestSolution(id, activeQuestion.id, currentSql, currentOption);
      setSubmissionResult(res);

      if (res.success) {
        setArenaData((prev) => ({
          ...prev,
          user_answers: {
            ...(prev?.user_answers || {}),
            [activeQuestion.id]: {
              selected_option: currentOption,
              submitted_sql: currentSql,
              is_correct: res.passed,
              marks_awarded: res.marks_awarded,
              submitted_at: res.submitted_at
            }
          },
          solved_question_ids: res.passed
            ? Array.from(new Set([...(prev?.solved_question_ids || []), activeQuestion.id]))
            : prev?.solved_question_ids || [],
          earned_marks: (prev?.earned_marks || 0) + (res.passed ? res.marks_awarded : 0)
        }));

        if (res.passed) {
          setToast({
            type: 'success',
            message: `Correct! Awarded ${res.marks_awarded} Marks at ${res.submitted_at}!`
          });
        } else {
          setToast({
            type: 'error',
            message: res.diff_reason || res.error || (isTech ? 'Incorrect answer option selected.' : 'Output mismatch. Check your query logic.')
          });
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit solution.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format HH:MM:SS
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <LoadingSpinner />
        <p className="mt-4 text-xs">Entering Secure Contest Exam Arena...</p>
      </div>
    );
  }

  // Link not open state (Before lobby_open_time)
  if (arenaData?.status === 'link_not_open') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl w-full space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Test Link Not Active Yet
            </span>
            <h1 className="text-2xl font-bold text-white mt-3">{arenaData.contest?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">{arenaData.message}</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
              Waiting Lobby Activates In
            </span>
            <span className="text-4xl font-mono font-black text-blue-400">
              {formatTimer(lobbyCountdown)}
            </span>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-left text-xs space-y-2">
            <span className="font-bold text-slate-300 block">Exam Schedule Timeline:</span>
            <div className="text-slate-400 space-y-1 text-[11px]">
              <div>• <strong>Lobby Opens:</strong> {arenaData.lobby_open_time ? new Date(arenaData.lobby_open_time).toLocaleString() : '20 min before start'}</div>
              <div>• <strong>Exam Starts:</strong> {arenaData.contest?.start_time ? new Date(arenaData.contest.start_time).toLocaleString() : '—'}</div>
              <div>• <strong>Exam Ends:</strong> {arenaData.contest?.end_time ? new Date(arenaData.contest.end_time).toLocaleString() : '—'}</div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={fetchArena}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Check Again
            </button>
            <Link
              to="/contests"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Back to Contests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Waiting lobby state (Lobby open, candidate reviews rules & awaits start)
  if (arenaData?.status === 'waiting_lobby') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block">
              Exam Waiting Lobby Open
            </span>
            <h1 className="text-2xl font-bold text-white">{arenaData.contest?.title}</h1>
            <p className="text-xs text-slate-400">{arenaData.message}</p>
          </div>

          {/* Countdown Clock */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
              Time Until Questions Unlock
            </span>
            <span className="text-4xl font-mono font-black text-amber-400">
              {formatTimer(startCountdown)}
            </span>
          </div>

          {/* Rules & Code of Conduct Verification Check */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Contest Rules & Examination Guidelines</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 text-xs font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
              {arenaData.rules || arenaData.contest?.rules || '1. All queries must be written independently.\n2. Ties broken by submission seconds.\n3. Top 3 earn Certificates + XP.'}
            </div>

            <label className="flex items-start gap-2.5 p-2 bg-indigo-950/30 border border-indigo-800/40 rounded-xl cursor-pointer hover:bg-indigo-950/50 transition">
              <input
                type="checkbox"
                checked={rulesAgreed}
                onChange={(e) => setRulesAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700 focus:ring-0"
              />
              <span className="text-xs text-indigo-200">
                <strong>Rules Verification Check:</strong> I have reviewed and agree to strictly follow the contest rules and code of conduct.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={fetchArena}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Refresh Status
            </button>
            <button
              onClick={fetchArena}
              disabled={!rulesAgreed}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{rulesAgreed ? 'Rules Confirmed • Ready to Begin' : 'Accept Rules to Proceed'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Evaluating state (Exam ended, waiting for results_publish_time)
  if (arenaData?.status === 'evaluating') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Exam Concluded • Evaluation in Progress
            </span>
            <h1 className="text-2xl font-bold text-white mt-3">{arenaData.contest?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">{arenaData.message}</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
              Podium & Certificates Revealed In
            </span>
            <span className="text-4xl font-mono font-black text-amber-400">
              {formatTimer(arenaData.seconds_until_results || 0)}
            </span>
          </div>

          <Link
            to={`/contests/${id}/leaderboard`}
            className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow"
          >
            Go to Leaderboard & Podium
          </Link>
        </div>
      </div>
    );
  }

  if (!arenaData || !arenaData.questions) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold">Exam Room Locked or Not Found</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          {toast?.message || 'You must be registered before the deadline to enter this contest.'}
        </p>
        <Link
          to="/contests"
          className="mt-6 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
        >
          Back to Contests
        </Link>
      </div>
    );
  }

  const isSolved = arenaData.solved_question_ids?.includes(activeQuestion?.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Dedicated Full-Page EER Diagram Studio */}
      {showEerStudio && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in">
          <EerDiagramViewer
            eerData={eerData}
            loading={isEerLoading}
            error={eerError}
            isFullPage={true}
            onBack={() => setShowEerStudio(false)}
            backLabel="Back to Contest Arena"
            targetTable={activeQuestion?.target_table}
          />
        </div>
      )}

      {/* Top Exam Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/contests"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate">{arenaData.contest?.title}</span>
            </h1>
            <span className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">Official Timed Online Exam</span>
          </div>
        </div>

        {/* Center Live Countdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-slate-950 border border-slate-700">
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={`font-mono text-xs sm:text-sm font-bold ${timeRemaining < 300 ? 'text-red-400' : 'text-white'}`}>
              {formatTimer(timeRemaining)}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-indigo-200">
              Score: <strong className="text-white font-bold">{arenaData.earned_marks || 0}</strong> / {arenaData.contest?.total_marks}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isCompleted}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Submit and finish your contest examination"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{isCompleted ? 'Test Completed' : 'Finish & Submit Test'}</span>
            <span className="sm:hidden">{isCompleted ? 'Done' : 'Finish'}</span>
          </button>
          <Link
            to={`/contests/${id}/leaderboard`}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1.5"
            title="Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Leaderboard</span>
          </Link>
        </div>
      </header>

      {/* Persistent Exam Completed Notice */}
      {isCompleted && (
        <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Examination Completed:</strong> Your answers have been successfully submitted and locked for evaluation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowThankYouModal(true)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shrink-0 cursor-pointer shadow"
          >
            View Thank You Summary
          </button>
        </div>
      )}

      {/* Global Question Selector & Navigation Bar (Always visible on mobile & desktop) */}
      <div className="p-2.5 sm:p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto z-10 sticky top-[61px] lg:static">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          {arenaData.questions?.map((q, idx) => {
            const solved = arenaData.solved_question_ids?.includes(q.id);
            const active = idx === activeQuestionIdx;
            const isTech = q.question_type === 'technical';
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setActiveQuestionIdx(idx);
                  setSubmissionResult(null);
                  setActiveTab('description');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-400/40 font-bold'
                    : solved
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                {solved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className={`w-2 h-2 rounded-full ${isTech ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                )}
                <span>Q{idx + 1}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  isTech ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {isTech ? 'MCQ' : 'SQL'}
                </span>
                <span className="text-[11px] text-slate-400">({q.marks}M)</span>
              </button>
            );
          })}
        </div>

        {/* Prev / Next Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeQuestionIdx > 0 && (
            <button
              type="button"
              onClick={() => {
                const prevIdx = activeQuestionIdx - 1;
                setActiveQuestionIdx(prevIdx);
                setSubmissionResult(null);
                setActiveTab('description');
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition flex items-center gap-1 cursor-pointer"
              title="Go to previous question"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const nextIdx = (activeQuestionIdx + 1) % (totalQuestions || 1);
              setActiveQuestionIdx(nextIdx);
              setSubmissionResult(null);
              setActiveTab('description');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
            title="Go to next question"
          >
            <span>Next Question</span>
            <ChevronRight className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Mobile Screen Segmented Tab Switcher (Visible only on screens < lg for SQL coding queries) */}
      {activeQuestion?.question_type !== 'technical' && (
        <div className="lg:hidden flex border-b border-slate-800 bg-slate-900/95 p-2 gap-2 sticky top-[112px] z-20">
          <button
            type="button"
            onClick={() => setMobileActiveView('problem')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileActiveView === 'problem'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Problem & Data (Q{activeQuestionIdx + 1})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('workspace')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileActiveView === 'workspace'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQL Editor & Run (Q{activeQuestionIdx + 1})</span>
          </button>
        </div>
      )}

      {/* Main Split Screen */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Problem Statement / Table Preview (5 cols) */}
        <div className={`lg:col-span-5 border-r border-slate-800 flex flex-col h-[calc(100vh-160px)] lg:h-[calc(100vh-115px)] overflow-y-auto ${
          activeQuestion?.question_type === 'technical'
            ? 'hidden lg:flex'
            : mobileActiveView === 'problem'
            ? 'flex'
            : 'hidden lg:flex'
        }`}>
          {/* Active Problem Statement & Tabs */}
          {activeQuestion && (
            <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
              {/* Question Meta Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeQuestion.question_type === 'technical'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {activeQuestion.question_type === 'technical' ? 'Technical MCQ' : 'Coding Query'}
                  </span>
                  {activeQuestion.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                      {activeQuestion.category}
                    </span>
                  )}
                  {activeQuestion.difficulty && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-slate-800 text-slate-400">
                      {activeQuestion.difficulty}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    {activeQuestion.marks} Marks
                  </span>
                  {isSolved && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Solved
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-tabs for Query Questions: Description vs Table Schema & 5-Row Data vs EER Diagram */}
              {activeQuestion.question_type !== 'technical' ? (
                <div className="flex border-b border-slate-800 gap-1 pb-1 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeTab === 'description'
                        ? 'bg-slate-800 text-white border-b-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Problem Description
                  </button>
                  <button
                    onClick={() => setActiveTab('schema')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeTab === 'schema'
                        ? 'bg-slate-800 text-white border-b-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5 text-indigo-400" />
                    Table Schema & 5-Row Preview
                    {activeQuestion.sample_rows && activeQuestion.sample_rows.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/30 text-indigo-200">
                        {activeQuestion.sample_rows.length} Rows
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('eer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                      activeTab === 'eer'
                        ? 'bg-slate-800 text-white border-b-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    EER Diagram
                  </button>
                </div>
              ) : null}

              {/* TAB 1: Description Content */}
              {activeTab === 'description' || activeQuestion.question_type === 'technical' ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white leading-snug">
                    {activeQuestion.title}
                  </h2>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/70 p-4 rounded-2xl border border-slate-800 shadow-inner">
                    {activeQuestion.description}
                  </div>

                  {/* Target Table Preview Badge for Queries */}
                  {activeQuestion.target_table && (
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Target Table</span>
                          <span className="font-mono text-xs font-bold text-slate-200">`{activeQuestion.target_table}`</span>
                        </div>
                      </div>
                      {activeQuestion.dataset_name && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Dataset: {activeQuestion.dataset_name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Exam Guidelines Note */}
                  <div className="p-3.5 bg-indigo-950/20 border border-indigo-800/30 rounded-xl text-xs text-slate-400 space-y-1">
                    <span className="font-semibold text-indigo-300 block">Assessment Policy</span>
                    <p className="text-[11px]">
                      Solutions are evaluated immediately. Marks are awarded upon passing with timestamp recorded for podium ranking.
                    </p>
                  </div>

                  {/* Final Exam Submission Banner */}
                  <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                    <div className="text-left">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Ready to submit your entire test?
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        It is <strong>not mandatory</strong> to answer every question. You can submit at any time.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      disabled={isCompleted}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isCompleted ? 'Test Completed' : 'Finish & Submit Exam'}</span>
                    </button>
                  </div>
                </div>
              ) : activeTab === 'schema' ? (
                /* TAB 2: Table Schema & 5-Row Live Data Preview */
                <div className="space-y-4">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Table</span>
                      <span className="text-sm font-bold font-mono text-indigo-300">`{activeQuestion.target_table}`</span>
                    </div>
                    {activeQuestion.dataset_name && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Source Dataset</span>
                        <span className="text-xs text-slate-300 font-mono">{activeQuestion.dataset_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Column Schema Definition */}
                  {activeQuestion.schema && activeQuestion.schema.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Table className="w-3.5 h-3.5 text-indigo-400" /> Table Columns & Data Types
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeQuestion.schema.map((col) => (
                          <div key={col.column_name} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
                            <span className="font-bold text-white">{col.column_name}</span>
                            <span className="text-slate-500 ml-1.5">({col.data_type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live 5 Sample Rows Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-amber-400" /> Live Data Preview (First 5 Rows)
                      </span>
                      <span className="text-[10px] text-slate-500">Examine values to craft exact query logic</span>
                    </div>

                    {activeQuestion.sample_rows && activeQuestion.sample_rows.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 shadow max-h-80">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 sticky top-0">
                              {Object.keys(activeQuestion.sample_rows[0]).map((col) => (
                                <th key={col} className="p-2 font-mono font-semibold whitespace-nowrap text-indigo-200">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {activeQuestion.sample_rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/50 text-slate-300">
                                {Object.keys(activeQuestion.sample_rows[0]).map((col) => (
                                  <td key={col} className="p-2 whitespace-nowrap">
                                    {row[col] !== null && row[col] !== undefined ? (
                                      <span>{String(row[col])}</span>
                                    ) : (
                                      <span className="text-slate-600 italic">NULL</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                        No sample rows available for this table.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 3: EER Diagram Interactive Visualizer */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>EER Schema ({activeQuestion.dataset_name || activeQuestion.target_table})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEerStudio(true)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 text-[11px] shadow transition active:scale-95 cursor-pointer shrink-0"
                      title="Open dedicated full-page studio view"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full-Page Studio</span>
                    </button>
                  </div>
                  <EerDiagramViewer
                    eerData={eerData}
                    loading={isEerLoading}
                    error={eerError}
                    height="h-[calc(100vh-270px)]"
                    targetTable={activeQuestion.target_table}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Code Editor OR Technical MCQ Options (7 cols, full width for technical MCQ on mobile) */}
        <div className={`lg:col-span-7 flex flex-col ${
          activeQuestion?.question_type === 'technical'
            ? 'flex col-span-12 h-[calc(100vh-115px)]'
            : mobileActiveView === 'workspace'
            ? 'flex h-[calc(100vh-160px)] lg:h-[calc(100vh-115px)]'
            : 'hidden lg:flex h-[calc(100vh-115px)]'
        } bg-slate-950`}>
          {activeQuestion?.question_type === 'technical' ? (
            /* TECHNICAL MCQ INTERACTIVE VIEW */
            <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
              {/* Question Statement in MCQ Workspace (Crucial for mobile & desktop clarity) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Question {activeQuestionIdx + 1} • MCQ
                    </span>
                    {activeQuestion.category && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {activeQuestion.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {activeQuestion.marks} Marks
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {activeQuestion.title}
                </h2>
                {activeQuestion.description && activeQuestion.description !== activeQuestion.title && (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                    {activeQuestion.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                  Select Answer Choice
                </span>
                <span className="text-[11px] text-slate-400">
                  Select one option & submit to lock
                </span>
              </div>

              {/* Options A, B, C, D Selection Cards */}
              {(() => {
                const currentPrevAns = arenaData?.user_answers?.[activeQuestion?.id];
                const isMcqLocked = Boolean(currentPrevAns || (submissionResult && activeQuestion?.question_type === 'technical') || arenaData?.solved_question_ids?.includes(activeQuestion?.id));
                const hasSelectedOption = typeof selectedOptions[activeQuestion?.id] === 'number';
                const isMcqSubmitDisabled = isSubmitting || timeRemaining <= 0 || isCompleted || isMcqLocked || !hasSelectedOption;

                return (
                  <>
                    <div className="space-y-3 flex-1">
                      {(activeQuestion.options || []).map((opt, optIdx) => {
                        const optText = typeof opt === 'string' ? opt : opt.text;
                        const isSelected = selectedOptions[activeQuestion.id] === optIdx;
                        const optionLetters = ['A', 'B', 'C', 'D'];

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={timeRemaining <= 0 || isCompleted || isMcqLocked}
                            onClick={() => {
                              if (isMcqLocked) return;
                              setSelectedOptions({
                                ...selectedOptions,
                                [activeQuestion.id]: optIdx
                              });
                            }}
                            className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                              isMcqLocked ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              isSelected
                                ? isMcqLocked
                                  ? 'bg-emerald-950/20 border-emerald-500/50 text-white ring-1 ring-emerald-500/50'
                                  : 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500'
                                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition ${
                              isSelected
                                ? isMcqLocked
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {optionLetters[optIdx]}
                            </div>
                            <div className="flex-1 text-xs text-slate-200 pt-1 leading-relaxed">
                              {optText || `Option ${optionLetters[optIdx]}`}
                            </div>
                            <div className="pt-1.5 shrink-0">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? isMcqLocked
                                    ? 'border-emerald-500 bg-emerald-600'
                                    : 'border-indigo-500 bg-indigo-600'
                                  : 'border-slate-600'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* MCQ Submission Footer */}
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {isCompleted
                          ? 'Exam submitted. Answers are locked.'
                          : timeRemaining <= 0
                          ? 'Exam ended. Submissions disabled.'
                          : isMcqLocked
                          ? 'Answer submitted and locked.'
                          : !hasSelectedOption
                          ? 'Please select an option (A, B, C, or D) above to submit.'
                          : 'Option selected. Click Submit & Lock Answer to evaluate.'}
                      </span>

                      <button
                        type="button"
                        onClick={handleSubmitSolution}
                        disabled={isMcqSubmitDisabled}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          isMcqLocked
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 cursor-not-allowed opacity-90'
                            : isMcqSubmitDisabled
                            ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                            : 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Evaluating Answer...
                          </>
                        ) : isMcqLocked ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Answer Submitted & Locked
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Submit & Lock Answer
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feedback Drawer for MCQ */}
                    {(submissionResult || currentPrevAns) && (
                      <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(submissionResult ? submissionResult.passed : currentPrevAns?.is_correct) ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Correct! (+{(submissionResult ? submissionResult.marks_awarded : currentPrevAns?.marks_awarded)} Marks)
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-red-400" /> Incorrect Choice (0 Marks)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {submissionResult?.submitted_at || currentPrevAns?.submitted_at}
                          </span>
                        </div>
                        {(submissionResult?.diff_reason || currentPrevAns?.diff_reason) && (
                          <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-300">
                            {submissionResult?.diff_reason || currentPrevAns?.diff_reason}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* CODING QUERY MONACO EDITOR VIEW */
            <>
              {/* Mobile Quick Problem Reminder */}
              <div className="lg:hidden p-3.5 bg-slate-900 border-b border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Q{activeQuestionIdx + 1} • SQL
                    </span>
                    <span className="font-bold text-white text-xs truncate max-w-[200px]">
                      {activeQuestion?.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileActiveView('problem')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition flex items-center gap-0.5 shrink-0"
                  >
                    <span>View Data</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {activeQuestion?.description && (
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {activeQuestion.description}
                  </p>
                )}
                {activeQuestion?.target_table && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Table className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Target Table: <strong className="text-indigo-300 font-bold">`{activeQuestion.target_table}`</strong></span>
                  </div>
                )}
              </div>

              {/* Editor Header */}
              <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-400">
                  SQL Solution Editor ({activeQuestion?.title})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSqlCodes({
                        ...sqlCodes,
                        [activeQuestion?.id]: activeQuestion?.starter_sql || ''
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Starter
                  </button>
                </div>
              </div>

              {/* Monaco SQL Editor */}
              <div className="flex-1 min-h-[300px]">
                <SqlEditor
                  value={sqlCodes[activeQuestion?.id] || ''}
                  onChange={(newCode) => {
                    setSqlCodes({
                      ...sqlCodes,
                      [activeQuestion?.id]: newCode
                    });
                  }}
                  onRun={handleSubmitSolution}
                  isRunning={isSubmitting}
                  height="100%"
                />
              </div>

              {/* Execution & Action Bar */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {isCompleted
                    ? 'Exam submitted. Answers are locked.'
                    : timeRemaining <= 0
                    ? 'Exam ended. Submissions disabled.'
                    : 'Execute and submit your query solution to evaluate marks in real time.'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {/* RUN & SUBMIT BUTTON */}
                  <button
                    type="button"
                    onClick={handleSubmitSolution}
                    disabled={isSubmitting || timeRemaining <= 0 || isCompleted}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isSubmitting || timeRemaining <= 0 || isCompleted
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
                        : 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95'
                    }`}
                    title="Run and submit query solution for real-time marks evaluation"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating Query...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run & Submit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Submission Result Drawer */}
              {submissionResult && (
                <div className="p-4 bg-slate-900/90 border-t border-slate-800 max-h-56 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {submissionResult.passed ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Correct Output (+{submissionResult.marks_awarded} Marks)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-400" /> Incorrect Solution (0 Marks)
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Execution: {submissionResult.execution_time_ms} ms
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Timestamp: {submissionResult.submitted_at}
                    </span>
                  </div>

                  {submissionResult.diff_reason && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-300">
                      {submissionResult.diff_reason}
                    </div>
                  )}
                  {submissionResult.error && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs font-mono text-red-300">
                      {submissionResult.error}
                    </div>
                  )}

                  {/* Returned Rows Preview */}
                  {submissionResult.user_rows && submissionResult.user_rows.length > 0 && (
                    <div className="overflow-x-auto text-[11px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                            {submissionResult.user_columns?.map((col) => (
                              <th key={col} className="p-1.5 font-semibold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {submissionResult.user_rows.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-800/60 text-slate-300">
                              {submissionResult.user_columns?.map((col) => (
                                <td key={col} className="p-1.5">
                                  {String(row[col] ?? 'NULL')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      {/* CONFIRM SUBMISSION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Finish & Submit Examination?</h3>
                <p className="text-xs text-slate-400">Review your progress before final evaluation.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-[11px]">Solved Questions</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {solvedCount} <span className="text-xs font-normal text-slate-500">/ {totalQuestions}</span>
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-[11px]">Unanswered Questions</p>
                <p className="text-base font-bold text-amber-400 mt-0.5">
                  {unansweredCount} <span className="text-xs font-normal text-slate-500">questions</span>
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-[11px]">Marks Secured</p>
                <p className="text-base font-bold text-indigo-400 mt-0.5">
                  {earnedMarks} <span className="text-xs font-normal text-slate-500">/ {totalMarks}</span>
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-[11px]">Time Remaining</p>
                <p className="text-base font-mono font-bold text-slate-200 mt-0.5">
                  {formatTimer(timeRemaining)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Note:</strong> It is not mandatory to solve all questions. You may submit early at any time. Once confirmed, your answers will be locked and saved for official leaderboard ranking.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isFinishing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={() => handleExamCompletion('manual')}
                disabled={isFinishing}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 shadow-lg shadow-red-500/20 transition flex items-center gap-2"
              >
                {isFinishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Submit Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THANK YOU / SUCCESSFUL COMPLETION MODAL */}
      {showThankYouModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-6">
            {/* Top decorative gradient glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-gradient-to-b from-indigo-500/20 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-4 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
                Exam Successfully Submitted
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Thank You! Test Successfully Completed
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
                {completionSource === 'timeout'
                  ? 'Contest time has elapsed. Your final answers and query submissions have been securely recorded.'
                  : 'Your answers and evaluations have been successfully recorded in the contest registry.'}
              </p>
            </div>

            {/* Performance Summary Card */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Contest</span>
                <span className="text-xs text-white font-semibold truncate max-w-[200px]">
                  {completionSummary?.contest_title || arenaData?.contest?.title || 'SQL Battle'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-medium">Solved</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {completionSummary?.solved_questions ?? solvedCount}
                    <span className="text-[10px] text-slate-500 font-normal"> / {completionSummary?.total_questions ?? totalQuestions}</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-medium">Marks</p>
                  <p className="text-base font-bold text-indigo-400 mt-0.5">
                    {completionSummary?.earned_marks ?? earnedMarks}
                    <span className="text-[10px] text-slate-500 font-normal"> / {completionSummary?.total_marks ?? totalMarks}</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-medium">Status</p>
                  <p className="text-xs font-bold text-teal-400 mt-1 flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> Submitted
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-800/40 text-left text-xs text-indigo-200/90 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Official final ranks and top-3 ranker certificates will be awarded once all evaluations conclude. You can track live standings on the leaderboard!
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/contests/${id}`)}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-300" /> View Contest Leaderboard
              </button>
              <button
                type="button"
                onClick={() => setShowThankYouModal(false)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Review Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXAM HAS STARTED ANNOUNCEMENT MODAL */}
      {showExamStartedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-5">
            {/* Top decorative glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-gradient-to-b from-indigo-500/30 via-emerald-500/20 to-transparent blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-3 animate-bounce">
                <Play className="w-7 h-7 text-emerald-400 fill-emerald-400/20 ml-0.5" />
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
                Questions Unlocked
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                Contest Exam Has Started!
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                All SQL query challenges and technical MCQs are now open. Your official contest timer has started. Click OK to begin.
              </p>
            </div>

            {/* Quick stats snapshot */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-center">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-medium">Questions</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{totalQuestions}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-medium">Total Marks</span>
                <span className="text-sm font-bold text-indigo-400 mt-0.5 block">{totalMarks}M</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block font-medium">Time Left</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">{formatTimer(timeRemaining)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowExamStartedModal(false)}
                className="w-full py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Exam • OK</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
