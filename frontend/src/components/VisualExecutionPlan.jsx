import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronUp, Info, Zap, ArrowRight, Lightbulb } from 'lucide-react';

export const VisualExecutionPlan = ({ executionData = null, queryText = '', loading = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  const steps = executionData?.execution_steps || [
    {
      step_num: 1,
      clause: 'FROM & JOIN',
      action: 'Identify & Combine Base Tables',
      description: 'Locates source tables and executes join conditions (ON).',
      active: true,
      pedagogical_tip: 'SQL engines always execute FROM and JOINs first to determine the working dataset before any filtering or calculations.'
    },
    {
      step_num: 2,
      clause: 'WHERE',
      action: 'Row-Level Filtering',
      description: 'Evaluates row conditions before grouping.',
      active: /WHERE/i.test(queryText),
      pedagogical_tip: 'WHERE filters rows individually BEFORE grouping. This is why you CANNOT use aggregate functions (like SUM or COUNT) or column aliases inside WHERE.'
    },
    {
      step_num: 3,
      clause: 'GROUP BY',
      action: 'Aggregate Grouping',
      description: 'Collapses rows into aggregate buckets.',
      active: /GROUP\s+BY/i.test(queryText),
      pedagogical_tip: 'GROUP BY collapses rows with matching keys into single summary rows. Any non-aggregated column in SELECT must be included here.'
    },
    {
      step_num: 4,
      clause: 'HAVING',
      action: 'Group Filtering',
      description: 'Filters aggregate buckets based on group criteria.',
      active: /HAVING/i.test(queryText),
      pedagogical_tip: 'HAVING is the WHERE clause for groups! It runs after GROUP BY has created aggregate values (e.g. HAVING COUNT(*) > 5).'
    },
    {
      step_num: 5,
      clause: 'SELECT',
      action: 'Project Output Columns',
      description: 'Computes expressions, aliases, and window functions.',
      active: true,
      pedagogical_tip: 'SELECT runs late in the pipeline! This is where column aliases (AS alias_name) are created.'
    },
    {
      step_num: 6,
      clause: 'DISTINCT',
      action: 'Deduplication',
      description: 'Removes duplicate row combinations.',
      active: /DISTINCT/i.test(queryText),
      pedagogical_tip: 'DISTINCT only runs after SELECT has determined which columns are in the output.'
    },
    {
      step_num: 7,
      clause: 'ORDER BY',
      action: 'Sort Rows',
      description: 'Orders final output rows ASC or DESC.',
      active: /ORDER\s+BY/i.test(queryText),
      pedagogical_tip: 'ORDER BY runs after SELECT, which is why ORDER BY CAN use column aliases and aggregate values computed in SELECT!'
    },
    {
      step_num: 8,
      clause: 'LIMIT',
      action: 'Paginate & Slice',
      description: 'Restricts total rows returned.',
      active: /LIMIT/i.test(queryText),
      pedagogical_tip: 'LIMIT is the very last operation. It slices the final sorted output before sending records back to the client.'
    }
  ];

  const activeStep = selectedStep || steps.find((s) => s.active) || steps[0];

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-4 sm:p-5 shadow-sm transition">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Visual SQL Execution Lifecycle</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Educational Engine
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SQL executes in a completely different order than written. Click any stage to inspect.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition"
        >
          <span>{expanded ? 'Hide Details' : 'Explore Steps'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Horizontal Pipeline Visualizer */}
      <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-slate-800/80 overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
          {steps.map((st, idx) => {
            const isSelected = activeStep.step_num === st.step_num;
            return (
              <React.Fragment key={st.step_num}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStep(st);
                    if (!expanded) setExpanded(true);
                  }}
                  className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400/50'
                      : st.active
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-indigo-200/80 dark:border-slate-700 hover:border-indigo-400'
                      : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected
                      ? 'bg-white text-indigo-700'
                      : st.active
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {st.step_num}
                  </span>
                  <span>{st.clause}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Expanded Step Deep Dive */}
      {expanded && activeStep && (
        <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-slate-700 shadow-sm animate-fade-in space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {activeStep.step_num}
              </span>
              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                Step {activeStep.step_num}: {activeStep.clause} ({activeStep.action})
              </h5>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
              activeStep.active
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {activeStep.active ? 'Active in your query' : 'Optional / Not present'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {activeStep.description}
          </p>

          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-lg border border-amber-200/70 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-sans">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Learner Golden Rule:</strong>
              <span>{activeStep.pedagogical_tip}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
