---
slug: sql-queryable-blockchain-nodejs
title: "How to Build a SQL-Queryable Blockchain with Node.js"
description: "Learn how MiniLedger stores blockchain state in SQLite, enabling standard SQL queries against your distributed ledger. A practical guide to queryable blockchain architecture."
keywords: [blockchain sql queries, queryable ledger, blockchain database, sqlite blockchain, sql blockchain, blockchain state queries, node.js blockchain]
authors: [chainscore]
tags: [tutorial, sql, architecture]
image: /img/og-image.png
---

# How to Build a SQL-Queryable Blockchain with Node.js

One of the biggest frustrations with enterprise blockchain platforms is querying data. Most blockchains treat state as an opaque key-value store — you can look up a specific key, but searching, filtering, and aggregating data requires external indexing infrastructure.

MiniLedger takes a different approach: **the world state is a SQLite database**. You can run standard SQL queries directly against your blockchain data, with no additional infrastructure.

Here's how it works, and how you can use it.

<!-- truncate -->

## The Problem with Blockchain Queries

Traditional blockchain platforms store world state in key-value databases:

- **Hyperledger Fabric** uses LevelDB (key-range only) or CouchDB (Mango queries)
- **R3 Corda** uses a JPA-based vault with custom query APIs
- **Quorum** has no native query mechanism for private state

This means that answering questions like "show me all accounts with balance > 1000" or "find the most recently updated records" requires either:

1. Iterating through all keys (slow)
2. Building a separate indexing service (complex)
3. Using a specialized query language (learning curve)

## SQLite as World State

MiniLedger stores all blockchain state in a SQLite database using WAL (Write-Ahead Logging) mode for concurrent read/write performance. The `world_state` table has this schema:

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT | The state key (e.g., `account:alice`) |
| `value` | TEXT | JSON-encoded value |
| `version` | INTEGER | Update counter |
| `updated_at` | INTEGER | Timestamp of last update |
| `updated_by` | TEXT | Public key of the updater |
| `block_height` | INTEGER | Block number of last update |

This gives you the full power of SQL, including `WHERE` clauses, `JOIN`s, JSON functions, aggregation, and ordering.

## Practical Examples

### Setup

First, get a node running with some data:

```bash
npm install miniledger
npx miniledger init
npx miniledger start
```

Submit some sample transactions:

```bash
# Create user accounts
curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"user:alice","value":{"name":"Alice","balance":5000,"role":"admin"}}'

curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"user:bob","value":{"name":"Bob","balance":3200,"role":"member"}}'

curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"user:carol","value":{"name":"Carol","balance":8100,"role":"admin"}}'

# Create product records
curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"product:widget-a","value":{"name":"Widget A","price":29.99,"stock":142}}'

curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"product:widget-b","value":{"name":"Widget B","price":49.99,"stock":37}}'
```

Wait a second for the transactions to be included in a block, then start querying.

### Basic Queries

**Get all user records:**

```bash
curl -s -X POST http://localhost:4441/state/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT key, value FROM world_state WHERE key LIKE '\''user:%'\''"}'
```

**Get recently updated records:**

```bash
curl -s -X POST http://localhost:4441/state/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT key, value, updated_at FROM world_state ORDER BY updated_at DESC LIMIT 10"}'
```

### JSON Functions

SQLite's built-in JSON functions let you query inside values:

**Find users with balance over 4000:**

```sql
SELECT key, json_extract(value, '$.name') as name,
       json_extract(value, '$.balance') as balance
FROM world_state
WHERE key LIKE 'user:%'
AND CAST(json_extract(value, '$.balance') AS INTEGER) > 4000
```

**Find admin users:**

```sql
SELECT key, json_extract(value, '$.name') as name
FROM world_state
WHERE key LIKE 'user:%'
AND json_extract(value, '$.role') = 'admin'
```

### Aggregation

**Total balance across all users:**

```sql
SELECT COUNT(*) as user_count,
       SUM(CAST(json_extract(value, '$.balance') AS INTEGER)) as total_balance,
       AVG(CAST(json_extract(value, '$.balance') AS INTEGER)) as avg_balance
FROM world_state
WHERE key LIKE 'user:%'
```

**Records per key prefix:**

```sql
SELECT
  SUBSTR(key, 1, INSTR(key, ':') - 1) as prefix,
  COUNT(*) as count
FROM world_state
WHERE key NOT LIKE '\_%' ESCAPE '\'
GROUP BY prefix
ORDER BY count DESC
```

### Parameterized Queries

For safety, use parameterized queries to avoid SQL injection:

```bash
curl -s -X POST http://localhost:4441/state/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM world_state WHERE key LIKE ?", "params": ["user:%"]}'
```

## Programmatic API

You can also run queries from your Node.js application using the [programmatic API](/docs/guides/programmatic-api):

```typescript
import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './ledger' });
await node.init();
await node.start();

// Submit data
await node.submit({ key: 'sensor:temp-1', value: { celsius: 22.5 } });
await node.submit({ key: 'sensor:temp-2', value: { celsius: 24.1 } });

// Query with SQL
const results = await node.query(
  'SELECT key, json_extract(value, "$.celsius") as temp FROM world_state WHERE key LIKE ?',
  ['sensor:%']
);
console.log(results);
// [{ key: 'sensor:temp-1', temp: 22.5 }, { key: 'sensor:temp-2', temp: 24.1 }]
```

## The Dashboard SQL Console

MiniLedger's [built-in block explorer](/docs/getting-started/demo) includes an interactive SQL console. Navigate to `http://localhost:4441/dashboard`, click the State tab, and run queries directly in your browser.

## Why Not a Separate Database?

A common pattern is to index blockchain data into PostgreSQL or Elasticsearch for queries. MiniLedger avoids this by making the canonical state store queryable directly. This means:

- **No sync lag**: Queries always return the latest committed state
- **No infrastructure**: No additional database to deploy and maintain
- **Consistency**: The query results match exactly what's on the ledger
- **Simplicity**: One source of truth, not two

The trade-off is that SQLite is single-writer, so write throughput is bounded. For most private blockchain use cases (hundreds to low thousands of transactions per second), this is not a practical limitation.

## Conclusion

SQL queryability is one of MiniLedger's defining features. It turns a blockchain from an opaque append-only log into a practical database that happens to be immutable, distributed, and cryptographically verifiable.

Check out the [SQL queries guide](/docs/guides/sql-queries) for a complete reference, or the [REST API docs](/docs/api-reference/rest-api) for the full query endpoint specification.

---

Get started with `npm install miniledger` — your blockchain state is just a SQL query away.
