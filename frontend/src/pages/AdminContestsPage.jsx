import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Calendar,
  Clock,
  Award,
  Users,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Phone,
  Mail,
  FileCheck,
  Code,
  HelpCircle,
  Table,
  Layers,
  Sparkles,
  PlusCircle,
  Database,
  Search,
  LayoutGrid,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { contestService } from '../services/contestService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';

export const AdminContestsPage = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Available Datasets for Query Builder
  const [availableDatasets, setAvailableDatasets] = useState([]);

  // Create / Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContestId, setEditingContestId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState(0);

  const defaultRulesTemplate = `1. Authentic Independent SQL Coding: All solutions must be written directly by the candidate.
2. Ranking & Evaluation: Total marks determine rank; ties are strictly resolved by earliest submission timestamp down to the second.
3. Exclusive Top 3 Rewards: Gold, Silver, and Bronze Rankers earn verified certificates and bonus platform XP (+150 XP, +100 XP, +75 XP).
4. Strict Registration Window: Registrations close promptly at the deadline; no candidate may enter without prior registration.
5. System Integrity: Tab switching and external aids are prohibited during the live exam.`;

  const defaultHybridQuestions = [
    {
      question_type: 'technical',
      title: 'SQL Architecture: PRIMARY KEY Constraints',
      description: 'Which of the following statements about Primary Keys in SQL relational databases is TRUE?',
      category: 'SQL Fundamentals',
      option_a: 'A table can have multiple separate PRIMARY KEY constraints defined on different columns.',
      option_b: 'A PRIMARY KEY uniquely identifies records and strictly enforces both UNIQUE and NOT NULL constraints.',
      option_c: 'Primary keys allow duplicate values if clustered indexing is explicitly disabled.',
      option_d: 'Primary keys can only be defined on numeric INTEGER data types.',
      correct_option: 1,
      explanation: 'A PRIMARY KEY uniquely identifies each row and guarantees both UNIQUE and NOT NULL properties. There can be only one primary key per table.',
      marks: 10
    },
    {
      question_type: 'query',
      title: 'Problem 1: Department Payroll Analytics',
      description: 'Write an SQL query to calculate the employee count, total payroll (SUM of salary), and average salary rounded to 2 decimal places for each department from `ch_employees`. Order the output by average salary descending.',
      difficulty: 'intermediate',
      dataset_name: 'ch_hr',
      target_table: 'ch_employees',
      starter_sql: 'SELECT dept_id, AVG(salary) FROM ch_employees GROUP BY dept_id;',
      solution_sql: 'SELECT dept_id, COUNT(*) AS employee_count, SUM(salary) AS total_payroll, ROUND(AVG(salary), 2) AS avg_salary FROM ch_employees GROUP BY dept_id ORDER BY avg_salary DESC;',
      marks: 40
    },
    {
      question_type: 'query',
      title: 'Problem 2: High Credit Customer Segmentation',
      description: 'Filter high credit customers having credit_limit greater than 5000. Return full_name, city, and credit_limit ordered by credit_limit descending.',
      difficulty: 'beginner',
      dataset_name: 'ch_ecommerce',
      target_table: 'ch_customers',
      starter_sql: 'SELECT * FROM ch_customers LIMIT 10;',
      solution_sql: 'SELECT full_name, city, credit_limit FROM ch_customers WHERE credit_limit > 5000 ORDER BY credit_limit DESC;',
      marks: 50
    }
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rules: defaultRulesTemplate,
    registration_start_time: '',
    registration_deadline: '',
    lobby_open_time: '',
    start_time: '',
    end_time: '',
    results_publish_time: '',
    total_marks: 100,
    duration_minutes: 120,
    questions: defaultHybridQuestions
  });

  // Registrations Modal State
  const [showRegsModal, setShowRegsModal] = useState(false);
  const [activeRegs, setActiveRegs] = useState({ contest_title: '', total: 0, data: [] });
  const [regsLoading, setRegsLoading] = useState(false);

  const fetchAdminContests = async () => {
    try {
      setLoading(true);
      const res = await contestService.getAdminContests();
      if (res.success && res.data) {
        setContests(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    try {
      const res = await contestService.getAvailableDatasets();
      if (res.success && res.data) {
        setAvailableDatasets(res.data);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  useEffect(() => {
    fetchAdminContests();
    fetchDatasets();
  }, []);

  const formatIsoForInput = (isoStr) => {
    if (!isoStr) return '';
    try {
      const normalized = (isoStr.endsWith('Z') || isoStr.includes('+')) ? isoStr : `${isoStr}Z`;
      const d = new Date(normalized);
      if (isNaN(d.getTime())) return '';
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const handleOpenCreate = () => {
    setEditingContestId(null);
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(10, 0, 0, 0);

    const sundayEnd = new Date(nextSunday);
    sundayEnd.setHours(12, 0, 0, 0);

    const saturdayDeadline = new Date(nextSunday);
    saturdayDeadline.setDate(nextSunday.getDate() - 1);
    saturdayDeadline.setHours(23, 59, 0, 0);

    const lobbyTime = new Date(nextSunday);
    lobbyTime.setMinutes(nextSunday.getMinutes() - 20);

    const resultsTime = new Date(sundayEnd);
    resultsTime.setMinutes(sundayEnd.getMinutes() + 5);

    const regStartTime = new Date(now);

    setFormData({
      title: `Sunday National SQL Championship - Edition #${contests.length + 1}`,
      description: 'Weekly competitive SQL assessment. Top 3 Rankers earn authentic digital certificates and bonus XP.',
      rules: defaultRulesTemplate,
      registration_start_time: formatIsoForInput(regStartTime.toISOString()),
      registration_deadline: formatIsoForInput(saturdayDeadline.toISOString()),
      lobby_open_time: formatIsoForInput(lobbyTime.toISOString()),
      start_time: formatIsoForInput(nextSunday.toISOString()),
      end_time: formatIsoForInput(sundayEnd.toISOString()),
      results_publish_time: formatIsoForInput(resultsTime.toISOString()),
      total_marks: defaultHybridQuestions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0),
      duration_minutes: 120,
      questions: defaultHybridQuestions
    });
    setExpandedQuestionIdx(0);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (contest) => {
    setEditingContestId(contest.id);
    const mappedQuestions = (contest.questions && contest.questions.length > 0)
      ? contest.questions.map((q, idx) => {
          const qType = q.question_type || 'query';
          return {
            id: q.id,
            question_type: qType,
            title: q.title || `Question ${idx + 1}`,
            description: q.description || '',
            category: q.category || (qType === 'technical' ? 'SQL Architecture' : 'Query Analytics'),
            difficulty: q.difficulty || 'intermediate',
            dataset_name: q.dataset_name || 'ch_hr',
            target_table: q.target_table || 'ch_employees',
            starter_sql: q.starter_sql || '',
            solution_sql: q.solution_sql || '',
            option_a: q.option_a ?? (q.options?.[0] || ''),
            option_b: q.option_b ?? (q.options?.[1] || ''),
            option_c: q.option_c ?? (q.options?.[2] || ''),
            option_d: q.option_d ?? (q.options?.[3] || ''),
            correct_option: q.correct_option ?? 0,
            explanation: q.explanation || '',
            marks: q.marks || (qType === 'technical' ? 5 : 25)
          };
        })
      : defaultHybridQuestions;

    setFormData({
      title: contest.title || '',
      description: contest.description || '',
      rules: contest.rules || defaultRulesTemplate,
      registration_start_time: formatIsoForInput(contest.registration_start_time || contest.created_at),
      registration_deadline: formatIsoForInput(contest.registration_deadline),
      lobby_open_time: formatIsoForInput(contest.lobby_open_time),
      start_time: formatIsoForInput(contest.start_time),
      end_time: formatIsoForInput(contest.end_time),
      results_publish_time: formatIsoForInput(contest.results_publish_time),
      total_marks: contest.total_marks || mappedQuestions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0),
      duration_minutes: contest.duration_minutes || 120,
      questions: mappedQuestions
    });
    setExpandedQuestionIdx(0);
    setShowCreateModal(true);
  };

  const handleAddTechnicalQuestion = () => {
    const techCount = formData.questions.filter((q) => q.question_type === 'technical').length;
    const newQ = {
      question_type: 'technical',
      title: `Technical MCQ #${techCount + 1}: Conceptual SQL`,
      description: 'Which of the following is correct regarding SQL transactions / indexing / syntax?',
      category: 'SQL Architecture',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 0,
      explanation: 'why .',
      marks: 5
    };
    const updated = [...formData.questions, newQ];
    const newTotal = updated.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
    setFormData({ ...formData, questions: updated, total_marks: newTotal });
    setExpandedQuestionIdx(updated.length - 1);
  };

  const handleAddQueryQuestion = () => {
    const queryCount = formData.questions.filter((q) => q.question_type === 'query').length;
    const defaultDs = availableDatasets[0] || { key: 'ch_hr', name: 'HR & Payroll', tables: ['ch_employees', 'ch_departments'] };
    const defaultTable = defaultDs.tables?.[0] || 'ch_employees';
    const newQ = {
      question_type: 'query',
      title: `Query Problem #${queryCount + 1}: Data Analytics`,
      description: `Write an SQL query to retrieve data from \`${defaultTable}\`.`,
      difficulty: 'intermediate',
      dataset_name: defaultDs.key,
      target_table: defaultTable,
      starter_sql: `SELECT * FROM \`${defaultTable}\` LIMIT 10;`,
      solution_sql: `SELECT * FROM \`${defaultTable}\`;`,
      marks: 25
    };
    const updated = [...formData.questions, newQ];
    const newTotal = updated.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
    setFormData({ ...formData, questions: updated, total_marks: newTotal });
    setExpandedQuestionIdx(updated.length - 1);
  };

  const handleDeleteQuestion = (idx) => {
    if (formData.questions.length <= 1) {
      setToast({ type: 'warning', message: 'A contest must contain at least 1 question.' });
      return;
    }
    const updated = formData.questions.filter((_, i) => i !== idx);
    const newTotal = updated.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
    setFormData({ ...formData, questions: updated, total_marks: newTotal });
    if (expandedQuestionIdx >= updated.length) {
      setExpandedQuestionIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...formData.questions];
    const currentQ = { ...updated[idx], [field]: value };

    // Auto-update table if dataset changed
    if (field === 'dataset_name') {
      const selectedDs = availableDatasets.find((d) => d.key === value || d.name === value);
      if (selectedDs && selectedDs.tables && selectedDs.tables.length > 0) {
        currentQ.target_table = selectedDs.tables[0];
        currentQ.starter_sql = `SELECT * FROM \`${selectedDs.tables[0]}\` LIMIT 10;`;
      }
    }

    updated[idx] = currentQ;
    if (field === 'marks') {
      const newTotal = updated.reduce((s, q) => s + (parseInt(q.marks) || 0), 0);
      setFormData({ ...formData, questions: updated, total_marks: newTotal });
    } else {
      setFormData({ ...formData, questions: updated });
    }
  };

  // Timeline Validation Engine ("Follow the Check")
  const getTimelineCheck = () => {
    if (!formData.start_time || !formData.end_time || !formData.registration_deadline) {
      return { valid: false, message: 'Start time, end time, and registration cutoff are required.' };
    }
    const tRegStart = formData.registration_start_time ? new Date(formData.registration_start_time) : null;
    const tRegCutoff = new Date(formData.registration_deadline);
    const tLobby = formData.lobby_open_time ? new Date(formData.lobby_open_time) : null;
    const tStart = new Date(formData.start_time);
    const tEnd = new Date(formData.end_time);
    const tResults = formData.results_publish_time ? new Date(formData.results_publish_time) : null;

    if (tRegStart && tRegStart >= tRegCutoff) {
      return { valid: false, message: 'Timeline Check: Registration Open Time must be before Registration Cutoff Deadline.' };
    }
    if (tRegCutoff > tStart) {
      return { valid: false, message: 'Timeline Check: Registration Cutoff must close on or before Exam Start Time.' };
    }
    if (tLobby && tLobby > tStart) {
      return { valid: false, message: 'Timeline Check: Test Link / Lobby must open before or at Exam Start Time.' };
    }
    if (tStart >= tEnd) {
      return { valid: false, message: 'Timeline Check: Exam Start Time must be strictly before Exam End Time.' };
    }
    if (tResults && tResults < tEnd) {
      return { valid: false, message: 'Timeline Check: Results & Podium Publish Time must be at or after Exam End Time.' };
    }
    return { valid: true, message: null };
  };

  const timelineCheck = getTimelineCheck();

  const handleSaveContest = async (e) => {
    e.preventDefault();
    if (!timelineCheck.valid) {
      setToast({ type: 'warning', message: timelineCheck.message });
      return;
    }

    try {
      setIsSubmitting(true);
      const toUtcIso = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const payload = {
        ...formData,
        registration_start_time: toUtcIso(formData.registration_start_time),
        registration_deadline: toUtcIso(formData.registration_deadline),
        lobby_open_time: toUtcIso(formData.lobby_open_time),
        start_time: toUtcIso(formData.start_time),
        end_time: toUtcIso(formData.end_time),
        results_publish_time: toUtcIso(formData.results_publish_time),
      };

      if (editingContestId) {
        const res = await contestService.updateContest(editingContestId, payload);
        if (res.success) {
          setToast({ type: 'success', message: res.message || 'Contest updated successfully!' });
          setShowCreateModal(false);
          fetchAdminContests();
        } else {
          setToast({ type: 'error', message: res.message || 'Failed to update contest.' });
        }
      } else {
        const res = await contestService.createContest(payload);
        if (res.success) {
          setToast({ type: 'success', message: res.message || 'Contest scheduled successfully!' });
          setShowCreateModal(false);
          fetchAdminContests();
        } else {
          setToast({ type: 'error', message: res.message || 'Failed to create contest.' });
        }
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Error saving contest.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRegistrations = async (contestId) => {
    try {
      setRegsLoading(true);
      setShowRegsModal(true);
      const res = await contestService.getContestRegistrations(contestId);
      if (res.success) {
        setActiveRegs(res);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch registered candidates.' });
    } finally {
      setRegsLoading(false);
    }
  };

  const handleFinalizeContest = async (contestId) => {
    if (!window.confirm('Are you sure you want to finalize this contest? This will calculate top 3 rankers, credit 150/100/75 XP, and mint certificates.')) {
      return;
    }
    try {
      const res = await contestService.finalizeContest(contestId);
      if (res.success) {
        setToast({ type: 'success', message: res.message || 'Contest finalized and XP distributed!' });
        fetchAdminContests();
      } else {
        setToast({ type: 'error', message: res.message });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Error finalizing contest.' });
    }
  };

  const handleSendReminders = async (contestId) => {
    try {
      const res = await contestService.sendContestReminders(contestId);
      if (res.success) {
        setToast({ type: 'success', message: res.message || '20-min reminder notifications dispatched!' });
      } else {
        setToast({ type: 'error', message: res.message });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to send reminders.' });
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm('Delete this contest and its related questions and submissions?')) return;
    try {
      const res = await contestService.deleteContest(contestId);
      if (res.success) {
        setToast({ type: 'success', message: 'Contest deleted successfully.' });
        fetchAdminContests();
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete contest.' });
    }
  };

  const stats = {
    total: contests.length,
    active: contests.filter((c) => c.status === 'active').length,
    upcoming: contests.filter((c) => c.status === 'upcoming' || c.status === 'draft').length,
    completed: contests.filter((c) => c.status === 'completed').length,
    totalRegistrations: contests.reduce((sum, c) => sum + (Number(c.registrations_count) || 0), 0),
  };

  const filteredContests = contests.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      String(c.id).includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      c.status === statusFilter ||
      (statusFilter === 'upcoming' && c.status === 'draft');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/60 text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
              Admin Portal • Contests
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sunday Community Contests & Exam Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Schedule national weekly SQL championships, configure registration timelines, broadcast reminders, and evaluate verified rankers.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Sunday Contest</span>
        </button>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Editions</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">contests</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Active Live</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {stats.active}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">running</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Scheduled</span>
            <div className="p-2 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-900/50">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
              {stats.upcoming}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">upcoming</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Completed</span>
            <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-900/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
              {stats.completed}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">archived</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Candidates</span>
            <div className="p-2 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-900/50">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {stats.totalRegistrations}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">registered</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search contest title, edition, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-slate-800 transition placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-200 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs & View Mode */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/50">
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'active', label: 'Active', count: stats.active },
                { id: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                { id: 'completed', label: 'Completed', count: stats.completed },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === s.id
                      ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.id === 'active' && stats.active > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === s.id
                      ? 'bg-indigo-700/60 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/50">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Counter & Active Filter Reset */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-bold">{filteredContests.length}</strong> of{' '}
              <strong className="text-white font-bold">{contests.length}</strong> contests
            </span>
            {(searchQuery || statusFilter !== 'all') && (
              <span className="text-[11px] bg-indigo-950/60 text-indigo-400 px-2 py-0.5 rounded-md font-medium border border-indigo-800/60">
                Filtered
              </span>
            )}
          </div>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Contests Presentation */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">No Contests Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'No contests match your current search and status filters.'
              : 'Click "Schedule Sunday Contest" to publish the next weekly edition.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Upgraded Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 uppercase text-[11px] font-extrabold tracking-wider">
                  <th className="py-3.5 px-4 w-14 text-center">ID</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Contest & Structure</th>
                  <th className="py-3.5 px-4 min-w-[190px]">Sunday Timings</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Registration Deadline</th>
                  <th className="py-3.5 px-4 text-center min-w-[140px]">Candidates</th>
                  <th className="py-3.5 px-4 text-center w-28">Status</th>
                  <th className="py-3.5 px-4 text-right min-w-[170px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredContests.map((c) => {
                  const isRegClosed = c.registration_deadline && new Date(c.registration_deadline) < new Date();

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* ID */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700/80">
                          #{String(c.id).padStart(2, '0')}
                        </span>
                      </td>

                      {/* Contest Title & Structure */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                            {c.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {c.questions_count || 0} Problems
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-950/40 text-amber-300 border border-amber-800/40 font-mono">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              {c.total_marks || 0} Total Marks
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sunday Timings */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>
                              {c.start_time
                                ? new Date(c.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Sunday Edition'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>
                              {c.start_time ? new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}
                              {' - '}
                              {c.end_time ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reg Deadline */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {c.registration_deadline
                                ? new Date(c.registration_deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Saturday 23:59'}
                            </span>
                          </div>
                          <div>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isRegClosed
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                            }`}>
                              {isRegClosed ? 'Registration Closed' : 'Registration Open'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Candidates */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewRegistrations(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 text-xs font-bold transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="Click to view full roster of registered candidates"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{c.registrations_count || 0}</span>
                          <span className="text-[10px] text-indigo-400/80 font-normal">Enrolled</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            c.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                              : c.status === 'completed'
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'active'
                                ? 'bg-emerald-400 animate-pulse'
                                : c.status === 'completed'
                                ? 'bg-slate-400'
                                : 'bg-blue-400'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Timing & Settings */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Contest Timings & Rules"
                            className="p-2 rounded-xl text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Send 20-min reminders */}
                          <button
                            type="button"
                            onClick={() => handleSendReminders(c.id)}
                            title="Send 20-min reminder notifications to participants"
                            className="p-2 rounded-xl text-sky-400 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/50 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Finalize Leaderboard */}
                          <button
                            type="button"
                            onClick={() => handleFinalizeContest(c.id)}
                            title="Finalize Ranks, Issue Certificates & XP"
                            className="p-2 rounded-xl text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Award className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteContest(c.id)}
                            title="Delete Contest"
                            className="p-2 rounded-xl text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Total Marks Pool:{' '}
                <strong className="text-amber-400 font-mono font-bold">
                  {filteredContests.reduce((acc, c) => acc + (c.total_marks || 0), 0)} Marks
                </strong>
              </span>
              <span>•</span>
              <span>
                Total Candidates Enrolled:{' '}
                <strong className="text-indigo-400 font-mono font-bold">
                  {filteredContests.reduce((acc, c) => acc + (Number(c.registrations_count) || 0), 0)}
                </strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              All editions synchronized with PostgreSQL backend
            </div>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContests.map((c) => {
            const isRegClosed = c.registration_deadline && new Date(c.registration_deadline) < new Date();

            return (
              <div
                key={c.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      #{String(c.id).padStart(2, '0')}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        c.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : c.status === 'completed'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'active'
                            ? 'bg-emerald-400 animate-pulse'
                            : c.status === 'completed'
                            ? 'bg-slate-400'
                            : 'bg-blue-400'
                        }`}
                      />
                      {c.status}
                    </span>
                  </div>

                  {/* Title & Structure */}
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors">
                      {c.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {c.questions_count || 0} Problems
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 font-mono font-bold">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        {c.total_marks || 0} Marks
                      </span>
                    </div>
                  </div>

                  {/* Timings */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date:
                      </span>
                      <span className="font-semibold text-white">
                        {c.start_time
                          ? new Date(c.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                          : 'Sunday'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> Hours:
                      </span>
                      <span>
                        {c.start_time ? new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'} -{' '}
                        {c.end_time ? new Date(c.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}
                      </span>
                    </div>
                  </div>

                  {/* Registration Window & Candidates */}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isRegClosed
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                    }`}>
                      {isRegClosed ? 'Registration Closed' : 'Registration Open'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleViewRegistrations(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 text-xs font-semibold transition"
                    >
                      <Users className="w-3 h-3 text-indigo-400" />
                      <span>{c.registrations_count || 0} Registered</span>
                    </button>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    title="Edit Contest Timings & Rules"
                    className="p-2 rounded-xl text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReminders(c.id)}
                    title="Send 20-min reminder email"
                    className="p-2 rounded-xl text-sky-400 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/50 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinalizeContest(c.id)}
                    title="Finalize Ranks, Issue Certificates & XP"
                    className="p-2 rounded-xl text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContest(c.id)}
                    title="Delete Contest"
                    className="p-2 rounded-xl text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registrations Roster Modal */}
      {showRegsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Registered Candidates</h3>
                <p className="text-xs text-slate-400">{activeRegs.contest_title} • {activeRegs.total} Total Registered</p>
              </div>
              <button
                onClick={() => setShowRegsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {regsLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : activeRegs.data?.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No participants registered yet for this edition.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                        <th className="p-2.5 font-semibold">Candidate</th>
                        <th className="p-2.5 font-semibold">Mobile Number</th>
                        <th className="p-2.5 font-semibold">College / Organization</th>
                        <th className="p-2.5 font-semibold text-right">Registered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeRegs.data?.map((r) => (
                        <tr key={r.id} className="text-slate-300">
                          <td className="p-2.5">
                            <span className="font-semibold text-white block">{r.full_name}</span>
                            <span className="text-[11px] text-slate-500">{r.email}</span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-300">{r.mobile_number}</td>
                          <td className="p-2.5 text-amber-200/90 font-medium">{r.college_name}</td>
                          <td className="p-2.5 text-right text-slate-500 text-[11px]">
                            {r.registered_at ? new Date(r.registered_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule / Edit Contest Modal with Timeline Controls */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  {editingContestId ? 'Edit Contest & Timeline Schedule' : 'Schedule New Community Contest'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure registration window, test link activation, exam duration, and rules verification.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContest} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Contest Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contest Title & Edition</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Sunday National SQL Championship - Edition #2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contest Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* TIMELINE SCHEDULER (Milestones 1 to 5) */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Calendar className="w-4 h-4" /> Complete Contest Timeline Milestones
                  </span>
                  <span className="text-[11px] text-slate-400">All times in local time</span>
                </div>

                {/* Milestone 1 & 2: Registration Window */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    1. Registration Window
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">When Registration Opens</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.registration_start_time}
                        onChange={(e) => setFormData({ ...formData, registration_start_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Registration Cutoff (Strict Deadline)</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.registration_deadline}
                        onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Milestone 3: Test Link & Waiting Lobby */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                      2. Test Link & Waiting Lobby Activation
                    </div>
                    {formData.start_time && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = new Date(new Date(formData.start_time).getTime() - 20 * 60000);
                          setFormData({ ...formData, lobby_open_time: formatIsoForInput(t.toISOString()) });
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                      >
                        Set to 20 Min Before Start
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">When Test Link Opens (Waiting Room Opens)</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.lobby_open_time}
                      onChange={(e) => setFormData({ ...formData, lobby_open_time: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Candidates entering during this window will view the waiting room, timer countdown, and Rules Check.
                    </span>
                  </div>
                </div>

                {/* Milestone 4: Live Exam Window */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                    3. Live Exam Window (Questions Unlocked)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Exam Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Exam End Time (Submissions Close)</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Milestone 5: Podium & Results Announcement */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-pink-300 uppercase tracking-wider">
                      4. Results, Top 3 Podium & Certificates Reveal
                    </div>
                    {formData.end_time && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = new Date(new Date(formData.end_time).getTime() + 5 * 60000);
                          setFormData({ ...formData, results_publish_time: formatIsoForInput(t.toISOString()) });
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                      >
                        Set to 5 Min After End
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Podium Announcement Datetime</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.results_publish_time}
                      onChange={(e) => setFormData({ ...formData, results_publish_time: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Validation Warning Alert if Sequence Check Fails */}
                {!timelineCheck.valid ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{timelineCheck.message}</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Timeline Check Passed: Schedule sequence is valid and ready to publish.</span>
                  </div>
                )}
              </div>

              {/* Contest Rules & Guidelines Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Contest Rules & Guidelines (Checked by Candidates Before Entering)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rules: defaultRulesTemplate })}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Reset Standard Rules
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* HYBRID QUESTIONS & DATASET BUILDER */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-indigo-400" /> Contest Questions & Exam Structure
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="text-indigo-300 font-semibold">
                        {formData.questions.filter(q => q.question_type === 'technical').length} MCQs ({formData.questions.filter(q => q.question_type === 'technical').reduce((s, q) => s + (parseInt(q.marks) || 0), 0)}M)
                      </span>
                      <span>•</span>
                      <span className="text-emerald-300 font-semibold">
                        {formData.questions.filter(q => q.question_type !== 'technical').length} Queries ({formData.questions.filter(q => q.question_type !== 'technical').reduce((s, q) => s + (parseInt(q.marks) || 0), 0)}M)
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">
                        Total: {formData.questions.reduce((s, q) => s + (parseInt(q.marks) || 0), 0)} Marks
                      </span>
                    </div>
                  </div>

                  {/* Add Question Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddTechnicalQuestion}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + Technical MCQ
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQueryQuestion}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> + Coding Query
                    </button>
                  </div>
                </div>

                {/* Question List Accordion Cards */}
                <div className="space-y-3">
                  {formData.questions.map((q, idx) => {
                    const isExpanded = expandedQuestionIdx === idx;
                    const isTech = q.question_type === 'technical';
                    const currentDataset = availableDatasets.find((d) => d.key === q.dataset_name || d.name === q.dataset_name);

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border transition overflow-hidden ${
                          isExpanded
                            ? 'bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/5'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Question Card Header */}
                        <div
                          onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none text-xs"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                              {idx + 1}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                isTech
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isTech ? 'Technical MCQ' : 'Coding Query'}
                            </span>
                            <span className="font-semibold text-white truncate max-w-xs md:max-w-md">
                              {q.title || `Question ${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[11px] border border-amber-400/20">
                              {q.marks || 0} Marks
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(idx);
                              }}
                              title="Delete Question"
                              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Question Form */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 space-y-4 text-xs">
                            {/* Question Title & Marks Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-6">
                                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                                  Question Title
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={q.title}
                                  onChange={(e) => handleQuestionChange(idx, 'title', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                  placeholder="e.g. SQL Architecture: PRIMARY KEY"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                                  {isTech ? 'Category / Topic' : 'Difficulty Level'}
                                </label>
                                {isTech ? (
                                  <input
                                    type="text"
                                    value={q.category || ''}
                                    onChange={(e) => handleQuestionChange(idx, 'category', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Joins, Indexing"
                                  />
                                ) : (
                                  <select
                                    value={q.difficulty || 'intermediate'}
                                    onChange={(e) => handleQuestionChange(idx, 'difficulty', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                  </select>
                                )}
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                                  Marks Awarded
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  required
                                  value={q.marks}
                                  onChange={(e) => handleQuestionChange(idx, 'marks', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            {/* Problem Statement / Prompt */}
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                                {isTech ? 'MCQ Question Prompt / Problem Statement' : 'Query Problem Description & Business Requirements'}
                              </label>
                              <textarea
                                rows={2}
                                required
                                value={q.description}
                                onChange={(e) => handleQuestionChange(idx, 'description', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                placeholder={isTech ? "Explain the scenario or question for the candidate..." : "Specify the columns, filters, and order criteria..."}
                              />
                            </div>

                            {/* TECHNICAL MCQ: Options A, B, C, D with Correct Option Selector */}
                            {isTech ? (
                              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                                    Options & Answer Key
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Click the radio button beside the correct answer
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {[
                                    { key: 'option_a', label: 'A', idx: 0 },
                                    { key: 'option_b', label: 'B', idx: 1 },
                                    { key: 'option_c', label: 'C', idx: 2 },
                                    { key: 'option_d', label: 'D', idx: 3 },
                                  ].map((opt) => (
                                    <div key={opt.key} className="flex items-center gap-2">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-300">
                                        <input
                                          type="radio"
                                          name={`correct_opt_${idx}`}
                                          checked={parseInt(q.correct_option) === opt.idx}
                                          onChange={() => handleQuestionChange(idx, 'correct_option', opt.idx)}
                                          className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold ${
                                          parseInt(q.correct_option) === opt.idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                          {opt.label}
                                        </span>
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={q[opt.key] || ''}
                                        onChange={(e) => handleQuestionChange(idx, opt.key, e.target.value)}
                                        placeholder={`Option ${opt.label} text`}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                                    Explanation / Solution Rationale (Optional)
                                  </label>
                                  <textarea
                                    rows={1}
                                    value={q.explanation || ''}
                                    onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                                    placeholder="Explain why the selected option is correct..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            ) : (
                              /* CODING QUERY: Dataset Selector, Target Table, Starter & Solution SQL */
                              <div className="space-y-3">
                                {/* Dataset & Table Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                                  <div>
                                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center gap-1">
                                      <Database className="w-3.5 h-3.5 text-indigo-400" /> Platform Dataset
                                    </label>
                                    <select
                                      value={q.dataset_name || ''}
                                      onChange={(e) => handleQuestionChange(idx, 'dataset_name', e.target.value)}
                                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                      {availableDatasets.map((ds) => (
                                        <option key={ds.key} value={ds.key}>
                                          {ds.name} {ds.is_builtin ? '(Built-in)' : '(Custom DB)'}
                                        </option>
                                      ))}
                                      <option value="custom_manual">Custom Dataset (Manual Entry)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center gap-1">
                                      <Table className="w-3.5 h-3.5 text-emerald-400" /> Target Table
                                    </label>
                                    {currentDataset && currentDataset.tables && currentDataset.tables.length > 0 ? (
                                      <select
                                        value={q.target_table || ''}
                                        onChange={(e) => handleQuestionChange(idx, 'target_table', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                      >
                                        {currentDataset.tables.map((tbl) => (
                                          <option key={tbl} value={tbl}>
                                            `{tbl}`
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        required
                                        value={q.target_table || ''}
                                        onChange={(e) => handleQuestionChange(idx, 'target_table', e.target.value)}
                                        placeholder="e.g. ch_customers"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Starter SQL */}
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center justify-between">
                                    <span>Starter SQL Template</span>
                                    <span className="text-[10px] text-slate-500">Provided to candidate on exam entry</span>
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={q.starter_sql || ''}
                                    onChange={(e) => handleQuestionChange(idx, 'starter_sql', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-indigo-500"
                                    placeholder="SELECT * FROM table_name LIMIT 10;"
                                  />
                                </div>

                                {/* Canonical Solution SQL */}
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center justify-between">
                                    <span className="text-amber-300 font-bold">Canonical Solution SQL</span>
                                    <span className="text-[10px] text-slate-500">Executed by automated test engine to evaluate output</span>
                                  </label>
                                  <textarea
                                    rows={2}
                                    required
                                    value={q.solution_sql || ''}
                                    onChange={(e) => handleQuestionChange(idx, 'solution_sql', e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500"
                                    placeholder="SELECT col1, COUNT(*) FROM table_name GROUP BY col1;"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !timelineCheck.valid}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow transition flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : (editingContestId ? 'Update Contest & Schedule' : 'Publish Contest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
