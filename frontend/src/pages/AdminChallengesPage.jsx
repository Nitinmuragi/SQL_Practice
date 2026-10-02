import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Award,
  Database,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Code2,
  Eye,
  X,
  Play,
  Check,
  AlertCircle,
  HelpCircle,
  Users,
  KeyRound,
  Lock,
  Trophy,
  Table,
  LayoutGrid,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { AdminAssessmentManager } from '../components/AdminAssessmentManager';

const PRESET_CATEGORIES = [
  'Filtering & Sorting',
  'Aggregation & GROUP BY',
  'JOINs & Multi-Table',
  'Subqueries & EXISTS',
  'Window Functions',
  'Data Cleaning & NULLs',
  'Conditional Logic (CASE)',
];

export const AdminChallengesPage = ({ initialTab = 'challenges' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getStartingTab = () => {
    if (location.pathname.includes('/admin/assessments')) return 'assessments';
    if (location.pathname.includes('/admin/challenges')) return 'challenges';
    return initialTab;
  };

  const [adminSection, setAdminSection] = useState(getStartingTab);

  useEffect(() => {
    if (location.pathname.includes('/admin/assessments')) {
      setAdminSection('assessments');
    } else if (location.pathname.includes('/admin/challenges')) {
      setAdminSection('challenges');
    }
  }, [location.pathname]);

  const [challenges, setChallenges] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [previewSolutionChallenge, setPreviewSolutionChallenge] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'beginner',
    category: 'Filtering & Sorting',
    dataset_name: 'E-Commerce Global',
    target_table: 'ch_customers',
    description: '',
    business_context: '',
    starter_sql: '',
    solution_sql: '',
    hint_1: '',
    hint_2: '',
    hint_3: '',
    xp_reward: 50,
  });

  // Solution Validation State inside modal
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Password Management State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      if (res.success) {
        setToast({ type: 'success', message: 'Admin password updated successfully!' });
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || err.message || 'Failed to update password.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchChallengesAndTables = async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        adminService.getChallenges(),
        adminService.getTables(),
      ]);
      if (cRes.success && cRes.data) {
        setChallenges(cRes.data);
      }
      if (tRes.success && tRes.data) {
        setAvailableTables(tRes.data);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load challenge data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallengesAndTables();
  }, []);

  const openCreateModal = () => {
    setEditingChallenge(null);
    setValidationResult(null);
    const defaultTable = availableTables[0]?.table_name || 'ch_customers';
    setFormData({
      title: '',
      slug: '',
      difficulty: 'beginner',
      category: 'Filtering & Sorting',
      dataset_name: 'E-Commerce Global',
      target_table: defaultTable,
      description: '',
      business_context: '',
      starter_sql: `-- Write your query for ${defaultTable}\nSELECT * FROM \`${defaultTable}\` LIMIT 10;`,
      solution_sql: '',
      hint_1: '',
      hint_2: '',
      hint_3: '',
      xp_reward: 50,
    });
    setShowModal(true);
  };

  const openEditModal = (ch) => {
    setEditingChallenge(ch);
    setValidationResult(null);
    setFormData({
      title: ch.title || '',
      slug: ch.slug || '',
      difficulty: ch.difficulty || 'beginner',
      category: ch.category || 'General',
      dataset_name: ch.dataset_name || 'E-Commerce Global',
      target_table: ch.target_table || 'ch_customers',
      description: ch.description || '',
      business_context: ch.business_context || '',
      starter_sql: ch.starter_sql || '',
      solution_sql: ch.solution_sql || '',
      hint_1: ch.hint_1 || '',
      hint_2: ch.hint_2 || '',
      hint_3: ch.hint_3 || '',
      xp_reward: ch.xp_reward || 50,
    });
    setShowModal(true);
  };

  const handleTitleChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: editingChallenge ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleTestSolution = async () => {
    if (!formData.solution_sql.trim()) {
      setToast({ type: 'error', message: 'Please enter a canonical solution SQL query to validate.' });
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await adminService.validateSolution(formData.target_table, formData.solution_sql);
      setValidationResult(res);
      if (res.success) {
        setToast({ type: 'success', message: `Query valid! Output verified on MySQL (${res.total_rows} rows).` });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setValidationResult({ success: false, error: msg });
      setToast({ type: 'error', message: msg });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.solution_sql.trim() || !formData.description.trim()) {
      setToast({ type: 'error', message: 'Please fill in all required challenge fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChallenge) {
        const res = await adminService.updateChallenge(editingChallenge.id, formData);
        if (res.success) {
          setToast({ type: 'success', message: 'Challenge updated successfully!' });
          setShowModal(false);
          fetchChallengesAndTables();
        }
      } else {
        const res = await adminService.createChallenge(formData);
        if (res.success) {
          setToast({ type: 'success', message: 'New challenge created and published!' });
          setShowModal(false);
          fetchChallengesAndTables();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setToast({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete challenge "${title}"?`)) {
      return;
    }
    try {
      const res = await adminService.deleteChallenge(id);
      if (res.success) {
        setToast({ type: 'success', message: `Challenge "${title}" deleted.` });
        setChallenges((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete challenge.' });
    }
  };

  // Dynamic categories extracted from existing challenges
  const availableCategories = [
    'all',
    ...Array.from(new Set([...PRESET_CATEGORIES, ...challenges.map((c) => c.category).filter(Boolean)])),
  ];

  // Filtered challenges
  const filtered = challenges.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.target_table && c.target_table.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.dataset_name && c.dataset_name.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q));
    const matchesDiff = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesDiff && matchesCategory;
  });

  const stats = {
    total: challenges.length,
    beginner: challenges.filter((c) => c.difficulty === 'beginner').length,
    intermediate: challenges.filter((c) => c.difficulty === 'intermediate').length,
    advanced: challenges.filter((c) => c.difficulty === 'advanced').length,
    totalSolves: challenges.reduce((acc, c) => acc + (c.total_students_solved || 0), 0),
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading Admin Challenge Portal..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600/60 text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
              Admin Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dynamic SQL Challenges
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Create, test, modify, and publish interactive SQL problem sets dynamically without touching codebase files.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setPasswordError('');
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setShowPasswordModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-indigo-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-indigo-500/30 transition active:scale-95 shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Change Password</span>
          </button>

          {adminSection === 'challenges' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Challenge</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Module Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/60 shadow-sm">
        <button
          type="button"
          onClick={() => {
            setAdminSection('challenges');
            navigate('/admin/challenges');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            adminSection === 'challenges'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Practice Challenges ({stats.total})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAdminSection('assessments');
            navigate('/admin/assessments');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            adminSection === 'assessments'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Skill Assessments</span>
        </button>
      </div>

      {adminSection === 'assessments' ? (
        <AdminAssessmentManager />
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total</span>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Code2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {stats.total}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">challenges</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Beginner</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {stats.beginner}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">problems</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Intermediate</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {stats.intermediate}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">problems</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Advanced</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
                  {stats.advanced}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">problems</span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">Student Solves</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {stats.totalSolves}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">total clears</span>
              </div>
            </div>
          </div>

          {/* Filter, Search & View Controls Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search title, table, dataset, slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="relative w-full sm:w-60">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition appearance-none"
                  >
                    <option value="all">All Categories ({challenges.length})</option>
                    {availableCategories
                      .filter((c) => c !== 'all')
                      .map((cat) => {
                        const count = challenges.filter((c) => c.category === cat).length;
                        return (
                          <option key={cat} value={cat}>
                            {cat} ({count})
                          </option>
                        );
                      })}
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Difficulty Pills & View Mode */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pt-1 lg:pt-0">
                {/* Difficulty Filters */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                  {[
                    { id: 'all', label: 'All', count: challenges.length },
                    { id: 'beginner', label: 'Beginner', count: stats.beginner },
                    { id: 'intermediate', label: 'Inter.', count: stats.intermediate },
                    { id: 'advanced', label: 'Adv.', count: stats.advanced },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficultyFilter(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        difficultyFilter === d.id
                          ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm font-extrabold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{d.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        difficultyFilter === d.id
                          ? 'bg-indigo-50 dark:bg-indigo-700/60 text-indigo-600 dark:text-white'
                          : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {d.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* View Switcher: Table vs Cards */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="Table View"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Counter & Active Filter Pills */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong className="text-slate-800 dark:text-slate-200 font-bold">{filtered.length}</strong> of{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">{challenges.length}</strong> challenges
                </span>
                {(searchQuery || difficultyFilter !== 'all' || categoryFilter !== 'all') && (
                  <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-medium border border-indigo-200/60 dark:border-indigo-800/60">
                    Filtered
                  </span>
                )}
              </div>

              {(searchQuery || difficultyFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDifficultyFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Challenges Presentation: Table View or Grid View */}
          {viewMode === 'table' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-extrabold tracking-wider">
                      <th className="py-3.5 px-4 w-14 text-center">ID</th>
                      <th className="py-3.5 px-4 min-w-[280px]">Challenge & Context</th>
                      <th className="py-3.5 px-4 w-32">Difficulty</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Target Schema</th>
                      <th className="py-3.5 px-4 text-center w-24">Reward</th>
                      <th className="py-3.5 px-4 min-w-[160px]">Engagement</th>
                      <th className="py-3.5 px-4 text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-sans">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                              <Search className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                No challenges found
                              </div>
                              <p className="text-xs text-slate-400">
                                Try adjusting your keywords, difficulty level, or category filter to discover challenges.
                              </p>
                            </div>
                            {(searchQuery || difficultyFilter !== 'all' || categoryFilter !== 'all') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery('');
                                  setDifficultyFilter('all');
                                  setCategoryFilter('all');
                                }}
                                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl hover:bg-indigo-100 transition"
                              >
                                Clear all filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((ch) => {
                        const completionPercent = Math.min(100, Math.max(0, Number(ch.completion_rate) || 0));

                        return (
                          <tr
                            key={ch.id}
                            className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                          >
                            {/* ID Column */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80">
                                #{String(ch.id).padStart(2, '0')}
                              </span>
                            </td>

                            {/* Challenge Title, Slug & Category */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1.5">
                                <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {ch.title}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                    {ch.category}
                                  </span>
                                  {ch.dataset_name && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                                      <Database className="w-2.5 h-2.5 text-indigo-500" />
                                      {ch.dataset_name}
                                    </span>
                                  )}
                                  <span className="font-mono text-slate-400 text-[10px]">
                                    /{ch.slug}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Difficulty */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold capitalize border ${
                                  ch.difficulty === 'beginner'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                                    : ch.difficulty === 'intermediate'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                                    : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    ch.difficulty === 'beginner'
                                      ? 'bg-emerald-500'
                                      : ch.difficulty === 'intermediate'
                                      ? 'bg-amber-500'
                                      : 'bg-purple-500'
                                  }`}
                                />
                                {ch.difficulty}
                              </span>
                            </td>

                            {/* Target Table */}
                            <td className="py-3.5 px-4">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-2xs">
                                <Table className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>{ch.target_table}</span>
                              </div>
                            </td>

                            {/* XP Reward */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                +{ch.xp_reward}
                              </span>
                            </td>

                            {/* Engagement & Solves */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    {ch.total_students_solved || 0} solves
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                    {completionPercent}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      completionPercent >= 70
                                        ? 'bg-emerald-500'
                                        : completionPercent >= 30
                                        ? 'bg-amber-500'
                                        : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${completionPercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewSolutionChallenge(ch)}
                                  title="Inspect Solution SQL"
                                  className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(ch)}
                                  title="Edit Challenge"
                                  className="p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800/60 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(ch.id, ch.title)}
                                  title="Delete Challenge"
                                  className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              {filtered.length > 0 && (
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>
                      Total XP in view:{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                        {filtered.reduce((acc, c) => acc + (c.xp_reward || 0), 0)} XP
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Total student clears:{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {filtered.reduce((acc, c) => acc + (c.total_students_solved || 0), 0)}
                      </strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Updated live from admin database
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.length === 0 ? (
                <div className="col-span-full p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        No challenges found
                      </div>
                      <p className="text-xs text-slate-400">
                        Try adjusting your keywords, difficulty level, or category filter to discover challenges.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                filtered.map((ch) => {
                  const completionPercent = Math.min(100, Math.max(0, Number(ch.completion_rate) || 0));

                  return (
                    <div
                      key={ch.id}
                      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                              #{String(ch.id).padStart(2, '0')}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold capitalize border ${
                                ch.difficulty === 'beginner'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                                  : ch.difficulty === 'intermediate'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ch.difficulty === 'beginner'
                                    ? 'bg-emerald-500'
                                    : ch.difficulty === 'intermediate'
                                    ? 'bg-amber-500'
                                    : 'bg-purple-500'
                                }`}
                              />
                              {ch.difficulty}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            +{ch.xp_reward} XP
                          </span>
                        </div>

                        {/* Title & Category */}
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {ch.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
                              {ch.category}
                            </span>
                            {ch.dataset_name && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                                <Database className="w-2.5 h-2.5 text-indigo-500" />
                                {ch.dataset_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Schema Target */}
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                          <Table className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-400">Target:</span>
                          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {ch.target_table}
                          </span>
                        </div>

                        {/* Solves & Progress */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                              <Users className="w-3 h-3 text-slate-400" />
                              {ch.total_students_solved || 0} student solves
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 font-bold">
                              {completionPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-slate-400 truncate">
                          /{ch.slug}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewSolutionChallenge(ch)}
                            title="Inspect Solution SQL"
                            className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ch)}
                            title="Edit Challenge"
                            className="p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800/60 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ch.id, ch.title)}
                            title="Delete Challenge"
                            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Create / Edit Challenge */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingChallenge ? 'Edit SQL Challenge' : 'Create New SQL Challenge'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live database verification ensures solutions evaluate properly before publishing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Total Revenue by Product Category"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Difficulty, Category, Target Table, XP */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Table *
                  </label>
                  <select
                    value={formData.target_table}
                    onChange={(e) => setFormData({ ...formData, target_table: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    {availableTables.map((t) => (
                      <option key={t.table_name} value={t.table_name}>
                        {t.table_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    step="10"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Description & Business Context */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Problem Description * (Supports Markdown)
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the challenge criteria, required columns, and filtering instructions..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Real-World Analytics Context (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marketing teams audit monthly churn to tailor retention offers."
                    value={formData.business_context}
                    onChange={(e) => setFormData({ ...formData, business_context: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Canonical Solution SQL with Verification */}
              <div className="space-y-2 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Canonical Solution SQL * (Required for Benchmark Evaluation)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestSolution}
                    disabled={validating || !formData.solution_sql.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition disabled:opacity-40 shadow-sm"
                  >
                    {validating ? (
                      <span>Testing on MySQL...</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Test & Verify Solution</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder={`SELECT ... FROM ${formData.target_table} WHERE ...;`}
                  value={formData.solution_sql}
                  onChange={(e) => setFormData({ ...formData, solution_sql: e.target.value })}
                  className="w-full p-3 font-mono text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-emerald-300 placeholder-slate-600 outline-none focus:ring-1 focus:ring-emerald-500"
                />

                {/* Validation Output Preview */}
                {validationResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      validationResult.success
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-800 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        {validationResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <span>{validationResult.message}</span>
                      </div>
                      {validationResult.execution_time_ms && (
                        <span className="font-mono text-[11px] opacity-80">
                          {validationResult.execution_time_ms} ms
                        </span>
                      )}
                    </div>

                    {validationResult.rows && validationResult.rows.length > 0 && (
                      <div className="overflow-x-auto max-h-32 border border-emerald-900/80 rounded-lg">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-emerald-900/60 text-emerald-300">
                            <tr>
                              {validationResult.columns?.map((c) => (
                                <th key={c} className="p-1.5 border-b border-emerald-800">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-900/40 text-slate-300">
                            {validationResult.rows.map((r, idx) => (
                              <tr key={idx}>
                                {validationResult.columns?.map((c) => (
                                  <td key={c} className="p-1.5 whitespace-nowrap">
                                    {String(r[c] !== null ? r[c] : 'NULL')}
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
              </div>

              {/* Starter SQL Template */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Student Starter SQL Skeleton
                </label>
                <textarea
                  rows={2}
                  value={formData.starter_sql}
                  onChange={(e) => setFormData({ ...formData, starter_sql: e.target.value })}
                  className="w-full p-2.5 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              {/* Progressive Hints */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Progressive Hints (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Hint 1: Concept (e.g. Use GROUP BY)"
                    value={formData.hint_1}
                    onChange={(e) => setFormData({ ...formData, hint_1: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Hint 2: Syntax advice"
                    value={formData.hint_2}
                    onChange={(e) => setFormData({ ...formData, hint_2: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Hint 3: Code skeleton"
                    value={formData.hint_3}
                    onChange={(e) => setFormData({ ...formData, hint_3: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingChallenge ? 'Save Changes' : 'Publish Challenge'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Solution Modal */}
      {previewSolutionChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold">{previewSolutionChallenge.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSolutionChallenge(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 block mb-1 uppercase tracking-wider">
                Canonical Solution SQL:
              </span>
              <pre className="p-3.5 bg-slate-950 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                {previewSolutionChallenge.solution_sql}
              </pre>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setPreviewSolutionChallenge(null)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Admin Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Change Admin Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your administrator master credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new strong password"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be at least 8 characters long.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-type new password"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
                >
                  {passwordLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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
