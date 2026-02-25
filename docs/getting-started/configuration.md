---
title: Configuration Reference
description: Complete configuration reference for MiniLedger. Covers the miniledger.config.json file, all options with types and defaults, environment variable overrides, and CLI flag overrides for the private blockchain framework.
keywords:
  - miniledger configuration
  - miniledger config
  - blockchain configuration
  - miniledger.config.json
  - miniledger environment variables
  - miniledger cli flags
  - raft configuration
  - blockchain node config
  - miniledger ports
  - miniledger settings
slug: /getting-started/configuration
sidebar_position: 4
---

# Configuration Reference

MiniLedger is designed to work with zero configuration. Default values are chosen for sensible single-node development. When you need to customize behavior -- for multi-node clusters, production deployments, or specific networking requirements -- MiniLedger provides three layers of configuration, applied in order of increasing priority:

1. **Config file** (`miniledger.config.json`) -- base configuration
2. **Environment variables** -- override specific settings without modifying the file
3. **CLI flags** -- highest priority, override everything else

## Configuration File

The configuration file is a JSON file named `miniledger.config.json`, located inside the data directory. When you run `miniledger init`, a default configuration file is generated automatically.

**Default location:**

```
./miniledger-data/miniledger.config.json
```

**Example full configuration:**

```json
{
  "dataDir": "./miniledger-data",
  "node": {
    "name": "node-1",
    "orgId": "default",
    "role": "validator"
  },
  "network": {
    "listenAddress": "0.0.0.0",
    "p2pPort": 4440,
    "apiPort": 4441,
    "peers": [],
    "maxPeers": 50
  },
  "consensus": {
    "algorithm": "raft",
    "blockTimeMs": 1000,
    "maxTxPerBlock": 500
  },
  "api": {
    "enabled": true,
    "cors": "*"
  },
  "logging": {
    "level": "info"
  }
}
```

## Full Options Reference

### Top-Level Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dataDir` | `string` | `"./miniledger-data"` | Path to the directory where MiniLedger stores chain data, state databases, keys, and configuration. Can be an absolute or relative path. |

### `node` -- Node Identity

Settings that identify this node within the network.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `node.name` | `string` | Auto-generated | Human-readable name for this node. Used in logs, peer lists, and the block explorer dashboard. If not specified, a random name is generated during `init`. |
| `node.orgId` | `string` | `"default"` | Organization identifier for this node. Used for access control and governance grouping. Nodes in the same organization can be managed together for voting and ACL purposes. |
| `node.role` | `string` | `"validator"` | The role of this node in the network. Determines whether the node participates in consensus and block production. Possible values: `"validator"` (full consensus participant), `"observer"` (replicates chain but does not vote or produce blocks). |

### `network` -- Networking

Settings that control how the node communicates with peers and exposes its API.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `network.listenAddress` | `string` | `"0.0.0.0"` | IP address to bind for both P2P and API servers. Use `"0.0.0.0"` to listen on all interfaces, or `"127.0.0.1"` to restrict to localhost only. |
| `network.p2pPort` | `number` | `4440` | TCP port for WebSocket P2P communication. Used for Raft consensus messages, block propagation, and peer discovery. |
| `network.apiPort` | `number` | `4441` | TCP port for the REST API server and block explorer dashboard. Clients use this port to submit transactions, run queries, and access the web UI. |
| `network.peers` | `string[]` | `[]` | Array of peer WebSocket URLs to connect to on startup. Format: `"ws://host:port"`. Example: `["ws://192.168.1.10:4440", "ws://192.168.1.11:4440"]`. Peers are also discovered dynamically through gossip, so you only need to specify a subset of known peers. |
| `network.maxPeers` | `number` | `50` | Maximum number of concurrent peer connections. Limits the number of inbound and outbound P2P connections to prevent resource exhaustion. |

### `consensus` -- Consensus Algorithm

Settings that control block production and consensus behavior.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `consensus.algorithm` | `string` | `"raft"` | The consensus algorithm to use. Possible values: `"raft"` (Raft consensus for multi-node crash-fault-tolerant clusters; requires a quorum of `2f + 1` nodes to tolerate `f` failures) or `"solo"` (single-node mode for development; the node produces blocks unilaterally without peer coordination). |
| `consensus.blockTimeMs` | `number` | `1000` | Target time between blocks in milliseconds. The leader produces a new block at this interval. Lower values mean faster finality but higher resource usage. Minimum: `100`. Recommended range: `500`--`5000`. |
| `consensus.maxTxPerBlock` | `number` | `500` | Maximum number of transactions included in a single block. Transactions exceeding this limit are queued for the next block. Larger values increase throughput but also increase block size and propagation time. |

### `api` -- REST API and Dashboard

Settings for the HTTP API server and built-in block explorer.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api.enabled` | `boolean` | `true` | Whether to start the REST API server and block explorer dashboard. Set to `false` if this node should only participate in P2P consensus without exposing an HTTP interface (useful for internal validator nodes). |
| `api.cors` | `string` | `"*"` | CORS (Cross-Origin Resource Sharing) policy for the API server. Set to `"*"` to allow requests from any origin, or specify a comma-separated list of allowed origins (e.g., `"https://app.example.com,https://admin.example.com"`). For production deployments, restrict this to your application's domain. |

### `logging` -- Log Output

Settings that control log verbosity.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logging.level` | `string` | `"info"` | Minimum log level. Messages below this level are suppressed. Possible values (from most to least verbose): `"debug"`, `"info"`, `"warn"`, `"error"`. Use `"debug"` during development for detailed consensus and transaction processing logs. Use `"warn"` or `"error"` in production to reduce log volume. |

## Environment Variables

Every configuration option can be overridden with an environment variable. Environment variables take precedence over the config file but are overridden by CLI flags.

The naming convention is: `MINILEDGER_` prefix, followed by the option path in uppercase, with dots replaced by underscores.

| Environment Variable | Config Equivalent | Example Value |
|---------------------|-------------------|---------------|
| `MINILEDGER_DATA_DIR` | `dataDir` | `/var/lib/miniledger` |
| `MINILEDGER_NODE_NAME` | `node.name` | `production-node-1` |
| `MINILEDGER_NODE_ORG_ID` | `node.orgId` | `acme-corp` |
| `MINILEDGER_NODE_ROLE` | `node.role` | `validator` |
| `MINILEDGER_NETWORK_LISTEN_ADDRESS` | `network.listenAddress` | `0.0.0.0` |
| `MINILEDGER_NETWORK_P2P_PORT` | `network.p2pPort` | `4440` |
| `MINILEDGER_NETWORK_API_PORT` | `network.apiPort` | `4441` |
| `MINILEDGER_NETWORK_PEERS` | `network.peers` | `ws://10.0.0.2:4440,ws://10.0.0.3:4440` |
| `MINILEDGER_NETWORK_MAX_PEERS` | `network.maxPeers` | `100` |
| `MINILEDGER_CONSENSUS_ALGORITHM` | `consensus.algorithm` | `raft` |
| `MINILEDGER_CONSENSUS_BLOCK_TIME_MS` | `consensus.blockTimeMs` | `2000` |
| `MINILEDGER_CONSENSUS_MAX_TX_PER_BLOCK` | `consensus.maxTxPerBlock` | `1000` |
| `MINILEDGER_API_ENABLED` | `api.enabled` | `true` |
| `MINILEDGER_API_CORS` | `api.cors` | `https://myapp.com` |
| `MINILEDGER_LOGGING_LEVEL` | `logging.level` | `debug` |

**Usage example:**

```bash
MINILEDGER_NETWORK_P2P_PORT=5550 \
MINILEDGER_NETWORK_API_PORT=5551 \
MINILEDGER_CONSENSUS_ALGORITHM=raft \
MINILEDGER_NETWORK_PEERS=ws://10.0.0.2:4440,ws://10.0.0.3:4440 \
miniledger start
```

Environment variables are particularly useful for container deployments, systemd services, and CI/CD pipelines where you want to configure nodes without modifying files on disk.

### Peers as Environment Variable

The `MINILEDGER_NETWORK_PEERS` variable accepts a comma-separated list of WebSocket URLs:

```bash
export MINILEDGER_NETWORK_PEERS="ws://node1.internal:4440,ws://node2.internal:4440,ws://node3.internal:4440"
```

## CLI Flag Overrides

CLI flags provide the highest-priority overrides. They are applied after the config file and environment variables.

| CLI Flag | Config Equivalent | Example |
|----------|-------------------|---------|
| `--data-dir` | `dataDir` | `miniledger start --data-dir /var/lib/miniledger` |
| `--name` | `node.name` | `miniledger start --name prod-node-1` |
| `--org-id` | `node.orgId` | `miniledger start --org-id acme-corp` |
| `--role` | `node.role` | `miniledger start --role observer` |
| `--listen-address` | `network.listenAddress` | `miniledger start --listen-address 127.0.0.1` |
| `--p2p-port` | `network.p2pPort` | `miniledger start --p2p-port 5550` |
| `--api-port` | `network.apiPort` | `miniledger start --api-port 5551` |
| `--peers` | `network.peers` | `miniledger start --peers ws://10.0.0.2:4440,ws://10.0.0.3:4440` |
| `--max-peers` | `network.maxPeers` | `miniledger start --max-peers 100` |
| `--consensus` | `consensus.algorithm` | `miniledger start --consensus raft` |
| `--block-time` | `consensus.blockTimeMs` | `miniledger start --block-time 2000` |
| `--max-tx-per-block` | `consensus.maxTxPerBlock` | `miniledger start --max-tx-per-block 1000` |
| `--no-api` | `api.enabled` = false | `miniledger start --no-api` |
| `--cors` | `api.cors` | `miniledger start --cors "https://myapp.com"` |
| `--log-level` | `logging.level` | `miniledger start --log-level debug` |

**Combined example:**

```bash
miniledger start \
  --name validator-east-1 \
  --org-id acme-corp \
  --p2p-port 5550 \
  --api-port 5551 \
  --consensus raft \
  --peers ws://10.0.0.2:4440,ws://10.0.0.3:4440 \
  --block-time 2000 \
  --log-level warn
```

## Configuration Precedence

When the same option is specified at multiple levels, the highest-priority source wins:

```
CLI flags  >  Environment variables  >  Config file  >  Defaults
```

For example, if `miniledger.config.json` sets `network.apiPort` to `4441`, the environment variable `MINILEDGER_NETWORK_API_PORT=8080` overrides it to `8080`, and the CLI flag `--api-port 9090` overrides everything to `9090`.

## Common Configuration Patterns

### Single-Node Development

The default configuration works for single-node development with no modifications:

```bash
miniledger init
miniledger start
```

This starts a node in solo consensus mode on ports 4440/4441.

### Three-Node Local Cluster

For testing Raft consensus on a single machine, use different ports for each node:

**Node 1:**
```bash
miniledger init --data-dir ./node1-data --name node-1
miniledger start --data-dir ./node1-data \
  --p2p-port 4440 --api-port 4441 \
  --consensus raft \
  --peers ws://127.0.0.1:4450,ws://127.0.0.1:4460
```

**Node 2:**
```bash
miniledger init --data-dir ./node2-data --name node-2
miniledger start --data-dir ./node2-data \
  --p2p-port 4450 --api-port 4451 \
  --consensus raft \
  --peers ws://127.0.0.1:4440,ws://127.0.0.1:4460
```

**Node 3:**
```bash
miniledger init --data-dir ./node3-data --name node-3
miniledger start --data-dir ./node3-data \
  --p2p-port 4460 --api-port 4461 \
  --consensus raft \
  --peers ws://127.0.0.1:4440,ws://127.0.0.1:4450
```

Or simply use the [demo command](/docs/getting-started/demo) which automates this entire process.

### Production Cluster Across Machines

For a production deployment across three separate servers:

**Server A (10.0.1.10):**
```json
{
  "dataDir": "/var/lib/miniledger",
  "node": {
    "name": "validator-a",
    "orgId": "acme-corp",
    "role": "validator"
  },
  "network": {
    "listenAddress": "0.0.0.0",
    "p2pPort": 4440,
    "apiPort": 4441,
    "peers": ["ws://10.0.1.11:4440", "ws://10.0.1.12:4440"],
    "maxPeers": 50
  },
  "consensus": {
    "algorithm": "raft",
    "blockTimeMs": 2000,
    "maxTxPerBlock": 1000
  },
  "api": {
    "enabled": true,
    "cors": "https://admin.acme-corp.com"
  },
  "logging": {
    "level": "warn"
  }
}
```

**Server B (10.0.1.11)** and **Server C (10.0.1.12)** use the same structure with appropriate `node.name` values and `network.peers` adjusted to point to the other two nodes.

### Headless Validator Node

For a node that only participates in consensus without exposing any HTTP interface:

```json
{
  "node": {
    "name": "internal-validator",
    "role": "validator"
  },
  "network": {
    "listenAddress": "0.0.0.0",
    "p2pPort": 4440,
    "peers": ["ws://10.0.1.10:4440", "ws://10.0.1.11:4440"]
  },
  "api": {
    "enabled": false
  },
  "logging": {
    "level": "warn"
  }
}
```

### Read-Only Observer Node

For a node that replicates the chain for querying but does not participate in consensus:

```json
{
  "node": {
    "name": "query-node",
    "role": "observer"
  },
  "network": {
    "listenAddress": "0.0.0.0",
    "p2pPort": 4440,
    "apiPort": 4441,
    "peers": ["ws://10.0.1.10:4440"]
  },
  "consensus": {
    "algorithm": "raft"
  },
  "api": {
    "enabled": true,
    "cors": "*"
  }
}
```

## Next Steps

With configuration understood, you are ready to explore more advanced topics:

- **[Multi-Node Clusters](/docs/guides/multi-node-cluster)** -- Detailed guide for deploying Raft clusters in production
- **[Smart Contracts](/docs/guides/smart-contracts)** -- Write and deploy JavaScript smart contracts
- **[Privacy and Encryption](/docs/guides/privacy-encryption)** -- Configure per-record AES-256-GCM encryption and ACLs
- **[REST API Reference](/docs/api-reference/rest-api)** -- Complete API documentation for all endpoints
