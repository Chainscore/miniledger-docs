---
title: Introduction to MiniLedger
description: MiniLedger is a zero-config private blockchain framework for Node.js with Raft consensus, SQLite-based state, JavaScript smart contracts, and a built-in block explorer. Learn what it is, who it is for, and how to get started.
keywords:
  - miniledger
  - private blockchain
  - node.js blockchain
  - permissioned ledger
  - enterprise blockchain
  - distributed ledger
  - raft consensus
  - javascript smart contracts
  - sql blockchain
  - hyperledger alternative
slug: /intro
sidebar_position: 1
---

# Introduction to MiniLedger

MiniLedger is a private blockchain framework built for Node.js that eliminates the infrastructure overhead traditionally associated with distributed ledger technology. There is no Docker, no Kubernetes, and no JVM -- just `npm install miniledger` and you have a fully functional permissioned blockchain running in seconds.

## What is MiniLedger?

MiniLedger is an embeddable, SQL-queryable distributed ledger designed for teams that need the guarantees of a blockchain -- immutability, cryptographic auditability, and decentralized consensus -- without the operational complexity of platforms like Hyperledger Fabric or Corda. It runs as a native Node.js process, stores its world state in SQLite, and exposes a REST API alongside a built-in block explorer dashboard.

At its core, MiniLedger provides:

- **An append-only chain of cryptographically linked blocks** secured with Ed25519 signatures
- **A deterministic world state** backed by SQLite, queryable with standard SQL
- **Raft consensus** for crash-fault-tolerant multi-node clusters
- **JavaScript smart contracts** that run in a sandboxed environment
- **Per-record AES-256-GCM encryption** with fine-grained access control lists
- **On-chain governance** with proposal submission and voting mechanics
- **WebSocket-based P2P networking** for low-latency node communication

## Who is MiniLedger For?

MiniLedger is designed for developers and teams who need a private, permissioned ledger but want to avoid the steep learning curve and infrastructure demands of enterprise blockchain platforms.

**Internal tooling and microservices** -- Embed a tamper-evident ledger directly into your Node.js application for audit trails, configuration change tracking, or inter-service coordination.

**Startups and small teams** -- Stand up a multi-node consortium blockchain on commodity hardware without dedicated DevOps resources.

**Prototyping and education** -- Spin up a working blockchain in under a minute to experiment with smart contracts, consensus algorithms, and distributed state.

**Regulated environments** -- Leverage per-record encryption and on-chain governance to meet compliance requirements for data privacy and change management.

## Key Features

### Zero Configuration

MiniLedger works out of the box. Run `npx miniledger init` to initialize a node and `npx miniledger start` to begin producing blocks. No configuration files, container orchestration, or external databases required.

### SQLite World State

Unlike most blockchain platforms that use proprietary key-value stores, MiniLedger persists its world state in SQLite. This means you can query ledger data using familiar SQL syntax -- `SELECT`, `JOIN`, `WHERE`, `GROUP BY` -- through the built-in query API.

### Raft Consensus

MiniLedger uses the Raft consensus algorithm for multi-node deployments, providing crash-fault tolerance with strong consistency guarantees. A cluster of `2f + 1` nodes tolerates up to `f` node failures. For single-node development, a `solo` consensus mode is available.

### JavaScript Smart Contracts

Write smart contracts in plain JavaScript. No Solidity, no Go chaincode, no new language to learn. Contracts are deployed as transactions and executed deterministically across all nodes.

### Privacy and Encryption

Sensitive data can be encrypted at the record level using AES-256-GCM. Access control lists determine which identities can decrypt specific records, enabling multi-party workflows where participants only see the data they are authorized to access.

### On-Chain Governance

Network configuration changes, contract upgrades, and policy decisions can be managed through MiniLedger's built-in governance system. Participants submit proposals and vote on-chain, with configurable approval thresholds.

### Built-In Block Explorer

MiniLedger ships with a browser-based dashboard for inspecting blocks, transactions, world state, and network health. No external tools needed -- just open `http://localhost:4441` in your browser.

### Ed25519 Identity

Every node and user is identified by an Ed25519 keypair. All transactions are cryptographically signed, providing non-repudiation and tamper detection at every layer.

## Quick Links

| Topic | Description |
|-------|-------------|
| [Installation](/docs/getting-started/installation) | Install MiniLedger via npm and verify your setup |
| [Quick Start](/docs/getting-started/quickstart) | Initialize a node, submit a transaction, and query state in 5 minutes |
| [Demo Mode](/docs/getting-started/demo) | Spin up a 3-node Raft cluster with sample data in one command |
| [Configuration](/docs/getting-started/configuration) | Full reference for all configuration options, environment variables, and CLI flags |
| [Multi-Node Clusters](/docs/guides/multi-node-cluster) | Set up a production-grade Raft cluster across multiple machines |
| [Smart Contracts](/docs/guides/smart-contracts) | Write, deploy, and invoke JavaScript smart contracts |
| [Governance](/docs/guides/governance) | Submit proposals and vote on network changes |
| [Privacy and Encryption](/docs/guides/privacy-encryption) | Configure per-record encryption and access control lists |
| [SQL Queries](/docs/guides/sql-queries) | Query the world state with SQL through the REST API |
| [REST API Reference](/docs/api-reference/rest-api) | Complete HTTP API documentation |
| [CLI Reference](/docs/api-reference/cli) | All CLI commands and flags |
| [Architecture Overview](/docs/architecture/overview) | How MiniLedger works under the hood |

## How It Works in 30 Seconds

```bash
# Install
npm install -g miniledger

# Initialize a new node
miniledger init

# Start the node
miniledger start

# Submit a transaction (from another terminal)
curl -X POST http://localhost:4441/api/tx \
  -H "Content-Type: application/json" \
  -d '{"type": "put", "key": "asset:001", "value": {"owner": "alice", "status": "active"}}'

# Query the world state with SQL
curl "http://localhost:4441/api/query?sql=SELECT%20*%20FROM%20state%20WHERE%20key%20LIKE%20'asset:%25'"
```

Open `http://localhost:4441` in your browser to explore blocks, transactions, and state through the built-in dashboard.

## Next Steps

Ready to get started? Head to the [Installation](/docs/getting-started/installation) guide to set up MiniLedger on your machine.
