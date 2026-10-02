import React from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Code2,
  Terminal,
  Upload,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Rows,
  Play,
  History,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive SQL Practice with Real MySQL Datasets</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto text-slate-900 dark:text-white leading-[1.15]">
            Practice SQL. Build Queries.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500">
              Understand Databases.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Create or upload your own dataset and practice SQL queries through an interactive visual query builder.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/25 transition active:scale-95"
            >
              <span>Start Practicing</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="px-7 py-3.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-base transition"
            >
              Login
            </Link>
          </div>

          {/* Interactive Preview Card Mockup */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-2xl p-4 sm:p-6 text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-xs text-slate-400">students.sql — Practice Workspace</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  MySQL 8.0 Connected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-300 space-y-1">
                  <p className="text-slate-500">// Generated SQL</p>
                  <p><span className="text-pink-400 font-bold">SELECT</span> name, marks</p>
                  <p><span className="text-pink-400 font-bold">FROM</span> students</p>
                  <p><span className="text-pink-400 font-bold">WHERE</span> marks &gt; 80;</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300">
                  <div className="text-slate-500 mb-2">// Query Results: 2 rows returned</div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-1">name</th>
                        <th className="pb-1">marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-1 text-emerald-400">Rahul</td>
                        <td className="py-1">87</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-emerald-400">Priya</td>
                        <td className="py-1">92</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Go from raw CSV/Excel data to running real queries in under 60 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Upload or Create',
                desc: 'Upload your own Excel or CSV files, or design tables manually with a flexible schema.',
                icon: Upload,
              },
              {
                step: '02',
                title: 'Visual Query Builder',
                desc: 'Select tables, pick columns, and add WHERE filters visually without writing syntax errors.',
                icon: Layers,
              },
              {
                step: '03',
                title: 'Real SQL Execution',
                desc: 'The backend validates safety and executes the parameterized SQL against real MySQL tables.',
                icon: Play,
              },
              {
                step: '04',
                title: 'Results & History',
                desc: 'Inspect real results, copy generated SQL queries, and re-run past executions anytime.',
                icon: History,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.step}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3 relative group hover:border-indigo-500 transition"
                >
                  <span className="text-2xl font-black text-indigo-500/20 group-hover:text-indigo-500/40 transition">
                    {card.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Your Data</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Drag-and-drop `.xlsx`, `.xls`, or `.csv` spreadsheets. Automatic data type inference transforms your columns into MySQL data types instantly.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visual Query Builder</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Combine conditions with AND/OR conjunctions, sort with ORDER BY, and set LIMIT constraints. Real-time SQL syntax generation keeps you learning.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Airtight User Data Isolation</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Every dataset is strictly isolated to your authenticated account. Destructive queries and unauthorized statements are safely blocked.
            </p>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="py-16 bg-gradient-to-tr from-indigo-700 to-violet-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to master SQL with hands-on practice?
          </h2>
          <p className="text-indigo-100 text-base sm:text-lg max-w-xl mx-auto font-normal">
            Create an account in 10 seconds and start practicing queries on real database tables today.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-base shadow-xl transition active:scale-95"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <Footer />
    </div>
  );
};
