import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Database, Table, Plus, Play, ChevronLeft, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';

export const DatabaseDetailPage = () => {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableDetails, setTableDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [toast, setToast] = useState(null);

  const fetchDataset = async () => {
    try {
      const res = await datasetService.getDataset(id);
      if (res.success && res.data) {
        setDataset(res.data);
        if (res.data.tables && res.data.tables.length > 0) {
          const firstTbl = res.data.tables[0].table_name;
          setSelectedTable(firstTbl);
          fetchTableDetails(firstTbl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (tblName) => {
    setLoadingTable(true);
    try {
      const res = await datasetService.getTableDetails(id, tblName);
      if (res.success && res.data) {
        setTableDetails(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, [id]);

  const handleSelectTable = (tblName) => {
    setSelectedTable(tblName);
    fetchTableDetails(tblName);
  };

  const handleInsertRow = async (e) => {
    e.preventDefault();
    try {
      const res = await datasetService.insertTableRow(id, selectedTable, newRowData);
      if (res.success) {
        setToast({ type: 'success', message: 'Row inserted successfully!' });
        setShowAddRowModal(false);
        setNewRowData({});
        fetchTableDetails(selectedTable);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to insert row.' });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dataset details..." />;
  }

  if (!dataset) {
    return (
      <div className="text-center p-12 space-y-4">
        <h2 className="text-xl font-bold">Dataset not found</h2>
        <Link to="/databases" className="text-indigo-600 hover:underline">
          Back to databases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <Link
            to="/databases"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Databases</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {dataset.name}
              </h1>
              <p className="text-xs text-slate-400">
                Source: <span className="capitalize">{dataset.source_type}</span> • Created:{' '}
                {dataset.created_at ? new Date(dataset.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <Link
          to={`/sql-practice?dataset_id=${dataset.id}&table=${selectedTable || ''}`}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-600/20 active:scale-95"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Practice SQL on this Dataset</span>
        </Link>
      </div>

      {/* Tables Navigation Tabs */}
      {dataset.tables && dataset.tables.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          {dataset.tables.map((t) => (
            <button
              key={t.id || t.table_name}
              onClick={() => handleSelectTable(t.table_name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-medium transition ${
                selectedTable === t.table_name
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>{t.table_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Table Content */}
      {loadingTable ? (
        <LoadingSpinner size="md" text="Loading table schema..." />
      ) : tableDetails ? (
        <div className="space-y-6">
          {/* Schema & Columns Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Table Schema: <span className="font-mono text-indigo-600 dark:text-indigo-400">{tableDetails.table_name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Total rows: <strong>{tableDetails.row_count}</strong>
                </p>
              </div>

              <button
                onClick={() => setShowAddRowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert Row</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Column Name</th>
                    <th className="py-2.5 px-4">Data Type</th>
                    <th className="py-2.5 px-4">Nullable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                  {tableDetails.columns?.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {col.name}
                      </td>
                      <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                        {col.type}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {col.nullable ? 'YES' : 'NO'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Data Preview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Preview (First 10 records)
            </h3>

            {(!tableDetails.preview_rows || tableDetails.preview_rows.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No records in this table.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm border-collapse font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {tableDetails.column_names?.map((c) => (
                        <th key={c} className="py-2.5 px-4 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tableDetails.preview_rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {tableDetails.column_names?.map((c) => (
                          <td key={c} className="py-2 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200">
                            {row[c] !== null && row[c] !== undefined ? String(row[c]) : (
                              <span className="italic text-slate-400">NULL</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Insert Row Modal */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Insert Row into {selectedTable}
            </h3>

            <form onSubmit={handleInsertRow} className="space-y-3">
              {tableDetails?.columns?.map((col) => (
                <div key={col.name}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {col.name} ({col.type})
                  </label>
                  <input
                    type="text"
                    value={newRowData[col.name] || ''}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, [col.name]: e.target.value })
                    }
                    placeholder={`Enter ${col.name}`}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  Save Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
