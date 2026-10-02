import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Award,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  User,
  GraduationCap,
  Bell,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { contestService } from '../services/contestService';

export const ContestRegistrationModal = ({ isOpen, onClose, contest, onRegistered }) => {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    college_name: '',
    degree_branch: '',
    email_notification_opt_in: true
  });
  const [hasPreviousProfile, setHasPreviousProfile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      loadProfileData();
    }
  }, [isOpen]);

  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const res = await contestService.getUserProfileData();
      if (res.success && res.data) {
        setFormData(prev => ({
          ...prev,
          full_name: res.data.full_name || '',
          email: res.data.email || '',
          mobile_number: res.data.mobile_number || '',
          college_name: res.data.college_name || '',
          degree_branch: res.data.degree_branch || '',
          email_notification_opt_in: true
        }));
        if (res.data.has_previous_profile) {
          setHasPreviousProfile(true);
          setIsEditMode(false);
        } else {
          setHasPreviousProfile(false);
          setIsEditMode(true);
        }
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  if (!isOpen || !contest) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.mobile_number.trim()) {
      setError('Please provide a valid mobile number for contest credentials & certificate verification.');
      return;
    }
    if (!formData.college_name.trim()) {
      setError('Please provide your College or Organization name (printed on official certificates).');
      return;
    }

    try {
      setLoading(true);
      const res = await contestService.registerForContest(contest.id, formData);
      if (res.success) {
        onRegistered && onRegistered(res);
        onClose();
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const deadlineFormatted = contest.registration_deadline
    ? new Date(contest.registration_deadline).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Saturday 11:59 PM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Sunday Championship
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {contest.duration_minutes} Mins • {contest.total_marks} Marks
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">{contest.title}</h2>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2">{contest.description}</p>
        </div>

        {/* Saturday Cutoff Alert */}
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-200">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Registration Cutoff:</strong> Closes strictly on <strong>{deadlineFormatted}</strong>. Registrations on Sunday are not accepted.
          </span>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {profileLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs">Checking your verified profile...</p>
            </div>
          ) : hasPreviousProfile && !isEditMode ? (
            /* Returning User 1-Click Direct Join View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Returning Participant Detected
                </div>
                <p className="text-xs text-slate-300">
                  Welcome back! Your verified profile details are ready. You can join with 1-click confirmation or update details below.
                </p>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" /> Candidate Name:
                  </span>
                  <span className="font-semibold text-white">{formData.full_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" /> Email Address:
                  </span>
                  <span className="font-semibold text-white">{formData.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Mobile Number:
                  </span>
                  <span className="font-semibold text-white">{formData.mobile_number}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" /> College / Org:
                  </span>
                  <span className="font-semibold text-amber-200">{formData.college_name}</span>
                </div>
                {formData.degree_branch && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-400" /> Degree / Stream:
                    </span>
                    <span className="font-medium text-slate-200">{formData.degree_branch}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  Edit Registration Details
                </button>
                <span className="text-slate-400 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" /> 20-min alert enabled
                </span>
              </div>
            </div>
          ) : (
            /* New User or Edit Form */
            <form id="contest-reg-form" onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Candidate Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="e.g., Enter Your Name"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registered Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      disabled
                      value={formData.email}
                      className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mobile Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    placeholder="e.g., +91 98765 43210"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Used for verification and exam alert delivery.</p>
              </div>

              {/* College / Organization */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  College / University / Company <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.college_name}
                    onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                    placeholder="e.g., VJTI Mumbai / IIT Bombay / Google"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[11px] text-amber-300/80 mt-1">
                  This will be officially printed on your Top 3 Ranker Certificate!
                </p>
              </div>

              {/* Degree / Branch */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Degree / Department / Branch (Optional)
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.degree_branch}
                    onChange={(e) => setFormData({ ...formData, degree_branch: e.target.value })}
                    placeholder="e.g., B.Tech Computer Engineering (Final Year)"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Notification Toggle */}
              <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="email_opt_in"
                  checked={formData.email_notification_opt_in}
                  onChange={(e) => setFormData({ ...formData, email_notification_opt_in: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-indigo-600 bg-slate-900 border-slate-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="email_opt_in" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-semibold text-white block">Email Confirmation & 20-Min Reminder Alert</span>
                  Send confirmation email now and a reminder email with the live join link 20 minutes before Sunday exam start.
                </label>
              </div>

              {hasPreviousProfile && isEditMode && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Perks Callout */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/40">
              <span className="text-[11px] text-amber-300 font-bold block">1st Rank: 150 XP</span>
              <span className="text-[10px] text-slate-400">Gold Certificate</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/40">
              <span className="text-[11px] text-slate-300 font-bold block">2nd Rank: 100 XP</span>
              <span className="text-[10px] text-slate-400">Silver Certificate</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/40">
              <span className="text-[11px] text-amber-500 font-bold block">3rd Rank: 75 XP</span>
              <span className="text-[10px] text-slate-400">Bronze Certificate</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type={hasPreviousProfile && !isEditMode ? 'button' : 'submit'}
            form={hasPreviousProfile && !isEditMode ? undefined : 'contest-reg-form'}
            onClick={hasPreviousProfile && !isEditMode ? handleSubmit : undefined}
            disabled={loading || profileLoading}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering...
              </>
            ) : hasPreviousProfile && !isEditMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                1-Click Direct Join
              </>
            ) : (
              <>
                Submit Registration
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
