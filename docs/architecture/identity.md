---
title: Identity & Cryptography
description: MiniLedger's identity system based on Ed25519 elliptic curve cryptography, including key generation, keystore encryption, node identity derivation, transaction signing, and block verification.
keywords: [miniledger identity, ed25519, elliptic curve cryptography, blockchain identity, keystore, digital signatures, node identity, cryptographic signing, noble ed25519, blockchain verification]
sidebar_position: 5
---

# Identity & Cryptography

Every MiniLedger node has a unique cryptographic identity based on an Ed25519 keypair. This identity is used to sign transactions and blocks, verify the authenticity of data received from other nodes, and derive a short human-readable node ID.

## Cryptographic Primitives

MiniLedger uses the following libraries from the `@noble` family:

| Library | Purpose |
|---|---|
| `@noble/ed25519` | Ed25519 key generation, signing, and verification |
| `@noble/hashes/sha512` | SHA-512 hash function (required internally by Ed25519) |
| `@noble/hashes/sha256` | SHA-256 for transaction hashes, block hashes, and key derivation |

These are pure JavaScript implementations with no native dependencies, making MiniLedger portable across all Node.js environments without compilation steps.

### Why Ed25519?

| Property | Benefit |
|---|---|
| **Fast** | Signing and verification are among the fastest of any signature scheme |
| **Small keys** | 32-byte private keys, 32-byte public keys, 64-byte signatures |
| **Deterministic** | Same message + same key always produces the same signature |
| **No random number pitfalls** | Unlike ECDSA, Ed25519 does not require a random nonce per signature |
| **Widely adopted** | Used by SSH, TLS, Signal, Solana, and many other systems |

## Key Generation

A new Ed25519 keypair is generated using `@noble/ed25519`:

```typescript
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Configure Ed25519 to use synchronous SHA-512
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const h = sha512.create();
  for (const msg of m) h.update(msg);
  return h.digest();
};

interface KeyPair {
  publicKey: string;  // 64-char hex (32 bytes)
  privateKey: string; // 64-char hex (32 bytes)
}

function generateKeyPair(): KeyPair {
  const privateKey = ed.utils.randomPrivateKey();    // 32 random bytes
  const publicKey = ed.getPublicKey(privateKey);      // Derive public key
  return {
    publicKey: toHex(publicKey),
    privateKey: toHex(privateKey),
  };
}
```

Both keys are stored as hex-encoded strings (64 characters each, representing 32 bytes).

## Node Identity

The `nodeId` is the first 16 hex characters of the Ed25519 public key:

```typescript
import { shortId } from "./utils.js";

this.nodeId = shortId(this.keyPair.publicKey);
// Example: "3a7f1b2c9e4d8f05" (first 16 chars of the 64-char public key)
```

The `nodeId` serves as a human-readable identifier in logs, peer connections, the REST API, and the Raft voter list. It is not used for cryptographic operations -- the full 64-character public key is always used for signing and verification.

### Identity Hierarchy

```
Ed25519 Private Key (32 bytes, hex-encoded)
     │
     ├──▶ Ed25519 Public Key (32 bytes, hex-encoded, 64 hex chars)
     │         │
     │         ├──▶ nodeId (first 16 hex chars of publicKey)
     │         │
     │         └──▶ Used in: transaction sender, block proposer,
     │              handshake publicKey, signature verification
     │
     └──▶ Used in: sign(hash, privateKey) -> signature
```

## Signing and Verification

### Signing

The `sign()` function signs a message (typically a transaction hash or block hash) with a private key:

```typescript
function sign(message: string, privateKeyHex: string): string {
  const msgBytes = new TextEncoder().encode(message);
  const sig = ed.sign(msgBytes, fromHex(privateKeyHex));
  return toHex(sig);  // 128-char hex (64 bytes)
}
```

Signatures are 64 bytes (128 hex characters).

### Verification

The `verify()` function checks that a signature was produced by the holder of the corresponding private key:

```typescript
function verify(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    return ed.verify(fromHex(signatureHex), msgBytes, fromHex(publicKeyHex));
  } catch {
    return false;  // Invalid input returns false instead of throwing
  }
}
```

### What Gets Signed

| Data Type | Signed Field | Signed By |
|---|---|---|
| **Transaction** | `tx.hash` (SHA-256 of canonical tx content) | Transaction sender's private key |
| **Block** | `block.hash` (SHA-256 of canonical block header) | Block proposer's (leader) private key |

The hash computation is deterministic -- it uses canonical JSON serialization (sorted keys) of the relevant fields:

```typescript
// Transaction hash
computeTxHash({
  type, sender, nonce, timestamp, payload
})

// Block hash
computeBlockHash({
  height, previousHash, timestamp, merkleRoot, stateRoot, proposer
})
```

## Keystore

The node's keypair is persisted in a `keystore.json` file in the data directory. The private key is encrypted before storage.

### Keystore File Format

```json
{
  "version": 1,
  "publicKey": "3a7f1b2c9e4d8f05...64 hex chars...",
  "encryptedPrivateKey": "e8c2f9a1b3d4...64 hex chars...",
  "salt": "a1b2c3d4e5f6...32 hex chars...",
  "orgId": "my-org",
  "name": "node-1"
}
```

| Field | Description |
|---|---|
| `version` | Keystore format version (currently `1`) |
| `publicKey` | Ed25519 public key in hex |
| `encryptedPrivateKey` | XOR-encrypted private key in hex |
| `salt` | Random 16-byte salt used for key derivation |
| `orgId` | Organization identifier for this node |
| `name` | Human-readable name for this node |

### Encryption

The private key is encrypted using XOR with a password-derived key:

```typescript
function encryptKeystore(keyPair, password, orgId, name): KeystoreFile {
  const salt = crypto.getRandomValues(new Uint8Array(16));   // 16 random bytes
  const derived = deriveKey(password, salt);                  // Password -> key
  const privBytes = fromHex(keyPair.privateKey);
  const encrypted = new Uint8Array(privBytes.length);
  for (let i = 0; i < privBytes.length; i++) {
    encrypted[i] = privBytes[i] ^ derived[i % derived.length];
  }
  return { version: 1, publicKey, encryptedPrivateKey, salt, orgId, name };
}
```

### Key Derivation

The password-derived key is produced by iteratively hashing the password concatenated with the salt:

```typescript
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  let key = sha256(new TextEncoder().encode(password + toHex(salt)));
  for (let i = 0; i < 10000; i++) {
    key = sha256(key);
  }
  return key;  // 32 bytes (matches Ed25519 private key size)
}
```

This is a simplified PBKDF with 10,000 SHA-256 iterations. The iteration count provides resistance against brute-force attacks on weak passwords.

### Decryption

Decryption reverses the XOR operation using the same derived key:

```typescript
function decryptKeystore(keystore, password): KeyPair {
  const salt = fromHex(keystore.salt);
  const derived = deriveKey(password, salt);
  const encrypted = fromHex(keystore.encryptedPrivateKey);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ derived[i % derived.length];
  }
  return { publicKey: keystore.publicKey, privateKey: toHex(decrypted) };
}
```

### Automatic Keypair Creation

On first startup, if no `keystore.json` exists, the node automatically generates a new keypair and saves it:

```typescript
const keystorePath = path.join(this.config.dataDir, "keystore.json");
if (fs.existsSync(keystorePath)) {
  // Load existing keypair
  const data = fs.readFileSync(keystorePath, "utf-8");
  const ks = deserializeKeystore(data);
  this.keyPair = decryptKeystore(ks, "");
} else {
  // Generate new keypair
  this.keyPair = generateKeyPair();
  const ks = encryptKeystore(
    this.keyPair, "", this.config.node.orgId, this.config.node.name
  );
  fs.writeFileSync(keystorePath, serializeKeystore(ks));
}
```

By default, the password is an empty string (`""`), which means the keystore is obfuscated but not password-protected. For production deployments, a non-empty password should be configured.

## Roles

MiniLedger supports three node roles defined in the `NodeIdentity` type:

| Role | Permissions |
|---|---|
| `admin` | Full access: submit transactions, propose governance changes, manage peers |
| `member` | Submit transactions, vote on proposals |
| `observer` | Read-only access: query state and blocks, no transaction submission |

Roles are stored in the `NodeIdentity` and used by the governance and privacy subsystems to enforce access control.

## Transaction Signing Flow

```
1. Build unsigned transaction
   ┌────────────────────────────┐
   │ type: "state:set"          │
   │ sender: publicKey          │
   │ nonce: nextNonce           │
   │ timestamp: Date.now()      │
   │ payload: { kind, key, val }│
   │ signature: ""              │
   └────────────┬───────────────┘
                │
2. Compute hash │
                ▼
   hash = SHA-256(canonicalize({type, sender, nonce, timestamp, payload}))

3. Sign hash with private key
   signature = Ed25519.sign(hash, privateKey)

4. Attach hash + signature
   ┌────────────────────────────┐
   │ hash: "a1b2c3..."         │
   │ type: "state:set"          │
   │ sender: publicKey          │
   │ nonce: 0                   │
   │ timestamp: 1706000000000   │
   │ payload: { ... }           │
   │ signature: "d4e5f6..."    │
   └────────────────────────────┘

5. Validate
   - Structural validation (hash length, sender length, nonce >= 0, payload.kind exists)
   - Recompute hash and compare
   - Verify signature: Ed25519.verify(signature, hash, sender)
```

## Block Signing Flow

```
1. Build unsigned block
   ┌────────────────────────────┐
   │ height: 42                 │
   │ previousHash: "..."        │
   │ timestamp: Date.now()      │
   │ merkleRoot: computeMerkle()│
   │ stateRoot: computeState()  │
   │ proposer: publicKey        │
   │ transactions: [...]        │
   │ signature: ""              │
   └────────────┬───────────────┘
                │
2. Compute hash │
                ▼
   hash = SHA-256(canonicalize({
     height, previousHash, timestamp, merkleRoot, stateRoot, proposer
   }))

3. Sign hash with leader's private key
   signature = Ed25519.sign(hash, leaderPrivateKey)

4. Final signed block
   ┌────────────────────────────┐
   │ height: 42                 │
   │ hash: "b3c4d5..."         │
   │ previousHash: "..."        │
   │ ...                        │
   │ signature: "f7a8b9..."    │
   └────────────────────────────┘
```

## Verification Chain

Every piece of data in MiniLedger can be independently verified:

```
Block N
  ├── hash = SHA-256(header fields)              ✓ recomputable
  ├── previousHash = Block[N-1].hash             ✓ chain linkage
  ├── merkleRoot = MerkleTree(tx hashes)         ✓ recomputable
  ├── stateRoot = SHA-256(ordered world_state)   ✓ recomputable
  ├── signature = Ed25519(hash, proposer.key)    ✓ verifiable
  └── transactions[]
       └── Transaction
            ├── hash = SHA-256(canonical fields)  ✓ recomputable
            └── signature = Ed25519(hash, sender) ✓ verifiable
```

This means any node can independently verify the entire chain by:
1. Replaying all transactions from the genesis block.
2. Recomputing all hashes and merkle roots.
3. Verifying all Ed25519 signatures against the stated public keys.

## CLI Key Management

The CLI provides commands for managing keys:

```bash
# Generate a new keypair (creates keystore.json in data directory)
npx miniledger keys generate

# Show the node's public key and nodeId
npx miniledger keys show

# Export the public key
npx miniledger keys export
```

## Security Best Practices

1. **Protect the keystore**: The `keystore.json` file contains the encrypted private key. Keep it secure and backed up.
2. **Use a strong password**: For production deployments, encrypt the keystore with a strong password instead of the default empty string.
3. **Rotate keys carefully**: Changing a node's keypair changes its identity. All peers and governance records will see it as a new node.
4. **Verify block proposers**: In a consortium network, maintain an allow-list of known proposer public keys.
5. **Monitor signatures**: Log and alert on signature verification failures, which may indicate tampering or misconfiguration.
