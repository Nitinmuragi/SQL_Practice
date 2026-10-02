import React, { useState } from 'react';
import {
  Clock,
  Rows,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Download,
  Table,
  BarChart2,
  Copy,
  FileText,
  Check,
} from 'lucide-react';
import { ErrorReasonModal } from './ErrorReasonModal';
import { analyzeSqlError } from '../utils/sqlErrorAnalyzer';
import { QueryChart } from './QueryChart';
import { exportToCsv, exportToJson, copyAsMarkdown } from '../utils/exportUtils';

export const ResultTable = ({
  results,
  error,
  loading = false,
  executionTime = null,
  queryText = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showTechnicalError, setShowTechnicalError] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const rowsPerPage = 10;

  if (loading) {
    return (
      <div className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Executing query safely against MySQL...
        </p>
      </div>
    );
  }

  if (error) {
    const diagnosis = analyzeSqlError(error, queryText);

    return (
      <>
        <div className="p-5 border border-rose-200 dark:border-rose-900/60 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 space-y-3 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Query Execution Failed</span>
              {diagnosis?.code && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                  {diagnosis.code}
                </span>
              )}
            </div>

            {/* View Reason Button */}
            <button
              type="button"
              onClick={() => setShowReasonModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition group"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition" />
              <span>View Reason & How to Fix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagnosis summary message */}
          {diagnosis && (
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-rose-200/80 dark:border-rose-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <span className="font-semibold text-rose-600 dark:text-rose-400 block mb-0.5">
                {diagnosis.title}:
              </span>
              <p className="text-slate-600 dark:text-slate-300 text-xs">{diagnosis.summary}</p>
            </div>
          )}

          {/* Collapsible raw error */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTechnicalError(!showTechnicalError)}
              className="flex items-center gap-1 text-[11px] font-medium text-rose-600/80 dark:text-rose-400/80 hover:underline"
            >
              <span>{showTechnicalError ? 'Hide technical error message' : 'View raw database error'}</span>
              {showTechnicalError ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTechnicalError && (
              <pre className="mt-2 p-3 bg-slate-950 text-rose-300 rounded-lg text-[11px] font-mono whitespace-pre-wrap overflow-x-auto border border-rose-900/40">
                {error}
              </pre>
            )}
          </div>
        </div>

        {/* Reason & How-to-Fix Modal */}
        <ErrorReasonModal
          isOpen={showReasonModal}
          onClose={() => setShowReasonModal(false)}
          error={error}
          queryText={queryText}
        />
      </>
    );
  }

  if (!results) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-900/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Build or write your query and click <strong className="text-indigo-600 dark:text-indigo-400">Run Query</strong> to view live dataset results.
        </p>
      </div>
    );
  }

  // DML operations (INSERT, UPDATE, DELETE) return affected_rows
  if (results.affected_rows !== undefined) {
    const op = results.operation || 'DML';
    return (
      <div className="p-6 border border-emerald-200 dark:border-emerald-900/60 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-emerald-200/80 dark:border-emerald-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-800 dark:text-emerald-200 text-base">
                  {results.message || 'Statement executed successfully'}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300">
                  {op}
                </span>
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Target database tables and row counters were synchronized.
              </p>
            </div>
          </div>
          {executionTime !== null && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{executionTime} ms</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-emerald-700/70 dark:text-emerald-400/70 block uppercase tracking-wider font-semibold">
              Rows Affected
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-100">
              {results.affected_rows}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { columns = [], rows = [], row_count = 0 } = results;

  // Pagination calculation
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedRows = rows.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Rows className="w-4 h-4 text-indigo-500" />
            <span>
              Rows returned: <strong className="text-slate-900 dark:text-white">{row_count}</strong>
            </span>
          </div>
          {executionTime !== null && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>
                Execution time: <strong className="text-slate-900 dark:text-white">{executionTime} ms</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: View Mode Switcher, Export Menu, and Pagination */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Table / Chart Toggle */}
          {rows.length > 0 && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  viewMode === 'chart'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Chart View</span>
              </button>
            </div>
          )}

          {/* Export Dropdown */}
          {rows.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 animate-fade-in text-xs"
                  onClick={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() => exportToCsv(columns, rows)}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportToJson(rows)}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyAsMarkdown(columns, rows);
                      if (ok) {
                        setCopiedMd(true);
                        setTimeout(() => setCopiedMd(false), 2000);
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 transition"
                  >
                    {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{copiedMd ? 'Copied Markdown!' : 'Copy Markdown'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pagination controls for table view */}
          {viewMode === 'table' && totalPages > 1 && (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Chart or Table */}
      {viewMode === 'chart' ? (
        <QueryChart columns={columns} rows={rows} />
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No matching records found for this query.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-4 font-semibold text-slate-500 dark:text-slate-400 w-12 text-center">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="py-2.5 px-4 text-center text-xs text-slate-400 font-mono">
                    {startIndex + rIdx + 1}
                  </td>
                  {columns.map((col) => {
                    const val = row[col];
                    return (
                      <td
                        key={col}
                        className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap"
                      >
                        {val === null || val === undefined ? (
                          <span className="text-slate-400 italic font-sans text-xs">NULL</span>
                        ) : typeof val === 'boolean' ? (
                          val ? 'TRUE' : 'FALSE'
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
