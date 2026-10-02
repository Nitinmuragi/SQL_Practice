import React from 'react';
import { Link } from 'react-router-dom';
import { Database, ShieldCheck, Terminal, BookOpen, Layers, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand & Platform Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  SQL Practice Platform
                </span>
                <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Enterprise SQL Lab
                </span>
              </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              A high-performance SQL training environment featuring real MySQL execution, live query analysis, dynamic challenge benchmarks, and isolated schema management.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>MySQL 8.0 Live Engine</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <span>Fast & Isolated</span>
              </div>
            </div>
          </div>

          {/* Column 1: Learning Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Learning Lab
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/sql-practice"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span>SQL Terminal</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/challenges"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>SQL Challenges</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/cheatsheet"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Syntax Cheat Sheet</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/error-guide"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5"
                >
                  <span>MySQL Error Directory</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Features
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/databases"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  Dataset Manager
                </Link>
              </li>
              <li>
                <Link
                  to="/history"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  Query History & Audit
                </Link>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500 cursor-default">
                  Multi-Table Relations
                </span>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500 cursor-default">
                  Safe Sandbox Execution
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Administration & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Governance
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition group"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Admin Portal</span>
                  <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/challenges"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  Challenge Management
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  Student Sign In
                </Link>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500 cursor-default">
                  Role-Based Security
                </span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} SQL Practice Platform. All rights reserved.</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>All Systems Operational</span>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span>REST API v1</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span>ISO/IEC 27001 Prepared</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
