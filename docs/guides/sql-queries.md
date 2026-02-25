---
title: SQL Queries
description: Query the MiniLedger world state using SQL. Learn the world_state schema, write filtering and aggregation queries, and use the REST API, programmatic API, and dashboard SQL console.
keywords:
  - miniledger SQL
  - blockchain SQL queries
  - query blockchain data
  - world state schema
  - SQL blockchain
  - blockchain analytics
  - ledger queries
  - distributed ledger SQL
  - miniledger dashboard
  - blockchain data analysis
sidebar_position: 5
---

# SQL Queries

One of MiniLedger's distinctive features is the ability to query the ledger's world state using **standard SQL**. Instead of iterating over blocks or calling contract methods to read data, you can write expressive SQL queries that filter, aggregate, and join data across the entire world state.

## The World State Schema

All key-value data written to MiniLedger (whether through direct transactions, smart contracts, or governance actions) is stored in a single queryable table called `world_state`.

### Table Structure

| Column | Type | Description |
|---|---|---|
| `key` | `TEXT` | The unique key identifying this entry (primary key) |
| `value` | `TEXT` | The stored value (JSON-encoded for complex objects) |
| `version` | `INTEGER` | The number of times this key has been written (starts at 1) |
| `updated_at` | `TEXT` | ISO 8601 timestamp of the last update |
| `updated_by` | `TEXT` | The node ID that submitted the last write transaction |
| `block_height` | `INTEGER` | The block number in which this key was last updated |

### Example Row

| key | value | version | updated_at | updated_by | block_height |
|---|---|:---:|---|---|:---:|
| `balance:alice` | `1000` | 3 | `2025-06-15T10:30:00Z` | `node1-abc...` | 42 |

## Writing Queries

### Basic Selection

Retrieve a single key:

```sql
SELECT * FROM world_state WHERE key = 'balance:alice';
```

### Prefix Matching with LIKE

MiniLedger uses key prefixes as a namespacing convention. Use `LIKE` to query all keys under a prefix:

```sql
-- All balances
SELECT * FROM world_state WHERE key LIKE 'balance:%';

-- All governance proposals
SELECT * FROM world_state WHERE key LIKE 'governance:proposal:%';

-- All keys related to a specific contract
SELECT * FROM world_state WHERE key LIKE 'contract:token:%';
```

### Filtering by Metadata

Query based on when, where, or by whom data was written:

```sql
-- Keys updated in the last hour
SELECT key, value, updated_at
FROM world_state
WHERE updated_at > datetime('now', '-1 hour');

-- Keys written by a specific node
SELECT key, value, block_height
FROM world_state
WHERE updated_by = 'node1-abc...';

-- Keys updated in a specific block range
SELECT key, value, block_height
FROM world_state
WHERE block_height BETWEEN 100 AND 200;

-- Keys that have been modified more than 5 times
SELECT key, version
FROM world_state
WHERE version > 5
ORDER BY version DESC;
```

### Working with JSON Values

When values are stored as JSON objects, you can use SQLite's `json_extract()` function to query individual fields:

```sql
-- Find all employees in the Engineering department
SELECT key,
       json_extract(value, '$.name') AS name,
       json_extract(value, '$.department') AS department
FROM world_state
WHERE key LIKE 'employee:%'
  AND json_extract(value, '$.department') = 'Engineering';

-- Find high-value transactions
SELECT key,
       json_extract(value, '$.amount') AS amount,
       json_extract(value, '$.from') AS sender,
       json_extract(value, '$.to') AS receiver
FROM world_state
WHERE key LIKE 'tx:transfer:%'
  AND CAST(json_extract(value, '$.amount') AS INTEGER) > 10000;
```

### Aggregation

Use standard SQL aggregation functions to compute summaries:

```sql
-- Total number of entries in the world state
SELECT COUNT(*) AS total_keys FROM world_state;

-- Count entries by prefix
SELECT
  SUBSTR(key, 1, INSTR(key, ':') - 1) AS prefix,
  COUNT(*) AS count
FROM world_state
GROUP BY prefix
ORDER BY count DESC;

-- Sum of all balances
SELECT SUM(CAST(value AS REAL)) AS total_supply
FROM world_state
WHERE key LIKE 'balance:%';

-- Average balance
SELECT AVG(CAST(value AS REAL)) AS avg_balance
FROM world_state
WHERE key LIKE 'balance:%';

-- Min and max block heights for a key prefix
SELECT
  MIN(block_height) AS first_block,
  MAX(block_height) AS last_block
FROM world_state
WHERE key LIKE 'contract:token:%';
```

### Pagination

For large result sets, use `LIMIT` and `OFFSET`:

```sql
-- First 20 results
SELECT key, value FROM world_state
WHERE key LIKE 'balance:%'
ORDER BY key
LIMIT 20;

-- Next 20 results
SELECT key, value FROM world_state
WHERE key LIKE 'balance:%'
ORDER BY key
LIMIT 20 OFFSET 20;
```

## Using SQL via the REST API

Submit SQL queries through the `/query` endpoint:

```bash
curl -X POST http://localhost:4441/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM world_state WHERE key LIKE ? ORDER BY block_height DESC LIMIT ?",
    "params": ["balance:%", 10]
  }'
```

### Response Format

```json
{
  "columns": ["key", "value", "version", "updated_at", "updated_by", "block_height"],
  "rows": [
    {
      "key": "balance:alice",
      "value": "1000",
      "version": 3,
      "updated_at": "2025-06-15T10:30:00Z",
      "updated_by": "node1-abc...",
      "block_height": 42
    },
    {
      "key": "balance:bob",
      "value": "500",
      "version": 1,
      "updated_at": "2025-06-15T09:15:00Z",
      "updated_by": "node1-abc...",
      "block_height": 38
    }
  ],
  "rowCount": 2
}
```

### Parameterized Queries

Always use parameterized queries with the `params` array to prevent SQL injection:

```bash
# Safe - parameterized
curl -X POST http://localhost:4441/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM world_state WHERE key = ?",
    "params": ["balance:alice"]
  }'

# Unsafe - string concatenation (DO NOT do this)
# "sql": "SELECT * FROM world_state WHERE key = 'balance:alice'"
```

:::warning
MiniLedger's query engine executes **read-only** SQL. `INSERT`, `UPDATE`, `DELETE`, `DROP`, and other write operations are rejected. All state mutations must go through transactions.
:::

## Using SQL via the Programmatic API

When using MiniLedger as an embedded library, the `node.query()` method provides direct SQL access:

```javascript
import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './data' });
await node.init();
await node.start();

// Simple query
const balances = await node.query(
  'SELECT key, value FROM world_state WHERE key LIKE ?',
  ['balance:%']
);
console.log(balances);

// Aggregation query
const [{ total }] = await node.query(
  'SELECT SUM(CAST(value AS REAL)) AS total FROM world_state WHERE key LIKE ?',
  ['balance:%']
);
console.log(`Total supply: ${total}`);

// Query with multiple conditions
const recentUpdates = await node.query(
  `SELECT key, value, updated_at, block_height
   FROM world_state
   WHERE key LIKE ?
     AND block_height > ?
   ORDER BY block_height DESC`,
  ['contract:%', 100]
);
```

See the [Programmatic API guide](/docs/guides/programmatic-api) for the full API reference.

## The SQL Console in the Dashboard

MiniLedger's built-in web dashboard (available at the API port, e.g., `http://localhost:4441`) includes an interactive **SQL Console** for running queries in the browser.

### Accessing the SQL Console

1. Open your browser and navigate to `http://localhost:4441`
2. Click **SQL Console** in the sidebar navigation
3. Type your query in the editor and click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### SQL Console Features

- **Syntax highlighting** for SQL keywords, strings, and numbers
- **Auto-complete** for table names and column names
- **Query history** -- use the up/down arrow keys to recall previous queries
- **Export results** to CSV or JSON format
- **Execution time** displayed for each query
- **Error messages** with line and column information for malformed queries

### Example Dashboard Session

```sql
-- Check total entries in the world state
SELECT COUNT(*) AS total FROM world_state;

-- View the most recently updated keys
SELECT key, updated_at, block_height
FROM world_state
ORDER BY block_height DESC
LIMIT 10;

-- Inspect a specific contract's state
SELECT key,
       json_extract(value, '$.name') AS name,
       json_extract(value, '$.version') AS version
FROM world_state
WHERE key LIKE 'contract:meta:%';
```

## Query Performance Tips

1. **Use key prefixes consistently.** Queries with `key LIKE 'prefix:%'` are efficient because `key` is the primary key and prefix matching uses index range scans.

2. **Avoid `SELECT *` in production.** Select only the columns you need to reduce response size and transfer time.

3. **Use `LIMIT` for large datasets.** Unbounded queries on a large world state can be slow and memory-intensive.

4. **Prefer `=` over `LIKE` for exact matches.** `WHERE key = 'balance:alice'` is faster than `WHERE key LIKE 'balance:alice'` because it uses a direct index lookup.

5. **Use `CAST()` for numeric comparisons.** Values are stored as text, so numeric comparisons require explicit casting:

   ```sql
   -- Correct
   WHERE CAST(value AS REAL) > 100

   -- Incorrect (string comparison)
   WHERE value > '100'
   ```

6. **Index awareness.** The `key` column is indexed (primary key). The `block_height` and `updated_at` columns are also indexed. Queries filtering on these columns are efficient. Filtering on `value` content (e.g., with `json_extract`) requires a full table scan.

## Common Query Patterns

### Audit Trail

```sql
-- Who wrote to a specific key and when?
SELECT key, updated_by, updated_at, version, block_height
FROM world_state
WHERE key = 'config:api-key'
ORDER BY version DESC;
```

### Inventory Check

```sql
-- All keys under a domain with their current values
SELECT key, value, version
FROM world_state
WHERE key LIKE 'inventory:%'
ORDER BY key;
```

### Health Monitoring

```sql
-- Distribution of updates across nodes
SELECT updated_by, COUNT(*) AS writes
FROM world_state
GROUP BY updated_by
ORDER BY writes DESC;

-- Data freshness - most and least recently updated prefixes
SELECT
  SUBSTR(key, 1, INSTR(key, ':') - 1) AS prefix,
  MAX(updated_at) AS last_updated,
  MIN(updated_at) AS first_entry
FROM world_state
GROUP BY prefix;
```

### Balance Report

```sql
-- Top 10 accounts by balance
SELECT
  REPLACE(key, 'balance:', '') AS account,
  CAST(value AS REAL) AS balance
FROM world_state
WHERE key LIKE 'balance:%'
ORDER BY balance DESC
LIMIT 10;
```

## Next Steps

- [Programmatic API](/docs/guides/programmatic-api) -- Use `node.query()` to run SQL from your application code
- [Smart Contracts](/docs/guides/smart-contracts) -- Create the data that SQL queries read
- [Privacy and Encryption](/docs/guides/privacy-encryption) -- Understand how encryption affects query results
