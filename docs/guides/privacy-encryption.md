---
title: Privacy and Encryption
description: Protect sensitive data on MiniLedger with AES-256-GCM encryption and fine-grained access control lists (ACLs). Learn field-level encryption, key exchange, and ACL policies.
keywords:
  - miniledger encryption
  - blockchain privacy
  - AES-256-GCM
  - access control list
  - field-level encryption
  - private data blockchain
  - blockchain ACL
  - data confidentiality
  - key exchange blockchain
  - permissioned blockchain privacy
sidebar_position: 4
---

# Privacy and Encryption

MiniLedger provides built-in privacy features that allow you to store sensitive data on the shared ledger without exposing it to unauthorized participants. The privacy layer combines **AES-256-GCM encryption** for data confidentiality with **access control lists (ACLs)** for fine-grained permission management.

## Why Privacy Matters on a Shared Ledger

In a private blockchain, all nodes replicate every transaction. Without encryption, any node operator can read all data in the world state. MiniLedger's privacy features solve this by:

- **Encrypting values at rest** so that only authorized nodes can decrypt and read them
- **Enforcing ACL policies** so that only designated nodes can read or write specific keys
- **Supporting field-level encryption** so you can encrypt sensitive fields while keeping metadata queryable

## Encryption: AES-256-GCM

MiniLedger uses **AES-256-GCM** (Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode) for all data encryption. This cipher provides:

- **Confidentiality** -- encrypted data is unreadable without the key
- **Integrity** -- any tampering with the ciphertext is detected via the authentication tag
- **Performance** -- AES-256-GCM is hardware-accelerated on modern CPUs

### How It Works

When you submit encrypted data:

1. The submitting node generates a random **256-bit symmetric key** and a unique **96-bit initialization vector (IV)** for each encrypted value
2. The value is encrypted using AES-256-GCM, producing ciphertext and a 128-bit authentication tag
3. The symmetric key is encrypted with each authorized reader's **public key** (RSA or ECDH) and included as an encrypted key envelope
4. The encrypted payload (ciphertext + IV + auth tag + key envelopes) is submitted as the transaction value
5. All nodes store the encrypted payload, but only nodes with matching private keys can decrypt it

### Submitting Encrypted Data

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kv:put",
    "key": "medical:patient:12345",
    "value": "John Doe, DOB: 1990-01-15, Blood Type: O+",
    "encryption": {
      "enabled": true,
      "readers": ["node1-id...", "node3-id..."]
    }
  }'
```

### Reading Encrypted Data

When an authorized node reads the key, decryption happens automatically:

```bash
# From an authorized node (node1 or node3)
curl http://localhost:4441/state/medical:patient:12345
```

```json
{
  "key": "medical:patient:12345",
  "value": "John Doe, DOB: 1990-01-15, Blood Type: O+",
  "encrypted": true,
  "version": 1
}
```

From an unauthorized node, the value is returned as encrypted ciphertext:

```bash
# From an unauthorized node (node2)
curl http://localhost:4443/state/medical:patient:12345
```

```json
{
  "key": "medical:patient:12345",
  "value": "<encrypted:aes-256-gcm:base64-ciphertext...>",
  "encrypted": true,
  "accessDenied": true,
  "version": 1
}
```

## Access Control Lists (ACLs)

ACLs define who can read and write specific keys or key prefixes in the world state. Each ACL policy has four fields:

| Field | Type | Description |
|---|---|---|
| `owner` | `string` | The node ID that owns this key. The owner always has full read/write access and can modify the ACL. |
| `readers` | `string[]` | Node IDs that can read (decrypt) the value |
| `writers` | `string[]` | Node IDs that can write (update) the value |
| `public` | `boolean` | If `true`, any node can read the value. Write access still requires being in the `writers` list or being the `owner`. |

### Setting an ACL Policy

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "acl:set",
    "payload": {
      "keyPattern": "medical:patient:*",
      "owner": "node1-id...",
      "readers": ["node1-id...", "node3-id..."],
      "writers": ["node1-id..."],
      "public": false
    }
  }'
```

This policy means:

- **node1** (owner) can read, write, and change the ACL
- **node3** can read but not write
- **node2** and all other nodes cannot read or write
- The pattern `medical:patient:*` applies to all keys under that prefix

### ACL Evaluation Order

When a node attempts to read or write a key, MiniLedger evaluates permissions in this order:

1. **Owner check** -- if the requesting node is the owner, access is granted
2. **Public check** -- if `public` is `true` and the operation is a read, access is granted
3. **Readers/Writers check** -- if the requesting node is in the `readers` list (for reads) or `writers` list (for writes), access is granted
4. **Deny** -- if none of the above conditions are met, access is denied

### Wildcard Patterns

ACL policies support wildcard patterns to apply rules to groups of keys:

```bash
# All keys under "finance:" prefix
"keyPattern": "finance:*"

# All patient records
"keyPattern": "medical:patient:*"

# A specific key (no wildcard)
"keyPattern": "config:api-key"
```

When multiple patterns match a key, the **most specific pattern** takes precedence. For example, `medical:patient:12345` takes priority over `medical:patient:*`, which takes priority over `medical:*`.

### Updating an ACL

Only the owner can modify an ACL policy:

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "acl:set",
    "payload": {
      "keyPattern": "medical:patient:*",
      "owner": "node1-id...",
      "readers": ["node1-id...", "node2-id...", "node3-id..."],
      "writers": ["node1-id...", "node3-id..."],
      "public": false
    }
  }'
```

### Querying ACL Policies

```bash
# Get ACL for a specific key pattern
curl http://localhost:4441/acl/medical:patient:*

# List all ACL policies
curl http://localhost:4441/acl
```

## Field-Level Encryption

In many cases, you want to encrypt only certain fields of a JSON object while leaving others readable for querying and indexing. MiniLedger supports field-level encryption for this purpose.

### Encrypting Specific Fields

```bash
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kv:put",
    "key": "employee:emp-001",
    "value": {
      "name": "Alice Johnson",
      "department": "Engineering",
      "salary": 95000,
      "ssn": "123-45-6789"
    },
    "encryption": {
      "enabled": true,
      "fields": ["salary", "ssn"],
      "readers": ["node1-id...", "node-hr-id..."]
    }
  }'
```

### How Authorized Nodes See the Data

```json
{
  "key": "employee:emp-001",
  "value": {
    "name": "Alice Johnson",
    "department": "Engineering",
    "salary": 95000,
    "ssn": "123-45-6789"
  }
}
```

### How Unauthorized Nodes See the Data

```json
{
  "key": "employee:emp-001",
  "value": {
    "name": "Alice Johnson",
    "department": "Engineering",
    "salary": "<encrypted>",
    "ssn": "<encrypted>"
  }
}
```

This allows unauthorized nodes to still query non-sensitive fields (e.g., `department = 'Engineering'`) while keeping salary and SSN data confidential.

## Key Exchange

MiniLedger handles cryptographic key exchange automatically during the node join process. Here is how it works:

### Automatic Key Exchange

1. When a node is initialized (`miniledger init`), it generates an **asymmetric key pair** (used for encrypting/decrypting symmetric keys)
2. When a node joins the cluster, it shares its **public key** with all existing members
3. When encrypted data is written, the submitting node encrypts the AES-256-GCM symmetric key with each authorized reader's public key
4. Each reader uses their private key to decrypt the symmetric key, then decrypts the data

### Key Rotation

To rotate a node's encryption keys:

```bash
curl -X POST http://localhost:4441/admin/rotate-keys
```

This triggers the following:

1. A new asymmetric key pair is generated
2. The new public key is distributed to all cluster members
3. Existing encrypted data remains readable using the old key (keys are versioned)
4. New encrypted data uses the rotated key

:::caution
Key rotation does not re-encrypt existing data. Previously encrypted values continue to use the old symmetric keys. To re-encrypt existing data with new keys, you must read and re-write the affected keys.
:::

### Viewing a Node's Public Key

```bash
curl http://localhost:4441/identity
```

```json
{
  "nodeId": "node1-id...",
  "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqh...\n-----END PUBLIC KEY-----",
  "keyVersion": 2,
  "createdAt": "2025-06-01T00:00:00.000Z"
}
```

## Encryption in Smart Contracts

Smart contracts can work with encrypted data, but the encryption and decryption happens at the **transaction boundary**, not inside the contract sandbox. This means:

- `ctx.get(key)` returns the **decrypted** value if the executing node is an authorized reader
- `ctx.set(key, value)` stores the value in plaintext -- to encrypt it, the ACL and encryption settings on the key determine how it is stored
- Contract code does not have direct access to encryption keys

To create a contract that writes encrypted data, combine the contract with an ACL policy:

```bash
# Set up ACL for contract-managed keys
curl -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "type": "acl:set",
    "payload": {
      "keyPattern": "contract:payroll:*",
      "owner": "node1-id...",
      "readers": ["node1-id...", "node-hr-id..."],
      "writers": ["node1-id..."],
      "public": false
    }
  }'
```

## Privacy Best Practices

1. **Use the principle of least privilege.** Grant only the minimum necessary access in ACL policies. Start with restrictive policies and expand as needed.

2. **Prefer field-level encryption over full-value encryption.** Encrypting only sensitive fields allows non-sensitive data to remain queryable via SQL, improving both usability and performance.

3. **Rotate keys periodically.** Even though AES-256-GCM is robust, regular key rotation limits the exposure window if a key is compromised.

4. **Audit ACL policies regularly.** Use SQL queries to list all ACL policies and verify that access grants are still appropriate:

   ```sql
   SELECT * FROM world_state WHERE key LIKE 'acl:%';
   ```

5. **Plan for node decommissioning.** When removing a node from the cluster, update all ACL policies to remove its ID from `readers` and `writers` lists. The removed node will retain its private key, so it could still decrypt data it previously had access to. Rotate keys and re-encrypt data if this is a concern.

6. **Separate concerns by key prefix.** Use distinct key prefixes for different sensitivity levels (`public:`, `internal:`, `confidential:`) and apply ACLs at the prefix level.

## Next Steps

- [SQL Queries](/docs/guides/sql-queries) -- Query encrypted and non-encrypted world state data
- [Governance](/docs/guides/governance) -- Use governance to manage ACL policy changes across the network
- [Multi-Node Cluster](/docs/guides/multi-node-cluster) -- Set up the cluster that the privacy layer protects
