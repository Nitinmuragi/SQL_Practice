/**
 * Utility functions for exporting SQL query results to CSV, JSON, and Clipboard Markdown.
 */

export const exportToCsv = (columns, rows, filename = 'query_results.csv') => {
  if (!columns || !columns.length || !rows || !rows.length) return false;

  const escapeField = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map(escapeField).join(',');
  const rowLines = rows.map((r) => columns.map((col) => escapeField(r[col])).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const exportToJson = (rows, filename = 'query_results.json') => {
  if (!rows || !rows.length) return false;

  const jsonString = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};

export const copyAsMarkdown = async (columns, rows) => {
  if (!columns || !columns.length) return false;

  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const rowStrings = (rows || []).slice(0, 50).map((r) => {
    return `| ${columns.map((c) => (r[c] !== null && r[c] !== undefined ? String(r[c]) : 'NULL')).join(' | ')} |`;
  });

  const mdTable = [header, separator, ...rowStrings].join('\n');
  try {
    await navigator.clipboard.writeText(mdTable);
    return true;
  } catch (e) {
    return false;
  }
};
