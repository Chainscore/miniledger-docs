---
title: REST API Reference
description: Complete reference for the MiniLedger REST API. Covers all HTTP endpoints for blocks, transactions, state, consensus, governance, and node management.
keywords:
  - miniledger api
  - rest api
  - blockchain api
  - ledger endpoints
  - hono api
  - block explorer api
  - transaction api
  - state query api
sidebar_position: 1
---

# REST API Reference

MiniLedger exposes a RESTful HTTP API built on [Hono](https://hono.dev/). All responses are JSON-encoded. The API server starts on the port configured with `--api-port` (default `3000`).

## Base URL

```
http://localhost:3000
```

## Conventions

- All successful responses return a JSON body.
- Paginated endpoints accept `?page=N&limit=M` query parameters. The maximum `limit` is **100**; the default is typically **20**.
- Error responses use standard HTTP status codes and include a JSON body with an `error` field:
  ```json
  { "error": "Resource not found" }
  ```

---

## Node

### GET /status

Returns the current status of the node, including the blockchain height, connected peer count, and uptime.

**Request**

```
GET /status
```

**Response** `200 OK`

```json
{
  "nodeId": "abc123def456",
  "height": 142,
  "peers": 2,
  "uptime": 3600,
  "consensus": "raft",
  "role": "leader",
  "version": "1.0.0"
}
```

| Field       | Type     | Description                                |
|-------------|----------|--------------------------------------------|
| `nodeId`    | `string` | Unique identifier of this node             |
| `height`    | `number` | Current blockchain height (latest block)   |
| `peers`     | `number` | Number of currently connected peers        |
| `uptime`    | `number` | Node uptime in seconds                     |
| `consensus` | `string` | Active consensus mechanism (`raft`, `solo`) |
| `role`      | `string` | Node's consensus role                      |
| `version`   | `string` | MiniLedger software version                |

---

### GET /identity

Returns the cryptographic identity of this node.

**Request**

```
GET /identity
```

**Response** `200 OK`

```json
{
  "nodeId": "abc123def456",
  "publicKey": "04a1b2c3d4e5f6...",
  "orgId": "my-org"
}
```

| Field       | Type     | Description                                |
|-------------|----------|--------------------------------------------|
| `nodeId`    | `string` | Unique node identifier                     |
| `publicKey` | `string` | Node's public key (hex-encoded)            |
| `orgId`     | `string` | Organization identifier the node belongs to |

---

### GET /dashboard

Returns data for the web explorer dashboard, aggregating key metrics across blocks, transactions, peers, and consensus state.

**Request**

```
GET /dashboard
```

**Response** `200 OK`

```json
{
  "height": 142,
  "totalTransactions": 580,
  "pendingTransactions": 3,
  "peers": 2,
  "consensus": {
    "role": "leader",
    "term": 5
  },
  "recentBlocks": [ ... ],
  "recentTransactions": [ ... ]
}
```

---

## Blocks

### GET /blocks

Returns a paginated list of blocks, ordered by height descending.

**Request**

```
GET /blocks?page=1&limit=20
```

| Parameter | Type     | Default | Description               |
|-----------|----------|---------|---------------------------|
| `page`    | `number` | `1`     | Page number (1-indexed)   |
| `limit`   | `number` | `20`    | Items per page (max 100)  |

**Response** `200 OK`

```json
{
  "blocks": [
    {
      "height": 142,
      "hash": "a3f1b9c8d7e6...",
      "previousHash": "f8e7d6c5b4a3...",
      "timestamp": 1706000000000,
      "transactions": 4,
      "merkleRoot": "1a2b3c4d5e6f..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 142
}
```

| Field              | Type     | Description                          |
|--------------------|----------|--------------------------------------|
| `height`           | `number` | Block height in the chain            |
| `hash`             | `string` | SHA-256 hash of the block            |
| `previousHash`     | `string` | Hash of the preceding block          |
| `timestamp`        | `number` | Unix timestamp in milliseconds       |
| `transactions`     | `number` | Number of transactions in the block  |
| `merkleRoot`       | `string` | Merkle root of the block's transactions |

---

### GET /blocks/:height

Returns a single block by its height, including full transaction data.

**Request**

```
GET /blocks/42
```

| Parameter | Type     | Description       |
|-----------|----------|-------------------|
| `height`  | `number` | Block height      |

**Response** `200 OK`

```json
{
  "height": 42,
  "hash": "a3f1b9c8d7e6...",
  "previousHash": "f8e7d6c5b4a3...",
  "timestamp": 1706000000000,
  "merkleRoot": "1a2b3c4d5e6f...",
  "transactions": [
    {
      "hash": "b2c3d4e5f6a7...",
      "type": "set",
      "key": "account:alice",
      "value": "{\"balance\":100}",
      "sender": "04a1b2c3d4e5f6...",
      "timestamp": 1706000000000
    }
  ]
}
```

**Error** `404 Not Found`

```json
{ "error": "Block not found" }
```

---

### GET /blocks/latest

Returns the most recently committed block.

**Request**

```
GET /blocks/latest
```

**Response** `200 OK`

Returns the same shape as [`GET /blocks/:height`](#get-blocksheight).

---

## Transactions

### POST /tx

Submit a new transaction to the network. The transaction is added to the pending pool and will be included in the next block once consensus is reached.

**Request**

```
POST /tx
Content-Type: application/json
```

The body accepts two formats:

**Key-Value format:**

```json
{
  "key": "account:alice",
  "value": "{\"balance\":150}"
}
```

**Typed payload format:**

```json
{
  "type": "transfer",
  "payload": {
    "from": "alice",
    "to": "bob",
    "amount": 50
  }
}
```

| Field     | Type     | Required | Description                                      |
|-----------|----------|----------|--------------------------------------------------|
| `key`     | `string` | No*      | State key to write                               |
| `value`   | `string` | No*      | Value to store (typically JSON-stringified)       |
| `type`    | `string` | No*      | Transaction type identifier                      |
| `payload` | `object` | No*      | Arbitrary transaction payload                    |

*Either `key`+`value` or `type`+`payload` must be provided.

**Response** `201 Created`

```json
{
  "hash": "b2c3d4e5f6a7...",
  "status": "pending"
}
```

| Field    | Type     | Description                                 |
|----------|----------|---------------------------------------------|
| `hash`   | `string` | SHA-256 hash of the submitted transaction   |
| `status` | `string` | Always `"pending"` upon initial submission  |

**Error** `400 Bad Request`

```json
{ "error": "Invalid transaction: missing key or type" }
```

---

### GET /tx

Returns the list of pending (unconfirmed) transactions in the mempool.

**Request**

```
GET /tx
```

**Response** `200 OK`

```json
{
  "transactions": [
    {
      "hash": "b2c3d4e5f6a7...",
      "type": "set",
      "key": "account:alice",
      "value": "{\"balance\":150}",
      "sender": "04a1b2c3d4e5f6...",
      "timestamp": 1706000000000,
      "status": "pending"
    }
  ],
  "count": 1
}
```

---

### GET /tx/:hash

Returns a single transaction by its hash. Works for both pending and confirmed transactions.

**Request**

```
GET /tx/b2c3d4e5f6a7...
```

| Parameter | Type     | Description           |
|-----------|----------|-----------------------|
| `hash`    | `string` | Transaction hash      |

**Response** `200 OK`

```json
{
  "hash": "b2c3d4e5f6a7...",
  "type": "set",
  "key": "account:alice",
  "value": "{\"balance\":150}",
  "sender": "04a1b2c3d4e5f6...",
  "timestamp": 1706000000000,
  "status": "confirmed",
  "blockHeight": 42,
  "blockHash": "a3f1b9c8d7e6..."
}
```

| Field         | Type     | Description                                    |
|---------------|----------|------------------------------------------------|
| `hash`        | `string` | Transaction hash                               |
| `type`        | `string` | Transaction type                               |
| `key`         | `string` | State key (if applicable)                      |
| `value`       | `string` | Stored value (if applicable)                   |
| `sender`      | `string` | Public key of the sender                       |
| `timestamp`   | `number` | Unix timestamp in milliseconds                 |
| `status`      | `string` | `"pending"` or `"confirmed"`                   |
| `blockHeight` | `number` | Block height (only if confirmed)               |
| `blockHash`   | `string` | Block hash (only if confirmed)                 |

**Error** `404 Not Found`

```json
{ "error": "Transaction not found" }
```

---

### GET /tx/recent

Returns a paginated list of confirmed (committed) transactions, ordered by most recent first. Optionally filterable by transaction type.

**Request**

```
GET /tx/recent?page=1&limit=20&type=transfer
```

| Parameter | Type     | Default | Description                       |
|-----------|----------|---------|-----------------------------------|
| `page`    | `number` | `1`     | Page number                       |
| `limit`   | `number` | `20`    | Items per page (max 100)          |
| `type`    | `string` | —       | Filter by transaction type        |

**Response** `200 OK`

```json
{
  "transactions": [
    {
      "hash": "b2c3d4e5f6a7...",
      "type": "transfer",
      "sender": "04a1b2c3d4e5f6...",
      "timestamp": 1706000000000,
      "status": "confirmed",
      "blockHeight": 42
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 580
}
```

---

### GET /tx/sender/:pubkey

Returns all transactions sent by a specific public key, up to a maximum of **200** results.

**Request**

```
GET /tx/sender/04a1b2c3d4e5f6...
```

| Parameter | Type     | Description              |
|-----------|----------|--------------------------|
| `pubkey`  | `string` | Sender's public key (hex) |

**Response** `200 OK`

```json
{
  "transactions": [ ... ],
  "count": 24
}
```

---

## State

### GET /state

Returns a paginated list of all state entries. Internal keys (prefixed with `_`) are excluded from results.

**Request**

```
GET /state?page=1&limit=20
```

| Parameter | Type     | Default | Description               |
|-----------|----------|---------|---------------------------|
| `page`    | `number` | `1`     | Page number               |
| `limit`   | `number` | `20`    | Items per page (max 100)  |

**Response** `200 OK`

```json
{
  "entries": [
    {
      "key": "account:alice",
      "value": "{\"balance\":150}",
      "updatedAt": 1706000000000,
      "blockHeight": 42
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 85
}
```

| Field         | Type     | Description                              |
|---------------|----------|------------------------------------------|
| `key`         | `string` | State key                                |
| `value`       | `string` | Stored value                             |
| `updatedAt`   | `number` | Timestamp of last update (ms)            |
| `blockHeight` | `number` | Block height of last update              |

---

### GET /state/:key

Returns a single state entry by its key.

**Request**

```
GET /state/account:alice
```

| Parameter | Type     | Description    |
|-----------|----------|----------------|
| `key`     | `string` | State key      |

**Response** `200 OK`

```json
{
  "key": "account:alice",
  "value": "{\"balance\":150}",
  "updatedAt": 1706000000000,
  "blockHeight": 42
}
```

**Error** `404 Not Found`

```json
{ "error": "State entry not found" }
```

---

### POST /state/query

Execute a SQL query against the state database. This provides a powerful way to filter, aggregate, and join state data.

**Request**

```
POST /state/query
Content-Type: application/json
```

```json
{
  "sql": "SELECT key, value FROM state WHERE key LIKE ? ORDER BY key",
  "params": ["account:%"]
}
```

| Field    | Type       | Required | Description                         |
|----------|------------|----------|-------------------------------------|
| `sql`    | `string`   | Yes      | SQL query string                    |
| `params` | `array`    | No       | Parameterized query values          |

**Response** `200 OK`

```json
{
  "results": [
    { "key": "account:alice", "value": "{\"balance\":150}" },
    { "key": "account:bob", "value": "{\"balance\":200}" }
  ],
  "count": 2
}
```

**Error** `400 Bad Request`

```json
{ "error": "Invalid SQL query" }
```

:::caution
The SQL query endpoint operates in **read-only** mode. Only `SELECT` statements are permitted. Mutations (`INSERT`, `UPDATE`, `DELETE`, `DROP`) will be rejected.
:::

---

## Search

### GET /search

Performs a unified search across blocks, transactions, state keys, and addresses. Useful for building block-explorer interfaces.

**Request**

```
GET /search?q=42
```

| Parameter | Type     | Required | Description                                          |
|-----------|----------|----------|------------------------------------------------------|
| `q`       | `string` | Yes      | Search term: block height, tx hash, state key, or address |

**Response** `200 OK`

```json
{
  "type": "block",
  "result": {
    "height": 42,
    "hash": "a3f1b9c8d7e6...",
    "timestamp": 1706000000000,
    "transactions": 4
  }
}
```

The `type` field indicates what was matched: `"block"`, `"transaction"`, `"state"`, or `"address"`. If nothing matches, the response returns:

```json
{
  "type": null,
  "result": null
}
```

---

## Peers

### GET /peers

Returns the list of currently connected peers.

**Request**

```
GET /peers
```

**Response** `200 OK`

```json
{
  "peers": [
    {
      "nodeId": "def456abc789",
      "address": "192.168.1.10:4000",
      "connectedAt": 1706000000000
    },
    {
      "nodeId": "ghi789jkl012",
      "address": "192.168.1.11:4000",
      "connectedAt": 1706000050000
    }
  ],
  "count": 2
}
```

| Field         | Type     | Description                       |
|---------------|----------|-----------------------------------|
| `nodeId`      | `string` | Peer's unique node identifier     |
| `address`     | `string` | Peer's P2P address (host:port)    |
| `connectedAt` | `number` | Connection timestamp (ms)         |

---

## Consensus

### GET /consensus

Returns the current consensus state of the node. Applicable when running Raft consensus.

**Request**

```
GET /consensus
```

**Response** `200 OK`

```json
{
  "role": "leader",
  "term": 5,
  "leaderId": "abc123def456",
  "votedFor": "abc123def456",
  "commitIndex": 141,
  "lastApplied": 141
}
```

| Field         | Type           | Description                                 |
|---------------|----------------|---------------------------------------------|
| `role`        | `string`       | Current role: `"leader"`, `"follower"`, or `"candidate"` |
| `term`        | `number`       | Current Raft term number                    |
| `leaderId`    | `string\|null` | Node ID of the current leader               |
| `votedFor`    | `string\|null` | Node ID this node voted for in current term |
| `commitIndex` | `number`       | Index of highest committed log entry        |
| `lastApplied` | `number`       | Index of highest applied log entry          |

---

## Governance

### GET /proposals

Returns all governance proposals.

**Request**

```
GET /proposals
```

**Response** `200 OK`

```json
{
  "proposals": [
    {
      "id": "prop-001",
      "title": "Increase block size limit",
      "description": "Proposal to increase max transactions per block from 50 to 100.",
      "status": "active",
      "proposer": "04a1b2c3d4e5f6...",
      "votesFor": 2,
      "votesAgainst": 0,
      "createdAt": 1706000000000
    }
  ]
}
```

---

### GET /proposals/:id

Returns a single governance proposal by its ID, including detailed vote information.

**Request**

```
GET /proposals/prop-001
```

| Parameter | Type     | Description      |
|-----------|----------|------------------|
| `id`      | `string` | Proposal ID      |

**Response** `200 OK`

```json
{
  "id": "prop-001",
  "title": "Increase block size limit",
  "description": "Proposal to increase max transactions per block from 50 to 100.",
  "status": "active",
  "proposer": "04a1b2c3d4e5f6...",
  "votesFor": 2,
  "votesAgainst": 0,
  "votes": [
    {
      "voter": "04a1b2c3d4e5f6...",
      "vote": "for",
      "timestamp": 1706000000000
    }
  ],
  "createdAt": 1706000000000
}
```

**Error** `404 Not Found`

```json
{ "error": "Proposal not found" }
```

---

## Contracts

### GET /contracts

Returns all deployed smart contracts.

**Request**

```
GET /contracts
```

**Response** `200 OK`

```json
{
  "contracts": [
    {
      "id": "contract-001",
      "name": "TokenLedger",
      "deployer": "04a1b2c3d4e5f6...",
      "deployedAt": 1706000000000,
      "blockHeight": 10
    }
  ]
}
```

---

## HTTP Status Codes

| Code  | Meaning               | Usage                                           |
|-------|-----------------------|-------------------------------------------------|
| `200` | OK                    | Successful read operation                       |
| `201` | Created               | Transaction submitted successfully               |
| `400` | Bad Request           | Invalid request body or query parameters         |
| `404` | Not Found             | Resource does not exist                          |
| `500` | Internal Server Error | Unexpected server-side failure                   |

---

## Rate Limiting

The REST API does not enforce rate limiting by default. In production deployments, consider placing MiniLedger behind a reverse proxy (e.g., Nginx, Caddy) with appropriate rate-limit rules.

---

## CORS

The API server enables CORS for all origins by default, making it suitable for browser-based frontends and explorer dashboards.
