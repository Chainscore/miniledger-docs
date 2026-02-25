---
title: "Example: Token Ledger"
description: Build a token and asset ledger using MiniLedger's built-in transfer contract, with minting, transfers, balance queries, and SQL-powered analytics.
keywords: [token ledger, asset ledger, blockchain tokens, miniledger tokens, digital asset transfer, minting, balance queries, token contract, permissioned token, enterprise tokens]
sidebar_position: 2
---

# Example: Token Ledger

This example demonstrates how to use MiniLedger's built-in **transfer contract** to create a simple token ledger with minting, transfers, and balance queries. This is useful for internal point systems, loyalty tokens, asset tracking, inter-company settlement, or any scenario where you need auditable value transfers between parties.

## Overview

The built-in transfer contract provides four methods:

| Method | Purpose |
|---|---|
| `init(ctx, initialBalance)` | Initialize the sender's account with an optional starting balance |
| `mint(ctx, amount)` | Mint new tokens to the sender's account |
| `transfer(ctx, to, amount)` | Transfer tokens from the sender to another address |
| `balance(ctx, address)` | Query the balance of an address |

## The Built-in Transfer Contract

MiniLedger ships with a built-in transfer contract defined in `src/contracts/builtins.ts`:

```javascript
return {
  init(ctx, initialBalance) {
    ctx.set("balance:" + ctx.sender, initialBalance || 0);
    ctx.log("Account initialized with balance: " + (initialBalance || 0));
  },

  mint(ctx, amount) {
    if (typeof amount !== "number" || amount <= 0) throw new Error("Invalid amount");
    const key = "balance:" + ctx.sender;
    const current = ctx.get(key) || 0;
    ctx.set(key, current + amount);
    ctx.log("Minted " + amount + " to " + ctx.sender);
    return current + amount;
  },

  transfer(ctx, to, amount) {
    if (typeof amount !== "number" || amount <= 0) throw new Error("Invalid amount");
    if (!to) throw new Error("Recipient required");

    const fromKey = "balance:" + ctx.sender;
    const toKey = "balance:" + to;

    const fromBalance = ctx.get(fromKey) || 0;
    if (fromBalance < amount) throw new Error("Insufficient balance");

    const toBalance = ctx.get(toKey) || 0;
    ctx.set(fromKey, fromBalance - amount);
    ctx.set(toKey, toBalance + amount);
    ctx.log("Transfer " + amount + " from " + ctx.sender + " to " + to);
  },

  balance(ctx, address) {
    const key = "balance:" + (address || ctx.sender);
    return ctx.get(key) || 0;
  }
}
```

## State Schema

Token balances are stored as simple key-value pairs:

```
Key:   "balance:<public_key_hex>"
Value: <number>
```

For example:

```
balance:3a7f1b2c9e4d8f05a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2  ->  1000
balance:b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0  ->  500
```

## Step-by-Step Walkthrough

### 1. Start the Node

```bash
npx miniledger start
```

### 2. Deploy the Transfer Contract

Deploy the built-in transfer contract (or your own custom version):

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:deploy",
    "payload": {
      "kind": "contract:deploy",
      "name": "token",
      "version": "1.0.0",
      "code": "return { init(ctx, initialBalance) { ctx.set(\"balance:\" + ctx.sender, initialBalance || 0); ctx.log(\"Account initialized with balance: \" + (initialBalance || 0)); }, mint(ctx, amount) { if (typeof amount !== \"number\" || amount <= 0) throw new Error(\"Invalid amount\"); const key = \"balance:\" + ctx.sender; const current = ctx.get(key) || 0; ctx.set(key, current + amount); ctx.log(\"Minted \" + amount + \" to \" + ctx.sender); return current + amount; }, transfer(ctx, to, amount) { if (typeof amount !== \"number\" || amount <= 0) throw new Error(\"Invalid amount\"); if (!to) throw new Error(\"Recipient required\"); const fromKey = \"balance:\" + ctx.sender; const toKey = \"balance:\" + to; const fromBalance = ctx.get(fromKey) || 0; if (fromBalance < amount) throw new Error(\"Insufficient balance\"); const toBalance = ctx.get(toKey) || 0; ctx.set(fromKey, fromBalance - amount); ctx.set(toKey, toBalance + amount); ctx.log(\"Transfer \" + amount + \" from \" + ctx.sender + \" to \" + to); }, balance(ctx, address) { const key = \"balance:\" + (address || ctx.sender); return ctx.get(key) || 0; } }"
    }
  }'
```

### 3. Initialize an Account

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "token",
      "method": "init",
      "args": [0]
    }
  }'
```

### 4. Mint Tokens

Mint 10,000 tokens to the node's own account:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "token",
      "method": "mint",
      "args": [10000]
    }
  }'
```

### 5. Transfer Tokens

Transfer 2,500 tokens to another address:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "token",
      "method": "transfer",
      "args": ["b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0", 2500]
    }
  }'
```

### 6. Check Balances

Query the sender's balance via the state API:

```bash
curl http://localhost:3000/api/state/balance:3a7f1b2c9e4d8f05a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2
```

Response:

```json
{
  "key": "balance:3a7f1b2c9e4d8f05...",
  "value": 7500,
  "version": 3,
  "updatedAt": 1706200000000,
  "updatedBy": "3a7f1b2c9e4d8f05...",
  "blockHeight": 5
}
```

### 7. SQL Queries for Analytics

List all accounts and balances:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, value FROM world_state WHERE key LIKE ?",
    "params": ["balance:%"]
  }'
```

Response:

```json
[
  { "key": "balance:3a7f1b2c9e4d8f05...", "value": "7500" },
  { "key": "balance:b9c8d7e6f5a4b3c2...", "value": "2500" }
]
```

Find accounts with balance above a threshold:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT key, CAST(value AS INTEGER) as balance FROM world_state WHERE key LIKE ? AND CAST(value AS INTEGER) > ?",
    "params": ["balance:%", 5000]
  }'
```

Count the total number of accounts:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT COUNT(*) as account_count FROM world_state WHERE key LIKE ?",
    "params": ["balance:%"]
  }'
```

Compute the total token supply:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT SUM(CAST(value AS INTEGER)) as total_supply FROM world_state WHERE key LIKE ?",
    "params": ["balance:%"]
  }'
```

Find all transfer transactions:

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT hash, sender, timestamp, payload FROM transactions WHERE type = ? ORDER BY timestamp DESC",
    "params": ["contract:invoke"]
  }'
```

## Programmatic Usage

```typescript
import { MiniLedgerNode } from "miniledger";

const node = await MiniLedgerNode.create({
  dataDir: "./token-data",
  config: { consensus: { algorithm: "solo" } },
});
await node.init();
await node.start();

// Deploy the token contract
await node.submit({
  type: "contract:deploy",
  payload: {
    kind: "contract:deploy",
    name: "token",
    version: "1.0.0",
    code: TRANSFER_CONTRACT, // Built-in contract string
  },
});

// Mint tokens
await node.submit({
  type: "contract:invoke",
  payload: {
    kind: "contract:invoke",
    contract: "token",
    method: "mint",
    args: [10000],
  },
});

// Transfer tokens
await node.submit({
  type: "contract:invoke",
  payload: {
    kind: "contract:invoke",
    contract: "token",
    method: "transfer",
    args: ["<recipient_public_key>", 2500],
  },
});

// Query balance
const state = await node.getState("balance:" + node.getPublicKey());
console.log("Balance:", state?.value); // 7500

// SQL query: total supply
const result = await node.query(
  "SELECT SUM(CAST(value AS INTEGER)) as total FROM world_state WHERE key LIKE ?",
  ["balance:%"]
);
console.log("Total supply:", result[0]?.total); // 10000
```

## Custom Token Contract

You can extend the built-in contract for more complex scenarios. Here is an example with an allowance mechanism and transfer limits:

```javascript
return {
  init(ctx, name, symbol, maxSupply) {
    ctx.set("token:name", name);
    ctx.set("token:symbol", symbol);
    ctx.set("token:maxSupply", maxSupply);
    ctx.set("token:totalSupply", 0);
    ctx.set("token:admin", ctx.sender);
    ctx.set("balance:" + ctx.sender, 0);
    ctx.log("Token " + symbol + " initialized with max supply " + maxSupply);
  },

  mint(ctx, amount) {
    if (typeof amount !== "number" || amount <= 0) throw new Error("Invalid amount");

    const admin = ctx.get("token:admin");
    if (ctx.sender !== admin) throw new Error("Only admin can mint");

    const maxSupply = ctx.get("token:maxSupply");
    const totalSupply = ctx.get("token:totalSupply") || 0;
    if (totalSupply + amount > maxSupply) throw new Error("Exceeds max supply");

    const key = "balance:" + ctx.sender;
    const current = ctx.get(key) || 0;
    ctx.set(key, current + amount);
    ctx.set("token:totalSupply", totalSupply + amount);
    ctx.log("Minted " + amount + ". Total supply: " + (totalSupply + amount));
  },

  transfer(ctx, to, amount) {
    if (typeof amount !== "number" || amount <= 0) throw new Error("Invalid amount");
    if (!to) throw new Error("Recipient required");

    const fromKey = "balance:" + ctx.sender;
    const toKey = "balance:" + to;

    const fromBalance = ctx.get(fromKey) || 0;
    if (fromBalance < amount) throw new Error("Insufficient balance");

    const toBalance = ctx.get(toKey) || 0;
    ctx.set(fromKey, fromBalance - amount);
    ctx.set(toKey, toBalance + amount);

    // Record transfer for audit
    const txCount = ctx.get("token:txCount") || 0;
    ctx.set("transfer:" + (txCount + 1), {
      from: ctx.sender,
      to: to,
      amount: amount,
      timestamp: ctx.timestamp
    });
    ctx.set("token:txCount", txCount + 1);

    ctx.log("Transfer " + amount + " from " + ctx.sender + " to " + to);
  },

  balance(ctx, address) {
    return ctx.get("balance:" + (address || ctx.sender)) || 0;
  },

  info(ctx) {
    return {
      name: ctx.get("token:name"),
      symbol: ctx.get("token:symbol"),
      maxSupply: ctx.get("token:maxSupply"),
      totalSupply: ctx.get("token:totalSupply"),
      admin: ctx.get("token:admin")
    };
  }
}
```

## Audit Trail

Every token operation is recorded as a transaction on the blockchain, providing a complete audit trail:

```bash
# Find all transactions involving a specific sender
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT hash, type, timestamp, payload FROM transactions WHERE sender = ? ORDER BY timestamp",
    "params": ["3a7f1b2c9e4d8f05..."]
  }'
```

Each transaction includes:
- **Cryptographic hash**: Tamper-evident transaction identifier
- **Sender public key**: Who initiated the operation
- **Ed25519 signature**: Proof the transaction was authorized by the sender
- **Block height**: Which block confirmed the transaction
- **Timestamp**: When the transaction was submitted

Because all state changes go through the blockchain, you can replay the entire history of token movements from genesis to present.

## Design Notes

1. **No fractional tokens**: The built-in contract uses integer arithmetic. For decimal tokens, multiply by a precision factor (e.g., store cents instead of dollars).
2. **No global burn**: Tokens can be minted but the built-in contract does not include a burn mechanism. Add one by extending the contract.
3. **Sender-only minting**: In the built-in contract, any account can mint tokens to itself. The custom example above restricts minting to the admin.
4. **Balance queries are free**: Reading state via `GET /api/state/balance:<address>` does not create a transaction. Only state-modifying operations (mint, transfer) consume a transaction.
5. **SQL for analytics**: Use SQL queries for aggregate operations (total supply, account counts, top holders) that would be expensive to compute in contract code.
