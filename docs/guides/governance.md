---
title: On-Chain Governance
description: Manage your MiniLedger network with on-chain governance. Create proposals, vote on peer changes, configuration updates, and contract upgrades with quorum-based decision making.
keywords:
  - miniledger governance
  - blockchain governance
  - on-chain voting
  - proposal voting
  - quorum consensus
  - add peer proposal
  - remove peer proposal
  - contract upgrade governance
  - private blockchain governance
  - network configuration
sidebar_position: 3
---

# On-Chain Governance

MiniLedger includes a built-in governance system that allows cluster participants to propose and vote on network changes. All governance actions are recorded as transactions on the ledger, providing a transparent and auditable decision-making process.

## Overview

Governance in MiniLedger follows a **propose-vote-execute** lifecycle:

1. A node submits a **proposal** describing the desired change
2. Other nodes **vote** to approve or reject the proposal
3. If the proposal reaches **quorum** within the voting period, it is automatically executed
4. If quorum is not reached before the deadline, the proposal expires

This system ensures that no single node can unilaterally change the network configuration.

## Proposal Types

MiniLedger supports five proposal types:

| Type | Description | Use Case |
|---|---|---|
| `add-peer` | Add a new node to the cluster | Scaling the network or replacing a failed node |
| `remove-peer` | Remove an existing node from the cluster | Decommissioning a compromised or obsolete node |
| `update-config` | Modify network configuration parameters | Adjusting consensus timeouts, block size, or other settings |
| `upgrade-contract` | Deploy a new version of a smart contract | Updating business logic with network approval |
| `custom` | A free-form proposal for off-chain coordination | Governance votes that do not trigger automatic execution |

## Proposal Status Lifecycle

Every proposal moves through the following statuses:

```
  +---------+     quorum met      +----------+
  |  active | ----------------->  | approved |  --> auto-execute
  +---------+                     +----------+
       |
       |  quorum not met
       |  (after 24h)             +----------+
       +------------------------> | rejected |
       |                          +----------+
       |
       |  deadline reached        +----------+
       |  (no quorum either way)  | expired  |
       +------------------------> +----------+
```

| Status | Description |
|---|---|
| `active` | The proposal is open for voting |
| `approved` | The proposal received enough "yes" votes and has been executed |
| `rejected` | The proposal received enough "no" votes to be rejected |
| `expired` | The voting period ended without reaching quorum in either direction |

## Creating a Proposal

Submit a proposal by sending a transaction with type `governance:propose`.

### Add a Peer

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "add-peer",
      "description": "Add Node 4 to the production cluster",
      "params": {
        "peerId": "node4-id-xyz...",
        "address": "ws://192.168.1.14:4440"
      }
    }
  }'
```

### Remove a Peer

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "remove-peer",
      "description": "Remove compromised Node 2 from the cluster",
      "params": {
        "peerId": "node2-id-abc..."
      }
    }
  }'
```

### Update Configuration

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "update-config",
      "description": "Increase election timeout for high-latency WAN deployment",
      "params": {
        "key": "consensus.electionTimeoutMin",
        "value": 3000
      }
    }
  }'
```

### Upgrade a Contract

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "upgrade-contract",
      "description": "Upgrade token contract to v2.0.0 with totalSupply method",
      "params": {
        "name": "token",
        "version": "2.0.0",
        "code": "return { balance(ctx, acct) { return ctx.get(`balance:${acct}`) || 0; }, totalSupply(ctx) { return ctx.get(\"totalSupply\") || 0; } };"
      }
    }
  }'
```

### Custom Proposal

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "custom",
      "description": "Schedule maintenance window for Saturday 2am-4am UTC",
      "params": {
        "note": "All operators should prepare for rolling restarts"
      }
    }
  }'
```

:::info
Custom proposals are recorded on-chain for transparency and auditability but do not trigger any automatic execution when approved.
:::

### Proposal Response

```json
{
  "txId": "tx-prop-001...",
  "status": "committed",
  "proposalId": "prop-abc123...",
  "blockHeight": 42
}
```

## Voting on a Proposal

Each node in the cluster can cast one vote per proposal. The proposer **automatically votes "yes"** when submitting the proposal.

### Cast a Vote

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:vote",
    "payload": {
      "proposalId": "prop-abc123...",
      "vote": "yes"
    }
  }'
```

The `vote` field accepts `"yes"` or `"no"`.

### Vote Response

```json
{
  "txId": "tx-vote-002...",
  "status": "committed",
  "proposalId": "prop-abc123...",
  "currentVotes": {
    "yes": 2,
    "no": 0,
    "total": 3
  },
  "blockHeight": 43
}
```

## Quorum Rules

MiniLedger uses **simple majority quorum** -- a proposal is approved when more than half of the eligible voters vote "yes".

| Cluster Size | Votes Needed to Approve | Votes Needed to Reject |
|:---:|:---:|:---:|
| 3 | 2 | 2 |
| 5 | 3 | 3 |
| 7 | 4 | 4 |

**Key rules:**

- **One vote per node.** A node cannot change its vote after casting it.
- **Proposer auto-votes yes.** The node that submits the proposal is automatically counted as a "yes" vote.
- **Immediate execution on quorum.** As soon as the required number of "yes" votes is reached, the proposal is executed immediately -- there is no need to wait for the voting period to end.
- **Immediate rejection on quorum.** If enough "no" votes accumulate to make approval impossible, the proposal is rejected immediately.
- **Only active cluster members can vote.** Nodes that have been removed from the cluster are not eligible.

## Voting Period

The default voting period is **24 hours** from the time the proposal is submitted. After this period:

- If quorum was reached, the proposal is already `approved` or `rejected`
- If quorum was not reached, the proposal status changes to `expired`

The voting period can be customized via network configuration:

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "governance:propose",
    "payload": {
      "proposalType": "update-config",
      "description": "Extend voting period to 48 hours",
      "params": {
        "key": "governance.votingPeriodMs",
        "value": 172800000
      }
    }
  }'
```

## Querying Proposals

### List All Proposals

```bash
curl http://localhost:4441/governance/proposals
```

```json
[
  {
    "proposalId": "prop-abc123...",
    "proposalType": "add-peer",
    "description": "Add Node 4 to the production cluster",
    "status": "active",
    "proposer": "node1-id...",
    "createdAt": "2025-06-15T10:00:00.000Z",
    "expiresAt": "2025-06-16T10:00:00.000Z",
    "votes": {
      "yes": 1,
      "no": 0
    }
  }
]
```

### Filter by Status

```bash
# Only active proposals
curl http://localhost:4441/governance/proposals?status=active

# Only approved proposals
curl http://localhost:4441/governance/proposals?status=approved
```

### Get a Specific Proposal

```bash
curl http://localhost:4441/governance/proposals/prop-abc123...
```

```json
{
  "proposalId": "prop-abc123...",
  "proposalType": "add-peer",
  "description": "Add Node 4 to the production cluster",
  "status": "approved",
  "proposer": "node1-id...",
  "createdAt": "2025-06-15T10:00:00.000Z",
  "resolvedAt": "2025-06-15T10:05:00.000Z",
  "params": {
    "peerId": "node4-id-xyz...",
    "address": "ws://192.168.1.14:4440"
  },
  "votes": {
    "yes": ["node1-id...", "node3-id..."],
    "no": []
  }
}
```

## Governance via SQL

Since governance data is stored in the world state, you can also query proposals using MiniLedger's SQL interface:

```sql
-- List all active proposals
SELECT * FROM world_state
WHERE key LIKE 'governance:proposal:%'
  AND json_extract(value, '$.status') = 'active';

-- Count votes for a specific proposal
SELECT key, json_extract(value, '$.vote') as vote
FROM world_state
WHERE key LIKE 'governance:vote:prop-abc123%';
```

See the [SQL Queries guide](/docs/guides/sql-queries) for more details.

## Governance Best Practices

1. **Write clear descriptions.** Every proposal should include a meaningful description that explains the "why" behind the change. This creates a permanent audit trail.

2. **Coordinate before proposing.** Use out-of-band communication (Slack, email) to discuss changes before submitting proposals. This avoids unnecessary rejected or expired proposals cluttering the ledger.

3. **Monitor proposal deadlines.** Set up alerts for active proposals so votes are cast before the 24-hour window expires.

4. **Use `upgrade-contract` for production contracts.** Direct `contract:deploy` works but bypasses governance. In multi-node production clusters, contract upgrades should go through the governance process so all operators can review the new code.

5. **Audit the governance log regularly.** Query the governance history to review past decisions and ensure no unauthorized proposals have been submitted.

## Security Considerations

- **Proposal submission is authenticated.** Only nodes that are active members of the cluster can submit proposals or vote.
- **Votes are immutable.** Once cast, a vote is recorded on-chain and cannot be changed or revoked.
- **Execution is atomic.** When an `add-peer`, `remove-peer`, `update-config`, or `upgrade-contract` proposal is approved, the action is applied atomically as part of the block commitment.
- **No admin override.** There is no superuser or admin role that can bypass the governance process. All changes require quorum.

## Next Steps

- [Multi-Node Cluster](/docs/guides/multi-node-cluster) -- Set up the cluster that governance manages
- [Smart Contracts](/docs/guides/smart-contracts) -- Write the contracts that `upgrade-contract` proposals deploy
- [Privacy and Encryption](/docs/guides/privacy-encryption) -- Protect governance-related data with encryption
