import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Filter,
  ArrowUpDown,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  SlidersHorizontal,
  Calculator,
  Code2,
  AlertCircle,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const OPERATORS = [
  '=',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'LIKE',
  'IN',
  'NOT IN',
  'BETWEEN',
  'NOT BETWEEN',
  'IS NULL',
  'IS NOT NULL',
  'EXISTS',
  'NOT EXISTS',
];

const JOIN_TYPES = [
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'CROSS JOIN',
  'SELF JOIN',
];

const AGG_FUNCTIONS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
const COND_FUNCTIONS = ['IFNULL', 'COALESCE', 'IF', 'CASE', 'NULLIF'];

export const QueryBuilder = ({
  tables = [],
  selectedTable,
  onSelectTable,
  columns = [],
  querySpec,
  onChangeQuerySpec,
  onRunQuery,
  isRunning = false,
}) => {
  // Operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  const [operation, setOperation] = useState(querySpec?.operation || 'SELECT');

  // SELECT state
  const [selectedColumns, setSelectedColumns] = useState(querySpec?.columns || ['*']);
  const [aggregates, setAggregates] = useState(querySpec?.aggregates || []);
  const [functions, setFunctions] = useState(querySpec?.functions || []);
  const [joins, setJoins] = useState(querySpec?.joins || []);
  const [conditions, setConditions] = useState(querySpec?.conditions || []);
  const [groupBy, setGroupBy] = useState(querySpec?.group_by || []);
  const [having, setHaving] = useState(querySpec?.having || []);
  const [orderByCol, setOrderByCol] = useState(querySpec?.order_by?.column || '');
  const [orderByDir, setOrderByDir] = useState(querySpec?.order_by?.direction || 'ASC');
  const [limit, setLimit] = useState(querySpec?.limit || 100);
  const [offset, setOffset] = useState(querySpec?.offset || 0);

  // INSERT state: object with column keys and values
  const [insertFields, setInsertFields] = useState(
    querySpec?.insert_data || {}
  );

  // UPDATE state: array of assignments [{ column, value }]
  const [updateAssignments, setUpdateAssignments] = useState(
    querySpec?.update_data?.assignments || [
      { column: columns[0] || '', value: '' },
    ]
  );

  // Section collapse states for clean UX
  const [showJoins, setShowJoins] = useState(false);
  const [showExprs, setShowExprs] = useState(false);
  const [showGroupBy, setShowGroupBy] = useState(false);

  // Ref to prevent circular feedback loops from resetting internal state
  const isEmittingRef = useRef(false);

  // Sync internal state when external querySpec changes (e.g. table switch or rerun history)
  useEffect(() => {
    if (isEmittingRef.current) {
      isEmittingRef.current = false;
      return;
    }

    if (querySpec) {
      setOperation(querySpec.operation || 'SELECT');
      setSelectedColumns(querySpec.columns || ['*']);
      setAggregates(querySpec.aggregates || []);
      setFunctions(querySpec.functions || []);
      setJoins(querySpec.joins || []);
      setConditions(querySpec.conditions || []);
      setGroupBy(querySpec.group_by || []);
      setHaving(querySpec.having || []);
      setOrderByCol(querySpec.order_by?.column || '');
      setOrderByDir(querySpec.order_by?.direction || 'ASC');
      setLimit(querySpec.limit || 100);
      setOffset(querySpec.offset || 0);
      if (querySpec.insert_data) setInsertFields(querySpec.insert_data);
      if (querySpec.update_data?.assignments) {
        setUpdateAssignments(querySpec.update_data.assignments);
      }
    }
  }, [querySpec]);

  // Synchronize new columns if selectedTable changed or columns finished loading
  useEffect(() => {
    if (columns.length > 0) {
      if (operation === 'INSERT' && Object.keys(insertFields).length === 0) {
        const init = {};
        columns.forEach((c) => (init[c] = ''));
        setInsertFields(init);
      }
      if (operation === 'UPDATE') {
        setUpdateAssignments((prev) => {
          if (!prev || prev.length === 0) {
            return [{ column: columns[0], value: '' }];
          }
          if (prev.length === 1 && !prev[0].column) {
            return [{ column: columns[0], value: prev[0].value || '' }];
          }
          return prev;
        });
      }
    }
  }, [columns, operation]);

  // Propagate state upwards
  const emitChange = (updated = {}) => {
    const nextOp = updated.operation !== undefined ? updated.operation : operation;
    const nextCols = updated.columns !== undefined ? updated.columns : selectedColumns;
    const nextAggs = updated.aggregates !== undefined ? updated.aggregates : aggregates;
    const nextFuncs = updated.functions !== undefined ? updated.functions : functions;
    const nextJoins = updated.joins !== undefined ? updated.joins : joins;
    const nextConds = updated.conditions !== undefined ? updated.conditions : conditions;
    const nextGroupBy = updated.groupBy !== undefined ? updated.groupBy : groupBy;
    const nextHaving = updated.having !== undefined ? updated.having : having;
    const nextOrderCol = updated.orderByCol !== undefined ? updated.orderByCol : orderByCol;
    const nextOrderDir = updated.orderByDir !== undefined ? updated.orderByDir : orderByDir;
    const nextLim = updated.limit !== undefined ? updated.limit : limit;
    const nextOffset = updated.offset !== undefined ? updated.offset : offset;
    const nextInsert = updated.insertFields !== undefined ? updated.insertFields : insertFields;
    const nextAssignments = updated.updateAssignments !== undefined ? updated.updateAssignments : updateAssignments;

    const spec = {
      operation: nextOp,
      table: selectedTable,
    };

    if (nextOp === 'SELECT') {
      spec.columns = nextCols;
      if (nextAggs.length > 0) spec.aggregates = nextAggs;
      if (nextFuncs.length > 0) spec.functions = nextFuncs;
      if (nextJoins.length > 0) spec.joins = nextJoins;
      if (nextConds.length > 0) spec.conditions = nextConds;
      if (nextGroupBy.length > 0) spec.group_by = nextGroupBy;
      if (nextHaving.length > 0) spec.having = nextHaving;
      if (nextOrderCol) {
        spec.order_by = { column: nextOrderCol, direction: nextOrderDir };
      }
      spec.limit = nextLim;
      if (nextOffset > 0) spec.offset = nextOffset;
    } else if (nextOp === 'INSERT') {
      spec.insert_data = nextInsert;
    } else if (nextOp === 'UPDATE') {
      spec.update_data = { assignments: nextAssignments };
      if (nextConds.length > 0) spec.conditions = nextConds;
    } else if (nextOp === 'DELETE') {
      if (nextConds.length > 0) spec.conditions = nextConds;
    }

    isEmittingRef.current = true;
    onChangeQuerySpec(spec);
  };

  const handleOperationSwitch = (op) => {
    setOperation(op);
    emitChange({ operation: op });
  };

  // --- Column Toggles ---
  const toggleColumn = (colName) => {
    let next;
    if (colName === '*') {
      next = ['*'];
    } else {
      let filtered = selectedColumns.filter((c) => c !== '*');
      if (filtered.includes(colName)) {
        filtered = filtered.filter((c) => c !== colName);
        next = filtered.length > 0 ? filtered : ['*'];
      } else {
        next = [...filtered, colName];
      }
    }
    setSelectedColumns(next);
    emitChange({ columns: next });
  };

  // --- Aggregate Functions ---
  const addAggregate = () => {
    const next = [...aggregates, { function: 'COUNT', column: '*', alias: '' }];
    setAggregates(next);
    emitChange({ aggregates: next });
  };

  const updateAggregate = (index, field, value) => {
    const next = [...aggregates];
    next[index] = { ...next[index], [field]: value };
    setAggregates(next);
    emitChange({ aggregates: next });
  };

  const removeAggregate = (index) => {
    const next = aggregates.filter((_, i) => i !== index);
    setAggregates(next);
    emitChange({ aggregates: next });
  };

  // --- Conditional Functions (IFNULL, COALESCE, CASE, etc.) ---
  const addFunction = (type = 'IFNULL') => {
    let newFunc = { type, alias: '' };
    if (type === 'IFNULL') {
      newFunc = { type, column: columns[0] || 'id', fallback: 'Unknown', alias: 'val_clean' };
    } else if (type === 'COALESCE') {
      newFunc = { type, args: [columns[0] || 'id', '0'], alias: 'coalesce_val' };
    } else if (type === 'IF') {
      newFunc = {
        type,
        condition: { column: columns[0] || 'id', operator: '>', value: 50 },
        true_value: 'Pass',
        false_value: 'Fail',
        alias: 'status',
      };
    } else if (type === 'CASE') {
      newFunc = {
        type,
        when_clauses: [
          { condition: { column: columns[0] || 'id', operator: '>=', value: 80 }, then: 'High' },
        ],
        else_value: 'Low',
        alias: 'tier',
      };
    } else if (type === 'NULLIF') {
      newFunc = { type, column: columns[0] || 'id', fallback: '0', alias: 'nullif_val' };
    }
    const next = [...functions, newFunc];
    setFunctions(next);
    emitChange({ functions: next });
  };

  const updateFunction = (index, key, val) => {
    const next = [...functions];
    next[index] = { ...next[index], [key]: val };
    setFunctions(next);
    emitChange({ functions: next });
  };

  const removeFunction = (index) => {
    const next = functions.filter((_, i) => i !== index);
    setFunctions(next);
    emitChange({ functions: next });
  };

  // --- JOINs ---
  const addJoin = () => {
    const otherTables = tables.filter((t) => (t.table_name || t) !== selectedTable);
    const joinTable = otherTables.length > 0 ? (otherTables[0].table_name || otherTables[0]) : selectedTable;
    const next = [
      ...joins,
      {
        type: 'INNER JOIN',
        table: joinTable,
        alias: '',
        left_on: `${selectedTable}.${columns[0] || 'id'}`,
        right_on: `${joinTable}.${columns[0] || 'id'}`,
      },
    ];
    setJoins(next);
    emitChange({ joins: next });
  };

  const updateJoin = (index, field, value) => {
    const next = [...joins];
    next[index] = { ...next[index], [field]: value };
    setJoins(next);
    emitChange({ joins: next });
  };

  const removeJoin = (index) => {
    const next = joins.filter((_, i) => i !== index);
    setJoins(next);
    emitChange({ joins: next });
  };

  // --- WHERE Conditions ---
  const addCondition = () => {
    const defaultCol = columns[0] || 'id';
    const next = [
      ...conditions,
      { column: defaultCol, operator: '=', value: '', not: false, conjunction: 'AND' },
    ];
    setConditions(next);
    emitChange({ conditions: next });
  };

  const updateCondition = (index, field, value) => {
    const next = [...conditions];
    next[index] = { ...next[index], [field]: value };
    setConditions(next);
    emitChange({ conditions: next });
  };

  const removeCondition = (index) => {
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next);
    emitChange({ conditions: next });
  };

  // --- GROUP BY & HAVING ---
  const toggleGroupByCol = (col) => {
    let next;
    if (groupBy.includes(col)) {
      next = groupBy.filter((c) => c !== col);
    } else {
      next = [...groupBy, col];
    }
    setGroupBy(next);
    emitChange({ groupBy: next });
  };

  const addHavingCondition = () => {
    const next = [
      ...having,
      { column: `COUNT(*)`, operator: '>', value: '0', conjunction: 'AND' },
    ];
    setHaving(next);
    emitChange({ having: next });
  };

  const updateHavingCondition = (index, field, value) => {
    const next = [...having];
    next[index] = { ...next[index], [field]: value };
    setHaving(next);
    emitChange({ having: next });
  };

  const removeHavingCondition = (index) => {
    const next = having.filter((_, i) => i !== index);
    setHaving(next);
    emitChange({ having: next });
  };

  // --- UPDATE Assignments ---
  const addUpdateAssignment = (specificCol = null) => {
    const assignedCols = updateAssignments.map((a) => a.column);
    const availableCol =
      specificCol ||
      columns.find((c) => !assignedCols.includes(c)) ||
      columns[0] ||
      '';
    const next = [...updateAssignments, { column: availableCol, value: '' }];
    setUpdateAssignments(next);
    emitChange({ updateAssignments: next });
  };

  const updateAssignmentField = (index, field, value) => {
    const next = [...updateAssignments];
    next[index] = { ...next[index], [field]: value };
    setUpdateAssignments(next);
    emitChange({ updateAssignments: next });
  };

  const removeUpdateAssignment = (index) => {
    const next = updateAssignments.filter((_, i) => i !== index);
    setUpdateAssignments(next);
    emitChange({ updateAssignments: next });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* 1. Operation Tabs Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'SELECT', label: 'SELECT', color: 'indigo' },
            { id: 'INSERT', label: 'INSERT', color: 'emerald' },
            { id: 'UPDATE', label: 'UPDATE', color: 'amber' },
            { id: 'DELETE', label: 'DELETE', color: 'rose' },
          ].map((tab) => {
            const isActive = operation === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleOperationSwitch(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Run Query Action */}
        <button
          onClick={onRunQuery}
          disabled={isRunning || !selectedTable}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 active:scale-95"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run {operation}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Target Table Selector */}
      <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <Database className="w-4 h-4 text-indigo-500 shrink-0" />
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
          Target Table:
        </label>
        <select
          value={selectedTable || ''}
          onChange={(e) => onSelectTable(e.target.value)}
          className="flex-1 sm:w-64 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {tables.map((t) => (
            <option key={t.table_name || t} value={t.table_name || t}>
              {t.table_name || t}
            </option>
          ))}
        </select>
      </div>

      {/* ========================================================================= */}
      {/* 3. SELECT FLOW */}
      {/* ========================================================================= */}
      {operation === 'SELECT' && (
        <div className="space-y-6">
          {/* Column Picker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Columns
              </label>
              <span className="text-xs text-slate-400">
                {selectedColumns.includes('*') ? 'All columns (*)' : `${selectedColumns.length} selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleColumn('*')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedColumns.includes('*')
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                * (All Columns)
              </button>
              {columns.map((col) => {
                const isSelected = selectedColumns.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleColumn(col)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expressions & Functions Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExprs(!showExprs)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Aggregate Functions & Conditional Expressions
                </span>
                {(aggregates.length > 0 || functions.length > 0) && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full font-mono">
                    {aggregates.length + functions.length} active
                  </span>
                )}
              </div>
              {showExprs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showExprs && (
              <div className="p-4 space-y-4 bg-white dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800">
                {/* Aggregates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Aggregates (COUNT, SUM, AVG, MIN, MAX)
                    </span>
                    <button
                      type="button"
                      onClick={addAggregate}
                      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Aggregate</span>
                    </button>
                  </div>
                  {aggregates.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No aggregates configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {aggregates.map((agg, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                          <select
                            value={agg.function || 'COUNT'}
                            onChange={(e) => updateAggregate(idx, 'function', e.target.value)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-semibold text-slate-800 dark:text-slate-200"
                          >
                            {AGG_FUNCTIONS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          <select
                            value={agg.column || '*'}
                            onChange={(e) => updateAggregate(idx, 'column', e.target.value)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-800 dark:text-slate-200"
                          >
                            <option value="*">*</option>
                            {columns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <span className="text-xs text-slate-400">AS</span>
                          <input
                            type="text"
                            placeholder="alias (optional)"
                            value={agg.alias || ''}
                            onChange={(e) => updateAggregate(idx, 'alias', e.target.value)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-800 dark:text-slate-200 w-32"
                          />
                          <button
                            type="button"
                            onClick={() => removeAggregate(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conditional Functions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Functions (IFNULL, COALESCE, IF, CASE, NULLIF)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {COND_FUNCTIONS.map((fName) => (
                        <button
                          key={fName}
                          type="button"
                          onClick={() => addFunction(fName)}
                          className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 text-slate-700 dark:text-slate-300 rounded font-mono font-medium transition"
                        >
                          +{fName}
                        </button>
                      ))}
                    </div>
                  </div>
                  {functions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No conditional expressions configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {functions.map((fn, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 text-xs font-bold font-mono bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded">
                              {fn.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">AS</span>
                              <input
                                type="text"
                                placeholder="alias"
                                value={fn.alias || ''}
                                onChange={(e) => updateFunction(idx, 'alias', e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-800 dark:text-slate-200 w-28"
                              />
                              <button
                                type="button"
                                onClick={() => removeFunction(idx)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Function Arguments Editor */}
                          {['IFNULL', 'NULLIF'].includes(fn.type) && (
                            <div className="flex items-center gap-2 text-xs">
                              <select
                                value={fn.column || columns[0]}
                                onChange={(e) => updateFunction(idx, 'column', e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded font-mono"
                              >
                                {columns.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              <span className="text-slate-400">fallback:</span>
                              <input
                                type="text"
                                value={fn.fallback || ''}
                                onChange={(e) => updateFunction(idx, 'fallback', e.target.value)}
                                placeholder="e.g. Unknown, 0"
                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded font-mono"
                              />
                            </div>
                          )}

                          {fn.type === 'COALESCE' && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Columns / Literals:</span>
                              <input
                                type="text"
                                value={(fn.args || []).join(', ')}
                                onChange={(e) =>
                                  updateFunction(
                                    idx,
                                    'args',
                                    e.target.value.split(',').map((s) => s.trim())
                                  )
                                }
                                placeholder="e.g. col1, col2, 'N/A'"
                                className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded font-mono"
                              />
                            </div>
                          )}

                          {fn.type === 'CASE' && (
                            <div className="text-xs space-y-1.5 pl-2 border-l-2 border-indigo-400">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500">WHEN</span>
                                <select
                                  value={fn.when_clauses?.[0]?.condition?.column || columns[0]}
                                  onChange={(e) => {
                                    const next = { ...fn };
                                    if (!next.when_clauses) next.when_clauses = [{}];
                                    if (!next.when_clauses[0].condition) next.when_clauses[0].condition = {};
                                    next.when_clauses[0].condition.column = e.target.value;
                                    updateFunction(idx, 'when_clauses', next.when_clauses);
                                  }}
                                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border rounded font-mono"
                                >
                                  {columns.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <select
                                  value={fn.when_clauses?.[0]?.condition?.operator || '>='}
                                  onChange={(e) => {
                                    const next = { ...fn };
                                    if (!next.when_clauses) next.when_clauses = [{}];
                                    if (!next.when_clauses[0].condition) next.when_clauses[0].condition = {};
                                    next.when_clauses[0].condition.operator = e.target.value;
                                    updateFunction(idx, 'when_clauses', next.when_clauses);
                                  }}
                                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border rounded"
                                >
                                  {['>=', '<=', '=', '!=', '>', '<', 'LIKE'].map((op) => (
                                    <option key={op} value={op}>{op}</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="cond value"
                                  value={fn.when_clauses?.[0]?.condition?.value || ''}
                                  onChange={(e) => {
                                    const next = { ...fn };
                                    if (!next.when_clauses) next.when_clauses = [{}];
                                    if (!next.when_clauses[0].condition) next.when_clauses[0].condition = {};
                                    next.when_clauses[0].condition.value = e.target.value;
                                    updateFunction(idx, 'when_clauses', next.when_clauses);
                                  }}
                                  className="w-20 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded font-mono"
                                />
                                <span className="font-semibold text-slate-500">THEN</span>
                                <input
                                  type="text"
                                  placeholder="result"
                                  value={fn.when_clauses?.[0]?.then || ''}
                                  onChange={(e) => {
                                    const next = { ...fn };
                                    if (!next.when_clauses) next.when_clauses = [{}];
                                    next.when_clauses[0].then = e.target.value;
                                    updateFunction(idx, 'when_clauses', next.when_clauses);
                                  }}
                                  className="w-24 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded font-mono"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-500">ELSE</span>
                                <input
                                  type="text"
                                  placeholder="fallback result"
                                  value={fn.else_value || ''}
                                  onChange={(e) => updateFunction(idx, 'else_value', e.target.value)}
                                  className="w-32 px-2 py-0.5 bg-white dark:bg-slate-900 border rounded font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* JOIN Section Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowJoins(!showJoins)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Table JOINs (INNER, LEFT, RIGHT, CROSS, SELF)
                </span>
                {joins.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full font-mono">
                    {joins.length} joined
                  </span>
                )}
              </div>
              {showJoins ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showJoins && (
              <div className="p-4 space-y-3 bg-white dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Connect other dataset tables via join relationships.
                  </span>
                  <button
                    type="button"
                    onClick={addJoin}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add JOIN</span>
                  </button>
                </div>

                {tables.length <= 1 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Notice: Current database only has 1 table ({selectedTable})</p>
                      <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                        To join with another table, use the <strong>+ Add Table</strong> or <strong>Upload</strong> button in the Database Explorer on the left to add a 2nd table (e.g. courses, enrollments).
                        You can also use <strong>SELF JOIN</strong> to join this table with itself.
                      </p>
                    </div>
                  </div>
                )}

                {joins.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No joins added.</p>
                ) : (
                  <div className="space-y-2">
                    {joins.map((j, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <select
                          value={j.type || 'INNER JOIN'}
                          onChange={(e) => updateJoin(idx, 'type', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold"
                        >
                          {JOIN_TYPES.map((jt) => (
                            <option key={jt} value={jt}>{jt}</option>
                          ))}
                        </select>
                        <select
                          value={j.table}
                          onChange={(e) => updateJoin(idx, 'table', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold"
                        >
                          {tables.map((t) => {
                            const tName = t.table_name || t;
                            const isCurrent = tName === selectedTable;
                            return (
                              <option key={tName} value={tName}>
                                {tName} {isCurrent ? '(Self)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {j.type !== 'CROSS JOIN' && (
                          <>
                            <span className="text-slate-400 font-semibold">ON</span>
                            <input
                              type="text"
                              placeholder="Left column"
                              value={j.left_on || ''}
                              onChange={(e) => updateJoin(idx, 'left_on', e.target.value)}
                              className="w-36 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono"
                            />
                            <span className="text-slate-400">=</span>
                            <input
                              type="text"
                              placeholder="Right column"
                              value={j.right_on || ''}
                              onChange={(e) => updateJoin(idx, 'right_on', e.target.value)}
                              className="w-36 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono"
                            />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeJoin(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WHERE Conditions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  WHERE Conditions
                </span>
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No conditions added. Query returns all matching rows.</p>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {idx > 0 && (
                      <select
                        value={cond.conjunction || 'AND'}
                        onChange={(e) => updateCondition(idx, 'conjunction', e.target.value)}
                        className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    {/* NOT toggle */}
                    <button
                      type="button"
                      onClick={() => updateCondition(idx, 'not', !cond.not)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        cond.not
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      NOT
                    </button>

                    {/* Column */}
                    {cond.operator !== 'EXISTS' && cond.operator !== 'NOT EXISTS' && (
                      <select
                        value={cond.column || ''}
                        onChange={(e) => updateCondition(idx, 'column', e.target.value)}
                        className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                      >
                        {columns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}

                    {/* Operator */}
                    <select
                      value={cond.operator || '='}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="w-32 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>

                    {/* Value Inputs */}
                    {['BETWEEN', 'NOT BETWEEN'].includes(cond.operator) ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Min (e.g. 10)"
                          value={Array.isArray(cond.value) ? cond.value[0] : (cond.value || '').split(',')[0] || ''}
                          onChange={(e) => {
                            const current = Array.isArray(cond.value) ? [...cond.value] : (cond.value || '').split(',');
                            const v2 = current[1] || '';
                            updateCondition(idx, 'value', [e.target.value, v2]);
                          }}
                          className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
                        />
                        <span className="text-xs text-slate-400 font-semibold">AND</span>
                        <input
                          type="text"
                          placeholder="Max (e.g. 50)"
                          value={Array.isArray(cond.value) ? cond.value[1] : (cond.value || '').split(',')[1] || ''}
                          onChange={(e) => {
                            const current = Array.isArray(cond.value) ? [...cond.value] : (cond.value || '').split(',');
                            const v1 = current[0] || '';
                            updateCondition(idx, 'value', [v1, e.target.value]);
                          }}
                          className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
                        />
                      </div>
                    ) : ['EXISTS', 'NOT EXISTS'].includes(cond.operator) ? (
                      <input
                        type="text"
                        placeholder="SELECT 1 FROM other_table WHERE ..."
                        value={cond.value || ''}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        className="flex-1 min-w-[220px] px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono"
                      />
                    ) : !['IS NULL', 'IS NOT NULL'].includes(cond.operator) ? (
                      <input
                        type="text"
                        placeholder={['IN', 'NOT IN'].includes(cond.operator) ? 'Val1, Val2, Val3' : 'Value (e.g. 80, Pune)'}
                        value={cond.value !== undefined ? cond.value : ''}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        className="flex-1 min-w-[140px] px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GROUP BY & HAVING Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGroupBy(!showGroupBy)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  GROUP BY & HAVING
                </span>
                {(groupBy.length > 0 || having.length > 0) && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-full font-mono">
                    {groupBy.length} grouped • {having.length} having
                  </span>
                )}
              </div>
              {showGroupBy ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showGroupBy && (
              <div className="p-4 space-y-4 bg-white dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800">
                {/* GROUP BY columns */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Group By Columns:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((c) => {
                      const isGrouped = groupBy.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleGroupByCol(c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                            isGrouped
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HAVING */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      HAVING Conditions (Filtered on Aggregates)
                    </span>
                    <button
                      type="button"
                      onClick={addHavingCondition}
                      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add HAVING</span>
                    </button>
                  </div>
                  {having.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No HAVING filters applied.</p>
                  ) : (
                    <div className="space-y-2">
                      {having.map((h, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                          <input
                            type="text"
                            placeholder="Aggregate (e.g. COUNT(*), AVG(marks))"
                            value={h.column || ''}
                            onChange={(e) => updateHavingCondition(idx, 'column', e.target.value)}
                            className="flex-1 min-w-[150px] px-2.5 py-1 bg-white dark:bg-slate-900 border rounded font-mono"
                          />
                          <select
                            value={h.operator || '>'}
                            onChange={(e) => updateHavingCondition(idx, 'operator', e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border rounded font-semibold"
                          >
                            {['>', '<', '>=', '<=', '=', '!='].map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Threshold value"
                            value={h.value !== undefined ? h.value : ''}
                            onChange={(e) => updateHavingCondition(idx, 'value', e.target.value)}
                            className="w-24 px-2.5 py-1 bg-white dark:bg-slate-900 border rounded font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => removeHavingCondition(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ORDER BY, LIMIT, OFFSET */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* ORDER BY */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-indigo-500" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ORDER BY
                </label>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={orderByCol}
                  onChange={(e) => {
                    setOrderByCol(e.target.value);
                    emitChange({ orderByCol: e.target.value });
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                >
                  <option value="">(None)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={orderByDir}
                  onChange={(e) => {
                    setOrderByDir(e.target.value);
                    emitChange({ orderByDir: e.target.value });
                  }}
                  disabled={!orderByCol}
                  className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-50"
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
              </div>
            </div>

            {/* LIMIT */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  LIMIT
                </label>
              </div>
              <input
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 100;
                  setLimit(val);
                  emitChange({ limit: val });
                }}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* OFFSET */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  OFFSET
                </label>
              </div>
              <input
                type="number"
                min="0"
                max="10000"
                value={offset}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setOffset(val);
                  emitChange({ offset: val });
                }}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INSERT FLOW */}
      {/* ========================================================================= */}
      {operation === 'INSERT' && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs">
            Enter values for the new record. Blank fields will be omitted or set to DEFAULT/NULL.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {columns.map((col) => (
              <div key={col} className="space-y-1">
                <label className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {col}
                </label>
                <input
                  type="text"
                  placeholder={`Value for ${col}`}
                  value={insertFields[col] || ''}
                  onChange={(e) => {
                    const next = { ...insertFields, [col]: e.target.value };
                    setInsertFields(next);
                    emitChange({ insertFields: next });
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. UPDATE FLOW */}
      {/* ========================================================================= */}
      {operation === 'UPDATE' && (
        <div className="space-y-5">
          {/* Assignments */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SET Column Values
              </span>
              <button
                type="button"
                onClick={() => addUpdateAssignment()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-sm w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column Assignment</span>
              </button>
            </div>

            {/* Quick column buttons */}
            {columns.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400 font-medium">Quick add:</span>
                {columns.map((c) => {
                  const isAssigned = updateAssignments.some((a) => a.column === c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => addUpdateAssignment(c)}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono transition flex items-center gap-1 ${
                        isAssigned
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {updateAssignments.length === 0 ? (
              <div className="p-4 border border-dashed border-amber-200 dark:border-amber-800/60 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 text-center">
                <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                  No columns currently set for update.
                </p>
                <button
                  type="button"
                  onClick={() => addUpdateAssignment()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Column</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {updateAssignments.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <select
                      value={a.column || ''}
                      onChange={(e) => updateAssignmentField(idx, 'column', e.target.value)}
                      className="w-48 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className="text-xs font-semibold text-slate-400">=</span>
                    <input
                      type="text"
                      placeholder="New Value (e.g. 95, 'Mumbai')"
                      value={a.value !== undefined ? a.value : ''}
                      onChange={(e) => updateAssignmentField(idx, 'value', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeUpdateAssignment(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                      title="Remove column"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Targeted WHERE conditions */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  WHERE Conditions (Safety Filter)
                </span>
              </div>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Caution: Running UPDATE without a WHERE condition will update ALL rows in the table!</span>
              </div>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <select
                      value={cond.column || ''}
                      onChange={(e) => updateCondition(idx, 'column', e.target.value)}
                      className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator || '='}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="w-28 px-2 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-semibold"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={cond.value || ''}
                      onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                      className="flex-1 min-w-[120px] px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DELETE FLOW */}
      {/* ========================================================================= */}
      {operation === 'DELETE' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {conditions.length === 0
                ? 'WARNING: You have no WHERE conditions! Running DELETE will remove ALL rows from this table!'
                : 'Only rows matching the WHERE conditions below will be deleted.'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                WHERE Conditions
              </span>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No WHERE conditions specified.</p>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <select
                      value={cond.column || ''}
                      onChange={(e) => updateCondition(idx, 'column', e.target.value)}
                      className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={cond.operator || '='}
                      onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                      className="w-28 px-2 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-semibold"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={cond.value || ''}
                      onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                      className="flex-1 min-w-[120px] px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
