import React, { useState } from 'react';
import { Database, Table, ChevronRight, ChevronDown, Hash, Type, Eye, Plus, Upload } from 'lucide-react';

export const DatabaseExplorer = ({
  datasets = [],
  activeDatasetId,
  onSelectDataset,
  activeTableName,
  onSelectTable,
  tableSchema = null,
  onAddTable,
  onUploadTable,
}) => {
  const [expandedDatasets, setExpandedDatasets] = useState({ [activeDatasetId]: true });

  const toggleDataset = (id) => {
    setExpandedDatasets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    if (activeDatasetId !== id) {
      onSelectDataset(id);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Database Explorer
          </h2>
        </div>
        <span className="text-xs font-medium text-slate-400">
          {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Dataset & Table Tree */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
        {datasets.length === 0 ? (
          <p className="text-xs text-slate-400 p-2 italic">No datasets available.</p>
        ) : (
          datasets.map((ds) => {
            const isExpanded = expandedDatasets[ds.id];
            const isSelected = activeDatasetId === ds.id;

            return (
              <div key={ds.id} className="space-y-1">
                {/* Dataset Item */}
                <button
                  type="button"
                  onClick={() => toggleDataset(ds.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{ds.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 shrink-0">
                    {ds.source_type}
                  </span>
                </button>

                {/* Tables List */}
                {isExpanded && (
                  <div className="pl-6 space-y-1 border-l border-slate-200 dark:border-slate-800 ml-3">
                    {(!ds.tables || ds.tables.length === 0) ? (
                      <p className="text-[11px] text-slate-400 italic py-1">No tables</p>
                    ) : (
                      ds.tables.map((tbl) => {
                        const isTblActive = isSelected && activeTableName === tbl.table_name;
                        return (
                          <button
                            key={tbl.id || tbl.table_name}
                            type="button"
                            onClick={() => {
                              if (activeDatasetId !== ds.id) onSelectDataset(ds.id);
                              onSelectTable(tbl.table_name);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-mono transition text-left ${
                              isTblActive
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Table className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{tbl.table_name}</span>
                            </div>
                            {tbl.row_count !== undefined && (
                              <span
                                className={`text-[10px] ${
                                  isTblActive ? 'text-indigo-100' : 'text-slate-400'
                                }`}
                              >
                                {tbl.row_count} r
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}

                    {/* Quick Action: Add Table to this database */}
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddTable) onAddTable(ds.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUploadTable) onUploadTable(ds.id);
                        }}
                        className="flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Upload file to this database"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selected Table Schema Details */}
      {tableSchema && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Columns in {tableSchema.table_name}
            </span>
            <span className="text-[11px] text-slate-400">{tableSchema.columns?.length || 0} cols</span>
          </div>

          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {tableSchema.columns?.map((col) => (
              <div
                key={col.name}
                className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-md text-[11px]"
              >
                <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{col.name}</span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                  {col.type?.split('(')[0] || 'VARCHAR'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
