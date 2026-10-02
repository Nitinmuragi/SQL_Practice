import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Plus, Upload, Trash2, ArrowRight, Table, Calendar, Sparkles } from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { UploadModal } from '../components/UploadModal';
import { TableModal } from '../components/TableModal';
import { SampleDatasetsModal } from '../components/SampleDatasetsModal';
import { Toast } from '../components/Toast';

export const DatabasesPage = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchDatasets = async () => {
    try {
      const res = await datasetService.getDatasets();
      if (res.success && res.data) {
        setDatasets(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"? This will drop its tables from MySQL.`)) {
      return;
    }
    try {
      const res = await datasetService.deleteDataset(id);
      if (res.success) {
        setToast({ type: 'success', message: `Dataset "${name}" deleted.` });
        fetchDatasets();
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete dataset.' });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading datasets..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Databases
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your custom MySQL datasets and uploaded tables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSampleModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Sample Datasets</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Data</span>
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Dataset</span>
          </button>
        </div>
      </div>

      {/* Dataset Grid */}
      {datasets.length === 0 ? (
        <EmptyState
          title="No Datasets Yet"
          description="Upload an Excel/CSV spreadsheet or create a dataset manually to practice SQL."
          primaryAction={{
            label: 'Create Manually',
            onClick: () => setShowTableModal(true),
          }}
          secondaryAction={{
            label: 'Upload File',
            onClick: () => setShowUploadModal(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {ds.name}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400 capitalize">
                        Source: {ds.source_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(ds.id, ds.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tables:</span>
                    </span>
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {ds.table_count || ds.tables?.length || 0}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created:</span>
                    </span>
                    <span>
                      {ds.created_at ? new Date(ds.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>

                {/* Table Badges */}
                {ds.tables && ds.tables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ds.tables.map((t) => (
                      <span
                        key={t.id || t.table_name}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                      >
                        {t.table_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/databases/${ds.id}`}
                  className="flex-1 text-center py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl transition"
                >
                  View Schema
                </Link>
                <Link
                  to={`/sql-practice?dataset_id=${ds.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded-xl transition shadow-sm"
                >
                  <span>Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          setToast({ type: 'success', message: 'Dataset uploaded successfully!' });
          fetchDatasets();
        }}
      />
      <TableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onCreateSuccess={() => {
          setToast({ type: 'success', message: 'Dataset created successfully!' });
          fetchDatasets();
        }}
      />
      <SampleDatasetsModal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        onSuccess={(datasetTitle) => {
          setToast({ type: 'success', message: `Sample dataset "${datasetTitle}" loaded successfully into your workspace!` });
          fetchDatasets();
        }}
      />

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
