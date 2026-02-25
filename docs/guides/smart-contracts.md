---
title: Smart Contracts
description: Write, deploy, and invoke JavaScript smart contracts on MiniLedger. Learn the context API, built-in contracts, error handling, and the 5-second execution timeout.
keywords:
  - miniledger smart contracts
  - javascript smart contracts
  - blockchain smart contracts
  - deploy smart contract
  - invoke smart contract
  - contract context API
  - private blockchain contracts
  - node.js smart contracts
  - kv-store contract
  - transfer contract
sidebar_position: 2
---

# Smart Contracts

MiniLedger smart contracts are plain **JavaScript functions** that run in a sandboxed environment on every node. They allow you to define custom business logic that reads and writes to the ledger's world state. Contracts are deployed as transactions and invoked through the REST API or programmatic API.

## Contract Structure

A MiniLedger smart contract is a JavaScript module that returns an object containing one or more methods. Each method receives a **context object** (`ctx`) as its first argument, followed by any additional arguments passed during invocation.

```javascript
return {
  // A simple greeting contract
  setGreeting(ctx, name) {
    ctx.set('greeting', `Hello, ${name}!`);
    ctx.log(`Greeting set by ${ctx.sender}`);
  },

  getGreeting(ctx) {
    return ctx.get('greeting');
  }
};
```

Key rules:

- The contract code must end with a `return { ... }` statement containing the method map
- Methods are synchronous -- no `async`/`await` or Promises
- Each method has a **5-second execution timeout**. If a method exceeds this limit, the transaction is rejected
- Contracts execute deterministically: the same inputs must always produce the same outputs across all nodes

## The Context API

Every contract method receives a `ctx` object that provides access to the world state and execution metadata.

### State Operations

| Method | Description | Example |
|---|---|---|
| `ctx.get(key)` | Read a value from the world state. Returns `undefined` if the key does not exist. | `ctx.get('balance:alice')` |
| `ctx.set(key, value)` | Write a value to the world state. Creates the key if it does not exist. Values are JSON-serializable. | `ctx.set('balance:alice', 100)` |
| `ctx.del(key)` | Delete a key from the world state. No-op if the key does not exist. | `ctx.del('temp:session')` |

### Execution Metadata

| Property | Type | Description |
|---|---|---|
| `ctx.sender` | `string` | The node ID of the transaction submitter |
| `ctx.blockHeight` | `number` | The current block height at execution time |
| `ctx.timestamp` | `number` | The block timestamp as a Unix epoch in milliseconds |

### Logging

| Method | Description |
|---|---|
| `ctx.log(message)` | Write a message to the contract execution log. Useful for debugging and audit trails. Logged messages are stored with the transaction receipt. |

### Complete Context Example

```javascript
return {
  transfer(ctx, from, to, amount) {
    // Validate input
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Read current balances
    const fromBalance = ctx.get(`balance:${from}`) || 0;
    const toBalance = ctx.get(`balance:${to}`) || 0;

    // Check sufficient funds
    if (fromBalance < amount) {
      throw new Error(`Insufficient balance: ${fromBalance} < ${amount}`);
    }

    // Update balances atomically
    ctx.set(`balance:${from}`, fromBalance - amount);
    ctx.set(`balance:${to}`, toBalance + amount);

    // Log the transfer for audit
    ctx.log(`Transfer: ${from} -> ${to}, amount=${amount}, block=${ctx.blockHeight}`);
  }
};
```

## Deploying a Contract

Contracts are deployed by submitting a transaction with type `contract:deploy` to the REST API.

### Via REST API

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:deploy",
    "payload": {
      "kind": "contract:deploy",
      "name": "token",
      "version": "1.0.0",
      "code": "return { mint(ctx, account, amount) { const bal = ctx.get(`balance:${account}`) || 0; ctx.set(`balance:${account}`, bal + amount); ctx.log(`Minted ${amount} to ${account}`); }, balance(ctx, account) { return ctx.get(`balance:${account}`) || 0; } };"
    }
  }'
```

### Deployment Fields

| Field | Type | Required | Description |
|---|:---:|:---:|---|
| `name` | `string` | Yes | A unique identifier for the contract |
| `version` | `string` | Yes | Semantic version string (e.g., `"1.0.0"`) |
| `code` | `string` | Yes | The JavaScript contract source code |

### Response

```json
{
  "txId": "tx-abc123...",
  "status": "committed",
  "blockHeight": 5
}
```

:::tip
For contracts with complex code, read the source from a file:

```bash
CODE=$(cat ./contracts/token.js)
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg code "$CODE" '{
    type: "contract:deploy",
    payload: {
      kind: "contract:deploy",
      name: "token",
      version: "1.0.0",
      code: $code
    }
  }')"
```
:::

## Invoking a Contract

Once deployed, invoke any method on a contract by submitting a transaction with type `contract:invoke`.

### Via REST API

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "token",
      "method": "mint",
      "args": ["alice", 1000]
    }
  }'
```

### Invocation Fields

| Field | Type | Required | Description |
|---|:---:|:---:|---|
| `contract` | `string` | Yes | The name of the deployed contract |
| `method` | `string` | Yes | The method to call on the contract |
| `args` | `array` | No | Arguments to pass to the method (default: `[]`) |

### Reading Return Values

If a contract method returns a value, it is included in the transaction receipt:

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "token",
      "method": "balance",
      "args": ["alice"]
    }
  }'
```

```json
{
  "txId": "tx-def456...",
  "status": "committed",
  "result": 1000,
  "blockHeight": 7
}
```

## Built-in Contracts

MiniLedger ships with two built-in contracts that are available without deployment.

### `transfer`

A simple value transfer contract for moving numeric balances between accounts.

```bash
# Mint initial balance
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "transfer",
      "method": "mint",
      "args": ["alice", 500]
    }
  }'

# Transfer between accounts
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "transfer",
      "method": "send",
      "args": ["alice", "bob", 200]
    }
  }'
```

**Methods:**

| Method | Arguments | Description |
|---|---|---|
| `mint(ctx, account, amount)` | account name, amount | Create new balance for an account |
| `send(ctx, from, to, amount)` | sender, receiver, amount | Transfer balance between accounts |
| `balance(ctx, account)` | account name | Query current balance |

### `kv-store`

A general-purpose key-value store contract for arbitrary data.

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:invoke",
    "payload": {
      "kind": "contract:invoke",
      "contract": "kv-store",
      "method": "put",
      "args": ["config:app-name", "My dApp"]
    }
  }'
```

**Methods:**

| Method | Arguments | Description |
|---|---|---|
| `put(ctx, key, value)` | key, value | Store a key-value pair |
| `get(ctx, key)` | key | Retrieve a value by key |
| `del(ctx, key)` | key | Delete a key-value pair |

## Error Handling

When a contract method throws an error, the transaction is **rejected** and no state changes are applied. The error message is returned in the transaction receipt.

### Throwing Errors in Contracts

```javascript
return {
  withdraw(ctx, account, amount) {
    const balance = ctx.get(`balance:${account}`) || 0;

    if (amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    if (balance < amount) {
      throw new Error(`Insufficient funds: have ${balance}, need ${amount}`);
    }

    ctx.set(`balance:${account}`, balance - amount);
  }
};
```

### Error Response

```json
{
  "txId": "tx-err789...",
  "status": "rejected",
  "error": "Insufficient funds: have 100, need 500",
  "blockHeight": 12
}
```

### Common Error Scenarios

| Scenario | Cause | Resolution |
|---|---|---|
| `Contract not found` | The contract name does not match any deployed contract | Verify the contract name and check it was deployed |
| `Method not found` | The method does not exist on the contract | Check the contract source for available methods |
| `Execution timeout` | Method exceeded the 5-second time limit | Optimize the contract logic or break it into smaller operations |
| `Runtime error` | Unhandled exception in contract code | Add proper validation and error handling |

## The 5-Second Execution Timeout

Every contract method invocation has a strict **5-second timeout**. This prevents infinite loops and runaway computations from stalling the network. If a method does not complete within 5 seconds:

1. Execution is forcibly terminated
2. All state changes from the method are rolled back
3. The transaction is marked as `rejected` with an `Execution timeout` error

**Best practices to avoid timeouts:**

- Avoid unbounded loops -- always set an upper limit on iterations
- Minimize the number of `ctx.get()` and `ctx.set()` calls per method
- Move complex computations off-chain and submit only the results to the contract
- Break large batch operations into multiple transactions

## Contract Versioning and Upgrades

When you deploy a contract with the same name but a different version, the new version replaces the old one. The world state created by previous versions is preserved.

```bash
# Deploy v1
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:deploy",
    "payload": {
      "kind": "contract:deploy",
      "name": "token",
      "version": "1.0.0",
      "code": "return { balance(ctx, acct) { return ctx.get(`balance:${acct}`) || 0; } };"
    }
  }'

# Deploy v2 with additional methods
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contract:deploy",
    "payload": {
      "kind": "contract:deploy",
      "name": "token",
      "version": "2.0.0",
      "code": "return { balance(ctx, acct) { return ctx.get(`balance:${acct}`) || 0; }, totalSupply(ctx) { return ctx.get(\"totalSupply\") || 0; } };"
    }
  }'
```

For governed contract upgrades in a multi-node cluster, see the [Governance guide](/docs/guides/governance).

## Contract Development Tips

1. **Keep contracts small and focused.** Each contract should handle a single domain (e.g., token management, access control).

2. **Use key prefixes for namespacing.** Prefix all keys with the contract name to avoid collisions: `token:balance:alice`, `token:supply`.

3. **Validate all inputs.** Never trust method arguments -- check types, ranges, and permissions before modifying state.

4. **Use `ctx.log()` for observability.** Logged messages help with debugging and create an audit trail that is stored alongside the transaction.

5. **Test contracts locally.** Use MiniLedger's [programmatic API](/docs/guides/programmatic-api) to spin up a single-node instance and test contracts in your CI pipeline.

## Next Steps

- [Governance](/docs/guides/governance) -- Manage contract upgrades through on-chain proposals
- [SQL Queries](/docs/guides/sql-queries) -- Query world state created by your contracts using SQL
- [Programmatic API](/docs/guides/programmatic-api) -- Deploy and invoke contracts from your Node.js application code
