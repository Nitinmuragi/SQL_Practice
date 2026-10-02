import React from 'react';
import { Sun, Moon, Shield, Database, LogOut } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Customize your workspace experience and appearance
        </p>
      </div>

      <div className="space-y-4">
        {/* Appearance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Interface Appearance
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Theme Mode
                </p>
                <p className="text-xs text-slate-400">
                  Switch between Dark mode and Light mode
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
            >
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </div>

        {/* Database & Security Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Database Security
          </h3>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <strong className="block text-emerald-800 dark:text-emerald-300 font-semibold">
                  Multi-Tenant SQL Isolation Active
                </strong>
                <span>
                  All queries execute inside isolated user table spaces with strict keyword filtering.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone / Logout */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-500">
            Session
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Log Out of Account
              </p>
              <p className="text-xs text-slate-400">
                End your active authenticated session on this browser
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
