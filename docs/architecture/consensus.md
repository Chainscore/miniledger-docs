---
title: Consensus — Raft Deep Dive
description: Detailed explanation of MiniLedger's Raft consensus implementation, including leader election, log replication, commit index advancement, solo mode, and how Raft log entries map directly to block proposals.
keywords: [raft consensus, miniledger consensus, leader election, log replication, blockchain consensus, distributed consensus, raft algorithm, block proposal, permissioned blockchain consensus]
sidebar_position: 2
---

# Consensus — Raft Deep Dive

MiniLedger supports two consensus modes: **solo** (single-node) and **raft** (multi-node). This document provides a detailed walkthrough of the Raft consensus implementation and how it integrates with MiniLedger's block production pipeline.

## Key Design Insight

MiniLedger makes one critical simplification compared to traditional Raft implementations:

> **Raft log entries ARE block proposals.** A committed Raft entry directly becomes a finalized block on the chain.

This eliminates the need for a separate consensus-to-chain translation layer. The `RaftLogEntry` type directly wraps a `Block`:

```typescript
interface RaftLogEntry {
  term: number;
  index: number;
  block: Block;
}
```

When a Raft entry is committed (replicated to a majority), the embedded block is applied to every node's local chain and world state.

## Consensus Modes

### Solo Mode

In solo mode, the node operates as a single-node blockchain. There is no Raft consensus, no P2P networking, and no leader election. The node simply produces blocks on a timer.

```typescript
// Solo mode block production (simplified)
setInterval(() => {
  const pending = txStore.getPending(maxTxPerBlock);
  if (pending.length === 0) return;

  // Apply transactions to world state
  for (const tx of pending) {
    applyTransaction(tx, chain.getHeight() + 1);
  }

  // Build and sign block
  const stateRoot = stateStore.computeStateRoot();
  const block = chain.proposeBlock(pending, publicKey, stateRoot);
  const signedBlock = { ...block, signature: sign(block.hash, privateKey) };

  // Persist
  chain.appendBlock(signedBlock);
  blockStore.insert(signedBlock);
  txStore.removePending(pending.map(tx => tx.hash));
}, blockTimeMs);
```

Solo mode is ideal for:
- Development and testing
- Single-organization deployments where Byzantine fault tolerance is not needed
- Embedded use cases where the blockchain is a library inside a larger application

### Raft Mode

In raft mode, the node participates in a multi-node cluster. One node is elected leader and is the sole block producer. Followers replicate the leader's log and apply committed blocks.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Node A         │     │   Node B         │     │   Node C         │
│   (Leader)       │     │   (Follower)     │     │   (Follower)     │
│                 │     │                 │     │                 │
│  Produce blocks │     │  Replicate log  │     │  Replicate log  │
│  Send heartbeats│────▶│  Apply commits  │     │  Apply commits  │
│  Advance commit │     │  Vote in        │     │  Vote in        │
│                 │────▶│  elections      │     │  elections      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Raft State

Each `RaftNode` maintains the following state:

### Persistent State (per node)

| Field | Type | Description |
|---|---|---|
| `currentTerm` | `number` | The latest term this node has seen. Monotonically increases. |
| `votedFor` | `string \| null` | The `nodeId` this node voted for in the current term, or `null`. |
| `raftLog` | `RaftLog` | The ordered log of block proposals. |

### Volatile State (per node)

| Field | Type | Description |
|---|---|---|
| `role` | `RaftRole` | One of `Follower`, `Candidate`, or `Leader`. |
| `leaderId` | `string \| null` | The `nodeId` of the current leader. |
| `commitIndex` | `number` | Index of the highest log entry known to be committed. |
| `lastApplied` | `number` | Index of the highest log entry applied to the state machine. |

### Leader-Only State

| Field | Type | Description |
|---|---|---|
| `nextIndex` | `Map<string, number>` | For each peer: index of the next log entry to send. |
| `matchIndex` | `Map<string, number>` | For each peer: index of the highest log entry known to be replicated. |

### Roles

```typescript
enum RaftRole {
  Follower = "follower",
  Candidate = "candidate",
  Leader = "leader",
}
```

Nodes start as **Follower**. If they do not receive a heartbeat from the leader within the election timeout, they transition to **Candidate** and start an election. If they win the election, they become **Leader**.

## Leader Election

### Election Trigger

A `RaftTimer` manages two timers:
- **Election timeout**: Randomized timer (150-300ms typical). If it fires without receiving a heartbeat from the leader, the node starts an election.
- **Heartbeat timer**: Fires periodically while the node is leader, sending `AppendEntries` RPCs (heartbeats) to all peers.

### Election Process

```
Step 1: Follower's election timer fires
        ┌──────────┐
        │ Follower  │ ── election timeout ──▶ transition to Candidate
        └──────────┘

Step 2: Candidate increments term, votes for self, requests votes
        ┌──────────┐
        │ Candidate │ ── RequestVote(term, candidateId, lastLogIndex, lastLogTerm)
        └──────────┘        │          │          │
                            ▼          ▼          ▼
                         Node B     Node C     Node D

Step 3: Peers evaluate and reply
        Each peer grants vote if:
        - payload.term >= currentTerm
        - Haven't voted yet in this term (or already voted for this candidate)
        - Candidate's log is at least as up-to-date as theirs

Step 4: Candidate tallies votes
        If votes >= majority (floor(N/2) + 1): become Leader
        If election timeout fires again: start new election with term + 1
        If AppendEntries from valid leader arrives: step down to Follower
```

### Vote Granting Logic

A node grants its vote when all of the following are true:

1. The candidate's term is equal to the node's current term (if higher, the node first steps down).
2. The node has not yet voted in this term, OR has already voted for this candidate.
3. The candidate's log is at least as up-to-date as the node's log.

Log comparison uses **last log term first, then last log index**:

```typescript
private isLogUpToDate(lastLogIndex: number, lastLogTerm: number): boolean {
  const myLastTerm = this.raftLog.getLastTerm();
  const myLastIndex = this.raftLog.getLastIndex();

  if (lastLogTerm !== myLastTerm) {
    return lastLogTerm > myLastTerm;  // Higher term wins
  }
  return lastLogIndex >= myLastIndex;  // Same term: longer log wins
}
```

### Single-Node Cluster

When a node is the only node in the cluster (`totalVoters === 1`), it wins the election immediately without sending any `RequestVote` RPCs:

```typescript
if (totalVoters === 1) {
  this.becomeLeader();
  return;
}
```

### Becoming Leader

When a candidate receives a majority of votes:

1. It sets `role = Leader` and `leaderId = self`.
2. Stops the election timer and starts the heartbeat timer.
3. Initializes `nextIndex` for each peer to `lastLogIndex + 1`.
4. Initializes `matchIndex` for each peer to `0`.
5. Sends an immediate heartbeat to all peers.
6. Emits the `"leader"` event, which triggers the node orchestrator to start block production.

### Step Down

A node steps down to Follower whenever it receives a message with a higher term:

```typescript
private stepDown(newTerm: number): void {
  this.currentTerm = newTerm;
  this.role = RaftRole.Follower;
  this.votedFor = null;
  this.timer.stopHeartbeatTimer();
  this.timer.resetElectionTimer();
}
```

This ensures that stale leaders cannot continue producing blocks after a new leader is elected.

## Log Replication

### Block Proposal (Leader)

When the leader's block timer fires:

1. Collect pending transactions from the pool.
2. Compute the state root from the current world state.
3. Build and sign a block.
4. Append the block as a new Raft log entry.
5. Immediately send `AppendEntries` to all peers.
6. Check if the entry can be committed (important for single-node clusters).

```typescript
proposeBlock(block: Block): void {
  if (this.role !== RaftRole.Leader) return;

  const entry: RaftLogEntry = {
    term: this.currentTerm,
    index: this.raftLog.getLastIndex() + 1,
    block,
  };

  this.raftLog.append(entry);
  this.matchIndex.set(this.opts.nodeId, entry.index);
  this.sendHeartbeats();         // Replicate immediately
  this.advanceCommitIndex();     // Commit immediately if single-node
}
```

### AppendEntries RPC

The leader sends `AppendEntries` to each peer with:

| Field | Description |
|---|---|
| `term` | Leader's current term |
| `leaderId` | Leader's nodeId |
| `prevLogIndex` | Index of log entry immediately preceding new entries |
| `prevLogTerm` | Term of the entry at `prevLogIndex` |
| `entries` | New log entries to append (may be empty for heartbeats) |
| `leaderCommit` | Leader's commit index |

### Follower Processing

When a follower receives `AppendEntries`:

1. **Term check**: If the leader's term is higher, step down. If lower, reject.
2. **Reset election timer**: Valid heartbeat from the leader.
3. **Log consistency check**: Verify that the entry at `prevLogIndex` has term `prevLogTerm`. If not, reply with `success: false` so the leader backs up.
4. **Append entries**: For each entry, check for conflicts (same index, different term). Truncate conflicting entries and append new ones.
5. **Update commit index**: `commitIndex = min(leaderCommit, lastLogIndex)`.
6. **Apply committed entries**: Apply all entries from `lastApplied + 1` to `commitIndex`.

### Leader Handling Replies

When the leader receives an `AppendEntriesReply`:

- **Success**: Update `nextIndex[peer] = matchIndex + 1` and `matchIndex[peer] = matchIndex`. Attempt to advance the commit index.
- **Failure**: Decrement `nextIndex[peer]` and retry immediately. This back-tracking continues until the follower's log matches the leader's.

## Commit Index Advancement

The leader advances the commit index when a log entry has been replicated to a majority of nodes:

```typescript
private advanceCommitIndex(): void {
  if (this.role !== RaftRole.Leader) return;

  const allNodeIds = [...this.peerManager.getKnownNodeIds(), this.nodeId];
  const majority = Math.floor(allNodeIds.length / 2) + 1;

  // Scan from newest to oldest
  for (let n = this.raftLog.getLastIndex(); n > this.commitIndex; n--) {
    const entry = this.raftLog.getEntry(n);
    if (!entry || entry.term !== this.currentTerm) continue;

    let replicatedCount = 0;
    for (const nodeId of allNodeIds) {
      const match = nodeId === this.nodeId
        ? this.raftLog.getLastIndex()
        : (this.matchIndex.get(nodeId) ?? 0);
      if (match >= n) replicatedCount++;
    }

    if (replicatedCount >= majority) {
      this.commitIndex = n;
      this.applyCommitted();
      break;
    }
  }
}
```

Key safety property: the leader only commits entries from its **current term**. This prevents the "figure 8" scenario described in the Raft paper where committing entries from previous terms could lead to inconsistency.

## Applying Committed Entries

Once the commit index advances, both leader and followers apply the committed blocks:

```typescript
private applyCommitted(): void {
  while (this.lastApplied < this.commitIndex) {
    this.lastApplied++;
    const entry = this.raftLog.getEntry(this.lastApplied);
    if (entry && this.onBlockCommitted) {
      this.onBlockCommitted(entry.block);  // Callback to node orchestrator
    }
  }
}
```

The `onBlockCommitted` callback in the node orchestrator applies the block within a SQLite transaction:

1. Apply each transaction's payload to the world state.
2. Append the block to the in-memory chain.
3. Insert the block into the `blocks` table.
4. Remove confirmed transactions from the pending pool.
5. Update sender nonces.

## Transaction Forwarding

In raft mode, only the leader can propose blocks. When a follower receives a transaction, it forwards it to the leader:

```typescript
// In the node orchestrator
if (this.raft && !this.raft.isLeader()) {
  this.raft.forwardToLeader(tx);
}

// In RaftNode
forwardToLeader(tx: Transaction): void {
  if (this.leaderId && this.leaderId !== this.opts.nodeId) {
    this.opts.peerManager.sendTo(
      this.leaderId,
      createMessage(MessageType.TxForward, this.opts.nodeId, { transaction: tx }),
    );
  }
}
```

The leader receives forwarded transactions via the `TxForward` message handler and adds them to its pending pool.

## Message Types

The Raft implementation uses four consensus message types:

| Message Type | Direction | Purpose |
|---|---|---|
| `CONSENSUS_REQUEST_VOTE` | Candidate -> Peers | Request votes during election |
| `CONSENSUS_REQUEST_VOTE_REPLY` | Peer -> Candidate | Grant or deny vote |
| `CONSENSUS_APPEND_ENTRIES` | Leader -> Followers | Heartbeat + log replication |
| `CONSENSUS_APPEND_ENTRIES_REPLY` | Follower -> Leader | Acknowledge log entries |
| `TX_FORWARD` | Follower -> Leader | Forward transactions to leader |

## Fault Tolerance

A raft cluster of `N` nodes can tolerate `(N-1)/2` node failures:

| Cluster Size | Majority | Tolerable Failures |
|---|---|---|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

When the leader fails, a follower's election timeout fires and it starts a new election. The new leader will have all committed entries (guaranteed by the vote-granting log comparison) and can resume block production.

## Configuration

Consensus behavior is controlled by the `consensus` configuration section:

```json
{
  "consensus": {
    "algorithm": "raft",
    "blockTimeMs": 1000,
    "maxTxPerBlock": 100
  }
}
```

| Setting | Default | Description |
|---|---|---|
| `algorithm` | `"solo"` | `"solo"` for single-node, `"raft"` for multi-node |
| `blockTimeMs` | `1000` | Block production interval in milliseconds |
| `maxTxPerBlock` | `100` | Maximum transactions per block |

## Solo vs Raft: When to Use Which

| Criterion | Solo | Raft |
|---|---|---|
| Node count | 1 | 3+ (odd numbers recommended) |
| Fault tolerance | None | Up to (N-1)/2 failures |
| Block finality | Immediate | After majority replication |
| Setup complexity | Zero-config | Requires peer configuration |
| Performance | Highest (no replication overhead) | Slightly lower (network round-trips) |
| Use case | Dev, testing, embedded, single-org | Multi-org, production, compliance |
