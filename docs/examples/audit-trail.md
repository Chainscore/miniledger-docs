---
title: "Example: Audit Trail & Compliance Logging"
description: Build an immutable audit trail and compliance logging system with MiniLedger, including event recording, tamper-evident logs, regulatory compliance, and advanced SQL-based audit queries.
keywords: [audit trail blockchain, compliance logging, immutable audit log, tamper-evident logging, blockchain compliance, regulatory audit, miniledger audit, enterprise audit trail, SOX compliance, HIPAA audit]
sidebar_position: 3
---

# Example: Audit Trail & Compliance Logging

This example demonstrates how to use MiniLedger as an immutable audit trail and compliance logging system. Every entry is cryptographically signed, timestamped, and recorded in an append-only ledger that cannot be altered retroactively -- exactly what regulators and auditors need.

## Why Blockchain for Audit Trails?

Traditional audit logs stored in databases or files can be modified, deleted, or backdated by anyone with sufficient access. A blockchain-backed audit trail provides:

| Property | How MiniLedger Delivers It |
|---|---|
| **Immutability** | Each block links to the previous block's hash. Altering any entry invalidates all subsequent blocks. |
| **Non-repudiation** | Every log entry is signed with the submitter's Ed25519 private key. The signer cannot deny authorship. |
| **Timestamp integrity** | Block timestamps are part of the hash chain. They cannot be backdated without invalidating the chain. |
| **Distributed verification** | In multi-node mode, multiple independent parties hold copies of the same audit log. No single party can tamper unilaterally. |
| **SQL queryability** | Audit entries are stored in SQLite and can be queried, filtered, and aggregated with standard SQL. |

## The Audit Trail Contract

```javascript
return {
  logEvent(ctx, category, action, subject, details) {
    if (!category || !action) {
      throw new Error("Category and action are required");
    }

    // Generate a sequential event ID
    const counterKey = "audit:counter";
    const counter = (ctx.get(counterKey) || 0) + 1;
    ctx.set(counterKey, counter);

    const eventId = "EVT-" + String(counter).padStart(8, "0");
    const eventKey = "audit:event:" + eventId;

    const event = {
      eventId: eventId,
      category: category,
      action: action,
      subject: subject || null,
      details: details || null,
      recordedBy: ctx.sender,
      blockHeight: ctx.blockHeight,
      timestamp: ctx.timestamp
    };

    ctx.set(eventKey, event);

    // Maintain a category index for efficient queries
    const catIndexKey = "audit:index:category:" + category;
    const catIndex = ctx.get(catIndexKey) || [];
    catIndex.push(eventId);
    ctx.set(catIndexKey, catIndex);

    // Maintain a subject index if subject is provided
    if (subject) {
      const subIndexKey = "audit:index:subject:" + subject;
      const subIndex = ctx.get(subIndexKey) || [];
      subIndex.push(eventId);
      ctx.set(subIndexKey, subIndex);
    }

    ctx.log("Audit event " + eventId + ": " + category + "/" + action);
    return eventId;
  },

  getEvent(ctx, eventId) {
    const key = "audit:event:" + eventId;
    return ctx.get(key);
  },

  getEventsByCategory(ctx, category) {
    const indexKey = "audit:index:category:" + category;
    return ctx.get(indexKey) || [];
  },

  getEventsBySubject(ctx, subject) {
    const indexKey = "audit:index:subject:" + subject;
    return ctx.get(indexKey) || [];
  },

  getEventCount(ctx) {
    return ctx.get("audit:counter") || 0;
  }
}
```

## Event Schema

Each audit event is stored under the key `audit:event:<eventId>`:

```json
{
  "eventId": "EVT-00000042",
  "category": "access",
  "action": "login",
  "subject": "user:john.doe@example.com",
  "details": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "mfaUsed": true
  },
  "recordedBy": "3a7f1b2c9e4d8f05...",
  "blockHeight": 127,
  "timestamp": 1706000000000
}
```

### Event Fields

| Field | Type | Description |
|---|---|---|
| `eventId` | `string` | Sequential identifier (e.g., `EVT-00000042`) |
| `category` | `string` | Event category (e.g., `access`, `data`, `config`, `finance`) |
| `action` | `string` | Specific action (e.g., `login`, `export`, `modify`, `approve`) |
| `subject` | `string` | Entity the event relates to (e.g., `user:X`, `document:Y`, `account:Z`) |
| `details` | `object` | Arbitrary structured data specific to the event |
| `recordedBy` | `string` | Public key of the node that recorded the event |
| `blockHeight` | `number` | Block in which this event was confirmed |
| `timestamp` | `number` | Unix timestamp in milliseconds |

## Use Cases

### Financial Compliance (SOX, SOC 2)

Log all financial transactions, approvals, and system access:

```bash
# Record an approval event
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "audit-trail",
      "method": "logEvent",
      "args": [
        "finance",
        "invoice_approved",
        "invoice:INV-2024-0042",
        {
          "amount": 15000.00,
          "currency": "USD",
          "approvedBy": "jane.smith@example.com",
          "department": "engineering",
          "costCenter": "CC-4200"
        }
      ]
    }
  }'
```

### Healthcare Compliance (HIPAA)

Track access to protected health information (PHI):

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "audit-trail",
      "method": "logEvent",
      "args": [
        "phi_access",
        "record_viewed",
        "patient:PT-12345",
        {
          "accessedBy": "dr.williams@hospital.org",
          "recordType": "lab_results",
          "justification": "scheduled_appointment",
          "accessPoint": "clinical_workstation_7B"
        }
      ]
    }
  }'
```

### System Configuration Changes

Record infrastructure and configuration changes:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "audit-trail",
      "method": "logEvent",
      "args": [
        "config",
        "firewall_rule_added",
        "server:prod-web-01",
        {
          "rule": "allow TCP 443 from 10.0.0.0/8",
          "changedBy": "ops@example.com",
          "changeTicket": "CHG-2024-0891",
          "previousRules": 42,
          "newRules": 43
        }
      ]
    }
  }'
```

### Access Control Events

Log authentication and authorization events:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "audit-trail",
      "method": "logEvent",
      "args": [
        "access",
        "login_failed",
        "user:john.doe@example.com",
        {
          "ip": "203.0.113.42",
          "reason": "invalid_password",
          "attemptNumber": 3,
          "lockoutTriggered": true
        }
      ]
    }
  }'
```

## Querying the Audit Trail

### By Individual Event

```bash
curl http://localhost:3000/api/state/audit:event:EVT-00000042
```

### By Category (Using Contract Index)

Retrieve the list of event IDs in a category:

```bash
curl http://localhost:3000/api/state/audit:index:category:access
```

### By Subject

Retrieve all events related to a specific entity:

```bash
curl http://localhost:3000/api/state/audit:index:subject:user:john.doe@example.com
```

### SQL-Based Audit Queries

MiniLedger's SQL query capability is where the audit trail really shines. Use standard SQL for complex audit queries:

**Find all events in a time range:**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value, updated_at FROM world_state WHERE key LIKE ? AND updated_at BETWEEN ? AND ? ORDER BY updated_at",
    "params": ["audit:event:%", 1706000000000, 1706100000000]
  }'
```

**Find all failed login attempts:**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value FROM world_state WHERE key LIKE ? AND value LIKE ?",
    "params": ["audit:event:%", "%\"action\":\"login_failed\"%"]
  }'
```

**Count events per category:**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, json_array_length(value) as event_count FROM world_state WHERE key LIKE ?",
    "params": ["audit:index:category:%"]
  }'
```

**Find events recorded by a specific node:**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value FROM world_state WHERE key LIKE ? AND value LIKE ?",
    "params": ["audit:event:%", "%\"recordedBy\":\"3a7f1b2c9e4d8f05%"]
  }'
```

**Audit events per block (for regulatory timeline):**

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT block_height, COUNT(*) as events FROM world_state WHERE key LIKE ? GROUP BY block_height ORDER BY block_height",
    "params": ["audit:event:%"]
  }'
```

## Programmatic Integration

Embed MiniLedger as an audit backend in your existing application:

```typescript
import { MiniLedgerNode } from "miniledger";

// Initialize the audit ledger
const auditLedger = await MiniLedgerNode.create({
  dataDir: "./audit-data",
  config: {
    consensus: { algorithm: "solo", blockTimeMs: 500 },
  },
});
await auditLedger.init();
await auditLedger.start();

// Deploy the audit contract
await auditLedger.submit({
  type: "contract:deploy",
  payload: {
    kind: "contract:deploy",
    name: "audit-trail",
    version: "1.0.0",
    code: auditContractCode,
  },
});

// Helper function for your application
async function logAuditEvent(
  category: string,
  action: string,
  subject: string,
  details: Record<string, unknown>
) {
  return auditLedger.submit({
    type: "contract:invoke",
    payload: {
      kind: "contract:invoke",
      contract: "audit-trail",
      method: "logEvent",
      args: [category, action, subject, details],
    },
  });
}

// Use in your application
app.post("/api/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;

  // Perform the role change in your main database
  await db.updateUserRole(id, newRole);

  // Record in the immutable audit trail
  await logAuditEvent("access", "role_changed", `user:${id}`, {
    newRole,
    previousRole: req.user.role,
    changedBy: req.user.email,
    ip: req.ip,
  });

  res.json({ success: true });
});

// Query audit history
app.get("/api/audit/user/:userId", async (req, res) => {
  const events = await auditLedger.query(
    "SELECT key, value FROM world_state WHERE key LIKE ? AND value LIKE ? ORDER BY updated_at DESC",
    ["audit:event:%", `%"subject":"user:${req.params.userId}"%`]
  );
  res.json(events);
});
```

## Using Simple State Keys (Without Contracts)

For simpler deployments, you can use MiniLedger's direct state operations without deploying a contract:

```bash
# Record an audit event directly as a state key
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "kind": "state:set",
      "key": "audit:2024-01-25T10:30:00Z:login:user123",
      "value": {
        "action": "login",
        "user": "user123",
        "ip": "192.168.1.100",
        "success": true
      }
    }
  }'
```

This approach is simpler (no contract deployment) but lacks the sequential event IDs and category indexes that the contract provides.

## Multi-Organization Audit

For cross-organization compliance (e.g., consortium auditing):

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  Company A Node    │     │  Auditor Node      │     │  Company B Node    │
│                   │     │                   │     │                   │
│  Logs events from │     │  Read-only access  │     │  Logs events from │
│  Company A systems│────▶│  to full audit     │◀────│  Company B systems│
│                   │     │  trail for both    │     │                   │
│  orgId: "co-a"    │     │  orgId: "auditor"  │     │  orgId: "co-b"    │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          │                        │                         │
          └────────────────────────┴─────────────────────────┘
                     Shared Raft Consensus
```

In this setup:
- Both companies submit audit events to the shared ledger.
- The auditor node participates in consensus and has a full copy of all events.
- No single party can alter or delete audit entries.
- The auditor can run SQL queries across the entire audit trail.

## Compliance Considerations

| Regulation | How MiniLedger Helps |
|---|---|
| **SOX** | Tamper-evident logging of financial transactions with cryptographic signatures |
| **HIPAA** | Immutable access logs for PHI with non-repudiation |
| **GDPR** | While GDPR requires data deletion (right to erasure), audit logs are typically exempt. Store only references to personal data, not the data itself. |
| **SOC 2** | Provides evidence of access controls, change management, and monitoring |
| **PCI DSS** | Audit trail for cardholder data access and system changes |

## Design Notes

1. **Append-only by design**: The blockchain is inherently append-only. Even the contract does not provide any method to modify or delete past events.
2. **Signed entries**: Every audit event is submitted as a transaction signed by the recording node's Ed25519 key, providing non-repudiation.
3. **Block-level timestamps**: Even if individual event timestamps could theoretically be fabricated, the block timestamp and hash chain provide an independent ordering guarantee.
4. **Storage growth**: Audit trails grow linearly. For high-volume systems, consider periodic archival of older blocks and state snapshots.
5. **Search limitations**: SQLite `LIKE` queries on JSON values work well for moderate volumes. For millions of events, consider maintaining additional index keys in the contract or running queries against exported data.
