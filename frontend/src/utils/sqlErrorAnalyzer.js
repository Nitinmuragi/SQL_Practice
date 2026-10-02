// Comprehensive SQL Error Knowledge Base & Diagnostic Engine

export const SQL_ERROR_CATALOG = [
  {
    id: 'err_only_full_group_by',
    code: 'MySQL 1140 / 1055',
    category: 'Aggregation & GROUP BY',
    title: 'In aggregated query without GROUP BY (ONLY_FULL_GROUP_BY)',
    summary: 'You selected a regular column alongside an aggregate function (like COUNT, SUM) without using GROUP BY.',
    keywords: ['1140', '1055', 'only_full_group_by', 'in aggregated query without group by', 'contains nonaggregated column'],
    whyItHappens:
      'When you use aggregate functions such as COUNT(*), SUM(), AVG(), MIN(), or MAX(), MySQL aggregates multiple rows into a single summary row. If you also select standard columns (e.g. name, city) without a GROUP BY clause, MySQL does not know which individual row\'s value to return for those columns. In modern MySQL (with ONLY_FULL_GROUP_BY enabled), this ambiguous combination is strictly disallowed to prevent misleading results.',
    howToOvercome: [
      'If you want aggregated summary statistics per category, add a GROUP BY clause with all non-aggregated columns in your SELECT list (e.g. GROUP BY department).',
      'If you only want overall totals (e.g. COUNT(*), SUM(salary)), remove the non-aggregated columns from the SELECT list.',
      'Wrap non-grouped columns in an aggregate function if appropriate (e.g. MIN(date) or MAX(name)).',
    ],
    wrongExample: `-- ❌ Incorrect: 'name' is not in GROUP BY\nSELECT department, name, COUNT(*)\nFROM employees;`,
    correctExample: `--  Correct: Group by all non-aggregated columns\nSELECT department, COUNT(*)\nFROM employees\nGROUP BY department;\n\n-- Or include both in GROUP BY:\nSELECT department, name, COUNT(*)\nFROM employees\nGROUP BY department, name;`,
  },
  {
    id: 'err_unknown_column',
    code: 'MySQL 1054',
    category: 'Columns & Tables',
    title: 'Unknown Column in field list, WHERE, or ON clause',
    summary: 'MySQL cannot find the specified column name in the referenced table.',
    keywords: ['1054', 'unknown column', 'does not exist in table'],
    whyItHappens:
      'This error occurs when: (1) There is a typo or spelling mistake in the column name, (2) The column exists in a different table than the one referenced, (3) A string value was written without quotes (e.g. WHERE city = Mumbai instead of WHERE city = \'Mumbai\', causing MySQL to treat Mumbai as a column name), or (4) The wrong table prefix was used in a JOIN condition.',
    howToOvercome: [
      'Check the table schema in the Database Explorer to verify the exact spelling and casing of your column names.',
      'Ensure string/text literal values in WHERE or ON conditions are enclosed in single quotes (\'value\').',
      'In multi-table queries, prefix column names with the correct table name (e.g. customers.customer_id instead of orders.customer_id).',
    ],
    wrongExample: `-- ❌ Incorrect: 'cust_id' typo & missing quotes around 'Paris'\nSELECT cust_id FROM customers WHERE city = Paris;`,
    correctExample: `--  Correct: Exact column name and quoted text string\nSELECT customer_id FROM customers WHERE city = 'Paris';`,
  },
  {
    id: 'err_ambiguous_column',
    code: 'MySQL 1052',
    category: 'Multi-Table & JOINs',
    title: 'Column in field list or ON clause is ambiguous',
    summary: 'Two or more tables in your JOIN share a column with the same name, and MySQL does not know which one you want.',
    keywords: ['1052', 'is ambiguous', 'ambiguous column'],
    whyItHappens:
      'When you perform a JOIN between two or more tables (for example, customers and orders) that both have a column with the same name (such as customer_id or id), referencing simply customer_id leaves MySQL unable to determine which table\'s column to read from.',
    howToOvercome: [
      'Qualify the column with its specific table name: use customers.customer_id or orders.customer_id.',
      'If you have aliased your tables (e.g. FROM customers c JOIN orders o), use the alias: c.customer_id.',
      'Review your SELECT columns and JOIN ON conditions to make sure every shared column name has an explicit table prefix.',
    ],
    wrongExample: `-- ❌ Incorrect: 'customer_id' exists in both tables without prefix\nSELECT customer_id, order_id\nFROM customers\nINNER JOIN orders ON customer_id = customer_id;`,
    correctExample: `--  Correct: Explicitly prefix with table name\nSELECT customers.customer_id, orders.order_id\nFROM customers\nINNER JOIN orders ON customers.customer_id = orders.customer_id;`,
  },
  {
    id: 'err_syntax_error',
    code: 'MySQL 1064',
    category: 'Syntax & Grammar',
    title: 'SQL Syntax Error / Unexpected Token',
    summary: 'The query contains a grammatical mistake, invalid SQL keyword, misplaced comma, or unmatched parenthesis.',
    keywords: ['1064', 'you have an error in your sql syntax', 'syntax error', 'near'],
    whyItHappens:
      'MySQL encountered a character, keyword, or token that does not conform to SQL grammar at that position. Common causes include: missing or trailing commas in SELECT/INSERT/UPDATE lists, unclosed parentheses, misspelled SQL keywords (e.g. SELCT, WHER, FORM), or using reserved words without backticks.',
    howToOvercome: [
      'Read the error message near the \'...\' quote—MySQL points right to the point where parsing failed.',
      'Check for missing or extra commas (especially a trailing comma right before FROM).',
      'Verify that every opening parenthesis ( has a matching closing parenthesis ).',
      'Ensure standard SQL clause order: SELECT -> FROM -> JOIN -> WHERE -> GROUP BY -> HAVING -> ORDER BY -> LIMIT.',
    ],
    wrongExample: `-- ❌ Incorrect: Trailing comma and misspelled WHERE\nSELECT id, name,\nFROM students\nWHER score > 50;`,
    correctExample: `--  Correct: Clean commas and correct spelling\nSELECT id, name\nFROM students\nWHERE score > 50;`,
  },
  {
    id: 'err_table_not_found',
    code: 'MySQL 1146',
    category: 'Columns & Tables',
    title: 'Table doesn\'t exist in database',
    summary: 'MySQL could not locate a physical table matching the name specified in the FROM or JOIN clause.',
    keywords: ['1146', "table doesn't exist", 'not found in this dataset', 'not found in dataset'],
    whyItHappens:
      'The specified table name does not exist in the active dataset. This is typically caused by: a typo in the table name, querying a table that belongs to a different dataset, or writing the plural form (e.g. employees) when the table is singular (employee).',
    howToOvercome: [
      'Look at the active Database Explorer panel on the left to see the exact names of tables available in your active database.',
      'Click the table directly from the Explorer to ensure the correct active table is loaded.',
      'If the table has not been created yet, click "+ Add Table" or "Upload" to add it to your dataset.',
    ],
    wrongExample: `-- ❌ Incorrect: 'student_tbl' does not exist in this database\nSELECT * FROM student_tbl;`,
    correctExample: `--  Correct: Use the exact table name from Database Explorer\nSELECT * FROM students;`,
  },
  {
    id: 'err_group_function_in_where',
    code: 'MySQL 1111',
    category: 'Aggregation & GROUP BY',
    title: 'Invalid use of group function in WHERE clause',
    summary: 'Aggregate functions (COUNT, SUM, AVG, MIN, MAX) cannot be placed inside a WHERE clause.',
    keywords: ['1111', 'invalid use of group function'],
    whyItHappens:
      'In SQL execution order, the WHERE clause filters rows BEFORE any grouping or aggregation takes place. Because aggregate totals (such as SUM(amount) or COUNT(*)) have not been calculated yet at the time the WHERE clause runs, MySQL rejects aggregate functions inside WHERE.',
    howToOvercome: [
      'Move aggregate filters from the WHERE clause to a HAVING clause.',
      'Use WHERE only for individual column values (e.g. status = \'active\').',
      'Use HAVING for calculated aggregate values (e.g. HAVING COUNT(*) > 5 or HAVING SUM(amount) > 1000).',
    ],
    wrongExample: `-- ❌ Incorrect: SUM() used inside WHERE\nSELECT department, SUM(salary)\nFROM employees\nWHERE SUM(salary) > 50000\nGROUP BY department;`,
    correctExample: `--  Correct: Use HAVING for aggregate conditions\nSELECT department, SUM(salary)\nFROM employees\nGROUP BY department\nHAVING SUM(salary) > 50000;`,
  },
  {
    id: 'err_duplicate_key',
    code: 'MySQL 1062',
    category: 'Constraints & Keys',
    title: 'Duplicate entry for Primary Key or Unique Constraint',
    summary: 'Attempted to insert a row with an ID or unique value that already exists in the table.',
    keywords: ['1062', 'duplicate entry', 'for key'],
    whyItHappens:
      'Primary keys and UNIQUE constraints guarantee that every value in that column is distinct across all rows. When an INSERT or UPDATE statement tries to save a value that is already held by another row, MySQL aborts to preserve relational data integrity.',
    howToOvercome: [
      'Choose a unique ID value that is not already present in the table.',
      'If adding rows manually, check the existing records in the table to see the highest ID used so far.',
      'Use an UPDATE statement instead of an INSERT if your intention was to modify the existing row.',
    ],
    wrongExample: `-- ❌ Incorrect: ID 1 already exists in table\nINSERT INTO students (id, name) VALUES (1, 'Alice');`,
    correctExample: `--  Correct: Use an unallocated ID or update the record\nINSERT INTO students (id, name) VALUES (105, 'Alice');\n-- Or update:\nUPDATE students SET name = 'Alice' WHERE id = 1;`,
  },
  {
    id: 'err_not_null_violation',
    code: 'MySQL 1048 / 1364',
    category: 'Constraints & Keys',
    title: 'Column cannot be NULL / Missing default value',
    summary: 'A required NOT NULL column was left empty or supplied with a NULL value.',
    keywords: ['1048', '1364', 'cannot be null', "doesn't have a default value"],
    whyItHappens:
      'When the table schema was defined, this column was specified as NOT NULL without a DEFAULT fallback value. If an INSERT or UPDATE statement omits this column or passes NULL, MySQL prevents the row from being saved.',
    howToOvercome: [
      'Provide a valid non-null value for all required columns when inserting rows.',
      'Check the schema definition in the Database Explorer to see which columns are marked as required (NOT NULL).',
    ],
    wrongExample: `-- ❌ Incorrect: 'email' is NOT NULL but was omitted or given NULL\nINSERT INTO users (id, name, email) VALUES (1, 'John', NULL);`,
    correctExample: `--  Correct: Provide valid values for all NOT NULL columns\nINSERT INTO users (id, name, email) VALUES (1, 'John', 'john@example.com');`,
  },
  {
    id: 'err_data_type_mismatch',
    code: 'MySQL 1292 / 1366',
    category: 'Data Types & Values',
    title: 'Incorrect data type value / Type truncation',
    summary: 'The value supplied does not match the column\'s data type (e.g. entering letters into an INT or DATE column).',
    keywords: ['1292', '1366', 'incorrect integer value', 'incorrect datetime value', 'truncated incorrect'],
    whyItHappens:
      'MySQL enforces strict data typing. If an INT column receives letters (e.g. \'abc\'), or a DATE column receives an invalid date format (e.g. \'not-a-date\'), MySQL rejects the assignment or query comparison.',
    howToOvercome: [
      'Ensure numeric columns (INT, FLOAT) receive valid numbers without letters or currency symbols (e.g. use 1500 instead of \'$1,500\').',
      'Format DATE values using the standard ISO format: \'YYYY-MM-DD\' (e.g. \'2026-09-27\').',
      'Format DATETIME values using \'YYYY-MM-DD HH:MM:SS\'.',
    ],
    wrongExample: `-- ❌ Incorrect: String passed to INT column and wrong date format\nINSERT INTO orders (id, amount, order_date)\nVALUES (1, 'five hundred', '27/09/2026');`,
    correctExample: `--  Correct: Proper numeric literal and ISO date\nINSERT INTO orders (id, amount, order_date)\nVALUES (1, 500, '2026-09-27');`,
  },
  {
    id: 'err_self_join_syntax',
    code: 'SQL Logic',
    category: 'Multi-Table & JOINs',
    title: 'Invalid SELF JOIN syntax / Missing Table Alias',
    summary: 'A table cannot be joined to itself without giving each occurrence a unique alias.',
    keywords: ['self join', "in 'on clause'", 'unknown column', 're-opened table'],
    whyItHappens:
      'In SQL, "SELF JOIN" is not a dedicated SQL keyword. A self-join is actually performed using a standard INNER JOIN or LEFT JOIN where the same table is referenced twice. Because the table is referenced twice in the same query, SQL requires at least one occurrence to have an explicit table alias (e.g. employees e1 INNER JOIN employees e2) so column references like e1.manager_id = e2.employee_id can be distinguished.',
    howToOvercome: [
      'Assign different aliases to each instance of the table (e.g. FROM employees AS a INNER JOIN employees AS b).',
      'In your ON condition, reference the aliased table names: a.manager_id = b.id.',
      'In the Query Builder, when performing a self-join, select INNER JOIN and specify an alias.',
    ],
    wrongExample: `-- ❌ Incorrect: Literal 'SELF JOIN' without table alias\nSELECT * FROM employees SELF JOIN employees ON employees.id = employees.id;`,
    correctExample: `--  Correct: Standard INNER JOIN with distinct aliases\nSELECT a.name AS employee, b.name AS manager\nFROM employees AS a\nINNER JOIN employees AS b ON a.manager_id = b.id;`,
  },
  {
    id: 'err_security_forbidden',
    code: 'Platform Safety',
    category: 'Syntax & Grammar',
    title: 'Destructive or Administrative Statement Forbidden',
    summary: 'Administrative statements like DROP, TRUNCATE, or ALTER are blocked to protect your workspace datasets.',
    keywords: ['destructive or administrative statement', 'is forbidden', 'access to system table', 'strictly prohibited'],
    whyItHappens:
      'To prevent accidental permanent loss of dataset tables, drop tables, or unauthorized modification of system catalogs, the platform security policy disallows destructive DDL queries (such as DROP TABLE, TRUNCATE, or ALTER) through the practice terminal.',
    howToOvercome: [
      'To practice data modification safely, use INSERT, UPDATE, or DELETE with appropriate WHERE conditions.',
      'To delete an entire dataset or table safely, use the "Delete Dataset" action inside the Database Explorer.',
    ],
    wrongExample: `-- ❌ Forbidden: Administrative table drop\nDROP TABLE students;`,
    correctExample: `--  Permitted: Clean rows safely with DELETE\nDELETE FROM students WHERE id = 10;`,
  },
];

/**
 * Analyzes a raw error message and query to produce a structured diagnosis.
 */
export function analyzeSqlError(errorMessage = '', queryText = '') {
  if (!errorMessage) {
    return null;
  }

  const errStr = String(errorMessage);
  const errLower = errStr.toLowerCase();
  const queryLower = String(queryText).toLowerCase();

  // 1. Try to find a matching entry in our catalog
  let matched = null;
  for (const item of SQL_ERROR_CATALOG) {
    const isMatch = item.keywords.some((kw) => errLower.includes(kw.toLowerCase()));
    if (isMatch) {
      matched = item;
      break;
    }
  }

  // Fallback generic error if no catalog entry matched directly
  if (!matched) {
    matched = {
      id: 'err_general_sql',
      code: 'SQL Execution Error',
      category: 'General SQL',
      title: 'SQL Statement Execution Failed',
      summary: 'The database server encountered an error while parsing or executing your statement.',
      whyItHappens:
        'The query could not be executed by MySQL. This typically occurs due to misspelled identifiers, mismatched parentheses, invalid join condition columns, or type incompatibilities.',
      howToOvercome: [
        'Review the exact error text to see which keyword or column MySQL stopped on.',
        'Verify that all table and column names match the schema in the Database Explorer.',
        'Test parts of the query in isolation (e.g. run a simple SELECT * first, then add WHERE, JOIN, or GROUP BY).',
      ],
      wrongExample: `-- Broken SQL:\n${queryText || 'SELECT * FROM ...'}`,
      correctExample: `-- Correct SQL format:\nSELECT * FROM table_name WHERE condition;`,
    };
  }

  // 2. Extract context-specific clues from the error message
  let extractedDetail = null;
  const colMatch = errStr.match(/Unknown column ['`]([^'`]+)['`]/i) || errStr.match(/Column ['`]([^'`]+)['`] in/i);
  if (colMatch && colMatch[1]) {
    extractedDetail = {
      type: 'column',
      name: colMatch[1],
      message: `Column "${colMatch[1]}" was specifically referenced in the error.`,
    };
  }

  const tableMatch = errStr.match(/Table ['`]([^'`]+)['`] doesn't exist/i);
  if (tableMatch && tableMatch[1]) {
    extractedDetail = {
      type: 'table',
      name: tableMatch[1],
      message: `Table "${tableMatch[1]}" was not found in the database.`,
    };
  }

  return {
    ...matched,
    rawError: errStr,
    queryText,
    extractedDetail,
  };
}
