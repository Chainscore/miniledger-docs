---
slug: raft-consensus-blockchain-cft
title: "Raft Consensus for Enterprise Blockchain: CFT vs BFT and Why Crash Tolerance Is Often Enough"
description: "A practical guide to Raft consensus for permissioned blockchains. Understand Crash Fault Tolerance vs Byzantine Fault Tolerance, leader election, log replication, and when Raft is the right choice for enterprise consortiums."
keywords: [raft consensus blockchain, raft vs pbft, cft vs bft, crash fault tolerance blockchain, byzantine fault tolerance, blockchain consensus algorithm, raft leader election, distributed consensus enterprise, permissioned blockchain consensus, raft log replication]
authors: [prasad]
tags: [consensus, architecture, raft, enterprise]
image: /img/og-image.png
---

# Raft Consensus for Enterprise Blockchain: CFT vs BFT and Why Crash Tolerance Is Often Enough

Consensus is the hardest problem in distributed systems, and blockchain platforms make it harder by treating every consensus algorithm choice as a religious debate. PBFT loyalists dismiss Raft as "not real consensus." Raft proponents point out that PBFT adds complexity most enterprise networks don't need.

The truth: for enterprise consortiums where all participants are known and bound by legal agreements, Raft-based Crash Fault Tolerance (CFT) is the pragmatic choice. Here's why, how it works, and when you actually need Byzantine Fault Tolerance (BFT).

<!-- truncate -->

## The Two Fault Models

Every consensus algorithm makes an assumption about how nodes can fail:

### Crash Fault Tolerance (CFT) — Raft, Paxos

**Assumption:** Nodes can crash, go offline, or experience network partitions. They cannot behave maliciously — they won't send contradictory messages, forge signatures, or attempt to corrupt the ledger.

**Real-world meaning:** Your server runs out of disk space. The data center loses power. A network cable gets unplugged. These are infrastructure failures, not attacks. CFT handles them.

**Algorithms:** Raft, Paxos, Zab (ZooKeeper)

### Byzantine Fault Tolerance (BFT) — PBFT, IBFT, Tendermint

**Assumption:** Nodes can behave arbitrarily maliciously. They might send different messages to different peers, forge signatures, or actively try to corrupt the ledger.

**Real-world meaning:** A node operator is compromised. An insider intentionally tries to fork the chain. A node's private key is stolen and used to submit fraudulent transactions.

**Algorithms:** PBFT, IBFT 2.0, Tendermint, HotStuff

### The Tradeoff

| Property | CFT (Raft) | BFT (PBFT) |
|----------|-----------|------------|
| Fault tolerance | `f` failures with `2f+1` nodes | `f` failures with `3f+1` nodes |
| Node overhead for 1 failure | 3 nodes | 4 nodes |
| Node overhead for 2 failures | 5 nodes | 7 nodes |
| Communication complexity | O(n) | O(n²) |
| Throughput (typical) | Higher | Lower (due to voting overhead) |
| Latency per consensus round | ~10-50ms | ~100-500ms |
| Handles malicious nodes | ❌ | ✅ |
| Handles crashed/offline nodes | ✅ | ✅ |

---

## Why CFT Is Usually Enough for Enterprise Blockchain

Enterprise consortiums have a characteristic that public blockchains don't: **legal agreements**.

When three banks, five hospitals, or four insurance carriers form a consortium, they sign legal agreements that define:
- Who can join the network
- What data they can access
- What constitutes a breach of contract
- Financial penalties for misconduct
- Jurisdiction and dispute resolution

A bank that intentionally submits fraudulent transactions to the consortium ledger is committing fraud — a crime with real-world consequences far beyond anything the consensus algorithm can enforce. The legal framework provides Byzantine protection. The consensus algorithm only needs to handle crashes.

### The Layers of Protection

```
┌─────────────────────────────────┐
│  Layer 4: Legal Framework       │  ← Handles malicious behavior
│  (Contracts, regulations, law)  │
├─────────────────────────────────┤
│  Layer 3: Governance            │  ← Handles policy violations
│  (On-chain voting, membership)  │
├─────────────────────────────────┤
│  Layer 2: Cryptographic         │  ← Handles impersonation
│  (Ed25519 signatures, TLS)      │
├─────────────────────────────────┤
│  Layer 1: Consensus (Raft CFT)  │  ← Handles crashes/partitions
└─────────────────────────────────┘
```

BFT consensus is only necessary when Layer 4 (legal) doesn't exist — like in public, permissionless blockchains where anyone can join anonymously.

---

## How Raft Works: A Practical Explanation

Raft was designed to be understandable. Here's how it works in the context of a blockchain.

### Three Node Roles

Every node is in exactly one of these states at any time:

- **Leader:** The node that proposes blocks. Only one leader exists per term. The leader receives transactions from clients, orders them into blocks, and replicates blocks to followers.

- **Follower:** Passive nodes that accept blocks from the leader and apply them to their local ledger. Followers respond to the leader's heartbeats.

- **Candidate:** A transitional state. When a follower stops receiving heartbeats (leader is down), it becomes a candidate and requests votes from other nodes to become the new leader.

```
     [Start]
        │
   ┌────▼────┐      timeout,      ┌──────────┐
   │ Follower│─────start election──► Candidate │
   └─────────┘                     └─────┬─────┘
        ▲                               │
        │                        receives majority
        │                        of votes
        │                               │
        │      ┌──────────┐        ┌────▼────┐
        └──────┤ discovers │◄───────┤  Leader  │
               │higher term│        └──────────┘
               └──────────┘
```

### Leader Election

1. Each node starts as a follower with a randomized election timeout (150-300ms).
2. If a follower doesn't receive a heartbeat from the leader within its timeout, it increments its term, becomes a candidate, and votes for itself.
3. The candidate sends `RequestVote` RPCs to all other nodes.
4. If a candidate receives votes from a majority (including itself), it becomes the leader.
5. The new leader begins sending heartbeats to assert authority.

### Log Replication (Block Production)

In MiniLedger's Raft implementation, log entries are block proposals:

1. Leader receives transactions from clients via the REST API.
2. When the block interval elapses (default: 1 second) or the block size limit is reached, the leader creates a block proposal.
3. Leader sends `AppendEntries` RPCs to all followers containing the proposed block.
4. When a majority of followers acknowledge the block, the leader commits it.
5. The leader updates its committed index and notifies followers in the next heartbeat.
6. All nodes apply the committed block to their state database (SQLite).

```
Client ──tx──► Leader ──AppendEntries(block)──► Follower 1 ──ack──┐
                       ──AppendEntries(block)──► Follower 2 ──ack──┤
                       ──AppendEntries(block)──► Follower 3        │ majority = commit
                                                                    │
              Leader ◄────────── commits block ◄───────────────────┘
                 │
                 ├──► Apply block to local SQLite
                 │
            [Next heartbeat]
                 │
                 ├──► Follower 1: "committed index = 42"
                 ├──► Follower 2: "committed index = 42"
                 └──► Follower 3: "committed index = 42"
```

### Safety Guarantees

Raft provides these guarantees:

- **Election Safety:** At most one leader per term.
- **Leader Append-Only:** A leader never overwrites or deletes entries in its log. It only appends.
- **Log Matching:** If two logs contain an entry with the same index and term, they are identical up to that index.
- **Leader Completeness:** Once a log entry is committed, all future leaders will have that entry.
- **State Machine Safety:** All nodes apply the same log entries in the same order.

---

## When You Actually Need BFT

BFT is the right choice when:

### 1. Public, Permissionless Blockchains

Anyone can join, anyone can run a node, and there are no legal agreements. You must assume some nodes are malicious. BFT is non-negotiable here.

### 2. Direct Competitors Without Legal Framework

Five cryptocurrency exchanges form a consortium but operate across six jurisdictions. Legal enforcement is impractical. BFT provides protocol-level protection against malicious behavior.

### 3. Extremely High-Value Assets

A central bank digital currency (CBDC) consortium where a single fraudulent block could represent billions in losses. The additional overhead of BFT is justified by the extreme risk.

### 4. Regulatory Requirement

Some financial regulators now explicitly require BFT consensus for specific categories of financial market infrastructure. Check your jurisdiction's requirements.

---

## Running Raft with MiniLedger

### Single Node (Solo Mode)

For development and single-organization deployments:

```bash
npx miniledger init
npx miniledger start
# Runs in solo mode. Blocks produced on a timer (default: 1 second).
```

### Three-Node Raft Cluster

For consortium deployments:

```bash
# Node 1 (bootstrap)
npx miniledger init --data-dir ./node1
npx miniledger start --bootstrap --p2p-port 4442

# Node 2 joins
npx miniledger init --data-dir ./node2
npx miniledger start --p2p-port 4443 --http-port 4444 \
  --bootstrap-peers ws://localhost:4442/ws

# Node 3 joins
npx miniledger init --data-dir ./node3
npx miniledger start --p2p-port 4445 --http-port 4446 \
  --bootstrap-peers ws://localhost:4442/ws
```

Three nodes tolerate one failure. If the leader goes down, a new election completes in 150-300ms and block production resumes.

### Five-Node Cluster for Higher Resilience

```bash
# 5 nodes tolerate 2 simultaneous failures
for i in 1 2 3 4 5; do
  npx miniledger init --data-dir ./node$i
done

# Start each, pointing to the same bootstrap
for i in 1 2 3 4 5; do
  PORT=$((4442 + i))
  HTTP_PORT=$((4441 + i))
  npx miniledger start \
    --data-dir ./node$i \
    --p2p-port $PORT \
    --http-port $HTTP_PORT \
    --bootstrap-peers ws://localhost:4442/ws &
done
```

### Testing Leader Failover

```bash
# Find the leader
curl -s http://localhost:4441/status | jq '.consensus.role'
# "leader"

# Kill the leader (PID from process list)
kill {leader-pid}

# Check a follower — it becomes candidate, then leader
sleep 1
curl -s http://localhost:4444/status | jq '.consensus.role'
# "leader"  ← New leader elected in < 1 second

# Submit a transaction to the new leader
curl -X POST http://localhost:4444/tx \
  -H "Content-Type: application/json" \
  -d '{"key": "test:after-failover", "value": {"status": "success"}}'

# Restart the old leader — it rejoins as a follower
```

---

## Monitoring Raft Health

### Key Metrics to Watch

```javascript
// Health check endpoint
const status = await fetch('http://localhost:4441/status').then(r => r.json());

// Consensus health
status.consensus.role        // "leader" | "follower" | "candidate"
status.consensus.term        // Current term number (should increment slowly)
status.consensus.commitIndex // Last committed log index

// Peer health
status.network.peers.length  // Should match expected cluster size
status.network.peers[].connected  // All should be true

// Block production
status.chain.blockHeight     // Should be incrementing
status.chain.lastBlockTime   // Should be within last few seconds
```

### Alerting Rules

```
⚠️ CRITICAL: consensus.role === "candidate" for > 5 seconds
   → Leader election is failing. Network partition or insufficient peers.

⚠️ WARNING: status.network.peers.length < (expected / 2) + 1
   → Below majority. Risk of losing quorum.

⚠️ WARNING: lastBlockTime > 30 seconds ago
   → Block production stalled. Leader may be down or partitioned.

⚠️ INFO: consensus.term incrementing rapidly (> 1 per minute)
   → Unstable leadership. Check network latency between nodes.
```

---

## Key Takeaways

1. **CFT via Raft is the pragmatic choice for permissioned consortiums.** Legal agreements handle Byzantine behavior. Consensus handles infrastructure failures.

2. **BFT is only necessary when you can't trust participants.** Public blockchains, anonymous networks, or extreme-value assets.

3. **Raft is simpler to operate and debug.** Leader election is deterministic and observable. Log replication is easy to reason about.

4. **Raft delivers better performance.** O(n) communication vs BFT's O(n²), fewer nodes needed for the same fault tolerance.

5. **Three nodes are enough to tolerate one failure.** Five nodes tolerate two. Scale horizontally without the 3f+1 penalty of BFT.

---

Read the [consensus architecture](/docs/architecture/consensus) for the full technical specification, or the [multi-node cluster guide](/docs/guides/multi-node-cluster) for deployment instructions.

---

*About the Author*

**Prasad Kumkar** is the Founder & CEO of ChainScore Labs. Over the last 5+ years, he has worked with teams building exchanges, DeFi infrastructure, smart contracts, tokenization systems, and protocol-level blockchain products, helping founders make architecture, security, and go-live decisions for production Web3 systems.
