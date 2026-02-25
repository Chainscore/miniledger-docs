---
title: CLI Reference
description: Complete command-line interface reference for MiniLedger. Covers node initialization, startup, cluster management, transaction submission, state queries, and key management.
keywords:
  - miniledger cli
  - command line
  - blockchain cli
  - node management
  - miniledger commands
  - ledger cli
  - raft cluster cli
sidebar_position: 2
---

# CLI Reference

The `miniledger` command-line interface provides commands for initializing nodes, managing clusters, submitting transactions, and querying state. It is installed globally when you install the MiniLedger package.

## Installation

```bash
npm install -g miniledger
```

After installation, the `miniledger` command is available in your terminal.

```bash
miniledger --help
```

---

## Commands

### miniledger init

Initialize a new MiniLedger node. This creates the data directory, generates a cryptographic key pair, and writes the default configuration file.

```bash
miniledger init [options]
```

**Options**

| Flag        | Alias | Default        | Description                        |
|-------------|-------|----------------|------------------------------------|
| `--dir`     | `-d`  | `./miniledger` | Path to the node's data directory  |

**Example**

```bash
# Initialize with defaults
miniledger init

# Initialize in a custom directory
miniledger init -d /var/lib/miniledger/node1
```

**Output**

```
Initialized MiniLedger node in ./miniledger
  Node ID:    abc123def456
  Public Key: 04a1b2c3d4e5f6...
  Config:     ./miniledger/config.json
```

**What it creates:**

```
miniledger/
  config.json       # Node configuration
  keys/
    private.pem     # Ed25519 private key
    public.pem      # Ed25519 public key
  data/
    blockchain.db   # SQLite database (created on first start)
```

:::caution
The `keys/private.pem` file contains your node's private key. Keep it secure and never share it. If compromised, any entity with access can sign transactions as your node.
:::

---

### miniledger start

Start the MiniLedger node. This boots the blockchain engine, P2P networking layer, consensus module, and REST API server.

```bash
miniledger start [options]
```

**Options**

| Flag          | Alias | Default        | Description                                   |
|---------------|-------|----------------|-----------------------------------------------|
| `--dir`       | `-d`  | `./miniledger` | Path to the node's data directory             |
| `--consensus` | —     | `raft`         | Consensus mechanism: `raft` or `solo`         |
| `--p2p-port`  | —     | `4000`         | Port for peer-to-peer communication           |
| `--api-port`  | —     | `3000`         | Port for the REST API server                  |

**Example**

```bash
# Start with defaults
miniledger start

# Start with custom ports and solo consensus
miniledger start --consensus solo --p2p-port 4001 --api-port 3001

# Start from a specific data directory
miniledger start -d /var/lib/miniledger/node1 --p2p-port 4001 --api-port 3001
```

**Output**

```
MiniLedger node starting...
  Consensus: raft
  P2P:       listening on 0.0.0.0:4000
  API:       listening on 0.0.0.0:3000
  Node ID:   abc123def456
  Height:    0

Node is ready.
```

**Consensus modes:**

| Mode   | Description                                                                                  |
|--------|----------------------------------------------------------------------------------------------|
| `raft` | Fault-tolerant consensus for multi-node clusters. Requires a minimum of 3 nodes for safety.  |
| `solo` | Single-node mode. The node is both leader and sole validator. Suitable for development.       |

---

### miniledger join

Join an existing MiniLedger network by connecting to a known peer node.

```bash
miniledger join <address> [options]
```

**Arguments**

| Argument    | Required | Description                                                |
|-------------|----------|------------------------------------------------------------|
| `address`   | Yes      | Address of the peer to connect to (format: `host:port`)    |

**Options**

| Flag         | Alias | Default        | Description                          |
|--------------|-------|----------------|--------------------------------------|
| `--dir`      | `-d`  | `./miniledger` | Path to the node's data directory    |
| `--p2p-port` | —     | `4000`         | Port for peer-to-peer communication  |
| `--api-port` | —     | `3000`         | Port for the REST API server         |

**Example**

```bash
# Join a network via a known peer
miniledger join 192.168.1.10:4000

# Join with custom ports and data directory
miniledger join 192.168.1.10:4000 -d ./node2 --p2p-port 4001 --api-port 3001
```

**Output**

```
Joining network via 192.168.1.10:4000...
  Connected to peer def456abc789
  Syncing blockchain... done (142 blocks)
  P2P: listening on 0.0.0.0:4001
  API: listening on 0.0.0.0:3001

Node joined the network successfully.
```

The joining node will:
1. Connect to the specified peer over P2P.
2. Discover additional peers in the network.
3. Synchronize the full blockchain history.
4. Begin participating in consensus.

---

### miniledger demo

Launch a 3-node demo cluster on localhost. This is the fastest way to explore MiniLedger's multi-node capabilities without manual configuration.

```bash
miniledger demo
```

**Example**

```bash
miniledger demo
```

**Output**

```
Starting 3-node demo cluster...

  Node 1: API http://localhost:3000  P2P :4000  (leader)
  Node 2: API http://localhost:3001  P2P :4001
  Node 3: API http://localhost:3002  P2P :4002

Cluster is ready. Press Ctrl+C to stop all nodes.

Dashboard: http://localhost:3000/dashboard
```

The demo command:
- Creates three temporary data directories.
- Initializes three nodes with distinct key pairs.
- Starts all three nodes with Raft consensus.
- Connects the nodes to form a cluster.
- Elects a leader automatically.

All data is stored in temporary directories and cleaned up when the process exits.

---

### miniledger status

Display the current status of the running node, including blockchain height, peer count, consensus role, and uptime.

```bash
miniledger status
```

**Example**

```bash
miniledger status
```

**Output**

```
MiniLedger Node Status
  Node ID:    abc123def456
  Height:     142
  Peers:      2
  Consensus:  raft (leader, term 5)
  Uptime:     1h 23m 45s
  API:        http://localhost:3000
  Version:    1.0.0
```

This command queries the local node's REST API (`GET /status`) and formats the response for the terminal.

---

### miniledger tx submit

Submit a transaction to the network.

```bash
miniledger tx submit <json>
```

**Arguments**

| Argument | Required | Description                                              |
|----------|----------|----------------------------------------------------------|
| `json`   | Yes      | JSON string representing the transaction body            |

**Example: Key-Value transaction**

```bash
miniledger tx submit '{"key":"account:alice","value":"{\"balance\":100}"}'
```

**Example: Typed payload transaction**

```bash
miniledger tx submit '{"type":"transfer","payload":{"from":"alice","to":"bob","amount":50}}'
```

**Output**

```
Transaction submitted successfully.
  Hash:   b2c3d4e5f6a7...
  Status: pending
```

**Error Output**

```
Error: Invalid transaction — missing key or type.
```

:::tip
When passing JSON on the command line, use single quotes around the entire JSON string to prevent shell interpretation of special characters. On Windows, use escaped double quotes instead.
:::

---

### miniledger query

Execute a SQL query against the node's state database. This command provides a convenient way to inspect and analyze state data from the terminal.

```bash
miniledger query <sql>
```

**Arguments**

| Argument | Required | Description            |
|----------|----------|------------------------|
| `sql`    | Yes      | SQL query string       |

**Example**

```bash
# List all account keys
miniledger query "SELECT key, value FROM state WHERE key LIKE 'account:%'"
```

**Output**

```
┌──────────────────┬──────────────────────────┐
│ key              │ value                    │
├──────────────────┼──────────────────────────┤
│ account:alice    │ {"balance":150}          │
│ account:bob      │ {"balance":200}          │
└──────────────────┴──────────────────────────┘
2 rows returned.
```

```bash
# Count total state entries
miniledger query "SELECT COUNT(*) as total FROM state"
```

**Output**

```
┌───────┐
│ total │
├───────┤
│ 85    │
└───────┘
1 row returned.
```

:::caution
Only `SELECT` statements are permitted. The query runs in read-only mode.
:::

---

### miniledger keys show

Display the node's public key. This is the key used to identify and verify the node's identity on the network.

```bash
miniledger keys show
```

**Example**

```bash
miniledger keys show
```

**Output**

```
Public Key: 04a1b2c3d4e5f6789012345678901234567890abcdef...
```

The public key is read from the `keys/public.pem` file in the node's data directory. Share this key with other network participants to verify transactions signed by this node.

---

### miniledger peers list

List all peers currently connected to the node.

```bash
miniledger peers list
```

**Example**

```bash
miniledger peers list
```

**Output**

```
Connected Peers (2):
  1. def456abc789  192.168.1.10:4000  connected 1h ago
  2. ghi789jkl012  192.168.1.11:4000  connected 45m ago
```

---

## Global Behavior

### Exit Codes

| Code | Meaning                                                  |
|------|----------------------------------------------------------|
| `0`  | Command completed successfully                           |
| `1`  | General error (invalid arguments, runtime failure, etc.) |

### Environment Variables

| Variable               | Description                                      | Default        |
|------------------------|--------------------------------------------------|----------------|
| `MINILEDGER_DIR`       | Default data directory (overridden by `--dir`)   | `./miniledger` |
| `MINILEDGER_API_PORT`  | Default API port (overridden by `--api-port`)    | `3000`         |
| `MINILEDGER_P2P_PORT`  | Default P2P port (overridden by `--p2p-port`)    | `4000`         |
| `MINILEDGER_LOG_LEVEL` | Logging verbosity: `debug`, `info`, `warn`, `error` | `info`     |

### Signal Handling

The MiniLedger process responds to the following signals:

| Signal    | Behavior                                                  |
|-----------|-----------------------------------------------------------|
| `SIGINT`  | Graceful shutdown (close connections, flush data, exit)    |
| `SIGTERM` | Graceful shutdown (same as `SIGINT`)                      |

---

## Quick Reference

```bash
# Full lifecycle: init, start, and interact
miniledger init -d ./mynode
miniledger start -d ./mynode --api-port 3000 --p2p-port 4000

# In another terminal
miniledger status
miniledger tx submit '{"key":"greeting","value":"hello world"}'
miniledger query "SELECT * FROM state WHERE key = 'greeting'"
miniledger keys show
miniledger peers list
```

```bash
# Multi-node cluster
miniledger init -d ./node1
miniledger start -d ./node1 --api-port 3000 --p2p-port 4000

miniledger init -d ./node2
miniledger join localhost:4000 -d ./node2 --api-port 3001 --p2p-port 4001

miniledger init -d ./node3
miniledger join localhost:4000 -d ./node3 --api-port 3002 --p2p-port 4002
```
