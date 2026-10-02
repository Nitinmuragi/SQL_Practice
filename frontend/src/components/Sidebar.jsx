import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  Database,
  History,
  User,
  Settings,
  LogOut,
  BookOpen,
  Award,
  Compass,
  X,
  ShieldCheck,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Sidebar = ({ mobileOpen = false, onCloseMobile = () => {} }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    await logout();
    navigate('/login');
  };

  const navItems = user?.is_admin
    ? [
        {
          to: '/admin/challenges',
          label: 'Admin Panel',
          icon: ShieldCheck,
          badge: 'Exclusive',
        },
        {
          to: '/admin/assessments',
          label: 'Skill Assessments',
          icon: Trophy,
        },
        {
          to: '/admin/contests',
          label: 'Contests Admin',
          icon: Sparkles,
          badge: 'Sunday',
        },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/contests', label: 'Community Contests', icon: Trophy, badge: 'Sunday Live' },
        { to: '/sql-practice', label: 'SQL Practice', icon: Code2 },
        { to: '/challenges', label: 'Practice Challenges', icon: Award, badge: 'XP Gated' },
        { to: '/assessment', label: 'Skill Assessment', icon: ShieldCheck, badge: 'Certify' },
        { to: '/cheatsheet', label: 'Visual Cheatsheet', icon: Compass },
        { to: '/databases', label: 'My Databases', icon: Database },
        { to: '/error-guide', label: 'SQL Error Guide', icon: BookOpen, badge: 'Learn' },
        { to: '/history', label: 'Query History', icon: History },
        { to: '/profile', label: 'Profile', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings },
      ];

  const renderNavContent = (isMobile = false) => (
    <>
      <div className="space-y-5">
        {/* User preview banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-lg ${user?.is_admin ? 'bg-gradient-to-tr from-indigo-700 to-violet-700 text-indigo-200' : 'bg-indigo-600 text-white'} flex items-center justify-center font-bold text-sm shadow-sm shrink-0`}>
              {user?.is_admin ? <ShieldCheck className="w-5 h-5 text-white" /> : (user?.full_name ? user.full_name[0].toUpperCase() : 'U')}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {user?.is_admin ? 'Administrator' : (user?.full_name || 'Student')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {user?.is_admin && (
          <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 text-center tracking-wider uppercase">
            Admin Console Restricted Mode
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/80 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout button at bottom */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Sticky / Fixed on scroll) */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto self-start">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 top-16 bottom-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sliding Drawer */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shadow-2xl border-r border-slate-200 dark:border-slate-800 md:hidden overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent(true)}
      </aside>
    </>
  );
};
