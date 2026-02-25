---
title: Demo Mode
description: Run miniledger demo to instantly spin up a 3-node Raft consensus cluster with a sample token smart contract, example transactions, and a live block explorer dashboard. Perfect for evaluating MiniLedger.
keywords:
  - miniledger demo
  - blockchain demo
  - raft consensus demo
  - private blockchain demo
  - smart contract demo
  - miniledger tutorial
  - 3 node cluster
  - blockchain evaluation
slug: /getting-started/demo
sidebar_position: 3
---

# Demo Mode

MiniLedger includes a built-in demo command that creates a fully functional 3-node Raft cluster on your local machine with a single command. The demo deploys a sample token smart contract, executes example transactions, and opens the block explorer dashboard so you can see everything in action.

This is the fastest way to evaluate MiniLedger's multi-node consensus, smart contracts, and query capabilities without any manual setup.

## Run the Demo

```bash
npx miniledger demo
```

That is it. One command, no configuration.

If you installed MiniLedger globally:

```bash
miniledger demo
```

## What the Demo Does

The `demo` command automates the following sequence:

### 1. Initializes Three Nodes

Three separate MiniLedger nodes are created, each with its own data directory, Ed25519 identity, and configuration:

| Node | Data Directory | P2P Port | API Port | Role |
|------|---------------|----------|----------|------|
| node-1 | `./demo-data/node-1` | 4440 | 4441 | Leader (initially) |
| node-2 | `./demo-data/node-2` | 4450 | 4451 | Follower |
| node-3 | `./demo-data/node-3` | 4460 | 4461 | Follower |

### 2. Forms a Raft Cluster

The three nodes discover each other via WebSocket P2P connections and perform Raft leader election. One node becomes the leader and begins producing blocks, while the other two replicate the chain as followers.

You will see log output similar to:

```
[demo] Starting node-1 (P2P: 4440, API: 4441)
[demo] Starting node-2 (P2P: 4450, API: 4451)
[demo] Starting node-3 (P2P: 4460, API: 4461)
[demo] Raft cluster formed. Leader: node-1
[demo] All 3 nodes connected and synced
```

### 3. Deploys a Token Smart Contract

A sample `SimpleToken` smart contract is deployed to the cluster. This contract implements basic token functionality:

- **mint** -- Create new tokens and assign them to an account
- **transfer** -- Move tokens from one account to another
- **balanceOf** -- Query the token balance of an account

The contract is written in plain JavaScript:

```javascript
// SimpleToken contract (deployed automatically by demo)
module.exports = {
  mint({ to, amount }, state) {
    const balance = state.get(`balance:${to}`) || 0;
    state.set(`balance:${to}`, balance + amount);
    return { to, newBalance: balance + amount };
  },

  transfer({ from, to, amount }, state) {
    const fromBalance = state.get(`balance:${from}`) || 0;
    if (fromBalance < amount) throw new Error('Insufficient balance');
    const toBalance = state.get(`balance:${to}`) || 0;
    state.set(`balance:${from}`, fromBalance - amount);
    state.set(`balance:${to}`, toBalance + amount);
    return { from, to, amount };
  },

  balanceOf({ account }, state) {
    return { account, balance: state.get(`balance:${account}`) || 0 };
  },
};
```

### 4. Executes Sample Transactions

The demo submits a series of transactions to populate the ledger with realistic data:

```
[demo] Deploying SimpleToken contract...
[demo] Minting 1000 tokens to alice
[demo] Minting 500 tokens to bob
[demo] Transferring 200 tokens from alice to bob
[demo] Transferring 50 tokens from bob to charlie
[demo] All sample transactions committed
```

After the transactions complete, the token balances are:

| Account | Balance |
|---------|---------|
| alice | 800 |
| bob | 650 |
| charlie | 50 |

### 5. Opens the Block Explorer

The demo automatically opens the block explorer dashboard in your default browser at:

```
http://localhost:4441
```

From the dashboard, you can:

- Browse all produced blocks and inspect their contents
- View each transaction, including the smart contract invocations
- Query the world state to see token balances
- Monitor the Raft cluster health across all three nodes

## Interacting with the Demo Cluster

While the demo is running, you can interact with any of the three nodes using `curl` or the CLI.

### Query Token Balances

```bash
# Query via the leader node (port 4441)
curl "http://localhost:4441/api/query?sql=SELECT * FROM state WHERE key LIKE 'balance:%'"
```

Response:

```json
{
  "results": [
    { "key": "balance:alice", "value": "800" },
    { "key": "balance:bob", "value": "650" },
    { "key": "balance:charlie", "value": "50" }
  ]
}
```

### Submit Additional Transactions

You can submit your own transactions to the running cluster:

```bash
# Transfer tokens from alice to a new account
curl -X POST http://localhost:4441/api/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract",
    "contract": "SimpleToken",
    "function": "transfer",
    "args": { "from": "alice", "to": "dave", "amount": 100 }
  }'
```

### Check Cluster Status

Query each node to verify they are in sync:

```bash
# Node 1 (leader)
curl http://localhost:4441/api/status

# Node 2 (follower)
curl http://localhost:4451/api/status

# Node 3 (follower)
curl http://localhost:4461/api/status
```

All three nodes should report the same block height.

### List Connected Peers

```bash
miniledger peers list --api-port 4441
```

Output:

```
Connected Peers (2)
  node-2  ws://127.0.0.1:4450  follower  synced
  node-3  ws://127.0.0.1:4460  follower  synced
```

## Testing Fault Tolerance

The demo cluster is a great way to observe Raft fault tolerance in action.

### Simulate a Node Failure

In a separate terminal, find and stop one of the follower nodes:

```bash
# The demo logs the PID of each node. You can also use:
curl -X POST http://localhost:4451/api/admin/shutdown
```

After stopping node-2, the cluster continues to operate with two of three nodes (which satisfies the Raft quorum requirement). Transactions submitted to the leader are still committed and replicated to the remaining follower.

### Observe Leader Election

If you stop the **leader** node instead, the two remaining followers will hold a new election and one of them will become the new leader. You can observe this in the log output:

```
[node-3] Raft election timeout. Starting election for term 2.
[node-3] Received vote from node-2. Won election.
[node-3] Became leader for term 2. Resuming block production.
```

Transactions should now be submitted to the new leader's API port.

## Stopping the Demo

Press `Ctrl+C` in the terminal where the demo is running:

```
[demo] Shutting down all nodes...
[demo] node-1 stopped
[demo] node-2 stopped
[demo] node-3 stopped
[demo] Demo data saved in ./demo-data
```

The demo data is preserved in `./demo-data`. You can restart the cluster by running `miniledger demo` again from the same directory, or delete the directory to start fresh:

```bash
rm -rf ./demo-data
```

## Demo Command Options

The `demo` command accepts optional flags for customization:

| Flag | Default | Description |
|------|---------|-------------|
| `--nodes` | `3` | Number of nodes to start |
| `--base-p2p-port` | `4440` | Starting P2P port (increments by 10 per node) |
| `--base-api-port` | `4441` | Starting API port (increments by 10 per node) |
| `--no-browser` | `false` | Do not open the block explorer automatically |
| `--data-dir` | `./demo-data` | Base directory for demo node data |

Example with custom options:

```bash
miniledger demo --nodes 5 --base-p2p-port 6000 --base-api-port 6001 --no-browser
```

## Next Steps

Now that you have seen MiniLedger running as a multi-node cluster with smart contracts:

- **[Configuration](/docs/getting-started/configuration)** -- Understand all the options you can tune for production deployments
- **[Multi-Node Clusters](/docs/guides/multi-node-cluster)** -- Set up a real cluster across multiple machines
- **[Smart Contracts](/docs/guides/smart-contracts)** -- Write your own JavaScript smart contracts
- **[Governance](/docs/guides/governance)** -- Learn how to manage network changes through on-chain proposals
