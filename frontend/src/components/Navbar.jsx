import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Database, Sun, Moon, LogOut, User as UserIcon, Menu, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen = false }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand logo & mobile hamburger */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}

          <Link
            to={isAuthenticated ? (user?.is_admin ? '/admin/challenges' : '/dashboard') : '/'}
            className="flex items-center gap-2.5 sm:gap-3"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                SQL <span className="text-indigo-600 dark:text-indigo-400">Practice</span>
              </span>
              {user?.is_admin ? (
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
                  Admin Console
                </span>
              ) : (
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Platform
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {user?.is_admin ? (
                <Link
                  to="/admin/challenges"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Admin: {user?.email}</span>
                </Link>
              ) : (
                <Link
                  to="/profile"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <span>{user?.full_name || 'My Account'}</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
