/**
 * Advanced SQL Formatter & Beautifier
 * Normalizes clauses, capitalizes SQL standard keywords, and applies readable indentation.
 */

const MAJOR_CLAUSES = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'UNION ALL',
  'UNION',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
];

const SUB_CLAUSES = ['AND', 'OR', 'ON'];

const KEYWORDS_TO_CAPITALIZE = [
  'SELECT', 'DISTINCT', 'AS', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS',
  'NULL', 'LIKE', 'BETWEEN', 'EXISTS', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
  'CROSS', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'COALESCE', 'CONCAT', 'ROUND', 'IFNULL', 'DATEDIFF', 'NOW'
];

export const formatSql = (sqlText) => {
  if (!sqlText || !sqlText.trim()) return '';

  // 1. Tokenize preserving string literals and comments
  const tokens = [];
  let i = 0;
  const n = sqlText.length;

  while (i < n) {
    const ch = sqlText[i];
    const nextCh = sqlText[i + 1] || '';

    // Single quoted string literal
    if (ch === "'") {
      let str = ch;
      i++;
      while (i < n) {
        str += sqlText[i];
        if (sqlText[i] === "'" && sqlText[i - 1] !== '\\') {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'LITERAL', value: str });
      continue;
    }

    // Double quoted identifier or string
    if (ch === '"') {
      let str = ch;
      i++;
      while (i < n) {
        str += sqlText[i];
        if (sqlText[i] === '"' && sqlText[i - 1] !== '\\') {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'LITERAL', value: str });
      continue;
    }

    // Backticked identifier
    if (ch === '`') {
      let str = ch;
      i++;
      while (i < n) {
        str += sqlText[i];
        if (sqlText[i] === '`') {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'LITERAL', value: str });
      continue;
    }

    // Single line comment (-- or #)
    if ((ch === '-' && nextCh === '-') || ch === '#') {
      let comment = ch;
      i += (ch === '-' ? 2 : 1);
      if (ch === '-') comment += '-';
      while (i < n && sqlText[i] !== '\n') {
        comment += sqlText[i];
        i++;
      }
      tokens.push({ type: 'COMMENT', value: comment.trim() });
      continue;
    }

    // Block comment (/* ... */)
    if (ch === '/' && nextCh === '*') {
      let comment = '/*';
      i += 2;
      while (i < n) {
        comment += sqlText[i];
        if (sqlText[i] === '*' && sqlText[i + 1] === '/') {
          comment += '/';
          i += 2;
          break;
        }
        i++;
      }
      tokens.push({ type: 'COMMENT', value: comment.trim() });
      continue;
    }

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Word or Symbol
    if (/[a-zA-Z0-9_]/.test(ch)) {
      let word = '';
      while (i < n && /[a-zA-Z0-9_]/.test(sqlText[i])) {
        word += sqlText[i];
        i++;
      }
      tokens.push({ type: 'WORD', value: word });
      continue;
    }

    // Punctuation / operator
    tokens.push({ type: 'SYMBOL', value: ch });
    i++;
  }

  // 2. Normalize and assemble formatted SQL
  let output = '';
  let pendingSpace = false;

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    const prevTok = k > 0 ? tokens[k - 1] : null;
    const nextTok = k + 1 < tokens.length ? tokens[k + 1] : null;

    if (tok.type === 'COMMENT') {
      output = output.trimEnd();
      output += (output ? '\n' : '') + tok.value + '\n';
      pendingSpace = false;
      continue;
    }

    if (tok.type === 'LITERAL') {
      if (pendingSpace) output += ' ';
      output += tok.value;
      pendingSpace = true;
      continue;
    }

    if (tok.type === 'SYMBOL') {
      if (tok.value === ';') {
        output = output.trimEnd() + ';\n';
        pendingSpace = false;
      } else if (tok.value === ',') {
        output = output.trimEnd() + ', ';
        pendingSpace = false;
      } else if (tok.value === '(' || tok.value === ')') {
        if (tok.value === '(' && pendingSpace) output += ' ';
        output += tok.value;
        pendingSpace = tok.value === ')';
      } else if (['=', '>', '<', '+', '-', '*', '/'].includes(tok.value)) {
        output = output.trimEnd() + ` ${tok.value} `;
        pendingSpace = false;
      } else {
        if (pendingSpace) output += ' ';
        output += tok.value;
        pendingSpace = true;
      }
      continue;
    }

    if (tok.type === 'WORD') {
      const upperWord = tok.value.toUpperCase();

      // Check for two-word major clauses (e.g. GROUP BY, ORDER BY, INNER JOIN, etc.)
      const nextWord = nextTok && nextTok.type === 'WORD' ? nextTok.value.toUpperCase() : '';
      const comboTwo = `${upperWord} ${nextWord}`;

      if (MAJOR_CLAUSES.includes(comboTwo)) {
        output = output.trimEnd();
        output += (output ? '\n' : '') + comboTwo + ' ';
        k++; // skip next word
        pendingSpace = false;
        continue;
      }

      if (MAJOR_CLAUSES.includes(upperWord)) {
        output = output.trimEnd();
        output += (output ? '\n' : '') + upperWord + ' ';
        pendingSpace = false;
        continue;
      }

      if (SUB_CLAUSES.includes(upperWord)) {
        output = output.trimEnd();
        output += '\n  ' + upperWord + ' ';
        pendingSpace = false;
        continue;
      }

      // Check keyword capitalization
      const finalWord = KEYWORDS_TO_CAPITALIZE.includes(upperWord) ? upperWord : tok.value;
      if (pendingSpace) output += ' ';
      output += finalWord;
      pendingSpace = true;
    }
  }

  return output.trim();
};
