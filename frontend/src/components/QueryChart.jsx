import React, { useState, useMemo } from 'react';
import { BarChart3, LineChart as LineChartIcon, PieChart, Layers, Info } from 'lucide-react';

export const QueryChart = ({ columns = [], rows = [] }) => {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No data available to plot a chart. Run a query that returns rows.
      </div>
    );
  }

  // 1. Detect candidate columns
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      // Check if at least one non-null value in the rows is a number
      const sample = rows.find((r) => r[col] !== null && r[col] !== undefined);
      if (!sample) return false;
      return typeof sample[col] === 'number' || (!isNaN(Number(sample[col])) && sample[col] !== '');
    });
  }, [columns, rows]);

  const categoricalColumns = useMemo(() => {
    return columns.filter((col) => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  // Default axes
  const [xAxis, setXAxis] = useState(() => {
    if (categoricalColumns.length > 0) return categoricalColumns[0];
    return columns[0] || '';
  });

  const [yAxis, setYAxis] = useState(() => {
    if (numericColumns.length > 0) return numericColumns[0];
    return columns[1] || columns[0] || '';
  });

  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line' | 'donut'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Prepare chart data (limit to first 30 rows for chart clarity)
  const chartData = useMemo(() => {
    const slice = rows.slice(0, 30);
    return slice.map((r, idx) => {
      const label = r[xAxis] !== null && r[xAxis] !== undefined ? String(r[xAxis]) : `Row ${idx + 1}`;
      const rawVal = r[yAxis];
      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
      return { label, value: val };
    });
  }, [rows, xAxis, yAxis]);

  // Aggregate stats
  const stats = useMemo(() => {
    const values = chartData.map((d) => d.value);
    if (!values.length) return { min: 0, max: 0, avg: 0, sum: 0 };
    const sum = values.reduce((acc, v) => acc + v, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / values.length;
    return {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      sum: Math.round(sum * 100) / 100,
    };
  }, [chartData]);

  // Chart dimensions
  const svgWidth = 700;
  const svgHeight = 280;
  const padding = { top: 25, right: 30, bottom: 45, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const maxValue = stats.max > 0 ? stats.max : 1;
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#14b8a6'
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-900 rounded-xl">
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                chartType === 'bar'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                chartType === 'line'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                chartType === 'donut'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Donut</span>
            </button>
          </div>

          {/* X Axis selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-400">Category (X):</span>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Y Axis selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-400">Metric (Y):</span>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rows hint */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Showing top {chartData.length} records</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="w-full overflow-x-auto">
        {chartType === 'donut' ? (
          // Donut / Pie View
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            <svg width="220" height="220" viewBox="-110 -110 220 220" className="overflow-visible">
              {(() => {
                let cumulativeAngle = 0;
                const total = stats.sum > 0 ? stats.sum : 1;
                return chartData.map((d, idx) => {
                  const sliceAngle = (d.value / total) * 360;
                  if (sliceAngle <= 0) return null;
                  const startAngle = cumulativeAngle;
                  const endAngle = cumulativeAngle + sliceAngle;
                  cumulativeAngle += sliceAngle;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const outerR = 90;
                  const innerR = 50;

                  const x1 = Math.cos(startRad) * outerR;
                  const y1 = Math.sin(startRad) * outerR;
                  const x2 = Math.cos(endRad) * outerR;
                  const y2 = Math.sin(endRad) * outerR;

                  const x3 = Math.cos(endRad) * innerR;
                  const y3 = Math.sin(endRad) * innerR;
                  const x4 = Math.cos(startRad) * innerR;
                  const y4 = Math.sin(startRad) * innerR;

                  const largeArc = sliceAngle > 180 ? 1 : 0;
                  const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

                  const color = colors[idx % colors.length];
                  const isHovered = hoveredPoint?.index === idx;

                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill={color}
                      className="cursor-pointer transition-all duration-200"
                      opacity={isHovered ? 1 : 0.85}
                      transform={isHovered ? 'scale(1.05)' : 'scale(1)'}
                      onMouseEnter={() => setHoveredPoint({ ...d, index: idx, pct: Math.round((d.value / total) * 100) })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                });
              })()}
              <text textAnchor="middle" dy="-5" className="fill-slate-900 dark:fill-white font-bold text-sm">
                Total
              </text>
              <text textAnchor="middle" dy="16" className="fill-slate-500 font-mono text-xs">
                {stats.sum}
              </text>
            </svg>

            {/* Donut Legend */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 text-xs w-full sm:w-64 pr-2">
              {chartData.map((d, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPoint({ ...d, index: idx })}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{d.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Bar or Line SVG Graph
          <div className="relative min-w-[500px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + graphHeight * (1 - ratio);
                const val = Math.round(maxValue * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800 stroke-[1]"
                      strokeDasharray={ratio > 0 ? '4 4' : 'none'}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] font-mono fill-slate-400"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Bar Elements */}
              {chartType === 'bar' &&
                chartData.map((d, idx) => {
                  const barWidth = Math.max(8, Math.min(36, (graphWidth / chartData.length) * 0.7));
                  const slotWidth = graphWidth / chartData.length;
                  const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
                  const barHeight = Math.max(2, (d.value / maxValue) * graphHeight);
                  const y = padding.top + graphHeight - barHeight;
                  const isHovered = hoveredPoint?.index === idx;

                  return (
                    <g key={idx} className="cursor-pointer">
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        fill={isHovered ? '#4f46e5' : '#6366f1'}
                        className="transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint({ ...d, index: idx })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* X Label */}
                      <text
                        x={x + barWidth / 2}
                        y={svgHeight - padding.bottom + 16}
                        textAnchor="middle"
                        className="text-[9px] fill-slate-400 font-sans"
                        transform={`rotate(-25, ${x + barWidth / 2}, ${svgHeight - padding.bottom + 16})`}
                      >
                        {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
                      </text>
                    </g>
                  );
                })}

              {/* Line Graph Elements */}
              {chartType === 'line' && (
                <>
                  {/* Line path */}
                  <path
                    d={(() => {
                      const slotWidth = graphWidth / (chartData.length > 1 ? chartData.length - 1 : 1);
                      return chartData
                        .map((d, idx) => {
                          const x = padding.left + idx * slotWidth;
                          const y = padding.top + graphHeight - (d.value / maxValue) * graphHeight;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ');
                    })()}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Points */}
                  {chartData.map((d, idx) => {
                    const slotWidth = graphWidth / (chartData.length > 1 ? chartData.length - 1 : 1);
                    const x = padding.left + idx * slotWidth;
                    const y = padding.top + graphHeight - (d.value / maxValue) * graphHeight;
                    const isHovered = hoveredPoint?.index === idx;

                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 3.5}
                        fill={isHovered ? '#4f46e5' : '#ffffff'}
                        stroke="#6366f1"
                        strokeWidth="2"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ ...d, index: idx })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 p-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs space-y-0.5 pointer-events-none">
                <span className="font-semibold text-slate-300 block">{hoveredPoint.label}</span>
                <span className="text-sm font-bold font-mono text-indigo-400">
                  {yAxis}: {hoveredPoint.value}
                </span>
                {hoveredPoint.pct !== undefined && (
                  <span className="text-[10px] text-slate-400 block">{hoveredPoint.pct}% of total</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Sum</span>
          <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">{stats.sum}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Average</span>
          <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">{stats.avg}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Highest</span>
          <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.max}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Lowest</span>
          <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">{stats.min}</span>
        </div>
      </div>
    </div>
  );
};
