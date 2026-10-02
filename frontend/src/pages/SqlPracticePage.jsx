import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Database, RefreshCw, Terminal, Layers, Plus, Upload, Code2, SlidersHorizontal, Zap, ArrowRight, BookOpen, Compass, Sparkles, X } from 'lucide-react';
import { datasetService } from '../services/datasetService';
import { queryService } from '../services/queryService';
import { DatabaseExplorer } from '../components/DatabaseExplorer';
import { QueryBuilder } from '../components/QueryBuilder';
import { SqlViewer } from '../components/SqlViewer';
import { SqlEditor } from '../components/SqlEditor';
import { VisualExecutionPlan } from '../components/VisualExecutionPlan';
import { ResultTable } from '../components/ResultTable';
import { Toast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { UploadModal } from '../components/UploadModal';
import { TableModal } from '../components/TableModal';
import { SampleDatasetsModal } from '../components/SampleDatasetsModal';
import { EerDiagramViewer } from '../components/EerDiagramViewer';

export const SqlPracticePage = () => {
  const [searchParams] = useSearchParams();
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [showSampleModal, setShowSampleModal] = useState(false);

  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [activeTableName, setActiveTableName] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [targetModalDatasetId, setTargetModalDatasetId] = useState(null);

  // EER Diagram Modal State
  const [showEerModal, setShowEerModal] = useState(false);
  const [eerData, setEerData] = useState(null);
  const [isEerLoading, setIsEerLoading] = useState(false);
  const [eerError, setEerError] = useState(null);

  useEffect(() => {
    if (showEerModal && activeDatasetId) {
      const fetchEer = async () => {
        setIsEerLoading(true);
        setEerError(null);
        try {
          const res = await datasetService.getDatasetEer(activeDatasetId);
          if (res.success && res.data) {
            setEerData(res.data);
          } else {
            setEerError(res.message || 'No EER schema found');
          }
        } catch (err) {
          setEerError(err.response?.data?.message || err.message || 'Failed to load EER diagram');
        } finally {
          setIsEerLoading(false);
        }
      };
      fetchEer();
    }
  }, [showEerModal, activeDatasetId]);

  // Dual Workspace Mode: 'builder' | 'editor'
  const [workspaceMode, setWorkspaceMode] = useState('builder');
  const [rawSql, setRawSql] = useState('');
  const [showExecutionPlan, setShowExecutionPlan] = useState(false);

  // Structured query spec
  const [querySpec, setQuerySpec] = useState({
    table: '',
    columns: ['*'],
    conditions: [],
    order_by: null,
    limit: 100,
  });

  // Query Execution State
  const [generatedSql, setGeneratedSql] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);

  // Modals & Notifications
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [toast, setToast] = useState(null);

  // 1. Fetch user datasets
  const fetchDatasets = async () => {
    try {
      const res = await datasetService.getDatasets();
      if (res.success && res.data) {
        setDatasets(res.data);
        if (res.data.length > 0) {
          // Check URL query param or select first dataset
          const urlDsId = searchParams.get('dataset_id');
          const targetDs = urlDsId
            ? res.data.find((d) => d.id === parseInt(urlDsId)) || res.data[0]
            : res.data[0];

          setActiveDatasetId(targetDs.id);
          if (targetDs.tables && targetDs.tables.length > 0) {
            const urlTable = searchParams.get('table');
            const targetTbl = urlTable && targetDs.tables.some((t) => t.table_name === urlTable)
              ? urlTable
              : targetDs.tables[0].table_name;
            setActiveTableName(targetTbl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // 2. Fetch table details whenever active dataset or table changes
  useEffect(() => {
    if (activeDatasetId && activeTableName) {
      const fetchTableInfo = async () => {
        try {
          const res = await datasetService.getTableDetails(activeDatasetId, activeTableName);
          if (res.success && res.data) {
            setTableSchema(res.data);

            // Update querySpec with active table
            setQuerySpec((prev) => ({
              ...prev,
              table: activeTableName,
              columns: ['*'],
            }));
          }
        } catch (err) {
          console.error('Failed to fetch table details:', err);
        }
      };
      fetchTableInfo();
    }
  }, [activeDatasetId, activeTableName]);

  // 3. Generate preview SQL whenever querySpec changes
  useEffect(() => {
    if (!querySpec.table) {
      setGeneratedSql('-- Please select a table to begin query');
      return;
    }

    const op = querySpec.operation || 'SELECT';

    if (op === 'INSERT') {
      const data = querySpec.insert_data || {};
      const cols = Object.keys(data);
      if (cols.length === 0) {
        setGeneratedSql(`-- Enter values to insert into ${querySpec.table}`);
        return;
      }
      const vals = cols.map((c) => {
        const v = data[c];
        return isNaN(v) || v === '' ? `'${v}'` : v;
      });
      setGeneratedSql(`INSERT INTO ${querySpec.table} (${cols.join(', ')})\nVALUES (${vals.join(', ')});`);
      return;
    }

    if (op === 'UPDATE') {
      const assigns = querySpec.update_data?.assignments || [];
      if (assigns.length === 0) {
        setGeneratedSql(`-- Configure column assignments to update ${querySpec.table}`);
        return;
      }
      const setClause = assigns
        .map((a) => {
          const col = a.column || 'column';
          if (a.value === '' || a.value === undefined) {
            return `${col} = ''`;
          }
          return `${col} = ${isNaN(a.value) ? `'${a.value}'` : a.value}`;
        })
        .join(', ');
      let sql = `UPDATE ${querySpec.table}\nSET ${setClause}`;
      if (querySpec.conditions && querySpec.conditions.length > 0) {
        const conds = formatConditions(querySpec.conditions);
        if (conds) sql += `\nWHERE ${conds}`;
      }
      setGeneratedSql(sql + ';');
      return;
    }

    if (op === 'DELETE') {
      let sql = `DELETE FROM ${querySpec.table}`;
      if (querySpec.conditions && querySpec.conditions.length > 0) {
        const conds = formatConditions(querySpec.conditions);
        if (conds) sql += `\nWHERE ${conds}`;
      }
      setGeneratedSql(sql + ';');
      return;
    }

    // SELECT
    const selectItems = [];
    if (querySpec.columns && querySpec.columns.length > 0 && !querySpec.columns.includes('*')) {
      selectItems.push(...querySpec.columns);
    }
    if (querySpec.aggregates && querySpec.aggregates.length > 0) {
      querySpec.aggregates.forEach((a) => {
        const alias = a.alias ? ` AS ${a.alias}` : '';
        selectItems.push(`${a.function || 'COUNT'}(${a.column || '*'})${alias}`);
      });
    }
    if (querySpec.functions && querySpec.functions.length > 0) {
      querySpec.functions.forEach((f) => {
        const alias = f.alias ? ` AS ${f.alias}` : '';
        if (['IFNULL', 'NULLIF'].includes(f.type)) {
          selectItems.push(`${f.type}(${f.column}, '${f.fallback || ''}')${alias}`);
        } else if (f.type === 'COALESCE') {
          selectItems.push(`COALESCE(${(f.args || []).join(', ')})${alias}`);
        } else if (f.type === 'CASE') {
          selectItems.push(`CASE WHEN ... THEN ... ELSE '${f.else_value || ''}' END${alias}`);
        } else {
          selectItems.push(`${f.type}()${alias}`);
        }
      });
    }

    const proj = selectItems.length > 0 ? selectItems.join(', ') : '*';
    let sql = `SELECT ${proj}\nFROM ${querySpec.table}`;

    if (querySpec.joins && querySpec.joins.length > 0) {
      querySpec.joins.forEach((j) => {
        const alias = j.alias ? ` AS ${j.alias}` : '';
        if (j.type === 'CROSS JOIN') {
          sql += `\nCROSS JOIN ${j.table}${alias}`;
        } else {
          sql += `\n${j.type || 'INNER JOIN'} ${j.table}${alias} ON ${j.left_on} = ${j.right_on}`;
        }
      });
    }

    if (querySpec.conditions && querySpec.conditions.length > 0) {
      const conds = formatConditions(querySpec.conditions);
      if (conds) sql += `\nWHERE ${conds}`;
    }

    if (querySpec.group_by && querySpec.group_by.length > 0) {
      sql += `\nGROUP BY ${querySpec.group_by.join(', ')}`;
    }

    if (querySpec.having && querySpec.having.length > 0) {
      const havingConds = querySpec.having
        .map((h, i) => `${i > 0 ? 'AND ' : ''}${h.column} ${h.operator} ${h.value}`)
        .join(' ');
      sql += `\nHAVING ${havingConds}`;
    }

    if (querySpec.order_by && querySpec.order_by.column) {
      sql += `\nORDER BY ${querySpec.order_by.column} ${querySpec.order_by.direction || 'ASC'}`;
    }

    if (querySpec.limit) {
      sql += `\nLIMIT ${querySpec.limit}`;
    }

    if (querySpec.offset) {
      sql += ` OFFSET ${querySpec.offset}`;
    }

    setGeneratedSql(sql + ';');
  }, [querySpec]);

  const formatConditions = (conditions) => {
    return conditions
      .filter((c) => (c.column || ['EXISTS', 'NOT EXISTS'].includes(c.operator)) && c.operator)
      .map((c, i) => {
        const conj = i > 0 ? `${c.conjunction || 'AND'} ` : '';
        const notStr = c.not ? 'NOT ' : '';
        if (['IS NULL', 'IS NOT NULL'].includes(c.operator)) {
          return `${conj}${notStr}${c.column} ${c.operator}`;
        }
        if (['BETWEEN', 'NOT BETWEEN'].includes(c.operator)) {
          const v1 = Array.isArray(c.value) ? c.value[0] : (c.value || '').split(',')[0];
          const v2 = Array.isArray(c.value) ? c.value[1] : (c.value || '').split(',')[1];
          return `${conj}${notStr}${c.column} ${c.operator} ${v1} AND ${v2}`;
        }
        if (['IN', 'NOT IN'].includes(c.operator)) {
          return `${conj}${notStr}${c.column} ${c.operator} (${c.value})`;
        }
        if (['EXISTS', 'NOT EXISTS'].includes(c.operator)) {
          return `${conj}${notStr}${c.operator} (${c.value})`;
        }
        const val = isNaN(c.value) || c.value === '' ? `'${c.value}'` : c.value;
        return `${conj}${notStr}${c.column} ${c.operator} ${val}`;
      })
      .join(' ');
  };

  // Send compiled query to raw SQL editor
  const handleSendToEditor = () => {
    setRawSql(generatedSql);
    setWorkspaceMode('editor');
    setToast({ type: 'info', message: 'Query loaded into Interactive SQL Terminal!' });
  };

  // Quick sample queries generator
  const loadSampleQuery = (type) => {
    if (!activeTableName) {
      setToast({ type: 'error', message: 'Please select a table first.' });
      return;
    }
    const cols = (tableSchema?.column_names || []).filter((c) => c !== '*');
    const firstCol = cols[0] || 'id';

    let sql = '';
    if (type === 'select_all') {
      sql = `SELECT * FROM \`${activeTableName}\` LIMIT 20;`;
    } else if (type === 'count_summary') {
      sql = `SELECT COUNT(*) AS total_records FROM \`${activeTableName}\`;`;
    } else if (type === 'filter_sample') {
      sql = `SELECT * FROM \`${activeTableName}\`\nWHERE \`${firstCol}\` IS NOT NULL\nLIMIT 10;`;
    } else if (type === 'order_sample') {
      sql = `SELECT * FROM \`${activeTableName}\`\nORDER BY \`${firstCol}\` DESC\nLIMIT 10;`;
    } else if (type === 'group_sample') {
      sql = `SELECT \`${firstCol}\`, COUNT(*) AS count_per_group\nFROM \`${activeTableName}\`\nGROUP BY \`${firstCol}\`\nHAVING COUNT(*) > 0\nORDER BY count_per_group DESC;`;
    }
    setRawSql(sql);
    setWorkspaceMode('editor');
    setToast({ type: 'info', message: 'Sample query loaded into SQL editor!' });
  };

  // 4. Run query against real backend/MySQL
  const handleRunQuery = async () => {
    if (!activeDatasetId) {
      setToast({ type: 'error', message: 'Please select a dataset first.' });
      return;
    }

    let payload;
    let queryTextUsed;

    if (workspaceMode === 'editor') {
      const cleanRaw = (rawSql || '').trim();
      if (!cleanRaw) {
        setToast({ type: 'error', message: 'Please write a SQL query to execute.' });
        return;
      }
      payload = { raw_sql: cleanRaw };
      queryTextUsed = cleanRaw;
    } else {
      if (!querySpec.table) {
        setToast({ type: 'error', message: 'Please select a table to query.' });
        return;
      }

      if (querySpec.operation === 'UPDATE') {
        const assigns = querySpec.update_data?.assignments || [];
        const validAssigns = assigns.filter(
          (a) => a.column && a.value !== undefined && a.value !== ''
        );
        if (validAssigns.length === 0) {
          setToast({
            type: 'error',
            message: 'Please specify at least one column value to update.',
          });
          return;
        }
      }

      if (querySpec.operation === 'INSERT') {
        const data = querySpec.insert_data || {};
        const filledCols = Object.keys(data).filter(
          (k) => data[k] !== '' && data[k] !== undefined
        );
        if (filledCols.length === 0) {
          setToast({
            type: 'error',
            message: 'Please specify at least one column value to insert.',
          });
          return;
        }
      }

      payload = querySpec;
      queryTextUsed = generatedSql;
    }

    setIsExecuting(true);
    setQueryError(null);
    setQueryResults(null);

    try {
      const res = workspaceMode === 'editor'
        ? await queryService.executeQuery(activeDatasetId, null, queryTextUsed)
        : await queryService.executeQuery(activeDatasetId, payload);
      if (res.success && res.data) {
        setQueryResults(res.data);
        if (res.data.display_sql) {
          setGeneratedSql(res.data.display_sql);
          if (workspaceMode === 'builder') {
            setRawSql(res.data.display_sql);
          }
        }
        setExecutionTime(res.data.execution_time_ms);
        setToast({ type: 'success', message: res.data.message || 'Query executed successfully!' });

        // If DML, refresh table counts and datasets in explorer
        if (res.data.affected_rows !== undefined) {
          fetchDatasets();
          if (activeDatasetId && activeTableName) {
            datasetService.getTableDetails(activeDatasetId, activeTableName).then((tRes) => {
              if (tRes.success && tRes.data) setTableSchema(tRes.data);
            });
          }
        }
      } else {
        setQueryError(res.error || res.message || 'Execution error');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setQueryError(errMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectDataset = (id) => {
    setActiveDatasetId(id);
    const ds = datasets.find((d) => d.id === id);
    if (ds && ds.tables && ds.tables.length > 0) {
      setActiveTableName(ds.tables[0].table_name);
    } else {
      setActiveTableName(null);
      setTableSchema(null);
    }
  };

  const handleSelectTable = (tblName) => {
    setActiveTableName(tblName);
  };

  if (loadingDatasets) {
    return <LoadingSpinner size="lg" text="Loading SQL practice workspace..." />;
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-8">
        <EmptyState
          title="No Datasets Available"
          description="Upload an Excel/CSV file or create your first dataset manually to start practicing SQL queries."
          primaryAction={{
            label: 'Create Dataset Manually',
            onClick: () => setShowTableModal(true),
          }}
          secondaryAction={{
            label: 'Upload Excel / CSV',
            onClick: () => setShowUploadModal(true),
          }}
        />

        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          datasets={datasets}
          initialDatasetId={targetModalDatasetId || activeDatasetId}
          onUploadSuccess={(data) => {
            setToast({ type: 'success', message: 'Table uploaded successfully!' });
            if (data?.dataset?.id) setActiveDatasetId(data.dataset.id);
            if (data?.table?.table_name) setActiveTableName(data.table.table_name);
            fetchDatasets();
          }}
        />
        <TableModal
          isOpen={showTableModal}
          onClose={() => setShowTableModal(false)}
          datasets={datasets}
          initialDatasetId={targetModalDatasetId || activeDatasetId}
          onCreateSuccess={(data) => {
            setToast({ type: 'success', message: 'Table created successfully!' });
            if (data?.dataset?.id) setActiveDatasetId(data.dataset.id);
            if (data?.table?.table_name) setActiveTableName(data.table.table_name);
            fetchDatasets();
          }}
        />
      </div>
    );
  }

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);
  const availableTables = activeDataset?.tables || [];
  const columnNames = tableSchema?.column_names || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Status & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SQL Practice Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Current Dataset:{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">
              {activeDataset?.name || 'None'}
            </strong>{' '}
            • Active Table:{' '}
            <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
              {activeTableName || 'None'}
            </strong>
          </p>
        </div>

        {/* Quick action buttons to add table or upload file */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
            title="Inspect table relationships, foreign keys & primary keys in an interactive visual diagram"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>EER Diagram</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSampleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl transition shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sample Datasets</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetModalDatasetId(activeDatasetId);
              setShowTableModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetModalDatasetId(activeDatasetId);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Database Explorer (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <DatabaseExplorer
            datasets={datasets}
            activeDatasetId={activeDatasetId}
            onSelectDataset={handleSelectDataset}
            activeTableName={activeTableName}
            onSelectTable={handleSelectTable}
            tableSchema={tableSchema}
            onAddTable={(dsId) => {
              setTargetModalDatasetId(dsId);
              setShowTableModal(true);
            }}
            onUploadTable={(dsId) => {
              setTargetModalDatasetId(dsId);
              setShowUploadModal(true);
            }}
          />
        </div>

        {/* Right Column: Dual-Mode Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Dual-Mode Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() => setWorkspaceMode('builder')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  workspaceMode === 'builder'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Visual Query Builder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rawSql && generatedSql) setRawSql(generatedSql);
                  setWorkspaceMode('editor');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  workspaceMode === 'editor'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Interactive SQL Terminal</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExecutionPlan(!showExecutionPlan)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  showExecutionPlan
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{showExecutionPlan ? 'Hide Execution Order' : 'Visual Execution Plan'}</span>
              </button>

              <Link
                to="/challenges"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Practice Challenges</span>
              </Link>
            </div>
          </div>

          {/* Mode A: Visual Query Builder */}
          {workspaceMode === 'builder' && (
            <div className="space-y-6">
              <QueryBuilder
                tables={availableTables}
                selectedTable={activeTableName}
                onSelectTable={handleSelectTable}
                columns={columnNames}
                querySpec={querySpec}
                onChangeQuerySpec={setQuerySpec}
                onRunQuery={handleRunQuery}
                isRunning={isExecuting}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated SQL
                  </span>
                  <button
                    type="button"
                    onClick={handleSendToEditor}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                  >
                    <span>⚡ Edit directly in SQL Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <SqlViewer
                  sql={generatedSql}
                  onRun={handleRunQuery}
                  isRunning={isExecuting}
                  onCopy={() => setToast({ type: 'info', message: 'SQL copied to clipboard!' })}
                />
              </div>
            </div>
          )}

          {/* Mode B: Raw SQL Editor Console */}
          {workspaceMode === 'editor' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Write raw SQL against active dataset:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{activeTableName}</strong>
                </span>

                {/* Sample Queries Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-sans hidden sm:inline">Templates:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        loadSampleQuery(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-sans cursor-pointer outline-none"
                  >
                    <option value="" disabled>Load Sample Query...</option>
                    <option value="select_all">1. SELECT * LIMIT 20</option>
                    <option value="count_summary">2. Total Rows (COUNT)</option>
                    <option value="filter_sample">3. Filter with WHERE</option>
                    <option value="order_sample">4. Order by Column DESC</option>
                    <option value="group_sample">5. GROUP BY & HAVING</option>
                  </select>
                </div>
              </div>

              <SqlEditor
                value={rawSql}
                onChange={setRawSql}
                onRun={handleRunQuery}
                isRunning={isExecuting}
                placeholder={`-- Write custom SQL for table ${activeTableName || 'your_table'}\nSELECT * FROM \`${activeTableName || 'table'}\` LIMIT 25;`}
                height="h-64 sm:h-72"
              />
            </div>
          )}

          {/* Optional Visual Execution Plan Stepper */}
          {showExecutionPlan && (
            <VisualExecutionPlan
              queryText={workspaceMode === 'editor' ? rawSql : generatedSql}
            />
          )}

          {/* Execution Results */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Query Results
            </h3>
            <ResultTable
              results={queryResults}
              error={queryError}
              loading={isExecuting}
              executionTime={executionTime}
              queryText={workspaceMode === 'editor' ? rawSql : generatedSql}
            />
          </div>
        </div>
      </div>

      {/* Modals & Toasts */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        datasets={datasets}
        initialDatasetId={targetModalDatasetId || activeDatasetId}
        onUploadSuccess={(data) => {
          setToast({ type: 'success', message: 'Table uploaded successfully!' });
          if (data?.dataset?.id) setActiveDatasetId(data.dataset.id);
          if (data?.table?.table_name) setActiveTableName(data.table.table_name);
          fetchDatasets();
        }}
      />
      <TableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        datasets={datasets}
        initialDatasetId={targetModalDatasetId || activeDatasetId}
        onCreateSuccess={(data) => {
          setToast({ type: 'success', message: 'Table created successfully!' });
          if (data?.dataset?.id) setActiveDatasetId(data.dataset.id);
          if (data?.table?.table_name) setActiveTableName(data.table.table_name);
          fetchDatasets();
        }}
      />
      <SampleDatasetsModal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        onSuccess={(datasetTitle) => {
          setToast({ type: 'success', message: `Sample dataset "${datasetTitle}" loaded successfully!` });
          fetchDatasets();
        }}
      />

      {/* Dedicated Full-Page EER Diagram Studio */}
      {showEerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in">
          <EerDiagramViewer
            eerData={eerData}
            loading={isEerLoading}
            error={eerError}
            isFullPage={true}
            onBack={() => setShowEerModal(false)}
            backLabel="Back to SQL Practice"
            targetTable={activeTableName}
          />
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
