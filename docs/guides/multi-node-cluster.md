---
title: Multi-Node Cluster Setup
description: Learn how to set up a multi-node MiniLedger cluster with Raft consensus. Step-by-step guide for bootstrapping nodes, joining peers, and verifying cluster health.
keywords:
  - miniledger cluster
  - multi-node blockchain
  - raft consensus setup
  - distributed ledger cluster
  - private blockchain cluster
  - node.js blockchain cluster
  - peer-to-peer blockchain
  - blockchain high availability
sidebar_position: 1
---

# Multi-Node Cluster Setup

MiniLedger uses the **Raft consensus protocol** to maintain a consistent, fault-tolerant ledger across multiple nodes. This guide walks you through bootstrapping a cluster, joining additional peers, and verifying that the cluster is healthy.

## Prerequisites

- Node.js 18 or later installed on each machine (or on a single machine for local testing)
- MiniLedger installed globally or as a project dependency:

```bash
npm install -g miniledger
```

- Network connectivity between nodes on the P2P port (default `4440`) and API port (default `4441`)

## Understanding the Raft Cluster Model

In a Raft cluster, one node acts as the **leader** and the remaining nodes are **followers**. The leader is responsible for:

- Accepting new transactions
- Replicating log entries to followers
- Committing entries once a majority (quorum) acknowledges them

A cluster of **N** nodes tolerates up to **(N-1)/2** failures. For production use, a minimum of **3 nodes** is recommended so the cluster can survive one node failure while still reaching quorum.

| Cluster Size | Quorum Required | Tolerated Failures |
|:---:|:---:|:---:|
| 1 | 1 | 0 |
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

## Step 1: Initialize the Bootstrap Node

The first node in a cluster is the **bootstrap node**. It starts as a single-member Raft group and becomes the initial leader.

```bash
# Create a data directory and initialize the node
miniledger init -d ./node1
```

This generates the node's identity (key pair), genesis block, and default configuration inside `./node1`.

Start the bootstrap node:

```bash
miniledger start -d ./node1 \
  --consensus raft \
  --p2p-port 4440 \
  --api-port 4441
```

You should see output indicating the node has started and elected itself as the leader:

```
[INFO] Node initialized: node-id=abc123...
[INFO] Raft: became leader (term 1)
[INFO] P2P listening on ws://0.0.0.0:4440
[INFO] API listening on http://0.0.0.0:4441
```

Verify the node is running:

```bash
curl http://localhost:4441/status
```

```json
{
  "nodeId": "abc123...",
  "role": "leader",
  "term": 1,
  "peers": 1,
  "blockHeight": 0,
  "status": "running"
}
```

## Step 2: Initialize and Join a Second Node

On a second machine (or in a separate terminal for local testing), initialize a new data directory:

```bash
miniledger init -d ./node2
```

Join the existing cluster by pointing to the bootstrap node's P2P address:

```bash
miniledger join ws://localhost:4440 -d ./node2 \
  --p2p-port 4442 \
  --api-port 4443
```

The join process performs the following:

1. Connects to the leader over WebSocket
2. Exchanges identity and cluster metadata
3. The leader adds the new node to the Raft configuration
4. The new node receives the current log and world state via snapshot transfer
5. The new node begins participating in Raft as a follower

You should see:

```
[INFO] Joining cluster via ws://localhost:4440
[INFO] Snapshot received: blockHeight=0, entries=0
[INFO] Raft: following leader abc123... (term 1)
[INFO] P2P listening on ws://0.0.0.0:4442
[INFO] API listening on http://0.0.0.0:4443
```

## Step 3: Add a Third Node

Repeat the process for the third node to achieve fault tolerance:

```bash
miniledger init -d ./node3

miniledger join ws://localhost:4440 -d ./node3 \
  --p2p-port 4444 \
  --api-port 4445
```

:::tip
You can join via any existing cluster member, not only the bootstrap node. The join request is automatically forwarded to the current leader.
:::

## Verifying Cluster Health

### Check Cluster Status via the API

Query any node's API to see the full cluster state:

```bash
curl http://localhost:4441/cluster
```

```json
{
  "leaderId": "abc123...",
  "term": 1,
  "nodes": [
    {
      "id": "abc123...",
      "address": "ws://192.168.1.10:4440",
      "role": "leader",
      "lastHeartbeat": "2025-06-15T10:30:00.000Z"
    },
    {
      "id": "def456...",
      "address": "ws://192.168.1.11:4442",
      "role": "follower",
      "lastHeartbeat": "2025-06-15T10:30:00.500Z"
    },
    {
      "id": "ghi789...",
      "address": "ws://192.168.1.12:4444",
      "role": "follower",
      "lastHeartbeat": "2025-06-15T10:30:00.500Z"
    }
  ],
  "commitIndex": 0,
  "lastApplied": 0
}
```

### Submit a Test Transaction

Confirm replication works by submitting a transaction to the leader and reading it from a follower:

```bash
# Write to the leader
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"type": "kv:put", "key": "hello", "value": "world"}'

# Read from a follower (after a brief replication delay)
curl http://localhost:4443/state/hello
```

Both nodes should return the same value, confirming that Raft log replication is functioning correctly.

### Monitor Replication Lag

Check the block height on each node to verify they are in sync:

```bash
# Node 1 (leader)
curl -s http://localhost:4441/status | jq .blockHeight

# Node 2 (follower)
curl -s http://localhost:4443/status | jq .blockHeight

# Node 3 (follower)
curl -s http://localhost:4445/status | jq .blockHeight
```

All nodes should report the same block height. A small lag (1-2 blocks) during heavy write loads is normal and resolves quickly.

## Leader Election and Failover

If the leader node goes down, the remaining nodes will detect the missing heartbeats and trigger a new election:

```bash
# Stop the leader
# (Ctrl+C or kill the node1 process)

# After a few seconds, check node2
curl http://localhost:4443/status
```

```json
{
  "nodeId": "def456...",
  "role": "leader",
  "term": 2,
  "peers": 3,
  "status": "running"
}
```

The cluster continues to accept transactions as long as a majority of nodes are available. When the original leader comes back online, it rejoins as a follower and catches up automatically.

## Running on Separate Machines

When deploying across separate machines, replace `localhost` with the actual IP addresses or hostnames:

```bash
# Machine A (192.168.1.10) - Bootstrap
miniledger init -d /var/lib/miniledger
miniledger start -d /var/lib/miniledger \
  --consensus raft \
  --p2p-port 4440 \
  --api-port 4441

# Machine B (192.168.1.11) - Join
miniledger init -d /var/lib/miniledger
miniledger join ws://192.168.1.10:4440 -d /var/lib/miniledger \
  --p2p-port 4440 \
  --api-port 4441

# Machine C (192.168.1.12) - Join
miniledger init -d /var/lib/miniledger
miniledger join ws://192.168.1.10:4440 -d /var/lib/miniledger \
  --p2p-port 4440 \
  --api-port 4441
```

:::note
When each node runs on its own machine, they can all use the same default ports (`4440`/`4441`) since there is no port conflict.
:::

## Firewall and Network Configuration

Ensure the following ports are open between all cluster nodes:

| Port | Protocol | Purpose |
|:---:|:---:|---|
| 4440 | TCP (WebSocket) | P2P communication, Raft messages, log replication |
| 4441 | TCP (HTTP) | REST API for clients and monitoring |

For cloud deployments, add these ports to your security group or firewall rules. Only allow traffic from known cluster members and authorized clients.

## Configuration Options

You can customize Raft behavior via the node configuration file at `<data-dir>/config.json`:

```json
{
  "consensus": {
    "protocol": "raft",
    "electionTimeoutMin": 1500,
    "electionTimeoutMax": 3000,
    "heartbeatInterval": 500,
    "snapshotThreshold": 1000
  }
}
```

| Parameter | Default | Description |
|---|:---:|---|
| `electionTimeoutMin` | `1500` | Minimum election timeout in milliseconds |
| `electionTimeoutMax` | `3000` | Maximum election timeout in milliseconds |
| `heartbeatInterval` | `500` | Leader heartbeat interval in milliseconds |
| `snapshotThreshold` | `1000` | Number of log entries before triggering a snapshot |

## Troubleshooting

### Node Cannot Join the Cluster

- Verify the bootstrap node is running and reachable: `curl http://<leader-host>:4441/status`
- Check that the P2P port is accessible: `nc -zv <leader-host> 4440`
- Ensure the data directory was initialized: `miniledger init -d <data-dir>`

### Split Brain or No Leader Elected

- Confirm a majority of nodes are online
- Check for clock skew between machines -- large time differences can affect election timeouts
- Review logs for repeated election cycles, which may indicate network partitions

### Slow Replication

- Check network latency between nodes
- Increase `snapshotThreshold` if frequent snapshots are causing performance issues
- Monitor disk I/O on the leader, as log persistence is write-intensive

## Next Steps

- [Smart Contracts](/docs/guides/smart-contracts) -- Deploy and invoke smart contracts across your cluster
- [Governance](/docs/guides/governance) -- Use on-chain governance to add or remove peers
- [Privacy and Encryption](/docs/guides/privacy-encryption) -- Protect sensitive data with field-level encryption
