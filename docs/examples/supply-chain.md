---
title: "Example: Supply Chain Tracking"
description: Build a complete supply chain tracking system with MiniLedger smart contracts, including product creation, location tracking, ownership transfers, and delivery confirmation with full audit history.
keywords: [supply chain blockchain, supply chain tracking, miniledger example, smart contract example, product tracking, blockchain traceability, provenance tracking, supply chain transparency]
sidebar_position: 1
---

# Example: Supply Chain Tracking

This example demonstrates how to build a complete supply chain tracking system using MiniLedger smart contracts. The system tracks products from creation through multiple locations and ownership transfers until final delivery, maintaining a full audit history on the ledger.

## Overview

The supply chain contract supports four operations:

| Method | Purpose |
|---|---|
| `createProduct` | Register a new product with an ID, name, and origin |
| `updateLocation` | Record a product's movement to a new location |
| `transferOwnership` | Transfer product ownership to another party |
| `markDelivered` | Mark a product as delivered to its final destination |

Each product is stored as a single state entry with a complete history array, providing full provenance tracking.

## The Contract

```javascript
return {
  createProduct(ctx, id, name, origin) {
    if (!id || !name || !origin) {
      throw new Error("Product ID, name, and origin are required");
    }

    const key = "product:" + id;
    const existing = ctx.get(key);
    if (existing) {
      throw new Error("Product " + id + " already exists");
    }

    const product = {
      id: id,
      name: name,
      origin: origin,
      owner: ctx.sender,
      status: "created",
      location: origin,
      history: [
        {
          action: "created",
          by: ctx.sender,
          location: origin,
          timestamp: ctx.timestamp,
          notes: "Product registered"
        }
      ]
    };

    ctx.set(key, product);
    ctx.log("Product created: " + id + " (" + name + ") at " + origin);
  },

  updateLocation(ctx, id, location, notes) {
    if (!id || !location) {
      throw new Error("Product ID and location are required");
    }

    const key = "product:" + id;
    const product = ctx.get(key);
    if (!product) {
      throw new Error("Product " + id + " not found");
    }
    if (product.status === "delivered") {
      throw new Error("Product " + id + " has already been delivered");
    }
    if (product.owner !== ctx.sender) {
      throw new Error("Only the current owner can update location");
    }

    product.location = location;
    product.history.push({
      action: "location_update",
      by: ctx.sender,
      location: location,
      timestamp: ctx.timestamp,
      notes: notes || ""
    });

    ctx.set(key, product);
    ctx.log("Product " + id + " moved to " + location);
  },

  transferOwnership(ctx, id, newOwner) {
    if (!id || !newOwner) {
      throw new Error("Product ID and new owner are required");
    }

    const key = "product:" + id;
    const product = ctx.get(key);
    if (!product) {
      throw new Error("Product " + id + " not found");
    }
    if (product.status === "delivered") {
      throw new Error("Cannot transfer a delivered product");
    }
    if (product.owner !== ctx.sender) {
      throw new Error("Only the current owner can transfer ownership");
    }

    const previousOwner = product.owner;
    product.owner = newOwner;
    product.status = "in_transit";
    product.history.push({
      action: "ownership_transfer",
      by: ctx.sender,
      from: previousOwner,
      to: newOwner,
      timestamp: ctx.timestamp,
      notes: "Transferred from " + previousOwner.substring(0, 16) +
             " to " + newOwner.substring(0, 16)
    });

    ctx.set(key, product);
    ctx.log("Product " + id + " transferred to " + newOwner.substring(0, 16));
  },

  markDelivered(ctx, id) {
    if (!id) {
      throw new Error("Product ID is required");
    }

    const key = "product:" + id;
    const product = ctx.get(key);
    if (!product) {
      throw new Error("Product " + id + " not found");
    }
    if (product.status === "delivered") {
      throw new Error("Product " + id + " is already delivered");
    }
    if (product.owner !== ctx.sender) {
      throw new Error("Only the current owner can mark as delivered");
    }

    product.status = "delivered";
    product.history.push({
      action: "delivered",
      by: ctx.sender,
      location: product.location,
      timestamp: ctx.timestamp,
      notes: "Product delivered"
    });

    ctx.set(key, product);
    ctx.log("Product " + id + " marked as delivered");
  }
}
```

## State Schema

Each product is stored under the key `product:<id>` with the following structure:

```json
{
  "id": "SKU-001",
  "name": "Organic Coffee Beans",
  "origin": "Bogota, Colombia",
  "owner": "3a7f1b2c9e4d8f05...",
  "status": "in_transit",
  "location": "Miami Port, USA",
  "history": [
    {
      "action": "created",
      "by": "3a7f1b2c9e4d8f05...",
      "location": "Bogota, Colombia",
      "timestamp": 1706000000000,
      "notes": "Product registered"
    },
    {
      "action": "location_update",
      "by": "3a7f1b2c9e4d8f05...",
      "location": "Cartagena Port, Colombia",
      "timestamp": 1706100000000,
      "notes": "Shipped to port"
    }
  ]
}
```

## Step-by-Step Walkthrough

### 1. Start the Node

```bash
npx miniledger start
```

The node starts on `http://localhost:3000` with a REST API.

### 2. Deploy the Contract

Save the contract code to a file or submit it via the API:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:deploy",
    "payload": {
      "kind": "contract:deploy",
      "name": "supply-chain",
      "version": "1.0.0",
      "code": "return { createProduct(ctx, id, name, origin) { ... }, ... }"
    }
  }'
```

Response:

```json
{
  "hash": "a1b2c3d4...",
  "type": "contract:deploy",
  "sender": "3a7f1b2c9e4d8f05...",
  "nonce": 0,
  "status": "pending"
}
```

### 3. Create a Product

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "supply-chain",
      "method": "createProduct",
      "args": ["SKU-001", "Organic Coffee Beans", "Bogota, Colombia"]
    }
  }'
```

### 4. Update Location

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "supply-chain",
      "method": "updateLocation",
      "args": ["SKU-001", "Cartagena Port, Colombia", "Shipped to port for export"]
    }
  }'
```

### 5. Transfer Ownership

When the product changes hands (e.g., from exporter to importer):

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "supply-chain",
      "method": "transferOwnership",
      "args": ["SKU-001", "b9c8d7e6f5a4b3c2..."]
    }
  }'
```

### 6. Mark as Delivered

The new owner marks the product as delivered:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "supply-chain",
      "method": "markDelivered",
      "args": ["SKU-001"]
    }
  }'
```

### 7. Query Product State

Read the current state of a product:

```bash
curl http://localhost:3000/api/state/product:SKU-001
```

Response:

```json
{
  "key": "product:SKU-001",
  "value": {
    "id": "SKU-001",
    "name": "Organic Coffee Beans",
    "origin": "Bogota, Colombia",
    "owner": "b9c8d7e6f5a4b3c2...",
    "status": "delivered",
    "location": "Cartagena Port, Colombia",
    "history": [
      {
        "action": "created",
        "by": "3a7f1b2c9e4d8f05...",
        "location": "Bogota, Colombia",
        "timestamp": 1706000000000,
        "notes": "Product registered"
      },
      {
        "action": "location_update",
        "by": "3a7f1b2c9e4d8f05...",
        "location": "Cartagena Port, Colombia",
        "timestamp": 1706100000000,
        "notes": "Shipped to port for export"
      },
      {
        "action": "ownership_transfer",
        "by": "3a7f1b2c9e4d8f05...",
        "from": "3a7f1b2c9e4d8f05...",
        "to": "b9c8d7e6f5a4b3c2...",
        "timestamp": 1706200000000,
        "notes": "Transferred from 3a7f1b2c9e4d8f05 to b9c8d7e6f5a4b3c2"
      },
      {
        "action": "delivered",
        "by": "b9c8d7e6f5a4b3c2...",
        "location": "Cartagena Port, Colombia",
        "timestamp": 1706300000000,
        "notes": "Product delivered"
      }
    ]
  },
  "version": 4,
  "updatedAt": 1706300000000,
  "updatedBy": "b9c8d7e6f5a4b3c2...",
  "blockHeight": 15
}
```

### 8. Query with SQL

Find all products that have been delivered:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value FROM world_state WHERE key LIKE ? AND value LIKE ?",
    "params": ["product:%", "%\"status\":\"delivered\"%"]
  }'
```

Find all products currently owned by a specific public key:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value FROM world_state WHERE key LIKE ? AND value LIKE ?",
    "params": ["product:%", "%\"owner\":\"b9c8d7e6f5a4b3c2%"]
  }'
```

## Programmatic Usage

You can also use MiniLedger as an embedded library:

```typescript
import { MiniLedgerNode } from "miniledger";

const node = await MiniLedgerNode.create({
  dataDir: "./supply-chain-data",
  config: { consensus: { algorithm: "solo" } },
});
await node.init();
await node.start();

// Deploy the contract
await node.submit({
  type: "contract:deploy",
  payload: {
    kind: "contract:deploy",
    name: "supply-chain",
    version: "1.0.0",
    code: supplyChainContractCode,
  },
});

// Create a product
await node.submit({
  type: "contract:invoke",
  payload: {
    kind: "contract:invoke",
    contract: "supply-chain",
    method: "createProduct",
    args: ["SKU-001", "Organic Coffee Beans", "Bogota, Colombia"],
  },
});

// Wait for block production, then query
setTimeout(async () => {
  const state = await node.getState("product:SKU-001");
  console.log("Product:", state?.value);
}, 2000);
```

## Multi-Node Deployment

For a production supply chain with multiple organizations:

```
Organization A (Exporter)         Organization B (Importer)
┌─────────────────────┐          ┌─────────────────────┐
│ MiniLedger Node A    │◀────────▶│ MiniLedger Node B    │
│ consensus: raft      │          │ consensus: raft      │
│ orgId: "exporter-co" │          │ orgId: "importer-co" │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                │
           ▼                                ▼
    Organization C (Logistics)
    ┌─────────────────────┐
    │ MiniLedger Node C    │
    │ consensus: raft      │
    │ orgId: "logistics-co"│
    └─────────────────────┘
```

Each organization runs its own node but shares the same ledger. The Raft consensus ensures all three nodes agree on the order and content of every block. Any party can independently verify the full provenance chain for any product.

## Design Considerations

1. **Immutable history**: The `history` array is append-only. Past entries cannot be modified, providing a tamper-evident audit trail.
2. **Ownership enforcement**: Only the current owner can update location, transfer ownership, or mark delivery. This is enforced by checking `product.owner === ctx.sender`.
3. **Status transitions**: Products follow a lifecycle (`created` -> `in_transit` -> `delivered`). Delivered products cannot be modified further.
4. **SQL queryability**: Because all state is in SQLite, you can run ad-hoc queries to find products by status, owner, location, or any other field.
5. **Scalability**: Each product is a single key-value pair. For high-volume supply chains, consider sharding products across multiple contract instances or using key prefixes for organizational namespacing.
