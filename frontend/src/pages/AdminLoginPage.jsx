import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      const loggedUser = res?.data?.user;

      if (!loggedUser?.is_admin) {
        // Automatically revoke auth since user is not an administrator
        await logout();
        setError(
          `Access Denied: Account '${email}' does not have system administrator privileges. Please use the standard student login.`
        );
      } else {
        // Successfully verified as admin
        navigate('/admin/challenges', { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Authentication failed. Please verify admin credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-indigo-950 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-xl shadow-indigo-950/40">
          <ShieldAlert className="w-7 h-7 text-indigo-400" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <span>Restricted Portal</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Administrator Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Curate challenges, manage benchmarks, and oversee platform datasets.
        </p>
      </div>

      {/* Already logged in as Admin banner */}
      {isAuthenticated && user?.is_admin && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Currently Authenticated as Administrator</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            You are signed in as <strong>{user.email}</strong>.
          </p>
          <button
            onClick={() => navigate('/admin/challenges')}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <span>Open Challenge Management</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Currently logged in as student warning */}
      {isAuthenticated && !user?.is_admin && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold">Notice: Active Student Session</p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            You are currently logged in as student <strong>{user.email}</strong>. Entering admin credentials below will switch your session to Administrator mode.
          </p>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md space-y-5">
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticate as Administrator</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Navigation back to student login */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p>
          Looking for student coursework & practice?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Go to Student Login
          </Link>
        </p>
      </div>
    </div>
  );
};
