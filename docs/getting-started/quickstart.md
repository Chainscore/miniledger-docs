---
title: Quick Start
description: Get a MiniLedger blockchain node running in 5 minutes. Initialize a node, start producing blocks, submit transactions via curl, query world state with SQL, and open the built-in block explorer dashboard.
keywords:
  - miniledger quickstart
  - blockchain quickstart
  - miniledger tutorial
  - private blockchain tutorial
  - submit blockchain transaction
  - query blockchain sql
  - block explorer
  - miniledger getting started
slug: /getting-started/quickstart
sidebar_position: 2
---

# Quick Start

This guide walks you through the core MiniLedger workflow: initializing a node, starting it, submitting transactions, querying world state with SQL, and using the built-in block explorer. The entire process takes under 5 minutes.

## Prerequisites

Make sure MiniLedger is installed. If not, follow the [Installation](/docs/getting-started/installation) guide first.

```bash
miniledger --version
```

## Step 1: Initialize a Node

Create a new MiniLedger node in your current directory:

```bash
miniledger init
```

This creates a `./miniledger-data` directory with the following contents:

- **chain.db** -- SQLite database for block storage
- **state.db** -- SQLite database for the world state
- **keys/** -- Ed25519 keypair for node identity and transaction signing
- **miniledger.config.json** -- Default configuration file

You can verify the generated identity:

```bash
miniledger keys show
```

Output:

```
Node Identity
  Public Key:  ed25519:7Hf3k9...xQ2m
  Node ID:     node-a1b2c3
  Org ID:      default
```

## Step 2: Start the Node

Start the blockchain node:

```bash
miniledger start
```

You should see output similar to:

```
[INFO] MiniLedger v1.x.x starting...
[INFO] Node ID: node-a1b2c3
[INFO] Consensus: solo
[INFO] P2P listening on ws://0.0.0.0:4440
[INFO] API server listening on http://0.0.0.0:4441
[INFO] Block explorer available at http://localhost:4441
[INFO] Block #1 produced (0 transactions)
```

The node is now running in solo consensus mode (single node), producing empty blocks at the default interval of 1 second. Leave this terminal open and open a **new terminal** for the next steps.

## Step 3: Check Node Status

From a second terminal, verify the node is running:

```bash
miniledger status
```

Output:

```
Node Status
  State:       running
  Block Height: 5
  Consensus:   solo
  Peers:       0
  Uptime:      12s
```

You can also check status via the REST API:

```bash
curl http://localhost:4441/api/status
```

## Step 4: Submit a Transaction

Submit your first transaction using `curl`. This writes a key-value pair to the world state:

```bash
curl -X POST http://localhost:4441/api/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "put",
    "key": "asset:001",
    "value": {
      "name": "Laptop",
      "owner": "alice",
      "status": "active",
      "purchaseDate": "2025-06-15"
    }
  }'
```

Response:

```json
{
  "txId": "tx-8f4e2a...",
  "status": "committed",
  "blockHeight": 8
}
```

Submit a few more transactions to populate the ledger:

```bash
# Second asset
curl -X POST http://localhost:4441/api/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "put",
    "key": "asset:002",
    "value": {
      "name": "Monitor",
      "owner": "bob",
      "status": "active",
      "purchaseDate": "2025-07-20"
    }
  }'

# Third asset
curl -X POST http://localhost:4441/api/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "put",
    "key": "asset:003",
    "value": {
      "name": "Keyboard",
      "owner": "alice",
      "status": "retired",
      "purchaseDate": "2024-01-10"
    }
  }'
```

You can also submit transactions using the CLI:

```bash
miniledger tx submit --type put --key "asset:004" --value '{"name":"Mouse","owner":"bob","status":"active"}'
```

## Step 5: Query World State with SQL

MiniLedger's world state is stored in SQLite, which means you can query it using standard SQL. Use the query API endpoint:

**Retrieve all assets:**

```bash
curl "http://localhost:4441/api/query?sql=SELECT * FROM state WHERE key LIKE 'asset:%'"
```

Response:

```json
{
  "results": [
    { "key": "asset:001", "value": "{\"name\":\"Laptop\",\"owner\":\"alice\",\"status\":\"active\",\"purchaseDate\":\"2025-06-15\"}" },
    { "key": "asset:002", "value": "{\"name\":\"Monitor\",\"owner\":\"bob\",\"status\":\"active\",\"purchaseDate\":\"2025-07-20\"}" },
    { "key": "asset:003", "value": "{\"name\":\"Keyboard\",\"owner\":\"alice\",\"status\":\"retired\",\"purchaseDate\":\"2024-01-10\"}" },
    { "key": "asset:004", "value": "{\"name\":\"Mouse\",\"owner\":\"bob\",\"status\":\"active\"}" }
  ]
}
```

**Filter by owner using JSON extraction:**

```bash
curl "http://localhost:4441/api/query?sql=SELECT key, json_extract(value, '$.owner') AS owner, json_extract(value, '$.name') AS name FROM state WHERE key LIKE 'asset:%' AND json_extract(value, '$.owner') = 'alice'"
```

Response:

```json
{
  "results": [
    { "key": "asset:001", "owner": "alice", "name": "Laptop" },
    { "key": "asset:003", "owner": "alice", "name": "Keyboard" }
  ]
}
```

**Count assets by status:**

```bash
curl "http://localhost:4441/api/query?sql=SELECT json_extract(value, '$.status') AS status, COUNT(*) AS count FROM state WHERE key LIKE 'asset:%' GROUP BY status"
```

Response:

```json
{
  "results": [
    { "status": "active", "count": 3 },
    { "status": "retired", "count": 1 }
  ]
}
```

You can also query from the CLI:

```bash
miniledger query "SELECT * FROM state WHERE key LIKE 'asset:%'"
```

## Step 6: Open the Block Explorer

MiniLedger includes a built-in block explorer dashboard. Open your browser and navigate to:

```
http://localhost:4441
```

The dashboard provides:

- **Block list** -- Browse all blocks with height, timestamp, hash, and transaction count
- **Transaction details** -- Inspect individual transactions, including payload, signatures, and execution results
- **World state browser** -- View and search the current state of the ledger
- **Network overview** -- See connected peers, consensus status, and node health
- **Real-time updates** -- The dashboard automatically refreshes as new blocks are produced

## Step 7: Stop the Node

When you are finished, switch back to the terminal running the node and press `Ctrl+C`:

```
[INFO] Shutting down gracefully...
[INFO] P2P server closed
[INFO] API server closed
[INFO] Databases flushed and closed
[INFO] MiniLedger stopped
```

Your data is persisted in `./miniledger-data` and will be available the next time you run `miniledger start`.

## What You Just Did

In this quick start, you:

1. **Initialized** a MiniLedger node with auto-generated Ed25519 identity keys
2. **Started** the node in solo consensus mode with P2P and API servers
3. **Submitted** transactions that wrote structured data to the immutable ledger
4. **Queried** the world state using standard SQL, including JSON extraction and aggregation
5. **Explored** blocks, transactions, and state through the built-in dashboard

All of this without writing a single line of configuration, installing Docker, or provisioning any external infrastructure.

## Next Steps

- **[Demo Mode](/docs/getting-started/demo)** -- Spin up a 3-node Raft cluster with a sample token contract in one command
- **[Configuration](/docs/getting-started/configuration)** -- Customize ports, consensus, logging, and more
- **[Multi-Node Clusters](/docs/guides/multi-node-cluster)** -- Set up a production Raft cluster across multiple machines
- **[Smart Contracts](/docs/guides/smart-contracts)** -- Write and deploy JavaScript smart contracts
- **[SQL Queries](/docs/guides/sql-queries)** -- Advanced query patterns and JSON functions
