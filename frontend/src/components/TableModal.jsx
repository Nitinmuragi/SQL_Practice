import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Table, Check, AlertCircle, Database } from 'lucide-react';
import { datasetService } from '../services/datasetService';

const DATA_TYPES = ['INT', 'VARCHAR', 'TEXT', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'DATE', 'DATETIME'];

export const TableModal = ({
  isOpen,
  onClose,
  onCreateSuccess,
  datasets = [],
  initialDatasetId = null,
}) => {
  const [mode, setMode] = useState('existing');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([
    { name: 'id', type: 'INT', nullable: false },
    { name: 'name', type: 'VARCHAR', nullable: true },
    { name: 'city', type: 'VARCHAR', nullable: true },
  ]);
  const [rows, setRows] = useState([
    { id: '1', name: 'Rahul', city: 'Pune' },
    { id: '2', name: 'Priya', city: 'Mumbai' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialDatasetId) {
        setSelectedDatasetId(initialDatasetId);
        setMode('existing');
      } else if (datasets && datasets.length > 0) {
        setSelectedDatasetId(datasets[0].id);
        setMode('existing');
      } else {
        setMode('new');
      }
    }
  }, [isOpen, initialDatasetId, datasets]);

  if (!isOpen) return null;

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'VARCHAR', nullable: true }]);
  };

  const updateColumn = (idx, field, value) => {
    const next = [...columns];
    next[idx] = { ...next[idx], [field]: value };
    setColumns(next);
  };

  const removeColumn = (idx) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    const newRow = {};
    columns.forEach((c) => {
      newRow[c.name] = '';
    });
    setRows([...rows, newRow]);
  };

  const updateRow = (rIdx, colName, value) => {
    const next = [...rows];
    next[rIdx] = { ...next[rIdx], [colName]: value };
    setRows(next);
  };

  const removeRow = (rIdx) => {
    setRows(rows.filter((_, i) => i !== rIdx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'new') {
      if (!datasetName.trim()) {
        setError('Database / Dataset name is required.');
        return;
      }
    } else {
      if (!selectedDatasetId) {
        setError('Please select a target database.');
        return;
      }
    }

    if (!tableName.trim()) {
      setError('Table name is required.');
      return;
    }
    const emptyCols = columns.some((c) => !c.name.trim());
    if (emptyCols) {
      setError('All columns must have a valid name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let res;
      if (mode === 'existing') {
        res = await datasetService.createTableInDataset(
          Number(selectedDatasetId),
          tableName.trim(),
          columns,
          rows
        );
      } else {
        res = await datasetService.createManualDataset(
          datasetName.trim(),
          tableName.trim(),
          columns,
          rows
        );
      }

      if (res.success) {
        onCreateSuccess(res.data);
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manual table.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDatasetName('');
    setTableName('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === 'existing' ? 'Add Table to Database' : 'Create New Database'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define schema columns, data types, and initial data rows
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        {datasets && datasets.length > 0 && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === 'existing'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Add Table to Existing Database
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                mode === 'new'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create New Database
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Target Database / Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'existing' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Database
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.tables?.length || 0} table{d.tables?.length !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Database / Dataset Name
                </label>
                <input
                  type="text"
                  required
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. University Database"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Table Name
              </label>
              <input
                type="text"
                required
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. courses"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Columns Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Columns Definition
              </span>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <input
                    type="text"
                    required
                    placeholder="Column name"
                    value={col.name}
                    onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                    className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                    className="w-28 sm:w-32 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {DATA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 px-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.nullable}
                      onChange={(e) => updateColumn(idx, 'nullable', e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>Nullable</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    disabled={columns.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rows Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Initial Data Rows ({rows.length})
              </span>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {rows.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 w-10 text-center text-slate-400">#</th>
                      {columns.map((c, i) => (
                        <th key={i} className="p-2 font-mono text-slate-700 dark:text-slate-300">
                          {c.name || `col_${i + 1}`}
                        </th>
                      ))}
                      <th className="p-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r, rIdx) => (
                      <tr key={rIdx}>
                        <td className="p-2 text-center text-slate-400">{rIdx + 1}</td>
                        {columns.map((c, cIdx) => (
                          <td key={cIdx} className="p-1">
                            <input
                              type="text"
                              value={r[c.name] !== undefined ? r[c.name] : ''}
                              onChange={(e) => updateRow(rIdx, c.name, e.target.value)}
                              placeholder="value"
                              className="w-full px-2 py-1 bg-transparent border-b border-transparent focus:border-indigo-500 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(rIdx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'new' ? !datasetName.trim() : !selectedDatasetId) || !tableName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Table...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Create Table in MySQL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
