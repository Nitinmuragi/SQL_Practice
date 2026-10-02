import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Database,
  Key,
  Link2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  Layers,
  ArrowLeft,
  Sparkles,
  Info,
  Check,
  Copy,
  Table
} from 'lucide-react';

export const EerDiagramViewer = ({
  eerData,
  loading = false,
  error = null,
  height = 'h-[500px]',
  targetTable = null,
  onBack = null,
  backLabel = 'Back',
  isFullPage = false
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tablePositions, setTablePositions] = useState({});
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredRel, setHoveredRel] = useState(null);
  const [selectedRel, setSelectedRel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(isFullPage);
  const [copiedJoin, setCopiedJoin] = useState(false);

  const tables = useMemo(() => eerData?.tables || [], [eerData]);
  const relationships = useMemo(() => eerData?.relationships || [], [eerData]);

  // Topological / Smart Initial Placement: Parent tables on left, child tables on right
  const autoLayoutTables = () => {
    if (!tables || tables.length === 0) return;

    // Identify which tables are parents (referenced by others) vs children (have foreign keys)
    const referencedTables = new Set(relationships.map((r) => r.to_table));
    const childTables = new Set(relationships.map((r) => r.from_table));

    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 380;
    const GAP_X = 180;
    const GAP_Y = 60;

    const positions = {};
    const parents = tables.filter((t) => referencedTables.has(t.table_name) && !childTables.has(t.table_name));
    const linkedChildren = tables.filter((t) => childTables.has(t.table_name));
    const independent = tables.filter((t) => !referencedTables.has(t.table_name) && !childTables.has(t.table_name));

    let col0Y = 60;
    let col1Y = 60;
    let col2Y = 60;

    // Col 0: Parent / Master tables
    parents.forEach((t) => {
      positions[t.table_name] = { x: 60, y: col0Y };
      col0Y += CARD_HEIGHT;
    });

    // Col 1: Child / Transaction tables
    linkedChildren.forEach((t) => {
      const xPos = parents.length > 0 ? 60 + CARD_WIDTH + GAP_X : 60;
      positions[t.table_name] = { x: xPos, y: col1Y };
      col1Y += CARD_HEIGHT;
    });

    // Col 2: Other tables
    independent.forEach((t) => {
      const xPos = 60 + (CARD_WIDTH + GAP_X) * 2;
      positions[t.table_name] = { x: xPos, y: col2Y };
      col2Y += CARD_HEIGHT;
    });

    // Fallback if no specific categorization
    if (Object.keys(positions).length < tables.length) {
      const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(tables.length))));
      tables.forEach((t, idx) => {
        if (!positions[t.table_name]) {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          positions[t.table_name] = {
            x: 60 + c * (CARD_WIDTH + GAP_X),
            y: 60 + r * (CARD_HEIGHT - 60)
          };
        }
      });
    }

    setTablePositions(positions);
    setPan({ x: 40, y: 40 });
    setZoom(1);
  };

  useEffect(() => {
    autoLayoutTables();
  }, [tables, relationships]);

  // Handle Dragging Table Nodes
  const handleTableMouseDown = (tableName, e) => {
    e.stopPropagation();
    const pos = tablePositions[tableName] || { x: 0, y: 0 };
    setDraggingTable(tableName);
    setDragOffset({
      x: e.clientX / zoom - pos.x,
      y: e.clientY / zoom - pos.y
    });
  };

  // Handle Canvas Panning
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.eer-table-node') || e.target.closest('.eer-control-btn') || e.target.closest('.eer-header-btn')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (draggingTable) {
      const newX = e.clientX / zoom - dragOffset.x;
      const newY = e.clientY / zoom - dragOffset.y;
      setTablePositions((prev) => ({
        ...prev,
        [draggingTable]: {
          ...prev[draggingTable],
          x: Math.max(10, newX),
          y: Math.max(10, newY)
        }
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(1.8, Math.max(0.4, prev * zoomFactor)));
  };

  const resetView = () => {
    autoLayoutTables();
  };

  // Calculate Exact Dot-to-Dot Coordinates for Bézier Curves
  const computedEdges = useMemo(() => {
    if (!relationships.length || Object.keys(tablePositions).length === 0) return [];

    const CARD_WIDTH = 320;
    const HEADER_HEIGHT = 46;
    const ROW_HEIGHT = 34;

    return relationships.map((rel) => {
      const fromPos = tablePositions[rel.from_table];
      const toPos = tablePositions[rel.to_table];

      if (!fromPos || !toPos) return null;

      const fromTableData = tables.find((t) => t.table_name === rel.from_table);
      const toTableData = tables.find((t) => t.table_name === rel.to_table);

      const fromColIdx = fromTableData?.columns?.findIndex((c) => c.name === rel.from_column) ?? 0;
      const toColIdx = toTableData?.columns?.findIndex((c) => c.name === rel.to_column) ?? 0;

      // Exact vertical center of socket dots
      const fromY = fromPos.y + HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toY = toPos.y + HEADER_HEIGHT + toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

      // Determine left-to-right vs right-to-left orientation
      let startX, endX, startControlX, endControlX;
      if (fromPos.x < toPos.x) {
        // Table A is left of Table B: Connect from Table A's right socket to Table B's left socket
        startX = fromPos.x + CARD_WIDTH;
        endX = toPos.x;
        const delta = Math.abs(endX - startX) * 0.5;
        startControlX = startX + Math.max(60, delta);
        endControlX = endX - Math.max(60, delta);
      } else {
        // Table A is right of Table B: Connect from Table A's left socket to Table B's right socket
        startX = fromPos.x;
        endX = toPos.x + CARD_WIDTH;
        const delta = Math.abs(endX - startX) * 0.5;
        startControlX = startX - Math.max(60, delta);
        endControlX = endX + Math.max(60, delta);
      }

      const pathData = `M ${startX} ${fromY} C ${startControlX} ${fromY}, ${endControlX} ${toY}, ${endX} ${toY}`;
      const midX = (startX + endX) / 2;
      const midY = (fromY + toY) / 2;

      const joinSql = `SELECT *\nFROM ${rel.to_table}\nJOIN ${rel.from_table} ON ${rel.to_table}.${rel.to_column} = ${rel.from_table}.${rel.from_column};`;

      return {
        ...rel,
        pathData,
        midX,
        midY,
        startX,
        fromY,
        endX,
        toY,
        joinSql
      };
    }).filter(Boolean);
  }, [relationships, tablePositions, tables]);

  const copyJoinSql = (sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedJoin(true);
    setTimeout(() => setCopiedJoin(false), 2000);
  };

  const isViewFull = isFullscreen || isFullPage;

  if (loading) {
    return (
      <div className={`w-full ${height} rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-8 text-center`}>
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-bold text-white font-mono">Generating Relational EER Schema...</span>
        <span className="text-xs text-slate-400 mt-1">Introspecting primary keys, foreign keys & relational links</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full ${height} rounded-2xl bg-slate-950 border border-rose-900/40 p-6 flex flex-col items-center justify-center text-center space-y-2`}>
        <span className="text-sm font-bold text-rose-400">Failed to load EER diagram</span>
        <span className="text-xs text-slate-400 font-mono">{error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full ${isViewFull ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : `${height} rounded-2xl`} bg-slate-950 border border-slate-800 overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans shadow-2xl flex flex-col`}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.12) 1.2px, transparent 1.2px)`,
        backgroundSize: '28px 28px'
      }}
    >
      {/* Top Professional Studio Header */}
      <div className="z-30 shrink-0 bg-slate-900/95 border-b border-slate-800/90 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-md">
        {/* Left: Back Button & Database Title */}
        <div className="flex items-center gap-3">
          {(onBack || isViewFull) && (
            <button
              type="button"
              onClick={onBack ? onBack : () => setIsFullscreen(false)}
              className="eer-header-btn flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition shadow active:scale-95 cursor-pointer shrink-0"
              title="Return to previous view"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>{backLabel}</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {eerData?.dataset_name || 'Database Schema'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {tables.length} {tables.length === 1 ? 'Table' : 'Tables'}
                </span>
                {relationships.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-emerald-400" />
                    {relationships.length} {relationships.length === 1 ? 'Link' : 'Links'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    Single / Unlinked Tables
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Interactive Entity-Relationship visualizer • Drag tables to arrange • Trace primary & foreign keys
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Search & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Search Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter table or column..."
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-28 sm:w-44 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-500 hover:text-white text-xs px-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1 shadow">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="eer-control-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1.5 font-bold min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="eer-control-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="eer-control-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reset Layout & Position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {!isFullPage && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="eer-control-btn p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Open Fullscreen Studio'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Relationship Banner (JOIN Helper) */}
      {selectedRel && (
        <div className="z-30 bg-slate-900 border-b border-indigo-500/40 px-4 sm:px-6 py-2 flex items-center justify-between animate-in slide-in-from-top-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
              JOIN Relationship
            </span>
            <span className="font-mono text-white">
              <strong className="text-emerald-400">{selectedRel.to_table}.{selectedRel.to_column}</strong>
              <span className="text-slate-500 mx-1.5">{'<───>'}</span>
              <strong className="text-indigo-400">{selectedRel.from_table}.{selectedRel.from_column}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyJoinSql(selectedRel.joinSql)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition font-mono"
            >
              {copiedJoin ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy SQL JOIN</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedRel(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Pan/Zoom Scalable World */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning || draggingTable ? 'none' : 'transform 0.1s ease-out',
            width: '4500px',
            height: '4500px',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          {/* SVG Relationship Connectors Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="relGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              {/* Arrow pointing at Primary Key (Child -> Parent) */}
              <marker
                id="eerArrow"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 11 6 L 0 11 z" fill="#10b981" />
              </marker>

              {/* Hover Arrow */}
              <marker
                id="eerArrowHover"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="9"
                markerHeight="9"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 12 6 L 0 12 z" fill="#38bdf8" />
              </marker>
            </defs>

            {computedEdges.map((edge) => {
              const isHovered = hoveredRel === edge.id;
              const isSelected = selectedRel?.id === edge.id;
              const active = isHovered || isSelected;

              return (
                <g key={edge.id} className="pointer-events-auto cursor-pointer">
                  {/* Invisible wide path for easy click & hover */}
                  <path
                    d={edge.pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    onMouseEnter={() => setHoveredRel(edge.id)}
                    onMouseLeave={() => setHoveredRel(null)}
                    onClick={() => setSelectedRel(edge)}
                  />

                  {/* Outer Glow on Hover */}
                  {active && (
                    <path
                      d={edge.pathData}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                    />
                  )}

                  {/* Visible Bézier Curve */}
                  <path
                    d={edge.pathData}
                    fill="none"
                    stroke={active ? '#38bdf8' : 'url(#relGrad)'}
                    strokeWidth={active ? '3' : '2'}
                    markerEnd={active ? 'url(#eerArrowHover)' : 'url(#eerArrow)'}
                    className="transition-all duration-150"
                    onMouseEnter={() => setHoveredRel(edge.id)}
                    onMouseLeave={() => setHoveredRel(null)}
                    onClick={() => setSelectedRel(edge)}
                  />

                  {/* Midpoint Pill Badge */}
                  <foreignObject
                    x={edge.midX - 85}
                    y={edge.midY - 14}
                    width="170"
                    height="28"
                    className="overflow-visible"
                  >
                    <div
                      onMouseEnter={() => setHoveredRel(edge.id)}
                      onMouseLeave={() => setHoveredRel(null)}
                      onClick={() => setSelectedRel(edge)}
                      className={`px-2.5 py-0.5 text-center text-[10px] font-mono rounded-full border transition truncate shadow-lg cursor-pointer ${
                        active
                          ? 'bg-sky-950 text-sky-200 border-sky-400 font-bold scale-105 ring-2 ring-sky-500/40'
                          : 'bg-slate-900/95 text-slate-300 border-slate-700/80 hover:border-slate-600'
                      }`}
                      title={`Click to view JOIN syntax: ${edge.from_table}.${edge.from_column} → ${edge.to_table}.${edge.to_column}`}
                    >
                      {edge.from_column} → {edge.to_column}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Table Cards Node Layer */}
          {tables.map((table) => {
            const pos = tablePositions[table.table_name] || { x: 60, y: 60 };
            const isTarget = targetTable && (table.table_name === targetTable || table.physical_table_name === targetTable);
            const isMatchedBySearch = searchQuery && (
              table.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              table.columns?.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            const isDimmed = searchQuery && !isMatchedBySearch;

            return (
              <div
                key={table.table_name}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  width: '320px'
                }}
                className={`eer-table-node absolute rounded-2xl border transition-shadow duration-150 bg-slate-900/95 shadow-2xl backdrop-blur-md overflow-hidden ${
                  isTarget
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-500/10'
                    : isMatchedBySearch
                    ? 'border-amber-400 ring-2 ring-amber-400/40'
                    : 'border-slate-800 hover:border-slate-700'
                } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
              >
                {/* Table Header (Draggable Handle) */}
                <div
                  onMouseDown={(e) => handleTableMouseDown(table.table_name, e)}
                  className={`p-3.5 border-b flex items-center justify-between cursor-move select-none ${
                    isTarget
                      ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-indigo-500/60'
                      : 'bg-slate-950 border-slate-800/90 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Database className={`w-4 h-4 shrink-0 ${isTarget ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-white font-mono truncate" title={table.table_name}>
                      {table.table_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isTarget && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                        Active Target
                      </span>
                    )}
                    {table.row_count !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                        {table.row_count} rows
                      </span>
                    )}
                  </div>
                </div>

                {/* Columns List with Left/Right Socket Dots */}
                <div className="divide-y divide-slate-800/60 font-mono text-xs">
                  {table.columns?.map((col) => {
                    const isColMatched = searchQuery && col.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const isFkLinked = relationships.some(
                      (r) => (r.from_table === table.table_name && r.from_column === col.name)
                    );
                    const isPkLinked = relationships.some(
                      (r) => (r.to_table === table.table_name && r.to_column === col.name)
                    );

                    return (
                      <div
                        key={col.name}
                        className={`relative px-4 py-2 flex items-center justify-between hover:bg-slate-800/60 transition ${
                          isColMatched ? 'bg-amber-500/10 text-amber-200' : 'text-slate-300'
                        }`}
                      >
                        {/* LEFT SOCKET DOT */}
                        <div
                          className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-slate-900 transition ${
                            col.is_pk || isPkLinked
                              ? 'bg-emerald-400 ring-2 ring-emerald-500/50 shadow-sm shadow-emerald-400/50'
                              : col.is_fk || isFkLinked
                              ? 'bg-sky-400 ring-2 ring-sky-500/50 shadow-sm shadow-sky-400/50'
                              : 'bg-slate-700'
                          }`}
                          title={col.is_pk ? 'Primary Key Socket' : col.is_fk ? 'Foreign Key Socket' : 'Column Port'}
                        />

                        {/* Column Name & Badge */}
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {col.is_pk ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5 shrink-0 shadow-sm"
                              title="Primary Key (Unique Identifier)"
                            >
                              <Key className="w-2.5 h-2.5 text-emerald-400" /> PK
                            </span>
                          ) : col.is_fk || isFkLinked ? (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-0.5 shrink-0 shadow-sm"
                              title={`Foreign Key -> ${col.ref_table || 'Related Table'}`}
                            >
                              <Link2 className="w-2.5 h-2.5 text-sky-400" /> FK
                            </span>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-700/60 shrink-0 ml-1" />
                          )}

                          <span className={`font-semibold truncate ${col.is_pk ? 'text-emerald-300 font-bold' : ''}`}>
                            {col.name}
                          </span>
                        </div>

                        {/* Data Type */}
                        <span className="text-[10px] text-slate-500 uppercase tracking-tight shrink-0 font-medium">
                          {col.type?.split('(')[0] || 'TEXT'}
                        </span>

                        {/* RIGHT SOCKET DOT */}
                        <div
                          className={`absolute -right-1.5 w-3 h-3 rounded-full border-2 border-slate-900 transition ${
                            col.is_pk || isPkLinked
                              ? 'bg-emerald-400 ring-2 ring-emerald-500/50 shadow-sm shadow-emerald-400/50'
                              : col.is_fk || isFkLinked
                              ? 'bg-sky-400 ring-2 ring-sky-500/50 shadow-sm shadow-sky-400/50'
                              : 'bg-slate-700'
                          }`}
                          title={col.is_pk ? 'Primary Key Socket' : col.is_fk ? 'Foreign Key Socket' : 'Column Port'}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Status & Key Legend Bar */}
      <div className="shrink-0 z-30 bg-slate-900/90 border-t border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-300 shadow-sm" />
            <span className="text-slate-300 font-semibold text-[11px]">Primary Key (PK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sky-400 border border-sky-300 shadow-sm" />
            <span className="text-slate-300 font-semibold text-[11px]">Foreign Key (FK)</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 rounded" />
            <span className="text-slate-400 text-[11px]">Relational Link</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Click any connector line to trace join and copy SQL syntax</span>
        </div>
      </div>
    </div>
  );
};
