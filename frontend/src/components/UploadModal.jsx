import React, { useState, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, Check, AlertCircle, ArrowRight, Database } from 'lucide-react';
import { datasetService } from '../services/datasetService';

export const UploadModal = ({
  isOpen,
  onClose,
  onUploadSuccess,
  datasets = [],
  initialDatasetId = null,
}) => {
  const [mode, setMode] = useState('existing');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [tableName, setTableName] = useState('');
  const [preview, setPreview] = useState(null);
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

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setError('');
    // Auto-fill dataset name and table name from filename
    const defaultName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setDatasetName(defaultName);
    setTableName(selected.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    // Preview
    setLoading(true);
    try {
      const res = await datasetService.previewUpload(selected);
      if (res.success && res.data) {
        setPreview(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error parsing preview of uploaded file.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

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

    setLoading(true);
    setError('');
    try {
      let res;
      if (mode === 'existing') {
        res = await datasetService.uploadTableToDataset(Number(selectedDatasetId), tableName.trim(), file);
      } else {
        res = await datasetService.uploadDataset(datasetName.trim(), tableName.trim(), file);
      }
      if (res.success) {
        onUploadSuccess(res.data);
        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload dataset.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDatasetName('');
    setTableName('');
    setPreview(null);
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === 'existing' ? 'Upload Table into Database' : 'Upload New Database'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import .xlsx, .xls, or .csv files into MySQL
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker */}
          {!file ? (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition group">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Click to browse or drag & drop Excel / CSV file
              </p>
              <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, or .csv (Max 16MB)</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="text-xs text-rose-500 hover:underline"
              >
                Change file
              </button>
            </div>
          )}

          {/* Dataset & Table Name inputs */}
          {file && (
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
                    placeholder="e.g. Sales Q1"
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
                  placeholder="e.g. orders"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Preview Box */}
          {preview && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Detected: <strong>{preview.total_rows}</strong> rows,{' '}
                  <strong>{preview.total_columns}</strong> columns
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  First 5 rows preview
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {preview.columns?.map((c) => (
                        <th key={c} className="p-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {c}
                          <span className="block text-[10px] text-slate-400 font-normal uppercase">
                            {preview.column_types?.[c] || 'VARCHAR'}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {preview.preview_rows?.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {preview.columns?.map((c) => (
                          <td key={c} className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {r[c] !== null ? String(r[c]) : <span className="italic text-slate-400">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              disabled={loading || !file || (mode === 'new' ? !datasetName.trim() : !selectedDatasetId) || !tableName.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Import & Create Table</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
