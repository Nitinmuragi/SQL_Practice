import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  Eye,
  X,
  Check,
  AlertCircle,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';

const EMPTY_QUESTION = {
  category: 'General SQL',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 0,
  explanation: '',
};

export const AdminAssessmentManager = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    level: 'intermediate',
    description: '',
    passing_score: 80,
    time_limit_minutes: 15,
    questions: [{ ...EMPTY_QUESTION }],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preview Drawer/Modal
  const [previewItem, setPreviewItem] = useState(null);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAssessments();
      if (res.success && res.data) {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error('Failed to load assessments:', err);
      setToast({ type: 'error', message: 'Failed to load assessments.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      level: 'intermediate',
      description: '',
      passing_score: 80,
      time_limit_minutes: 15,
      questions: [
        { ...EMPTY_QUESTION, category: 'Relational Querying' },
        { ...EMPTY_QUESTION, category: 'Data Analysis' },
      ],
    });
    setShowModal(true);
  };

  const openEditModal = async (item) => {
    let fullItem = item;
    if (!item.questions || item.questions.length === 0) {
      try {
        const res = await adminService.getAssessment(item.id);
        if (res.success && res.data) {
          fullItem = res.data;
        }
      } catch (err) {
        console.error('Failed to load assessment details for editing:', err);
      }
    }

    setEditingId(fullItem.id);
    const questions = (fullItem.questions && fullItem.questions.length > 0)
      ? fullItem.questions.map((q) => ({
          category: q.category || 'General SQL',
          question_text: q.question || q.question_text || '',
          option_a: q.options ? q.options[0] : (q.option_a || ''),
          option_b: q.options ? q.options[1] : (q.option_b || ''),
          option_c: q.options ? q.options[2] : (q.option_c || ''),
          option_d: q.options ? q.options[3] : (q.option_d || ''),
          correct_option: q.correct_index !== undefined ? q.correct_index : (q.correct_option || 0),
          explanation: q.explanation || '',
        }))
      : [{ ...EMPTY_QUESTION }];

    setFormData({
      title: fullItem.title,
      level: fullItem.level,
      description: fullItem.description || '',
      passing_score: fullItem.passing_score || 80,
      time_limit_minutes: fullItem.time_limit_minutes || 15,
      questions,
    });
    setShowModal(true);
  };

  const handleOpenPreview = async (item) => {
    let fullItem = item;
    if (!item.questions || item.questions.length === 0) {
      try {
        const res = await adminService.getAssessment(item.id);
        if (res.success && res.data) {
          fullItem = res.data;
        }
      } catch (err) {
        console.error('Failed to load assessment details for preview:', err);
      }
    }
    setPreviewItem(fullItem);
  };

  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...EMPTY_QUESTION }],
    }));
  };

  const handleRemoveQuestion = (idx) => {
    if (formData.questions.length <= 1) {
      setToast({ type: 'error', message: 'An assessment must have at least one question.' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const handleQuestionChange = (idx, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.questions];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setToast({ type: 'error', message: 'Assessment title is required.' });
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question_text.trim()) {
        setToast({ type: 'error', message: `Question #${i + 1} has empty question text.` });
        return;
      }
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        setToast({ type: 'error', message: `Question #${i + 1} must have all 4 options filled.` });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await adminService.updateAssessment(editingId, formData);
        if (res.success) {
          setToast({ type: 'success', message: 'Assessment updated successfully!' });
          setShowModal(false);
          fetchAssessments();
        }
      } else {
        const res = await adminService.createAssessment(formData);
        if (res.success) {
          setToast({ type: 'success', message: 'New Level Assessment published successfully!' });
          setShowModal(false);
          fetchAssessments();
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save assessment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete assessment "${title}"?`)) {
      return;
    }
    try {
      const res = await adminService.deleteAssessment(id);
      if (res.success) {
        setToast({ type: 'success', message: `Assessment "${title}" deleted.` });
        setAssessments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete assessment.' });
    }
  };

  const filtered = assessments.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || a.title?.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q));
    const matchLevel = selectedLevel === 'all' || a.level?.toLowerCase() === selectedLevel.toLowerCase();
    return matchSearch && matchLevel;
  });

  const levelStats = {
    total: assessments.length,
    beginner: assessments.filter((a) => a.level?.toLowerCase() === 'beginner').length,
    intermediate: assessments.filter((a) => a.level?.toLowerCase() === 'intermediate').length,
    advanced: assessments.filter((a) => a.level?.toLowerCase() === 'advanced').length,
    totalQuestions: assessments.reduce((acc, a) => acc + (a.questions_count || (a.questions ? a.questions.length : 0)), 0),
  };

  const getLevelBadge = (level) => {
    switch (level?.toLowerCase()) {
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

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading Assessment Manager..." />;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-slate-400 block font-medium">Total Assessments</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
            {levelStats.total}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Beginner</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
            {levelStats.beginner}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Intermediate</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono mt-1 block">
            {levelStats.intermediate}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-purple-600 dark:text-purple-400 block font-medium">Advanced</span>
          <span className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono mt-1 block">
            {levelStats.advanced}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <span className="text-xs text-indigo-600 dark:text-indigo-400 block font-medium">Total Questions</span>
          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono mt-1 block">
            {levelStats.totalQuestions}
          </span>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Level Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
          {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer shrink-0 ${
                selectedLevel === lvl
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search & Create Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Level Assessment</span>
          </button>
        </div>
      </div>

      {/* Assessments Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No assessments found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click "New Level Assessment" above to create and publish a new assessment set.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const qCount = item.questions_count || (item.questions ? item.questions.length : 0);
            return (
              <div
                key={item.id}
                className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getLevelBadge(item.level)}`}>
                      {item.level}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.time_limit_minutes}m limit
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {qCount} Questions
                    </span>
                    <span>Pass: {item.passing_score}%</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Preview Questions"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                      title="Edit Assessment"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                      title="Delete Assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Level Assessment' : 'Create New Level Assessment'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Assessment General Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Advanced SQL Analytics: Set #2"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Skill Level *
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Passing Score Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Description / Syllabus Covered
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline what skills and concepts are validated in this assessment set..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Questions Builder Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Assessment Questions ({formData.questions.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure scenario questions, multiple options, correct answer keys, and explanations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {formData.questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Question #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Category (e.g. CTEs)"
                            value={q.category}
                            onChange={(e) => handleQuestionChange(idx, 'category', e.target.value)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none w-32"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded transition cursor-pointer"
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div>
                        <textarea
                          rows={2}
                          required
                          placeholder="Enter question text or query scenario..."
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* 4 Options Grid */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Options & Correct Answer Selection:
                        </span>
                        {[
                          { key: 'option_a', index: 0, label: 'A' },
                          { key: 'option_b', index: 1, label: 'B' },
                          { key: 'option_c', index: 2, label: 'C' },
                          { key: 'option_d', index: 3, label: 'D' },
                        ].map((opt) => (
                          <div key={opt.key} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${idx}`}
                              checked={q.correct_option === opt.index}
                              onChange={() => handleQuestionChange(idx, 'correct_option', opt.index)}
                              className="accent-indigo-600 cursor-pointer"
                              title="Mark as correct answer"
                            />
                            <span className="w-5 text-xs font-bold text-slate-500">{opt.label}:</span>
                            <input
                              type="text"
                              required
                              placeholder={`Option ${opt.label} text`}
                              value={q[opt.key]}
                              onChange={(e) => handleQuestionChange(idx, opt.key, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation */}
                      <div className="pt-1">
                        <input
                          type="text"
                          placeholder="Explanation shown to students after grading..."
                          value={q.explanation}
                          onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Assessment...' : (editingId ? 'Update Assessment' : 'Publish Assessment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW DRAWER / MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getLevelBadge(previewItem.level)}`}>
                  {previewItem.level}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {previewItem.description || 'No description.'}
              </p>

              <div className="space-y-4 pt-2">
                {(previewItem.questions || []).map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Q{idx + 1}. {q.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {q.question || q.question_text}
                    </p>
                    <div className="space-y-1 pt-1">
                      {[
                        q.options ? q.options[0] : q.option_a,
                        q.options ? q.options[1] : q.option_b,
                        q.options ? q.options[2] : q.option_c,
                        q.options ? q.options[3] : q.option_d,
                      ].map((optText, optIdx) => {
                        const isCorrect = (q.correct_index !== undefined ? q.correct_index : q.correct_option) === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="w-4">{String.fromCharCode(65 + optIdx)}.</span>
                            <span>{optText}</span>
                            {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 italic">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
