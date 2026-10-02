import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Copy,
  Check,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { queryService } from '../services/queryService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { ErrorReasonModal } from '../components/ErrorReasonModal';

export const HistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedErrorItem, setSelectedErrorItem] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await queryService.getHistory(page, 20);
      if (res.success && res.data) {
        setHistory(res.data.history || []);
        setPagination({
          page: res.data.page,
          total_pages: res.data.total_pages,
          total: res.data.total,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleCopy = (id, sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setToast({ type: 'info', message: 'SQL copied to clipboard!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRerun = (item) => {
    // Navigate to SQL Practice with the dataset ID
    if (item.dataset_id) {
      navigate(`/sql-practice?dataset_id=${item.dataset_id}`);
    } else {
      navigate('/sql-practice');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Query Execution History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Audit log of all queries run by your account ({pagination.total} total)
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Loading query log..." />
      ) : history.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No queries in history
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Queries you run in the SQL Practice workspace will be recorded here automatically.
          </p>
          <Link
            to="/sql-practice"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Go to SQL Practice
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      item.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {item.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    {item.status}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold">{item.dataset_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  {item.execution_time !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.execution_time} ms</span>
                    </div>
                  )}
                  <span>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>

              {/* Code block */}
              <div className="relative group">
                <pre className="p-3.5 bg-slate-950 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {item.query_text}
                </pre>
              </div>

              {/* Error message display if failed */}
              {item.error_message && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs font-mono text-rose-700 dark:text-rose-300 truncate max-w-xl">
                    <span className="font-semibold">Error:</span> {item.error_message}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedErrorItem(item)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition shrink-0"
                  >
                    <Lightbulb className="w-3 h-3 text-amber-300" />
                    <span>View Reason & Solution</span>
                  </button>
                </div>
              )}

              {/* Actions row */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleCopy(item.id, item.query_text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition min-h-[36px]"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleRerun(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition min-h-[36px]"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Open in Workspace</span>
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchHistory(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchHistory(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {selectedErrorItem && (
        <ErrorReasonModal
          isOpen={!!selectedErrorItem}
          onClose={() => setSelectedErrorItem(null)}
          error={selectedErrorItem.error_message}
          queryText={selectedErrorItem.query_text}
        />
      )}
    </div>
  );
};
