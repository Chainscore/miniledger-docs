---
title: Architecture Overview
description: High-level architecture of MiniLedger, a single-process Node.js private blockchain framework with Raft consensus, WebSocket mesh networking, SQLite storage, and Ed25519 cryptography.
keywords: [miniledger architecture, blockchain architecture, node.js blockchain, single-process blockchain, raft consensus, sqlite blockchain, ed25519, private blockchain design]
sidebar_position: 1
---

# Architecture Overview

MiniLedger is a single-process, embeddable private blockchain framework for Node.js. It is designed to give developers the guarantees of a distributed ledger -- immutability, auditability, cryptographic integrity -- without the infrastructure complexity of traditional enterprise blockchain platforms.

This document describes the high-level architecture, component responsibilities, and data flow within a MiniLedger node.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MiniLedgerNode                             │
│                    (Node Orchestrator)                           │
│                                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  REST API  │  │    Raft      │  │     P2P Networking       │  │
│  │  (Hono)    │  │  Consensus   │  │  (WebSocket Mesh)        │  │
│  │           │  │              │  │                          │  │
│  │ /blocks   │  │ Leader       │  │ PeerManager              │  │
│  │ /txs      │  │ Election     │  │ ├── WsServer             │  │
│  │ /state    │  │ Log          │  │ ├── WsClient             │  │
│  │ /query    │  │ Replication  │  │ ├── BlockSync             │  │
│  │ /identity │  │ Commit       │  │ └── MessageRouter         │  │
│  │ /govern   │  │ Index        │  │                          │  │
│  └─────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│        │               │                       │                │
│  ┌─────┴───────────────┴───────────────────────┴─────────────┐  │
│  │                  Contracts & Governance                     │  │
│  │                                                            │  │
│  │  ContractRegistry    Governor    ContractContext            │  │
│  │  ├── deploy()        ├── propose()                         │  │
│  │  ├── invoke()        └── vote()                            │  │
│  │  └── compileContract()                                     │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────┴──────────────────────────────────┐  │
│  │                      Core Layer                             │  │
│  │                                                            │  │
│  │  Chain         Block          Transaction     Merkle Tree  │  │
│  │  ├── init()    ├── hash       ├── hash        ├── root     │  │
│  │  ├── append()  ├── prevHash   ├── sender      └── verify   │  │
│  │  └── propose() ├── stateRoot  ├── nonce                    │  │
│  │                ├── merkleRoot ├── payload                   │  │
│  │                └── signature  └── signature                 │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────┴──────────────────────────────────┐  │
│  │               Storage & Cryptography                        │  │
│  │                                                            │  │
│  │  SQLite (better-sqlite3, WAL)    Ed25519 (@noble/ed25519)  │  │
│  │  ├── blocks                      ├── generateKeyPair()     │  │
│  │  ├── transactions                ├── sign()                │  │
│  │  ├── world_state                 ├── verify()              │  │
│  │  ├── tx_pool                     └── keystore.json         │  │
│  │  ├── nonces                                                │  │
│  │  └── meta                                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Overview

### Node Orchestrator (`MiniLedgerNode`)

The `MiniLedgerNode` class is the top-level entry point. It initializes all subsystems, manages the node lifecycle, and coordinates data flow between components. Key responsibilities:

- **Initialization**: Opens the database, runs migrations, loads or generates the Ed25519 keypair, and restores the chain from storage.
- **Consensus mode selection**: Starts either **solo mode** (single-node block production on a timer) or **raft mode** (multi-node consensus with P2P networking).
- **Transaction submission**: Validates incoming transactions, adds them to the pending pool, broadcasts them to peers, and forwards to the Raft leader when necessary.
- **Block production**: In solo mode, produces blocks at a configurable interval. In raft mode, the leader proposes blocks through consensus.
- **State application**: Applies transaction payloads to the world state inside SQLite transactions, supporting `state:set`, `state:delete`, `contract:deploy`, `contract:invoke`, `governance:propose`, and `governance:vote`.

### REST API (Hono)

A lightweight HTTP API built on [Hono](https://hono.dev) that exposes the ledger for external consumption:

| Endpoint Group | Purpose |
|---|---|
| `/api/blocks` | Query blocks by height or hash |
| `/api/transactions` | Submit and query transactions |
| `/api/state` | Read world state entries |
| `/api/query` | Execute read-only SQL queries against world_state |
| `/api/identity` | View node identity and status |
| `/api/network` | List connected peers |
| `/api/governance` | Create proposals and cast votes |

### Raft Consensus

MiniLedger implements the [Raft consensus algorithm](https://raft.github.io/) for multi-node deployments. A key design simplification: **Raft log entries ARE block proposals**. A committed Raft entry directly becomes a finalized block on the chain. This eliminates the need for a separate consensus-to-chain translation layer.

See [Consensus Deep Dive](./consensus.md) for full details.

### P2P Networking (WebSocket Mesh)

Nodes communicate over a WebSocket mesh using the `ws` library. The `PeerManager` orchestrates connections, handshakes, peer discovery, and health checks. A `MessageRouter` dispatches typed messages to registered handlers.

See [Networking](./networking.md) for the full protocol specification.

### Contracts & Governance

**ContractRegistry** manages smart contract deployment and invocation. Contracts are JavaScript functions that return an object of named methods. Each method receives a `ContractContext` providing `get()`, `set()`, `del()`, `sender`, `blockHeight`, `timestamp`, and `log()`.

**Governor** handles on-chain governance: creating proposals, casting votes, and tallying results.

### Core Layer

The core layer provides the fundamental blockchain data structures:

- **Chain**: Maintains the in-memory chain tip, validates block linkage, and proposes new blocks.
- **Block**: Contains `height`, `hash`, `previousHash`, `merkleRoot`, `stateRoot`, `timestamp`, `proposer`, `signature`, and `transactions[]`.
- **Transaction**: Contains `hash`, `type`, `sender`, `nonce`, `timestamp`, `payload`, and `signature`. Six transaction types are supported (`state:set`, `state:delete`, `contract:deploy`, `contract:invoke`, `governance:propose`, `governance:vote`).
- **Merkle Tree**: Computes binary Merkle roots from transaction hashes using SHA-256. Odd-length levels duplicate the last element.

### Storage (SQLite)

All persistent data is stored in a single SQLite database (`ledger.db`) using `better-sqlite3` with WAL (Write-Ahead Logging) mode for concurrent read performance. The schema includes tables for blocks, transactions, world state, the transaction pool, nonces, and metadata.

See [Storage](./storage.md) for schema details and the migration system.

### Cryptography (Ed25519)

All identities and signatures use Ed25519 elliptic curve cryptography via `@noble/ed25519` and `@noble/hashes`. The node's keypair is stored in an encrypted `keystore.json` file. The `nodeId` is the first 16 hex characters of the public key.

See [Identity & Cryptography](./identity.md) for keystore format and signing details.

## Data Flow

### Transaction Lifecycle

```
Client                    Node A (Leader)           Node B (Follower)
  │                           │                           │
  │── POST /api/transactions ─▶│                           │
  │                           │── validate tx             │
  │                           │── sign tx                 │
  │                           │── add to pending pool     │
  │                           │── broadcast TX_BROADCAST ─▶│
  │                           │                           │── add to pending pool
  │                           │                           │
  │                    [block timer fires]                 │
  │                           │                           │
  │                           │── collect pending txs     │
  │                           │── apply to world state    │
  │                           │── compute stateRoot       │
  │                           │── build + sign block      │
  │                           │                           │
  │                    [Raft log replication]              │
  │                           │                           │
  │                           │── AppendEntries(block) ──▶│
  │                           │◀── AppendEntriesReply ────│
  │                           │                           │
  │                    [majority acknowledged]             │
  │                           │                           │
  │                           │── advance commitIndex     │
  │                           │── apply block to chain    │
  │                           │── persist to SQLite       │
  │                           │                           │
  │                           │       (follower applies   │
  │                           │        committed block)   │
  │◀── 201 { hash, ... } ────│                           │
```

### Block Production (Solo Mode)

In solo mode, block production is simpler -- there is no Raft replication step. The node runs a periodic timer (configurable via `consensus.blockTimeMs`) that:

1. Collects pending transactions (up to `consensus.maxTxPerBlock`).
2. Applies each transaction to the world state within a SQLite transaction.
3. Computes the state root from the `world_state` table.
4. Builds and signs the block.
5. Appends the block to the chain and persists it to storage.
6. Removes confirmed transactions from the pending pool.

### Block Production (Raft Mode)

In raft mode, only the leader produces blocks:

1. The leader collects pending transactions and builds a signed block.
2. The block is proposed as a Raft log entry (`proposeBlock()`).
3. The entry is replicated to followers via `AppendEntries` RPCs.
4. Once a majority of nodes acknowledge the entry, the commit index advances.
5. All nodes (leader and followers) apply the committed block to their local chain and state.

## Design Principles

| Principle | Implementation |
|---|---|
| **Zero-config** | Single `npm install` and `npx miniledger start` gets a working node |
| **Single-process** | No Docker, no JVM, no external services -- just one Node.js process |
| **SQL-queryable** | World state lives in SQLite, queryable with standard SQL |
| **Embeddable** | Import `MiniLedgerNode` as a library in any Node.js application |
| **Cryptographic integrity** | Every block and transaction is SHA-256 hashed and Ed25519 signed |
| **Deterministic state** | State root computed from ordered world_state ensures all nodes converge |

## Module Map

| Module | Path | Responsibility |
|---|---|---|
| Node Orchestrator | `src/node.ts` | Top-level lifecycle and coordination |
| Core | `src/core/` | Block, transaction, chain, merkle, hashing |
| Storage | `src/storage/` | SQLite database, block/state/tx stores, migrations |
| Identity | `src/identity/` | Ed25519 keypair, signing, keystore encryption |
| Network | `src/network/` | WebSocket server/client, peer manager, sync, protocol |
| Consensus | `src/consensus/` | Raft leader election, log replication, commit |
| Contracts | `src/contracts/` | Contract compilation, execution, registry, built-ins |
| Governance | `src/governance/` | Proposals, voting, policies |
| Privacy | `src/privacy/` | ACL, encryption, key exchange, privacy policies |
| API | `src/api/` | Hono HTTP routes, middleware |
| CLI | `src/cli/` | Command-line interface (start, init, keys, tx, query) |
| Config | `src/config/` | Configuration loading, schema, defaults |
