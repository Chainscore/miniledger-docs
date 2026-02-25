---
title: Storage Layer
description: MiniLedger's SQLite storage layer using better-sqlite3 with WAL mode, including database schema, migrations system, state root computation, and query capabilities.
keywords: [miniledger storage, sqlite blockchain, better-sqlite3, WAL mode, blockchain database, state root, world state, database schema, blockchain migrations, sql queryable blockchain]
sidebar_position: 3
---

# Storage Layer

MiniLedger stores all persistent data in a single SQLite database file (`ledger.db`) using the `better-sqlite3` driver. This design choice provides zero-config persistence, ACID transactions, and the ability to query blockchain state with standard SQL.

## Why SQLite?

| Concern | SQLite Advantage |
|---|---|
| **Zero dependencies** | No database server to install, configure, or manage |
| **Single file** | The entire ledger is one portable `.db` file |
| **ACID transactions** | Block application and state updates are atomic |
| **SQL queries** | Query world state using familiar SQL syntax |
| **Embeddable** | Perfect for a library that runs inside other Node.js apps |
| **Performance** | `better-sqlite3` is synchronous and avoids callback overhead |

## Database Initialization

When a `MiniLedgerDB` is created, it opens the SQLite database and configures four pragmas:

```typescript
this.db = new Database(dbPath);
this.db.pragma("journal_mode = WAL");
this.db.pragma("synchronous = NORMAL");
this.db.pragma("foreign_keys = ON");
this.db.pragma("busy_timeout = 5000");
```

| Pragma | Value | Purpose |
|---|---|---|
| `journal_mode` | `WAL` | Write-Ahead Logging for concurrent reads during writes |
| `synchronous` | `NORMAL` | Balance between durability and performance |
| `foreign_keys` | `ON` | Enforce referential integrity (e.g., tx -> block) |
| `busy_timeout` | `5000` | Wait up to 5 seconds if the database is locked |

### WAL Mode

WAL (Write-Ahead Logging) mode is critical for MiniLedger's performance. In WAL mode:

- **Readers never block writers** and **writers never block readers**. The API can serve read queries while a block is being written.
- Writes append to a WAL file instead of modifying the main database file directly.
- The WAL is periodically checkpointed (merged back into the main file) automatically by SQLite.

This means the REST API can handle concurrent `GET /api/state/:key` requests without being blocked by an in-progress block commit.

## Schema

The database schema is created via the migrations system. The initial migration (version 1) creates the following tables:

### `blocks`

Stores finalized blocks.

```sql
CREATE TABLE blocks (
  height      INTEGER PRIMARY KEY,
  hash        TEXT UNIQUE NOT NULL,
  prev_hash   TEXT NOT NULL,
  timestamp   INTEGER NOT NULL,
  merkle_root TEXT NOT NULL,
  state_root  TEXT NOT NULL,
  proposer    TEXT NOT NULL,
  signature   TEXT NOT NULL DEFAULT '',
  raw         TEXT NOT NULL
);
```

| Column | Type | Description |
|---|---|---|
| `height` | INTEGER PK | Block height (0-based, sequential) |
| `hash` | TEXT UNIQUE | SHA-256 hash of the block header |
| `prev_hash` | TEXT | Hash of the previous block |
| `timestamp` | INTEGER | Unix timestamp in milliseconds |
| `merkle_root` | TEXT | Merkle root of transaction hashes |
| `state_root` | TEXT | Hash of the world state after this block |
| `proposer` | TEXT | Ed25519 public key (hex) of the block producer |
| `signature` | TEXT | Ed25519 signature (hex) of the block hash |
| `raw` | TEXT | JSON-serialized full block (including transactions) |

### `transactions`

Stores confirmed transactions with their block association.

```sql
CREATE TABLE transactions (
  hash         TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  sender       TEXT NOT NULL,
  nonce        INTEGER NOT NULL,
  timestamp    INTEGER NOT NULL,
  payload      TEXT NOT NULL,
  signature    TEXT NOT NULL DEFAULT '',
  block_height INTEGER REFERENCES blocks(height),
  position     INTEGER,
  status       TEXT NOT NULL DEFAULT 'confirmed'
);
```

| Column | Type | Description |
|---|---|---|
| `hash` | TEXT PK | SHA-256 hash of the transaction content |
| `type` | TEXT | Transaction type (e.g., `state:set`, `contract:invoke`) |
| `sender` | TEXT | Ed25519 public key (hex) of the sender |
| `nonce` | INTEGER | Monotonically increasing per-sender sequence number |
| `timestamp` | INTEGER | Unix timestamp in milliseconds |
| `payload` | TEXT | JSON-serialized transaction payload |
| `signature` | TEXT | Ed25519 signature (hex) of the transaction hash |
| `block_height` | INTEGER FK | Height of the block containing this transaction |
| `position` | INTEGER | Position within the block's transaction list |
| `status` | TEXT | Transaction status (`confirmed`) |

### `world_state`

The key-value store representing the current state of the ledger.

```sql
CREATE TABLE world_state (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  updated_at   INTEGER NOT NULL,
  updated_by   TEXT NOT NULL,
  block_height INTEGER NOT NULL
);
```

| Column | Type | Description |
|---|---|---|
| `key` | TEXT PK | State key (e.g., `balance:abc123`, `product:SKU-001`) |
| `value` | TEXT | JSON-serialized value |
| `version` | INTEGER | Monotonically increasing version per key (optimistic concurrency) |
| `updated_at` | INTEGER | Unix timestamp of last update |
| `updated_by` | TEXT | Public key (hex) of the sender that last modified this key |
| `block_height` | INTEGER | Block height at which this key was last modified |

### `tx_pool`

Temporary storage for pending (unconfirmed) transactions.

```sql
CREATE TABLE tx_pool (
  hash     TEXT PRIMARY KEY,
  raw      TEXT NOT NULL,
  received INTEGER NOT NULL,
  priority INTEGER DEFAULT 0
);
```

### `nonces`

Tracks the last-used nonce per sender for replay protection.

```sql
CREATE TABLE nonces (
  sender TEXT PRIMARY KEY,
  nonce  INTEGER NOT NULL DEFAULT 0
);
```

### `meta`

General-purpose metadata key-value store for internal use.

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### `peers`

Stores known peer information for peer discovery persistence.

```sql
CREATE TABLE peers (
  id         TEXT PRIMARY KEY,
  public_key TEXT UNIQUE NOT NULL,
  address    TEXT NOT NULL,
  org_id     TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'validator',
  added_at   INTEGER NOT NULL
);
```

### Indexes

The migration creates the following indexes for query performance:

```sql
CREATE INDEX idx_tx_sender   ON transactions(sender);
CREATE INDEX idx_tx_block    ON transactions(block_height);
CREATE INDEX idx_tx_type     ON transactions(type);
CREATE INDEX idx_state_updated ON world_state(updated_at);
CREATE INDEX idx_state_block   ON world_state(block_height);
```

## Migrations System

MiniLedger uses a simple, forward-only migration system. Migrations are defined as an array of `{ version, sql }` objects in `src/storage/migrations.ts`.

### How It Works

1. On initialization, the `_migrations` tracking table is created if it does not exist:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

2. The system queries all previously applied migration versions.
3. For each migration not yet applied, it runs the SQL within a transaction and records the version:

```typescript
migrate(): void {
  const applied = this.db
    .prepare("SELECT version FROM _migrations ORDER BY version")
    .all();
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      this.db.transaction(() => {
        this.db.exec(migration.sql);
        this.db.prepare(
          "INSERT INTO _migrations (version, applied_at) VALUES (?, ?)"
        ).run(migration.version, Date.now());
      })();
    }
  }
}
```

### Adding New Migrations

To add a new migration, append to the `MIGRATIONS` array with the next version number:

```typescript
export const MIGRATIONS = [
  { version: 1, sql: `...` },       // Initial schema
  { version: 2, sql: `            // Example: add a new column
    ALTER TABLE blocks ADD COLUMN extra TEXT DEFAULT '';
  ` },
];
```

Migrations are idempotent -- running `migrate()` multiple times has no effect on already-applied migrations.

## Store Classes

The storage layer is organized into three store classes, each operating on a specific domain:

### `BlockStore`

Handles block persistence and retrieval.

| Method | Description |
|---|---|
| `insert(block)` | Insert a block into the `blocks` table |
| `getByHeight(height)` | Retrieve a block by its height |
| `getByHash(hash)` | Retrieve a block by its hash |
| `getLatest()` | Get the most recent block |
| `getRange(from, to)` | Get a range of blocks by height |
| `count()` | Return the total block count |

### `StateStore`

Manages the world state (key-value pairs).

| Method | Description |
|---|---|
| `get(key)` | Read a state entry by key |
| `set(key, value, updatedBy, blockHeight)` | Write or update a state entry (auto-increments version) |
| `delete(key)` | Remove a state entry |
| `query(sql, params)` | Execute a read-only SQL SELECT query |
| `computeStateRoot()` | Compute the SHA-256 hash of the entire world state |
| `count()` | Return the total number of state entries |

### `TxStore`

Manages transactions including the pending pool.

| Method | Description |
|---|---|
| `getByHash(hash)` | Retrieve a confirmed transaction |
| `addToPending(tx)` | Add a transaction to the pending pool |
| `getPending(limit)` | Get pending transactions (ordered by received time) |
| `removePending(hashes)` | Remove transactions from the pending pool after confirmation |
| `pendingCount()` | Return the number of pending transactions |
| `getNextNonce(sender)` | Get the next nonce for a sender |
| `updateNonce(sender, nonce)` | Update the last-used nonce for a sender |

## State Root Computation

The state root is a SHA-256 hash of the entire `world_state` table, providing a deterministic fingerprint of the ledger state at a given block height. All nodes must compute the same state root for the same sequence of blocks.

```typescript
computeStateRoot(): string {
  const rows = this.db
    .prepare("SELECT key, value, version FROM world_state ORDER BY key ASC")
    .all();

  if (rows.length === 0) {
    return "0".repeat(64);  // Empty state: 64 zeros
  }

  const stateString = rows
    .map(r => `${r.key}:${r.value}:${r.version}`)
    .join("|");

  return sha256Hex(stateString);
}
```

The computation works as follows:

1. Read all rows from `world_state` ordered by `key` ascending (deterministic order).
2. If the table is empty, return a 64-character string of zeros.
3. Concatenate each row as `key:value:version`, joined by `|`.
4. Compute the SHA-256 hash of the concatenated string.

The state root is included in every block header, enabling any node to verify that its state matches the proposer's state after applying the same transactions.

## SQL Queries

One of MiniLedger's distinguishing features is the ability to run SQL queries directly against the world state. The `StateStore.query()` method accepts a SQL string and parameters:

```typescript
query(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }
  return this.db.prepare(sql).all(...params);
}
```

**Safety**: Only `SELECT` queries are permitted. Any attempt to run `INSERT`, `UPDATE`, `DELETE`, or `DROP` will be rejected.

### Example Queries

```sql
-- Get all state keys matching a prefix
SELECT key, value FROM world_state WHERE key LIKE 'product:%'

-- Find recently updated entries
SELECT key, value, updated_at
FROM world_state
WHERE updated_at > ?
ORDER BY updated_at DESC

-- Count entries by block height
SELECT block_height, COUNT(*) as count
FROM world_state
GROUP BY block_height
ORDER BY block_height DESC

-- Cross-table query: find all transactions for a specific block
SELECT t.hash, t.type, t.sender, t.timestamp
FROM transactions t
WHERE t.block_height = ?
ORDER BY t.position
```

Via the REST API:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM world_state WHERE key LIKE ?", "params": ["balance:%"]}'
```

## Atomic Block Application

Block application uses SQLite's transaction support to ensure atomicity. If any transaction within a block fails to apply, the entire block is rolled back:

```typescript
this.db.raw().transaction(() => {
  for (const tx of block.transactions) {
    this.applyTransaction(tx, block.height);
  }
  this.chain.appendBlock(block);
  this.blockStore.insert(block);
  this.txStore.removePending(block.transactions.map(tx => tx.hash));
  for (const tx of block.transactions) {
    this.txStore.updateNonce(tx.sender, tx.nonce);
  }
})();
```

The `better-sqlite3` `transaction()` method wraps the callback in `BEGIN IMMEDIATE ... COMMIT`, with automatic `ROLLBACK` on any thrown error. This guarantees that the database is never in an inconsistent state.

## Data Directory Layout

All node data is stored in a single directory (configurable via `dataDir`):

```
data/
  ledger.db          # Main SQLite database
  ledger.db-wal      # WAL file (auto-managed by SQLite)
  ledger.db-shm      # Shared memory file (auto-managed by SQLite)
  keystore.json      # Encrypted Ed25519 keypair
```

## Performance Characteristics

| Operation | Complexity | Notes |
|---|---|---|
| Block insert | O(T) | T = number of transactions in the block |
| State get | O(log N) | SQLite B-tree index lookup |
| State set | O(log N) | UPSERT with version increment |
| State root | O(N) | Full table scan, ordered by key |
| SQL query | Varies | Depends on query complexity and indexes |
| Pending pool | O(1) amortized | Hash-indexed pool |

For most workloads, MiniLedger can process hundreds of transactions per second on a single machine. The state root computation is the most expensive operation per block and scales linearly with the number of state entries.
