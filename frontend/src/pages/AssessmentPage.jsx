import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Trophy,
  ChevronRight,
  Clock,
  ArrowLeft,
  Check,
  Layers,
  BarChart2,
  Zap,
  BookOpen,
  Lock,
} from 'lucide-react';
import { assessmentService } from '../services/assessmentService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CertificateModal } from '../components/CertificateModal';
import { Toast } from '../components/Toast';

export const AssessmentPage = () => {
  const [assessments, setAssessments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  // Active Assessment Session
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Certificate Modal State
  const [showCertModal, setShowCertModal] = useState(false);
  const [modalCertificate, setModalCertificate] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      const [assResult, certsResult] = await Promise.allSettled([
        assessmentService.getAssessments('all'),
        assessmentService.getMyCertificates(),
      ]);

      if (assResult.status === 'fulfilled' && assResult.value?.success && assResult.value?.data) {
        setAssessments(assResult.value.data);
      }
      if (certsResult.status === 'fulfilled' && certsResult.value?.success && certsResult.value?.data) {
        setCertificates(certsResult.value.data);
      }
    } catch (err) {
      console.error('Failed to load assessment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const handleStartAssessment = async (assessmentSummary) => {
    if (assessmentSummary.is_locked) {
      setToast({
        type: 'warning',
        message: `🔒 Assessment Locked: ${assessmentSummary.level?.toUpperCase()} level requires ${assessmentSummary.required_xp} XP to unlock. Your current XP is ${assessmentSummary.user_xp || 0}. Earn more XP in Beginner challenges or Sunday Contests!`
      });
      return;
    }
    try {
      setLoading(true);
      const res = await assessmentService.getAssessment(assessmentSummary.id);
      if (res.success && res.data) {
        setActiveAssessment(res.data);
        setCurrentIdx(0);
        setAnswers({});
        setResult(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to start assessment.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!activeAssessment) return;
    const questions = activeAssessment.questions || [];
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < questions.length) {
      setToast({
        type: 'error',
        message: `Please answer all questions before submitting (${answeredCount}/${questions.length} answered).`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assessmentService.submitAssessment(activeAssessment.id, answers);
      if (res.success) {
        setResult(res);
        if (res.passed && res.certificate) {
          setModalCertificate(res.certificate);
          setToast({
            type: 'success',
            message: `🎉 Congratulations! You scored ${res.score_percent}% and earned your ${activeAssessment.level.toUpperCase()} Certificate!`,
          });
        }
        // Refresh catalog in background to update best scores
        fetchCatalogData();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to grade assessment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitSession = () => {
    setActiveAssessment(null);
    setResult(null);
    setAnswers({});
    setCurrentIdx(0);
  };

  const getLevelBadge = (lvl) => {
    switch (lvl?.toLowerCase()) {
      case 'beginner':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'intermediate':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  if (loading && !activeAssessment) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner size="lg" text="Loading SQL Skill Assessments..." />
      </div>
    );
  }

  const filteredAssessments = assessments.filter(
    (a) => selectedLevel === 'all' || a.level?.toLowerCase() === selectedLevel.toLowerCase()
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* VIEW A: ASSESSMENT CATALOG (LEVEL-WISE) */}
      {!activeAssessment ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Official Skill Competency Certification
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  SQL Competency Skill Assessments
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Earn accredited credentials tailored to your SQL expertise. Choose your skill tier, complete timed scenario evaluations, and earn verifiable certificates for Beginner, Intermediate, and Advanced analytics.
                </p>
              </div>

              {certificates.length > 0 && (
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center shrink-0 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider">
                      Earned Credentials
                    </div>
                    <div className="text-lg font-black text-white">
                      {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalCertificate(certificates[0]);
                      setShowCertModal(true);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                  >
                    View Latest Certificate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Level Switcher Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
              {[
                { key: 'all', label: 'All Levels', count: assessments.length },
                { key: 'beginner', label: '🟢 Beginner', count: assessments.filter((a) => a.level?.toLowerCase() === 'beginner').length },
                { key: 'intermediate', label: '🟡 Intermediate', count: assessments.filter((a) => a.level?.toLowerCase() === 'intermediate').length },
                { key: 'advanced', label: '🟣 Advanced', count: assessments.filter((a) => a.level?.toLowerCase() === 'advanced').length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedLevel(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedLevel === tab.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedLevel === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {filteredAssessments.length} {filteredAssessments.length === 1 ? 'assessment' : 'assessments'}
            </div>
          </div>

          {/* Level Assessments Cards Grid */}
          {filteredAssessments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No assessments found in this level
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No assessment packages are available for the selected level. Try selecting "All Levels" or another tier above.
              </p>
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <span>View All Assessments</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssessments.map((ass) => {
                const matchingCert = certificates.find((c) => c.assessment_id === ass.id || c.track_name === ass.title);

                return (
                  <div
                    key={ass.id}
                    className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col justify-between ${
                      ass.is_locked
                        ? 'border-slate-800 opacity-75 hover:border-amber-500/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getLevelBadge(ass.level)}`}>
                          {ass.level}
                        </span>
                        {ass.is_locked ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40">
                            <Lock className="w-3 h-3" />
                            <span>Unlock at {ass.required_xp} XP</span>
                          </span>
                        ) : matchingCert ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Certified ({matchingCert.score_percent}%)</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {ass.time_limit_minutes}m
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {ass.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {ass.description || 'Evaluates relational querying, filtering, grouping, and performance logic.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>{ass.questions_count} Scenario Questions</span>
                        <span>Pass: {ass.passing_score}%</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {matchingCert && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalCertificate(matchingCert);
                              setShowCertModal(true);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition cursor-pointer text-center"
                          >
                            View Certificate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartAssessment(ass)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            ass.is_locked
                              ? 'bg-slate-800 text-amber-500 border border-amber-900/40 hover:bg-slate-700'
                              : matchingCert
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                          }`}
                        >
                          {ass.is_locked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked ({ass.required_xp} XP)</span>
                            </>
                          ) : (
                            <>
                              <span>{matchingCert ? 'Retake Test' : 'Start Assessment'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW B: INTERACTIVE ASSESSMENT SESSION */
        <div className="space-y-6">
          {/* Back button & Active Assessment Summary */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleExitSession}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assessments</span>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getLevelBadge(activeAssessment.level)}`}>
                {activeAssessment.level}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {activeAssessment.title}
              </span>
            </div>
          </div>

          {!result ? (
            /* Active Test Questions View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Question Progress Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Question {currentIdx + 1} of {(activeAssessment.questions || []).length}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-medium">
                    {(activeAssessment.questions || [])[currentIdx]?.category || 'General SQL'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(activeAssessment.questions || []).map((q, idx) => {
                    const isAnswered = answers[String(q.id)] !== undefined;
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                            : isAnswered
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Question */}
              {(() => {
                const q = (activeAssessment.questions || [])[currentIdx];
                if (!q) return null;
                const options = q.options || [q.option_a, q.option_b, q.option_c, q.option_d];

                return (
                  <div className="p-6 sm:p-8 space-y-6">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question || q.question_text}
                    </h2>

                    <div className="space-y-3">
                      {options.map((optText, optIdx) => {
                        const isSelected = answers[String(q.id)] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/40 text-slate-900 dark:text-white shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-400 dark:border-slate-600 bg-transparent'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm sm:text-base font-medium">{optText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation & Submit footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                >
                  Previous
                </button>

                <div className="flex items-center gap-3">
                  {currentIdx < (activeAssessment.questions || []).length - 1 ? (
                    <button
                      onClick={() => setCurrentIdx((prev) => Math.min((activeAssessment.questions || []).length - 1, prev + 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white transition cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md disabled:opacity-50 transition cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Evaluating Answers...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Assessment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
                    result.passed
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {result.passed ? <Trophy className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {result.passed
                      ? `🎉 ${activeAssessment.level.toUpperCase()} Certification Passed!`
                      : 'Assessment Not Passed'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    You scored <span className="font-bold text-slate-900 dark:text-white">{result.score_percent}%</span> ({result.correct_count} of {result.total_questions} correct). Passing threshold: {result.passing_score}%.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {result.passed && result.certificate && (
                    <button
                      onClick={() => {
                        setModalCertificate(result.certificate);
                        setShowCertModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md transition cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>View & Print Official Certificate</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setResult(null);
                      setAnswers({});
                      setCurrentIdx(0);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Assessment</span>
                  </button>

                  <button
                    onClick={handleExitSession}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <span>Back to All Assessments</span>
                  </button>
                </div>
              </div>

              {/* Detailed Review */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Detailed Answers & Explanations Review
                </h3>

                <div className="space-y-4">
                  {result.details.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        item.is_correct
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {item.is_correct ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500" />
                          )}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {idx + 1}. {item.question}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Explanation: </span>
                            {item.explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        certificate={modalCertificate}
      />
    </div>
  );
};
