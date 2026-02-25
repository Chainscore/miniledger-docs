---
title: Programmatic API
description: Embed MiniLedger directly in your Node.js application. Learn MiniLedger.create(), lifecycle methods, transaction submission, SQL queries, event handling, and TypeScript types.
keywords:
  - miniledger programmatic API
  - embedded blockchain
  - node.js blockchain library
  - miniledger npm
  - blockchain events
  - typescript blockchain
  - miniledger create
  - submit transaction
  - blockchain query API
  - embedded ledger node.js
sidebar_position: 6
---

# Programmatic API

MiniLedger can be used as an **embedded library** directly inside your Node.js application. Instead of running a separate `miniledger` process and communicating via the REST API, you instantiate a ledger node in-process, giving you low-latency access to all ledger operations.

This approach is ideal for:

- **Microservices** that need an embedded audit log or state store
- **Testing** smart contracts in CI/CD pipelines
- **Desktop or Electron applications** with local-first data
- **Serverless functions** that need a lightweight persistent ledger

## Installation

```bash
npm install miniledger
```

MiniLedger requires **Node.js 18 or later**.

## Quick Start

```javascript
import { MiniLedger } from 'miniledger';

// Create a node instance
const node = await MiniLedger.create({ dataDir: './my-ledger' });

// Initialize (generates identity, creates genesis block if new)
await node.init();

// Start the node (begins accepting transactions)
await node.start();

// Submit a key-value transaction
await node.submit({ key: 'hello', value: 'world' });

// Query the world state
const rows = await node.query('SELECT * FROM world_state WHERE key = ?', ['hello']);
console.log(rows);
// [{ key: 'hello', value: 'world', version: 1, updated_at: '...', updated_by: '...', block_height: 1 }]

// Stop the node gracefully
await node.stop();
```

## API Reference

### `MiniLedger.create(options)`

Creates a new MiniLedger node instance. This is an async factory method that sets up the internal components but does not start the node.

```javascript
const node = await MiniLedger.create({
  dataDir: './my-ledger',
});
```

**Options:**

| Option | Type | Required | Default | Description |
|---|---|:---:|---|---|
| `dataDir` | `string` | Yes | -- | Path to the directory for storing ledger data (blocks, state, config) |

**Returns:** `Promise<MiniLedgerNode>`

:::tip
If the `dataDir` does not exist, it will be created automatically. If it already contains ledger data, the existing ledger is loaded.
:::

### `node.init()`

Initializes the node. For a new data directory, this generates the node's identity (key pair), creates the genesis block, and sets up the database. For an existing data directory, this loads the existing state.

```javascript
await node.init();
```

**Returns:** `Promise<void>`

### `node.start()`

Starts the node. After this call, the node accepts transactions and (if configured for multi-node) participates in Raft consensus.

```javascript
await node.start();
```

**Returns:** `Promise<void>`

**Behavior:**

- In single-node mode, the node immediately becomes the leader
- In multi-node mode, the node begins the Raft election process
- The P2P and API servers are started if ports are configured
- Event listeners begin firing

### `node.stop()`

Gracefully stops the node. Flushes pending writes, closes database connections, and shuts down network listeners.

```javascript
await node.stop();
```

**Returns:** `Promise<void>`

:::caution
Always call `node.stop()` before your process exits. Failure to do so may result in data corruption or incomplete writes.
:::

### `node.submit(transaction)`

Submits a transaction to the ledger. The transaction is appended to the Raft log, replicated to peers (in multi-node mode), and committed to the world state.

```javascript
// Simple key-value write
const receipt = await node.submit({
  key: 'user:alice',
  value: JSON.stringify({ name: 'Alice', role: 'admin' }),
});

console.log(receipt);
// {
//   txId: 'tx-abc123...',
//   status: 'committed',
//   blockHeight: 5
// }
```

**Parameters:**

| Field | Type | Required | Description |
|---|---|:---:|---|
| `key` | `string` | Yes | The key to write in the world state |
| `value` | `string \| number \| object` | Yes | The value to store. Objects are JSON-serialized. |

**Returns:** `Promise<TransactionReceipt>`

#### Submitting Typed Transactions

For smart contract deployment and invocation, use the full transaction format:

```javascript
// Deploy a contract
const deployReceipt = await node.submit({
  type: 'contract:deploy',
  payload: {
    kind: 'contract:deploy',
    name: 'counter',
    version: '1.0.0',
    code: `return {
      increment(ctx) {
        const count = ctx.get('count') || 0;
        ctx.set('count', count + 1);
        return count + 1;
      },
      get(ctx) {
        return ctx.get('count') || 0;
      }
    };`,
  },
});

// Invoke a contract
const invokeReceipt = await node.submit({
  type: 'contract:invoke',
  payload: {
    kind: 'contract:invoke',
    contract: 'counter',
    method: 'increment',
    args: [],
  },
});
console.log(invokeReceipt.result); // 1
```

#### Submitting Governance Transactions

```javascript
// Submit a governance proposal
await node.submit({
  type: 'governance:propose',
  payload: {
    proposalType: 'update-config',
    description: 'Increase block size limit',
    params: {
      key: 'block.maxSize',
      value: 2048,
    },
  },
});

// Vote on a proposal
await node.submit({
  type: 'governance:vote',
  payload: {
    proposalId: 'prop-abc123...',
    vote: 'yes',
  },
});
```

### `node.query(sql, params?)`

Executes a read-only SQL query against the world state.

```javascript
// Simple query
const rows = await node.query('SELECT * FROM world_state WHERE key LIKE ?', ['balance:%']);

// Aggregation
const [{ total }] = await node.query(
  'SELECT SUM(CAST(value AS REAL)) AS total FROM world_state WHERE key LIKE ?',
  ['balance:%']
);

// No parameters
const allKeys = await node.query('SELECT COUNT(*) AS count FROM world_state');
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `sql` | `string` | Yes | SQL query string. Only `SELECT` statements are allowed. |
| `params` | `any[]` | No | Parameterized values for `?` placeholders (default: `[]`) |

**Returns:** `Promise<Row[]>` -- An array of objects, one per result row, with column names as keys.

## Events

MiniLedger emits events that you can listen to for real-time monitoring, logging, and application integration. Use the standard Node.js `EventEmitter` pattern.

### Available Events

| Event | Payload | Description |
|---|---|---|
| `block:created` | `{ blockHeight, txCount, timestamp }` | A new block has been committed to the chain |
| `tx:submitted` | `{ txId, type, key }` | A transaction has been submitted (before commit) |
| `tx:committed` | `{ txId, type, blockHeight }` | A transaction has been committed to a block |
| `tx:rejected` | `{ txId, type, error }` | A transaction was rejected |
| `peer:joined` | `{ peerId, address }` | A new peer joined the cluster |
| `peer:left` | `{ peerId, reason }` | A peer left or was removed from the cluster |
| `leader:elected` | `{ leaderId, term }` | A new Raft leader was elected |
| `state:changed` | `{ key, value, version, blockHeight }` | A world state entry was created or updated |

### Listening to Events

```javascript
import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './data' });
await node.init();

// Listen for new blocks
node.on('block:created', (block) => {
  console.log(`Block #${block.blockHeight} created with ${block.txCount} transactions`);
});

// Listen for committed transactions
node.on('tx:committed', (tx) => {
  console.log(`Transaction ${tx.txId} committed at block ${tx.blockHeight}`);
});

// Listen for rejected transactions
node.on('tx:rejected', (tx) => {
  console.error(`Transaction ${tx.txId} rejected: ${tx.error}`);
});

// Listen for state changes on specific keys
node.on('state:changed', (change) => {
  if (change.key.startsWith('balance:')) {
    console.log(`Balance updated: ${change.key} = ${change.value}`);
  }
});

// Listen for cluster membership changes
node.on('peer:joined', (peer) => {
  console.log(`Peer ${peer.peerId} joined from ${peer.address}`);
});

node.on('leader:elected', (leader) => {
  console.log(`New leader: ${leader.leaderId} (term ${leader.term})`);
});

await node.start();
```

### One-Time Event Listeners

Use `node.once()` to listen for an event only once:

```javascript
// Wait for the first block after start
node.once('block:created', (block) => {
  console.log('First block created:', block);
});
```

### Removing Event Listeners

```javascript
const handler = (block) => console.log(block);
node.on('block:created', handler);

// Later...
node.off('block:created', handler);
```

## TypeScript Types

MiniLedger ships with full TypeScript declarations. Import types directly from the package:

```typescript
import {
  MiniLedger,
  MiniLedgerNode,
  MiniLedgerOptions,
  Transaction,
  TransactionReceipt,
  TransactionType,
  QueryResult,
  BlockEvent,
  TxEvent,
  PeerEvent,
  LeaderEvent,
  StateChangeEvent,
} from 'miniledger';
```

### Key Type Definitions

```typescript
interface MiniLedgerOptions {
  dataDir: string;
}

interface Transaction {
  type?: TransactionType;
  key?: string;
  value?: string | number | object;
  payload?: ContractDeployPayload | ContractInvokePayload | GovernancePayload;
}

type TransactionType =
  | 'kv:put'
  | 'kv:delete'
  | 'contract:deploy'
  | 'contract:invoke'
  | 'governance:propose'
  | 'governance:vote'
  | 'acl:set';

interface TransactionReceipt {
  txId: string;
  status: 'committed' | 'rejected';
  blockHeight: number;
  result?: any;
  error?: string;
}

interface ContractDeployPayload {
  kind: 'contract:deploy';
  name: string;
  version: string;
  code: string;
}

interface ContractInvokePayload {
  kind: 'contract:invoke';
  contract: string;
  method: string;
  args?: any[];
}

interface QueryResult {
  key: string;
  value: string;
  version: number;
  updated_at: string;
  updated_by: string;
  block_height: number;
}

interface BlockEvent {
  blockHeight: number;
  txCount: number;
  timestamp: number;
}

interface TxEvent {
  txId: string;
  type: TransactionType;
  key?: string;
  blockHeight?: number;
  error?: string;
}

interface PeerEvent {
  peerId: string;
  address?: string;
  reason?: string;
}

interface LeaderEvent {
  leaderId: string;
  term: number;
}

interface StateChangeEvent {
  key: string;
  value: any;
  version: number;
  blockHeight: number;
}
```

### TypeScript Usage Example

```typescript
import { MiniLedger, TransactionReceipt, QueryResult } from 'miniledger';

async function main(): Promise<void> {
  const node = await MiniLedger.create({ dataDir: './ts-ledger' });
  await node.init();
  await node.start();

  // Type-safe transaction submission
  const receipt: TransactionReceipt = await node.submit({
    key: 'config:version',
    value: '2.0.0',
  });

  if (receipt.status === 'committed') {
    console.log(`Committed at block ${receipt.blockHeight}`);
  }

  // Type-safe queries
  const results: QueryResult[] = await node.query(
    'SELECT * FROM world_state WHERE key LIKE ?',
    ['config:%']
  );

  for (const row of results) {
    console.log(`${row.key} = ${row.value} (v${row.version})`);
  }

  await node.stop();
}

main().catch(console.error);
```

## Complete Application Example

Here is a full example of a simple REST service backed by an embedded MiniLedger node:

```javascript
import express from 'express';
import { MiniLedger } from 'miniledger';

const app = express();
app.use(express.json());

let node;

// Initialize MiniLedger
async function initLedger() {
  node = await MiniLedger.create({ dataDir: './app-ledger' });
  await node.init();
  await node.start();

  node.on('block:created', (block) => {
    console.log(`Block #${block.blockHeight} committed`);
  });
}

// Write an entry
app.post('/entries', async (req, res) => {
  const { key, value } = req.body;

  try {
    const receipt = await node.submit({ key, value });
    res.json(receipt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Read an entry
app.get('/entries/:key', async (req, res) => {
  const rows = await node.query(
    'SELECT key, value, version, updated_at FROM world_state WHERE key = ?',
    [req.params.key]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(rows[0]);
});

// Search entries
app.get('/search', async (req, res) => {
  const { prefix, limit = 50 } = req.query;
  const rows = await node.query(
    'SELECT key, value, version FROM world_state WHERE key LIKE ? LIMIT ?',
    [`${prefix}%`, Number(limit)]
  );
  res.json(rows);
});

// Start the server
initLedger().then(() => {
  app.listen(3000, () => {
    console.log('App running on http://localhost:3000');
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await node.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await node.stop();
  process.exit(0);
});
```

## Multi-Node Programmatic Setup

You can also configure multi-node clusters programmatically:

```javascript
import { MiniLedger } from 'miniledger';

// Bootstrap node
const node1 = await MiniLedger.create({ dataDir: './node1' });
await node1.init();
await node1.start({
  consensus: 'raft',
  p2pPort: 4440,
  apiPort: 4441,
});

// Joining node
const node2 = await MiniLedger.create({ dataDir: './node2' });
await node2.init();
await node2.start({
  consensus: 'raft',
  p2pPort: 4442,
  apiPort: 4443,
  joinAddress: 'ws://localhost:4440',
});
```

## Error Handling

All async methods throw on failure. Use `try/catch` for error handling:

```javascript
try {
  const receipt = await node.submit({ key: 'test', value: 'data' });

  if (receipt.status === 'rejected') {
    console.error(`Transaction rejected: ${receipt.error}`);
  }
} catch (err) {
  if (err.code === 'NOT_LEADER') {
    console.error('This node is not the leader. Submit to:', err.leaderAddress);
  } else if (err.code === 'NODE_NOT_STARTED') {
    console.error('Node has not been started. Call node.start() first.');
  } else {
    console.error('Unexpected error:', err);
  }
}
```

### Common Error Codes

| Code | Description |
|---|---|
| `NOT_LEADER` | Transaction was submitted to a follower node. Includes `leaderAddress` for redirect. |
| `NODE_NOT_STARTED` | `submit()` or `query()` called before `node.start()` |
| `NODE_STOPPED` | Operation attempted after `node.stop()` |
| `INVALID_TRANSACTION` | Transaction payload is malformed |
| `CONTRACT_NOT_FOUND` | Referenced contract does not exist |
| `EXECUTION_TIMEOUT` | Contract method exceeded the 5-second timeout |

## Next Steps

- [Multi-Node Cluster](/docs/guides/multi-node-cluster) -- Set up a distributed cluster for high availability
- [Smart Contracts](/docs/guides/smart-contracts) -- Write and deploy contracts using `node.submit()`
- [SQL Queries](/docs/guides/sql-queries) -- Advanced query patterns for `node.query()`
