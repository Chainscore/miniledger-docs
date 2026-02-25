---
title: Node.js Programmatic API
description: Complete reference for the MiniLedger Node.js TypeScript API. Covers node creation, lifecycle management, transaction submission, state queries, block access, and event handling.
keywords:
  - miniledger sdk
  - node.js api
  - typescript api
  - programmatic api
  - blockchain sdk
  - embedded ledger
  - miniledger node
  - transaction api
  - event-driven blockchain
sidebar_position: 3
---

# Node.js Programmatic API

MiniLedger can be embedded directly into any Node.js or TypeScript application. The programmatic API gives you full control over the node lifecycle, transaction submission, state queries, and event handling.

## Installation

```bash
npm install miniledger
```

## Quick Start

```typescript
import { MiniLedger } from "miniledger";

const node = await MiniLedger.create({
  dataDir: "./my-ledger",
  config: {
    consensus: "solo",
    apiPort: 3000,
    p2pPort: 4000,
  },
});

await node.init();
await node.start();

// Submit a transaction
const tx = await node.submit({ key: "greeting", value: "hello world" });
console.log("Transaction hash:", tx.hash);

// Query state
const entry = await node.getState("greeting");
console.log("State:", entry?.value);

// Graceful shutdown
await node.stop();
```

---

## Factory

### MiniLedger.create(options?)

Creates a new `MiniLedgerNode` instance. This does **not** initialize or start the node; call `node.init()` and `node.start()` separately.

```typescript
static async create(options?: MiniLedgerOptions): Promise<MiniLedgerNode>
```

**Parameters**

| Parameter          | Type                          | Required | Description                         |
|--------------------|-------------------------------|----------|-------------------------------------|
| `options`          | `MiniLedgerOptions`           | No       | Configuration options               |
| `options.dataDir`  | `string`                      | No       | Path to the data directory. Defaults to `"./miniledger"`. |
| `options.config`   | `Partial<MiniLedgerConfig>`   | No       | Override default configuration values. |

**Returns**

`Promise<MiniLedgerNode>` -- A configured but uninitialized node instance.

**Example**

```typescript
import { MiniLedger } from "miniledger";

// Minimal (all defaults)
const node = await MiniLedger.create();

// Custom configuration
const node = await MiniLedger.create({
  dataDir: "/var/lib/miniledger",
  config: {
    consensus: "raft",
    apiPort: 3000,
    p2pPort: 4000,
    logLevel: "debug",
  },
});
```

---

## Types

### MiniLedgerConfig

Full node configuration. Pass a `Partial<MiniLedgerConfig>` to `MiniLedger.create()` to override specific fields.

```typescript
interface MiniLedgerConfig {
  /** Consensus mechanism: "raft" or "solo" */
  consensus: "raft" | "solo";

  /** Port for the REST API server */
  apiPort: number;

  /** Port for peer-to-peer communication */
  p2pPort: number;

  /** Logging verbosity */
  logLevel: "debug" | "info" | "warn" | "error";

  /** Maximum transactions per block */
  maxBlockSize: number;

  /** Block interval in milliseconds */
  blockInterval: number;
}
```

### Transaction

Represents a transaction in the ledger.

```typescript
interface Transaction {
  /** SHA-256 hash of the transaction */
  hash: string;

  /** Transaction type identifier */
  type: string;

  /** State key (for key-value transactions) */
  key?: string;

  /** State value (for key-value transactions) */
  value?: string;

  /** Arbitrary payload (for typed transactions) */
  payload?: Record<string, unknown>;

  /** Public key of the sender */
  sender: string;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Cryptographic signature */
  signature: string;

  /** Current status */
  status: "pending" | "confirmed";

  /** Block height (present only when confirmed) */
  blockHeight?: number;

  /** Block hash (present only when confirmed) */
  blockHash?: string;
}
```

### Block

Represents a block in the blockchain.

```typescript
interface Block {
  /** Block height in the chain */
  height: number;

  /** SHA-256 hash of the block */
  hash: string;

  /** Hash of the previous block */
  previousHash: string;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Merkle root of the block's transactions */
  merkleRoot: string;

  /** Transactions included in this block */
  transactions: Transaction[];
}
```

### StateEntry

Represents a single key-value entry in the state database.

```typescript
interface StateEntry {
  /** State key */
  key: string;

  /** Stored value */
  value: string;

  /** Timestamp of last update in milliseconds */
  updatedAt: number;

  /** Block height of last update */
  blockHeight: number;
}
```

### NodeStatus

Runtime status of the node.

```typescript
interface NodeStatus {
  /** Unique node identifier */
  nodeId: string;

  /** Current blockchain height */
  height: number;

  /** Number of connected peers */
  peers: number;

  /** Uptime in seconds */
  uptime: number;

  /** Active consensus mechanism */
  consensus: "raft" | "solo";

  /** Node's consensus role */
  role: "leader" | "follower" | "candidate";

  /** Software version */
  version: string;
}
```

---

## Lifecycle Methods

### node.init()

Initialize the node. Creates the data directory, generates cryptographic keys (if they do not exist), and prepares the database. Must be called before `start()`.

```typescript
async init(): Promise<void>
```

**Example**

```typescript
const node = await MiniLedger.create({ dataDir: "./my-node" });
await node.init();
// Node is now initialized but not running
```

**Throws**

- If the data directory cannot be created or written to.
- If key generation fails.

---

### node.start()

Start the node. Boots the P2P server, REST API server, and consensus engine. The node begins listening for connections and participating in the network.

```typescript
async start(): Promise<void>
```

**Example**

```typescript
await node.init();
await node.start();
// Node is running and accepting connections
```

**Throws**

- If the node has not been initialized.
- If the configured ports are already in use.

---

### node.stop()

Gracefully stop the node. Closes all peer connections, stops the API server, flushes pending data to disk, and shuts down the consensus engine.

```typescript
async stop(): Promise<void>
```

**Example**

```typescript
// Graceful shutdown
await node.stop();
console.log("Node stopped.");
```

**Throws**

- If the node is not currently running.

---

## Transaction Methods

### node.submit(params)

Submit a new transaction to the network. The transaction is signed with the node's private key, added to the mempool, and propagated to peers. It will be included in a future block once consensus is reached.

```typescript
async submit(params: SubmitParams): Promise<Transaction>
```

**Parameters**

```typescript
interface SubmitParams {
  /** Transaction type identifier */
  type?: string;

  /** State key (for key-value transactions) */
  key?: string;

  /** State value (for key-value transactions) */
  value?: string;

  /** Arbitrary payload (for typed transactions) */
  payload?: Record<string, unknown>;
}
```

Either `key`+`value` or `type`+`payload` must be provided.

**Returns**

`Promise<Transaction>` -- The submitted transaction with status `"pending"`.

**Example: Key-Value transaction**

```typescript
const tx = await node.submit({
  key: "account:alice",
  value: JSON.stringify({ balance: 100 }),
});

console.log(tx.hash);   // "b2c3d4e5f6a7..."
console.log(tx.status); // "pending"
```

**Example: Typed payload transaction**

```typescript
const tx = await node.submit({
  type: "transfer",
  payload: {
    from: "alice",
    to: "bob",
    amount: 50,
  },
});

console.log(tx.hash);
console.log(tx.type); // "transfer"
```

**Throws**

- If neither `key`/`value` nor `type`/`payload` is provided.
- If the node is not running.

---

### node.getTransaction(hash)

Retrieve a transaction by its hash. Works for both pending and confirmed transactions.

```typescript
async getTransaction(hash: string): Promise<Transaction | null>
```

**Parameters**

| Parameter | Type     | Description        |
|-----------|----------|--------------------|
| `hash`    | `string` | Transaction hash   |

**Returns**

`Promise<Transaction | null>` -- The transaction, or `null` if not found.

**Example**

```typescript
const tx = await node.getTransaction("b2c3d4e5f6a7...");

if (tx) {
  console.log(`Status: ${tx.status}`);
  if (tx.status === "confirmed") {
    console.log(`Confirmed in block ${tx.blockHeight}`);
  }
} else {
  console.log("Transaction not found.");
}
```

---

## State Methods

### node.getState(key)

Retrieve a single state entry by its key.

```typescript
async getState(key: string): Promise<StateEntry | null>
```

**Parameters**

| Parameter | Type     | Description   |
|-----------|----------|---------------|
| `key`     | `string` | State key     |

**Returns**

`Promise<StateEntry | null>` -- The state entry, or `null` if the key does not exist.

**Example**

```typescript
const entry = await node.getState("account:alice");

if (entry) {
  const data = JSON.parse(entry.value);
  console.log(`Alice's balance: ${data.balance}`);
} else {
  console.log("Key not found.");
}
```

---

### node.query(sql, params?)

Execute a SQL query against the state database. This is a read-only operation. Only `SELECT` statements are permitted.

```typescript
async query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>
```

**Parameters**

| Parameter | Type        | Required | Description                  |
|-----------|-------------|----------|------------------------------|
| `sql`     | `string`    | Yes      | SQL query string             |
| `params`  | `unknown[]` | No       | Parameterized query values   |

**Returns**

`Promise<Record<string, unknown>[]>` -- Array of result rows.

**Example**

```typescript
// Simple query
const results = await node.query("SELECT key, value FROM state WHERE key LIKE 'account:%'");

for (const row of results) {
  console.log(`${row.key}: ${row.value}`);
}
```

```typescript
// Parameterized query
const results = await node.query(
  "SELECT * FROM state WHERE key = ? OR key = ?",
  ["account:alice", "account:bob"]
);

console.log(`Found ${results.length} entries.`);
```

```typescript
// Aggregation
const [{ total }] = await node.query("SELECT COUNT(*) as total FROM state");
console.log(`Total state entries: ${total}`);
```

**Throws**

- If the SQL statement is not a `SELECT`.
- If the SQL syntax is invalid.

---

## Block Methods

### node.getBlock(height)

Retrieve a block by its height in the chain.

```typescript
async getBlock(height: number): Promise<Block | null>
```

**Parameters**

| Parameter | Type     | Description   |
|-----------|----------|---------------|
| `height`  | `number` | Block height  |

**Returns**

`Promise<Block | null>` -- The block with full transaction data, or `null` if the height exceeds the chain length.

**Example**

```typescript
const block = await node.getBlock(42);

if (block) {
  console.log(`Block ${block.height}`);
  console.log(`  Hash:         ${block.hash}`);
  console.log(`  Transactions: ${block.transactions.length}`);
  console.log(`  Timestamp:    ${new Date(block.timestamp).toISOString()}`);
}
```

---

### node.getLatestBlock()

Retrieve the most recently committed block.

```typescript
async getLatestBlock(): Promise<Block | null>
```

**Returns**

`Promise<Block | null>` -- The latest block, or `null` if no blocks have been created yet (genesis state).

**Example**

```typescript
const latest = await node.getLatestBlock();

if (latest) {
  console.log(`Chain height: ${latest.height}`);
  console.log(`Latest hash:  ${latest.hash}`);
} else {
  console.log("No blocks yet.");
}
```

---

## Node Info Methods

### node.getStatus()

Returns the current runtime status of the node. This is a synchronous method.

```typescript
getStatus(): NodeStatus
```

**Returns**

`NodeStatus` -- Current status including height, peer count, role, and uptime.

**Example**

```typescript
const status = node.getStatus();

console.log(`Height: ${status.height}`);
console.log(`Peers:  ${status.peers}`);
console.log(`Role:   ${status.role}`);
console.log(`Uptime: ${status.uptime}s`);
```

---

### node.getPublicKey()

Returns the node's public key as a hex-encoded string.

```typescript
getPublicKey(): string
```

**Returns**

`string` -- Hex-encoded public key.

**Example**

```typescript
const pubKey = node.getPublicKey();
console.log(`Public Key: ${pubKey}`);
// "04a1b2c3d4e5f6..."
```

---

### node.getNodeId()

Returns the node's unique identifier.

```typescript
getNodeId(): string
```

**Returns**

`string` -- Node identifier string.

**Example**

```typescript
const nodeId = node.getNodeId();
console.log(`Node ID: ${nodeId}`);
// "abc123def456"
```

---

## Events

`MiniLedgerNode` extends `EventEmitter` and emits the following events throughout its lifecycle. Use these events to build reactive applications on top of the ledger.

### block:created

Emitted when this node creates a new block (leader only).

```typescript
node.on("block:created", (block: Block) => {
  console.log(`Created block ${block.height} with ${block.transactions.length} transactions`);
});
```

| Callback Parameter | Type    | Description          |
|--------------------|---------|----------------------|
| `block`            | `Block` | The newly created block |

---

### block:received

Emitted when a new block is received from the network and appended to the local chain.

```typescript
node.on("block:received", (block: Block) => {
  console.log(`Received block ${block.height} from leader`);
});
```

| Callback Parameter | Type    | Description            |
|--------------------|---------|------------------------|
| `block`            | `Block` | The received block     |

---

### tx:submitted

Emitted when a transaction is submitted to the mempool (either locally or received from a peer).

```typescript
node.on("tx:submitted", (tx: Transaction) => {
  console.log(`New pending transaction: ${tx.hash}`);
});
```

| Callback Parameter | Type          | Description                |
|--------------------|---------------|----------------------------|
| `tx`               | `Transaction` | The submitted transaction  |

---

### tx:confirmed

Emitted when a transaction is confirmed by inclusion in a committed block.

```typescript
node.on("tx:confirmed", (tx: Transaction) => {
  console.log(`Transaction ${tx.hash} confirmed in block ${tx.blockHeight}`);
});
```

| Callback Parameter | Type          | Description                 |
|--------------------|---------------|-----------------------------|
| `tx`               | `Transaction` | The confirmed transaction   |

---

### started

Emitted when the node has fully started and is ready to accept connections and transactions.

```typescript
node.on("started", () => {
  console.log("Node is ready.");
});
```

---

### stopped

Emitted when the node has completed its graceful shutdown.

```typescript
node.on("stopped", () => {
  console.log("Node stopped.");
});
```

---

### error

Emitted when an unrecoverable or notable error occurs.

```typescript
node.on("error", (err: Error) => {
  console.error("Node error:", err.message);
});
```

| Callback Parameter | Type    | Description     |
|--------------------|---------|-----------------|
| `err`              | `Error` | The error object |

:::tip
Always attach an `error` event handler. In Node.js, unhandled `error` events on `EventEmitter` instances will crash the process.
:::

---

## Complete Example

The following example demonstrates the full lifecycle of an embedded MiniLedger node, including initialization, transaction submission, event handling, state querying, and graceful shutdown.

```typescript
import { MiniLedger } from "miniledger";
import type { Block, Transaction } from "miniledger";

async function main() {
  // 1. Create and initialize the node
  const node = await MiniLedger.create({
    dataDir: "./my-app-ledger",
    config: {
      consensus: "solo",
      apiPort: 3000,
      p2pPort: 4000,
      logLevel: "info",
    },
  });

  await node.init();

  // 2. Register event handlers
  node.on("block:created", (block: Block) => {
    console.log(`[Block] #${block.height} created with ${block.transactions.length} tx`);
  });

  node.on("tx:confirmed", (tx: Transaction) => {
    console.log(`[TX] ${tx.hash.slice(0, 12)}... confirmed in block #${tx.blockHeight}`);
  });

  node.on("error", (err: Error) => {
    console.error("[Error]", err.message);
  });

  // 3. Start the node
  await node.start();
  console.log(`Node started. ID: ${node.getNodeId()}`);
  console.log(`Public Key: ${node.getPublicKey()}`);

  // 4. Submit transactions
  const tx1 = await node.submit({
    key: "account:alice",
    value: JSON.stringify({ balance: 1000 }),
  });
  console.log(`Submitted tx: ${tx1.hash}`);

  const tx2 = await node.submit({
    type: "transfer",
    payload: { from: "alice", to: "bob", amount: 250 },
  });
  console.log(`Submitted tx: ${tx2.hash}`);

  // 5. Wait for confirmation then query
  // (In solo mode, confirmation is near-instant)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 6. Read state
  const aliceState = await node.getState("account:alice");
  if (aliceState) {
    console.log("Alice's account:", JSON.parse(aliceState.value));
  }

  // 7. SQL query
  const results = await node.query(
    "SELECT key, value FROM state WHERE key LIKE ?",
    ["account:%"]
  );
  console.log(`Found ${results.length} accounts.`);

  // 8. Inspect blockchain
  const latest = await node.getLatestBlock();
  if (latest) {
    console.log(`Latest block: #${latest.height}, hash: ${latest.hash}`);
  }

  const status = node.getStatus();
  console.log(`Chain height: ${status.height}, Peers: ${status.peers}`);

  // 9. Look up a transaction
  const found = await node.getTransaction(tx1.hash);
  console.log(`TX status: ${found?.status}`);

  // 10. Graceful shutdown
  await node.stop();
  console.log("Done.");
}

main().catch(console.error);
```

---

## Error Handling

All async methods may throw errors. Wrap calls in try-catch blocks for robust error handling.

```typescript
try {
  const tx = await node.submit({ key: "test", value: "data" });
  console.log("Submitted:", tx.hash);
} catch (err) {
  if (err instanceof Error) {
    console.error("Failed to submit transaction:", err.message);
  }
}
```

Common error scenarios:

| Error                              | Cause                                             |
|------------------------------------|----------------------------------------------------|
| `"Node is not initialized"`        | Called `start()` before `init()`                   |
| `"Node is not running"`            | Called `submit()` or query methods before `start()` |
| `"Port XXXX is already in use"`    | Another process is using the configured port       |
| `"Invalid transaction parameters"` | Neither `key`/`value` nor `type`/`payload` provided |
| `"Read-only query violation"`      | Attempted a mutation in `query()`                  |
