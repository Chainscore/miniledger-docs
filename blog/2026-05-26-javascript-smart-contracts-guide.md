---
slug: javascript-smart-contracts-guide
title: "JavaScript Smart Contracts: A Practical Guide for Node.js Developers"
description: "How to write, test, deploy, and upgrade smart contracts in JavaScript — no Solidity, no Go, no compilation step. A complete tutorial for Node.js developers building enterprise blockchain applications."
keywords: [javascript smart contracts, smart contracts nodejs, blockchain contracts without solidity, javascript blockchain contracts, smart contract tutorial javascript, nodejs smart contract development, javascript smart contract examples, web2 developer blockchain, smart contracts for javascript developers, enterprise smart contracts javascript]
authors: [prasad]
tags: [tutorial, contracts, developer, javascript]
image: /img/og-image.png
---

# JavaScript Smart Contracts: A Practical Guide for Node.js Developers

If you're a Node.js developer, the words "smart contract" probably make you think of Solidity, Remix IDE, Hardhat, gas optimization, and Ethereum test networks. That's the Web3 path — and it's powerful, but it's also a significant context switch from the JavaScript ecosystem you already know.

There's another path: JavaScript smart contracts on a permissioned blockchain. No new language to learn. No compilation step. No gas fees. No test networks. Just JavaScript — the language your team already writes every day.

Here's how to build, test, deploy, and upgrade smart contracts entirely within the Node.js ecosystem.

<!-- truncate -->

## Why JavaScript Smart Contracts?

### The Solidity Path

```
Write .sol → Compile with solc → Deploy to testnet → Pay gas → Debug →
Recompile → Redeploy → More gas → Verify on Etherscan → Deploy to mainnet
```

### The JavaScript Path

```
Write .js → npm test → Deploy with one API call → It's live
```

The difference isn't just convenience. It's about what your team is capable of maintaining. If your team is 10 Node.js developers and 0 Solidity developers, JavaScript smart contracts mean your entire team can write, review, and maintain contract logic — not just the one person who took a Solidity bootcamp.

---

## Contract Structure

A MiniLedger smart contract is a plain JavaScript object (or class) with methods. Each method receives a `ctx` (context) parameter that provides access to the ledger state:

```javascript
// token-contract.js
export default {
  /**
   * Mint new tokens and assign them to an account.
   */
  mint(ctx, recipient, amount) {
    // Only the contract owner can mint
    if (ctx.sender !== ctx.contractOwner) {
      throw new Error('Only contract owner can mint');
    }

    const accountKey = `token:${recipient}`;
    const account = ctx.get(accountKey) || { balance: 0 };
    account.balance += amount;
    ctx.set(accountKey, account);

    ctx.log(`Minted ${amount} tokens → ${recipient}`);
  },

  /**
   * Transfer tokens from sender to receiver.
   */
  transfer(ctx, receiver, amount) {
    const senderKey = `token:${ctx.sender}`;
    const receiverKey = `token:${receiver}`;

    const sender = ctx.get(senderKey);
    if (!sender) throw new Error('Sender account not found');
    if (sender.balance < amount) throw new Error('Insufficient balance');

    const receiverAcct = ctx.get(receiverKey) || { balance: 0 };

    sender.balance -= amount;
    receiverAcct.balance += amount;

    ctx.set(senderKey, sender);
    ctx.set(receiverKey, receiverAcct);

    ctx.log(`Transfer: ${ctx.sender} → ${receiver}: ${amount}`);
  },

  /**
   * Check the balance of an account.
   */
  balanceOf(ctx, account) {
    const acct = ctx.get(`token:${account}`);
    return acct ? acct.balance : 0;
  }
};
```

### The Contract Context (`ctx`)

Every contract method receives a context object with these properties and methods:

| Property/Method | Type | Description |
|----------------|------|-------------|
| `ctx.sender` | `string` | Public key of the transaction submitter |
| `ctx.contractOwner` | `string` | Public key of the contract deployer |
| `ctx.blockHeight` | `number` | Current block height |
| `ctx.timestamp` | `number` | Unix timestamp of the current block |
| `ctx.get(key)` | `function` | Read a value from world state |
| `ctx.set(key, value)` | `function` | Write a value to world state |
| `ctx.del(key)` | `function` | Delete a key from world state |
| `ctx.log(message)` | `function` | Emit a log message (stored on-chain) |

---

## Building a Real Contract: Escrow Service

Let's build a more realistic contract — an escrow service for a marketplace where buyers and sellers need a neutral third party to hold funds.

```javascript
// escrow-contract.js
export default {
  /**
   * Create a new escrow agreement.
   * Buyer deposits funds. Funds are held until release conditions are met.
   */
  createEscrow(ctx, seller, amount, description, autoReleaseAfterBlocks) {
    if (ctx.sender === seller) {
      throw new Error('Cannot create escrow with yourself as seller');
    }

    const escrowId = `escrow-${ctx.blockHeight}-${Date.now()}`;
    const buyerKey = `token:${ctx.sender}`;

    // Verify buyer has sufficient balance
    const buyer = ctx.get(buyerKey);
    if (!buyer || buyer.balance < amount) {
      throw new Error('Insufficient balance for escrow deposit');
    }

    // Lock the funds
    buyer.balance -= amount;
    ctx.set(buyerKey, buyer);

    // Create escrow record
    ctx.set(`escrow:${escrowId}`, {
      id: escrowId,
      buyer: ctx.sender,
      seller: seller,
      amount: amount,
      description: description,
      status: 'funded',
      created_at: new Date(ctx.timestamp).toISOString(),
      created_block: ctx.blockHeight,
      auto_release_after: autoReleaseBlocksAfter || null,
      events: [{
        type: 'created',
        by: ctx.sender,
        at: ctx.blockHeight
      }]
    });

    ctx.log(`Escrow created: ${escrowId} | ${amount} from ${ctx.sender} for ${seller}`);
    return escrowId;
  },

  /**
   * Release funds to the seller. Can only be called by the buyer.
   */
  releaseFunds(ctx, escrowId) {
    const escrow = ctx.get(`escrow:${escrowId}`);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'funded') throw new Error(`Escrow is ${escrow.status}`);
    if (ctx.sender !== escrow.buyer) throw new Error('Only buyer can release funds');

    // Release to seller
    const sellerKey = `token:${escrow.seller}`;
    const seller = ctx.get(sellerKey) || { balance: 0 };
    seller.balance += escrow.amount;
    ctx.set(sellerKey, seller);

    // Update escrow
    escrow.status = 'released';
    escrow.released_at = new Date(ctx.timestamp).toISOString();
    escrow.released_block = ctx.blockHeight;
    escrow.events.push({
      type: 'released',
      by: ctx.sender,
      at: ctx.blockHeight
    });
    ctx.set(`escrow:${escrowId}`, escrow);

    ctx.log(`Escrow released: ${escrowId} → ${escrow.seller} (${escrow.amount})`);
  },

  /**
   * Refund the escrow back to the buyer. Can be called by buyer or seller.
   */
  refundEscrow(ctx, escrowId, reason) {
    const escrow = ctx.get(`escrow:${escrowId}`);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'funded') throw new Error(`Escrow is ${escrow.status}`);

    const isBuyer = ctx.sender === escrow.buyer;
    const isSeller = ctx.sender === escrow.seller;

    if (!isBuyer && !isSeller) {
      throw new Error('Only buyer or seller can initiate refund');
    }

    // Refund to buyer
    const buyerKey = `token:${escrow.buyer}`;
    const buyer = ctx.get(buyerKey) || { balance: 0 };
    buyer.balance += escrow.amount;
    ctx.set(buyerKey, buyer);

    // Update escrow
    escrow.status = 'refunded';
    escrow.refund_reason = reason;
    escrow.refunded_by = ctx.sender;
    escrow.refunded_at = new Date(ctx.timestamp).toISOString();
    escrow.events.push({
      type: 'refunded',
      by: ctx.sender,
      reason: reason,
      at: ctx.blockHeight
    });
    ctx.set(`escrow:${escrowId}`, escrow);

    ctx.log(`Escrow refunded: ${escrowId} → buyer (${reason})`);
  },

  /**
   * Dispute the escrow. Flags it for manual review by the marketplace admin.
   */
  disputeEscrow(ctx, escrowId, reason) {
    const escrow = ctx.get(`escrow:${escrowId}`);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'funded') throw new Error(`Escrow is ${escrow.status}`);

    const isBuyer = ctx.sender === escrow.buyer;
    const isSeller = ctx.sender === escrow.seller;

    if (!isBuyer && !isSeller) {
      throw new Error('Only escrow participants can raise a dispute');
    }

    escrow.status = 'disputed';
    escrow.dispute_reason = reason;
    escrow.disputed_by = ctx.sender;
    escrow.events.push({
      type: 'disputed',
      by: ctx.sender,
      reason: reason,
      at: ctx.blockHeight
    });
    ctx.set(`escrow:${escrowId}`, escrow);

    ctx.log(`⚠️  Escrow disputed: ${escrowId} by ${ctx.sender}: ${reason}`);
  },

  /**
   * Admin resolves a dispute by releasing or refunding.
   */
  resolveDispute(ctx, escrowId, resolution) {
    if (ctx.sender !== ctx.contractOwner) {
      throw new Error('Only contract owner (admin) can resolve disputes');
    }

    const escrow = ctx.get(`escrow:${escrowId}`);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'disputed') throw new Error('Escrow is not in dispute');

    if (resolution === 'release') {
      const sellerKey = `token:${escrow.seller}`;
      const seller = ctx.get(sellerKey) || { balance: 0 };
      seller.balance += escrow.amount;
      ctx.set(sellerKey, seller);
      escrow.status = 'released';
    } else if (resolution === 'refund') {
      const buyerKey = `token:${escrow.buyer}`;
      const buyer = ctx.get(buyerKey) || { balance: 0 };
      buyer.balance += escrow.amount;
      ctx.set(buyerKey, buyer);
      escrow.status = 'refunded';
    } else {
      throw new Error('Resolution must be "release" or "refund"');
    }

    escrow.resolved_by = ctx.sender;
    escrow.resolved_at = new Date(ctx.timestamp).toISOString();
    escrow.events.push({
      type: 'resolved',
      resolution: resolution,
      by: ctx.sender,
      at: ctx.blockHeight
    });
    ctx.set(`escrow:${escrowId}`, escrow);

    ctx.log(`Dispute resolved: ${escrowId} → ${resolution} by admin`);
  }
};
```

---

## Deploying a Contract

```javascript
import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './ledger' });
await node.init();
await node.start();

// Deploy the escrow contract
const deployTx = await node.submit({
  type: 'deploy_contract',
  contract: {
    name: 'EscrowService',
    version: '1.0.0',
    source: `
      export default {
        createEscrow(ctx, seller, amount, description, autoReleaseAfterBlocks) {
          // ... (contract code)
        },
        // ... other methods
      }
    `
  }
});

console.log('Contract deployed:', deployTx.contractAddress);
// Contract deployed: contract-abc123def456
```

---

## Invoking a Contract

```javascript
// Create an escrow
const escrowId = await node.invokeContract('EscrowService', 'createEscrow', [
  'pk_seller_node2',   // seller
  500,                 // amount
  'Website development - milestone 1 completion',  // description
  100                  // auto-release after 100 blocks
]);

console.log('Escrow created:', escrowId);

// Later: buyer releases funds
await node.invokeContract('EscrowService', 'releaseFunds', [escrowId]);

// Or: query escrow status
const escrows = await node.query(`
  SELECT key, json_extract(value, '$.status') as status,
         json_extract(value, '$.amount') as amount,
         json_extract(value, '$.buyer') as buyer,
         json_extract(value, '$.seller') as seller
  FROM world_state
  WHERE key LIKE 'escrow:%'
    AND json_extract(value, '$.status') = 'funded'
`);
```

---

## Contract Sandbox and Security

MiniLedger's contract runtime runs inside a sandboxed JavaScript environment. The following globals are **not available** to contracts:

- `process` — no access to the Node.js process
- `require` / `import` — no importing external modules
- `fetch` / `XMLHttpRequest` — no network access
- `setTimeout` / `setInterval` — no timers
- `fs` / file system — no disk access
- `eval` — no dynamic code execution
- `Function` constructor — no alternative code evaluation
- `globalThis` — limited to sandbox scope

Available globals include: `Object`, `Array`, `String`, `Number`, `Boolean`, `Date`, `Math`, `JSON`, `Error`, `Map`, `Set`, `console` (redirected to `ctx.log`).

The runtime also enforces:
- **5-second execution timeout** — contracts that run longer are terminated
- **State mutation only through `ctx.set()` and `ctx.del()`** — no direct database access
- **Read-only access to state via `ctx.get()`** — contracts can read any state key but can only modify keys they're authorized to write

---

## Testing Contracts

Test contracts locally before deploying to a live network:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MiniLedger } from 'miniledger';
import escrowContract from './escrow-contract.js';

describe('EscrowService Contract', () => {
  let node, buyer, seller, admin;

  beforeEach(async () => {
    node = await MiniLedger.create({ dataDir: ':memory:' });
    await node.init();
    await node.start();

    // Create identities
    buyer = node.generateIdentity();
    seller = node.generateIdentity();
    admin = node.generateIdentity();

    // Deploy contract as admin
    await node.submit({
      type: 'deploy_contract',
      contract: { name: 'EscrowService', version: '1.0.0', source: escrowContract.toString() },
      signer: admin
    });

    // Mint tokens for buyer
    await node.submit({
      key: `token:${buyer.publicKey}`,
      value: { balance: 10000 },
      signer: admin
    });
  });

  it('should create an escrow and lock buyer funds', async () => {
    await node.invokeContract('EscrowService', 'createEscrow', [
      seller.publicKey, 500, 'Test escrow', null
    ], { signer: buyer });

    const buyerBalance = await node.query(`
      SELECT json_extract(value, '$.balance') as balance
      FROM world_state WHERE key = 'token:${buyer.publicKey}'
    `);
    expect(buyerBalance[0].balance).toBe(9500);
  });

  it('should release funds to seller when buyer confirms', async () => {
    const escrowId = await node.invokeContract('EscrowService', 'createEscrow', [
      seller.publicKey, 500, 'Test escrow', null
    ], { signer: buyer });

    await node.invokeContract('EscrowService', 'releaseFunds', [
      escrowId
    ], { signer: buyer });

    const sellerBalance = await node.query(`
      SELECT json_extract(value, '$.balance') as balance
      FROM world_state WHERE key = 'token:${seller.publicKey}'
    `);
    expect(sellerBalance[0].balance).toBe(500);
  });

  it('should prevent non-buyer from releasing funds', async () => {
    const escrowId = await node.invokeContract('EscrowService', 'createEscrow', [
      seller.publicKey, 500, 'Test escrow', null
    ], { signer: buyer });

    await expect(
      node.invokeContract('EscrowService', 'releaseFunds', [
        escrowId
      ], { signer: seller })
    ).rejects.toThrow('Only buyer can release funds');
  });

  it('should handle dispute and admin resolution', async () => {
    const escrowId = await node.invokeContract('EscrowService', 'createEscrow', [
      seller.publicKey, 500, 'Test escrow', null
    ], { signer: buyer });

    // Seller disputes
    await node.invokeContract('EscrowService', 'disputeEscrow', [
      escrowId, 'Buyer not responding'
    ], { signer: seller });

    // Admin resolves in seller's favor
    await node.invokeContract('EscrowService', 'resolveDispute', [
      escrowId, 'release'
    ], { signer: admin });

    const escrow = await node.query(`
      SELECT value FROM world_state WHERE key = 'escrow:${escrowId}'
    `);
    const data = JSON.parse(escrow[0].value);
    expect(data.status).toBe('released');
    expect(data.events).toHaveLength(3); // created, disputed, resolved
  });
});
```

---

## Contract Upgrades

Contracts can be upgraded by deploying a new version:

```javascript
// Deploy v1.1.0 with additional functionality
await node.submit({
  type: 'deploy_contract',
  contract: {
    name: 'EscrowService',
    version: '1.1.0',
    source: updatedContractCode,
    previousVersion: '1.0.0'
  }
});

// Existing escrow records continue to work
// New escrows use v1.1.0 logic
// Migration functions can be added to upgrade v1.0.0 records to v1.1.0 format
```

---

## Built-in Contracts

MiniLedger ships with two built-in contracts you can use as building blocks:

### Token Contract

```javascript
// Built-in: mint, transfer, balanceOf, totalSupply
await node.invokeContract('Token', 'mint', ['alice', 1000]);
await node.invokeContract('Token', 'transfer', ['bob', 300]);
const balance = await node.invokeContract('Token', 'balanceOf', ['alice']);
```

### KV Store Contract

```javascript
// Built-in: set, get, del — with ownership tracking
await node.invokeContract('KVStore', 'set', ['config:api', { version: '2.0', rateLimit: 100 }]);
const config = await node.invokeContract('KVStore', 'get', ['config:api']);
```

---

## Key Takeaways

1. **JavaScript contracts eliminate the language barrier.** Your entire Node.js team can write, review, and maintain smart contracts without learning Solidity or Go.

2. **The sandbox provides safe execution.** No filesystem access, no network access, no timers, 5-second timeout. Contracts can't escape the runtime.

3. **Testing is familiar.** Use Vitest or Jest — the same test framework you use for the rest of your application.

4. **Deployment is instant.** One API call. No compilation. No test networks. No gas fees.

5. **Contracts are queryable.** Contract state lives in SQLite. Query escrow statuses, token balances, and contract events with standard SQL.

---

Read the [smart contracts guide](/docs/guides/smart-contracts) for the full API reference, or the [SQL queries guide](/docs/guides/sql-queries) for querying contract state.

---

*About the Author*

**Prasad Kumkar** is the Founder & CEO of ChainScore Labs. Over the last 5+ years, he has worked with teams building exchanges, DeFi infrastructure, smart contracts, tokenization systems, and protocol-level blockchain products, helping founders make architecture, security, and go-live decisions for production Web3 systems.
