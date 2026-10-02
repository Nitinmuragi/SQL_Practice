import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Copy,
  Check,
  Play,
  Layers,
  Sparkles,
  Database,
  ArrowRight,
  Code2,
  Table as TableIcon,
} from 'lucide-react';

export const CheatSheetPage = () => {
  const navigate = useNavigate();
  const [selectedJoin, setSelectedJoin] = useState('INNER');
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTryInWorkspace = (sql) => {
    navigate('/sql-practice');
  };

  // Sample data for Visual Venn Diagram
  const joinScenarios = {
    INNER: {
      title: 'INNER JOIN',
      subtitle: 'Returns records that have matching values in both tables.',
      sql: `SELECT c.id, c.name, o.order_id, o.amount\nFROM customers c\nINNER JOIN orders o ON c.id = o.customer_id;`,
      leftCircleHighlight: false,
      rightCircleHighlight: false,
      intersectionHighlight: true,
      explanation: 'Only customers who actually placed an order appear. Customers without orders and orders without matching customers are excluded.',
      sampleRows: [
        { c_id: 1, c_name: 'Alice', o_id: 101, o_amount: '$250.00' },
        { c_id: 2, c_name: 'Bob', o_id: 102, o_amount: '$180.00' },
      ],
    },
    LEFT: {
      title: 'LEFT JOIN (LEFT OUTER JOIN)',
      subtitle: 'Returns ALL records from the left table, and matching records from the right table.',
      sql: `SELECT c.id, c.name, o.order_id, o.amount\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id;`,
      leftCircleHighlight: true,
      rightCircleHighlight: false,
      intersectionHighlight: true,
      explanation: 'Every customer is returned. If a customer has no orders, the order columns are populated with NULL values.',
      sampleRows: [
        { c_id: 1, c_name: 'Alice', o_id: 101, o_amount: '$250.00' },
        { c_id: 2, c_name: 'Bob', o_id: 102, o_amount: '$180.00' },
        { c_id: 3, c_name: 'Charlie', o_id: 'NULL', o_amount: 'NULL' },
      ],
    },
    RIGHT: {
      title: 'RIGHT JOIN (RIGHT OUTER JOIN)',
      subtitle: 'Returns ALL records from the right table, and matching records from the left table.',
      sql: `SELECT c.id, c.name, o.order_id, o.amount\nFROM customers c\nRIGHT JOIN orders o ON c.id = o.customer_id;`,
      leftCircleHighlight: false,
      rightCircleHighlight: true,
      intersectionHighlight: true,
      explanation: 'Every order is returned, even guest checkouts where no customer profile exists.',
      sampleRows: [
        { c_id: 1, c_name: 'Alice', o_id: 101, o_amount: '$250.00' },
        { c_id: 2, c_name: 'Bob', o_id: 102, o_amount: '$180.00' },
        { c_id: 'NULL', c_name: 'NULL', o_id: 103, o_amount: '$95.00' },
      ],
    },
    CROSS: {
      title: 'CROSS JOIN (Cartesian Product)',
      subtitle: 'Returns every row from Table A paired with every row from Table B (A × B).',
      sql: `SELECT c.name, p.product_name\nFROM customers c\nCROSS JOIN products p;`,
      leftCircleHighlight: true,
      rightCircleHighlight: true,
      intersectionHighlight: true,
      explanation: 'Generates all possible combinations without any ON condition. If Table A has 3 rows and Table B has 4 rows, output has 12 rows.',
      sampleRows: [
        { c_id: 1, c_name: 'Alice', o_id: 1, o_amount: 'Laptop' },
        { c_id: 1, c_name: 'Alice', o_id: 2, o_amount: 'Keyboard' },
        { c_id: 2, c_name: 'Bob', o_id: 1, o_amount: 'Laptop' },
      ],
    },
    SELF: {
      title: 'SELF JOIN',
      subtitle: 'Joins a table to itself using aliases to compare rows within the same table.',
      sql: `SELECT e.emp_name AS employee, m.emp_name AS manager\nFROM employees e\nINNER JOIN employees m ON e.manager_id = m.emp_id;`,
      leftCircleHighlight: false,
      rightCircleHighlight: false,
      intersectionHighlight: true,
      explanation: 'Essential for hierarchical data (e.g. employee-manager structures, category trees, or consecutive day tracking).',
      sampleRows: [
        { c_id: 102, c_name: 'Marcus Miller (Dev)', o_id: 101, o_amount: 'Sophia Chen (VP)' },
        { c_id: 103, c_name: 'Aisha Khan (Dev)', o_id: 102, o_amount: 'Marcus Miller (Lead)' },
      ],
    },
  };

  const currentJoin = joinScenarios[selectedJoin];

  const cheatSheetSections = [
    {
      category: 'Window Functions (Modern Analytical SQL)',
      icon: Sparkles,
      items: [
        {
          id: 'dense_rank',
          title: 'DENSE_RANK() - Top Earners Without Gaps',
          desc: 'Ranks rows within partitions. Ties receive the same rank, and no ranks are skipped.',
          sql: `SELECT emp_name, dept_id, salary,\n       DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as salary_rank\nFROM employees;`,
        },
        {
          id: 'running_total',
          title: 'Cumulative Running Total (SUM OVER)',
          desc: 'Calculates rolling cumulative totals across sorted records.',
          sql: `SELECT order_date, total_amount,\n       SUM(total_amount) OVER (ORDER BY order_date) as cumulative_revenue\nFROM orders;`,
        },
        {
          id: 'lead_lag',
          title: 'LEAD() & LAG() - Comparing Consecutive Rows',
          desc: 'Accesses previous or following row values without self-joins.',
          sql: `SELECT order_id, order_date, total_amount,\n       LAG(total_amount, 1) OVER (ORDER BY order_date) as prev_order_amount\nFROM orders;`,
        },
      ],
    },
    {
      category: 'Common Table Expressions (CTEs & WITH)',
      icon: Layers,
      items: [
        {
          id: 'basic_cte',
          title: 'Clean Modular Queries with WITH CTE',
          desc: 'Splits complex multi-step queries into readable named result sets.',
          sql: `WITH HighValueCustomers AS (\n    SELECT customer_id, SUM(total_amount) as total_spend\n    FROM orders\n    GROUP BY customer_id\n    HAVING SUM(total_amount) > 1000\n)\nSELECT c.full_name, h.total_spend\nFROM customers c\nINNER JOIN HighValueCustomers h ON c.customer_id = h.customer_id;`,
        },
      ],
    },
    {
      category: 'Conditional Logic & Null Safety',
      icon: Code2,
      items: [
        {
          id: 'case_when',
          title: 'CASE WHEN - Conditional Buckets & Pivots',
          desc: 'Categorizes data on the fly into business tiers.',
          sql: `SELECT product_name, price,\n       CASE\n           WHEN price >= 1000 THEN 'Premium Flagship'\n           WHEN price >= 200 THEN 'Mid-Tier'\n           ELSE 'Budget Friendly'\n       END AS price_category\nFROM products;`,
        },
        {
          id: 'coalesce_ifnull',
          title: 'COALESCE() & IFNULL() - Default Fallbacks',
          desc: 'Replaces NULL values with clean fallback text or numbers.',
          sql: `SELECT full_name,\n       COALESCE(email, phone_number, 'No Contact Info') AS primary_contact\nFROM customers;`,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-300" />
            <span className="px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              Interactive SQL Cheatsheet & Venn Visualizer
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Visual SQL Reference Hub
          </h1>
          <p className="text-sm text-indigo-100 max-w-xl">
            Interactive Venn diagrams for SQL JOINs, copyable syntax templates, and modern Window Function patterns.
          </p>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE JOIN VENN DIAGRAM */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Interactive SQL Join Venn Diagram</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select a join type to visualize how rows from Table A and Table B intersect.
            </p>
          </div>

          {/* Join Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {['INNER', 'LEFT', 'RIGHT', 'CROSS', 'SELF'].map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setSelectedJoin(j)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedJoin === j
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* Venn Diagram Visualizer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* SVG Venn Diagram (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <svg viewBox="0 0 400 240" className="w-full max-w-sm">
              <defs>
                <clipPath id="left-circle-clip">
                  <circle cx="150" cy="120" r="85" />
                </clipPath>
              </defs>

              {/* Left Circle (Table A) */}
              <circle
                cx="150"
                cy="120"
                r="85"
                className={`transition-colors duration-300 stroke-2 ${
                  currentJoin.leftCircleHighlight
                    ? 'fill-indigo-500/60 stroke-indigo-600'
                    : 'fill-slate-200/40 dark:fill-slate-700/30 stroke-slate-300 dark:stroke-slate-600'
                }`}
              />

              {/* Right Circle (Table B) */}
              <circle
                cx="250"
                cy="120"
                r="85"
                className={`transition-colors duration-300 stroke-2 ${
                  currentJoin.rightCircleHighlight
                    ? 'fill-indigo-500/60 stroke-indigo-600'
                    : 'fill-slate-200/40 dark:fill-slate-700/30 stroke-slate-300 dark:stroke-slate-600'
                }`}
              />

              {/* Intersection Overlay (matching both) */}
              <circle
                cx="250"
                cy="120"
                r="85"
                clipPath="url(#left-circle-clip)"
                className={`transition-colors duration-300 ${
                  currentJoin.intersectionHighlight
                    ? 'fill-indigo-600 dark:fill-indigo-500'
                    : 'fill-transparent'
                }`}
              />

              {/* Labels */}
              <text x="110" y="125" textAnchor="middle" className="text-xs font-bold fill-slate-800 dark:fill-slate-100 select-none">
                Table A
              </text>
              <text x="290" y="125" textAnchor="middle" className="text-xs font-bold fill-slate-800 dark:fill-slate-100 select-none">
                Table B
              </text>
              <text x="200" y="125" textAnchor="middle" className="text-[11px] font-black fill-white select-none">
                Match
              </text>
            </svg>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-3">
              {currentJoin.title}
            </span>
          </div>

          {/* Details & Output Table (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentJoin.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentJoin.subtitle}
              </p>
            </div>

            <p className="text-xs text-indigo-900 dark:text-indigo-300 p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60">
              💡 {currentJoin.explanation}
            </p>

            {/* SQL Snippet */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-indigo-200 overflow-x-auto relative group">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <span>SQL Syntax</span>
                <button
                  type="button"
                  onClick={() => handleCopy(`join_${selectedJoin}`, currentJoin.sql)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white"
                >
                  {copiedKey === `join_${selectedJoin}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === `join_${selectedJoin}` ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap">{currentJoin.sql}</pre>
            </div>

            {/* Live Sample Result Table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Sample Query Output
              </span>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">c.id</th>
                      <th className="p-2">c.name</th>
                      <th className="p-2">o.order_id</th>
                      <th className="p-2">o.amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentJoin.sampleRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-bold">{r.c_id}</td>
                        <td className="p-2">{r.c_name}</td>
                        <td className={`p-2 ${r.o_id === 'NULL' ? 'text-amber-500 font-bold' : ''}`}>{r.o_id}</td>
                        <td className={`p-2 ${r.o_amount === 'NULL' ? 'text-amber-500 font-bold' : ''}`}>{r.o_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ADVANCED SQL TEMPLATES */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Code2 className="w-5 h-5 text-indigo-600" />
          <span>Advanced SQL Patterns & Templates</span>
        </h2>

        <div className="space-y-6">
          {cheatSheetSections.map((sec, secIdx) => {
            const Icon = sec.icon;
            return (
              <div
                key={secIdx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4"
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Icon className="w-4 h-4 text-indigo-600" />
                  <span>{sec.category}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sec.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {it.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                          {it.desc}
                        </p>
                        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-indigo-200 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{it.sql}</pre>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => handleCopy(it.id, it.sql)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        >
                          {copiedKey === it.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === it.id ? 'Copied' : 'Copy SQL'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTryInWorkspace(it.sql)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition"
                        >
                          <span>Try in Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
