---
slug: enterprise-blockchain-glossary
title: "The Ultimate Enterprise Blockchain Glossary — 50+ Terms Every Architect, CTO, and Developer Should Know"
description: "A comprehensive, plain-English glossary of 50+ enterprise blockchain terms: consensus algorithms, cryptography, smart contracts, governance, privacy, networking, and more. Written for architects, CTOs, and developers evaluating or deploying permissioned blockchains."
keywords: [enterprise blockchain glossary, blockchain terminology, blockchain terms explained, permissioned blockchain glossary, DLT glossary, blockchain vocabulary, blockchain definitions, consensus algorithm glossary, smart contract glossary, blockchain architecture terms]
authors: [prasad]
tags: [glossary, reference, architecture, education]
image: /img/og-image.png
---

# The Ultimate Enterprise Blockchain Glossary — 50+ Terms Every Architect, CTO, and Developer Should Know

Enterprise blockchain is plagued by jargon. Consensus algorithms with Greek-letter names. Cryptography terms borrowed from academic papers. Acronyms that mean different things in different contexts.

This glossary cuts through the noise. Every definition is plain English, cross-referenced, and written for someone who needs to make decisions, not publish papers.

<!-- truncate -->

---

## Core Concepts

### Blockchain
A cryptographically linked chain of blocks, each containing a batch of transactions. Once a block is committed, modifying any transaction in it would require recomputing every subsequent block's hash — computationally infeasible. Blockchains provide **immutability** (records can't be changed) and **non-repudiation** (signers can't deny they signed).

### Distributed Ledger Technology (DLT)
The broader category that includes blockchains and other distributed data structures. All blockchains are DLTs, but not all DLTs are blockchains. R3 Corda, for example, is a DLT that doesn't batch transactions into blocks — it uses a different data structure. In practice, "DLT" and "blockchain" are used interchangeably in enterprise contexts.

### Permissioned Blockchain (Private Blockchain)
A blockchain where participation is restricted to known, approved entities. Every node operator is identified and authorized. Transaction validation is done by known validators, not anonymous miners. Used for enterprise consortiums, supply chains, and regulated industries.

### Permissionless Blockchain (Public Blockchain)
A blockchain where anyone can join, run a node, and participate in consensus. Bitcoin and Ethereum are permissionless. Transactions are validated by anonymous or pseudonymous validators incentivized by token rewards.

### Consortium Blockchain
A permissioned blockchain operated by a group of organizations rather than a single entity. Each member runs a node. Governance is shared — no single organization controls the network. The most common enterprise blockchain model.

### Node
A server (or process) running blockchain software. A node maintains a copy of the ledger, participates in consensus, and serves API requests. In permissioned networks, each consortium member runs at least one node.

### Block
A batch of transactions that have been validated and committed to the ledger. Each block contains: a block number (height), a timestamp, a reference to the previous block's hash (creating the chain), and a list of transactions.

### Genesis Block
The first block in a blockchain. Block height 0. Created when the network is initialized. All subsequent blocks chain back to it.

### Block Height
The number of blocks in the chain before a given block. Genesis block = height 0. A block at height 1000 is the 1001st block.

### Transaction
A cryptographically signed operation submitted to the blockchain. In enterprise contexts, transactions typically represent state changes: updating a record, transferring an asset, invoking a smart contract.

### World State
The current state of all data on the blockchain. In key-value blockchains, this is the set of all keys and their current values. In UTXO blockchains (Bitcoin), it's the set of unspent transaction outputs. Changes when transactions are committed.

### Immutability
The property that once data is committed to the blockchain, it cannot be altered or deleted — only appended to. Not absolute (a 51% attack could rewrite history), but cryptographically and economically infeasible to break.

### Non-Repudiation
The guarantee that a transaction signer cannot later deny having signed it. Achieved through cryptographic digital signatures. If the signature verifies against your public key, you (or someone with your private key) signed it — no denial possible.

### Smart Contract
Code that runs on the blockchain. When invoked by a transaction, the contract executes deterministic logic on the ledger state. Used for business logic (escrow, token transfers, compliance checks) that must execute transparently and verifiably.

### Token
A digital asset tracked on a blockchain. Tokens can represent anything: currency, loyalty points, securities, real-world assets, voting rights. In enterprise contexts, tokens often represent physical assets (shipments, invoices, certificates).

---

## Consensus

### Consensus Algorithm (Consensus Mechanism)
The protocol by which nodes agree on the state of the ledger. Determines which transactions are valid, in what order, and ensures all honest nodes reach the same conclusion.

### Crash Fault Tolerance (CFT)
A consensus model that tolerates nodes crashing, going offline, or experiencing network partitions — but assumes nodes won't behave maliciously. Raft and Paxos are CFT algorithms. Requires `2f+1` nodes to tolerate `f` failures.

### Byzantine Fault Tolerance (BFT)
A consensus model that tolerates nodes behaving arbitrarily maliciously — sending contradictory messages, forging signatures, attempting to corrupt the ledger. PBFT, IBFT, and Tendermint are BFT algorithms. Requires `3f+1` nodes to tolerate `f` Byzantine failures.

### Raft
A CFT consensus algorithm designed for understandability. Nodes are in one of three states: leader (proposes entries), follower (accepts entries), or candidate (requests votes to become leader). Widely used in distributed systems (etcd, Consul, CockroachDB) and increasingly in permissioned blockchains.

### Leader
In leader-based consensus (Raft, Paxos), the single node responsible for proposing new blocks/entries. All writes flow through the leader. If the leader fails, a new election chooses a successor.

### Follower
In leader-based consensus, nodes that accept and replicate entries proposed by the leader. Followers respond to heartbeats. If heartbeats stop, followers may become candidates and trigger an election.

### Leader Election
The process of selecting a new leader when the current leader fails. In Raft, followers time out waiting for heartbeats, become candidates, and request votes. The first candidate to receive majority votes becomes the new leader.

### Term
In Raft, a monotonically increasing counter representing a leadership period. Each term has at most one leader. Terms increment during elections.

### Quorum
The minimum number of nodes that must agree for a decision to be valid. In CFT (Raft): `(n/2) + 1` — a simple majority. In BFT (PBFT): `(2n/3) + 1` — a supermajority.

### PBFT (Practical Byzantine Fault Tolerance)
The original BFT consensus algorithm. Nodes exchange multi-round vote messages (pre-prepare, prepare, commit) for each block. Communication complexity is O(n²) — scales poorly beyond 20-30 nodes. Used in Hyperledger Fabric (pre-2.0) and early private blockchains.

### IBFT 2.0 (Istanbul Byzantine Fault Tolerance)
A BFT algorithm designed for blockchain. Simpler than PBFT. Uses a single round of votes per block. Used in Hyperledger Besu and ConsenSys Quorum.

### Proof of Work (PoW)
The consensus mechanism used by Bitcoin. Miners compete to solve a cryptographic puzzle. The winner gets to propose the next block. Extremely energy-intensive. Not used in enterprise blockchains (no need for anonymous participation).

### Proof of Stake (PoS)
Validators lock up tokens as collateral. They're selected to propose blocks based on their stake. Energy-efficient compared to PoW. Used by Ethereum post-Merge. Not typically used in enterprise (known validators don't need economic incentives).

### Proof of Authority (PoA)
A consensus model where a predefined set of trusted validators (authorities) take turns proposing blocks. Used in permissioned Ethereum networks (Clique, Aura). Simple and fast, but relies on validator reputation.

### Finality
The guarantee that a committed block will never be reverted. In Raft/PBFT, finality is immediate once a block is committed. In PoW chains (Bitcoin), finality is probabilistic — more confirmations = higher probability of permanence.

---

## Cryptography

### Hash Function (Cryptographic Hash)
A one-way function that takes arbitrary input and produces a fixed-size output (hash). Properties: deterministic (same input → same output), preimage-resistant (can't reverse), collision-resistant (can't find two inputs with same hash). SHA-256 is the most common blockchain hash function.

### Merkle Tree (Hash Tree)
A tree structure where leaf nodes are hashes of data blocks and non-leaf nodes are hashes of their child nodes. The Merkle root represents the entire dataset. Enables efficient verification that a specific transaction is in a block — you only need the Merkle proof, not the entire block.

### Digital Signature
Cryptographic proof that a message was created by the owner of a private key. Created with a private key, verified with the corresponding public key. Provides authentication, integrity, and non-repudiation.

### Public Key Cryptography (Asymmetric Cryptography)
A system using keypairs: a private key (kept secret) and a public key (shared openly). Messages encrypted with the public key can only be decrypted with the private key. Signatures created with the private key can be verified with the public key.

### Ed25519
A modern elliptic curve digital signature algorithm. Faster and more secure than older ECDSA curves. Uses 256-bit keys. Widely adopted in blockchain (Solana, Polkadot, MiniLedger) and modern protocols (SSH, TLS 1.3).

### ECDSA (Elliptic Curve Digital Signature Algorithm)
The digital signature algorithm used by Bitcoin and Ethereum. Secure but slower than Ed25519 and susceptible to certain implementation pitfalls (nonce reuse).

### Private Key
The secret half of a cryptographic keypair. Must be kept absolutely confidential. Used to create digital signatures and decrypt messages. "Not your keys, not your coins" — whoever controls the private key controls the associated assets.

### Public Key
The shareable half of a cryptographic keypair. Derived from the private key (one-way). Used to verify signatures and encrypt messages. Acts as an identity on the blockchain — your public key is your address.

### Keystore
An encrypted file that stores a private key, protected by a password. Standard format (e.g., Ethereum keystore) uses scrypt or PBKDF2 for key derivation and AES-128-CTR for encryption.

### AES-256-GCM
Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode. Provides both confidentiality (encryption) and authenticity (tamper detection). Used for on-chain data encryption in permissioned blockchains with per-record privacy.

### Salt
Random data added to a hash function input to prevent precomputed attacks (rainbow tables) and ensure identical inputs produce different hashes. Used in password hashing and identity systems.

### X.509 Certificate
A digital certificate format used in PKI (Public Key Infrastructure). Binds a public key to an identity verified by a Certificate Authority (CA). Used in Hyperledger Fabric for node and client identity. Certificates expire and must be renewed.

### Certificate Authority (CA)
A trusted entity that issues and revokes X.509 certificates. In Fabric, Fabric CA is a dedicated service. In simpler permissioned blockchains, Ed25519 keypairs replace the PKI/CA model entirely.

### PKI (Public Key Infrastructure)
The system of CAs, certificates, revocation lists, and policies that manages identity in traditional enterprise IT (TLS, VPN, code signing). Fabric uses PKI for identity. Adds significant operational complexity.

---

## Privacy & Access Control

### Channel (Fabric)
A private subnet of communication between a subset of network participants. Each channel has its own ledger. Members of one channel cannot see transactions on another. Fabric's primary privacy mechanism. Complex to configure and manage.

### Private Data Collection (Fabric)
A mechanism for sharing data between a subset of channel members without revealing it to all channel members. Data is distributed peer-to-peer, not via blocks. The hash of private data is stored on the public ledger for evidence.

### Per-Record Encryption
An alternative to channels: each record is encrypted with AES-256-GCM and associated with an Access Control List (ACL) specifying which public keys can decrypt (read) and which can modify (write). Simpler than channels — each record has its own access policy, not a separate ledger.

### Access Control List (ACL)
A policy attached to a record that specifies: owner (creator), readers (public keys that can decrypt), writers (public keys that can modify), and a public flag (visible to all network members). Enables granular data sharing without separate channels.

### Zero-Knowledge Proof (ZKP)
A cryptographic method where one party proves to another that a statement is true without revealing any information beyond the validity of the statement. Example: prove you're over 18 without revealing your birth date. Increasingly used for privacy-preserving identity verification.

### Confidential Computing
A hardware-based approach to data privacy. Code and data are processed inside a Trusted Execution Environment (TEE) — an encrypted region of the processor (e.g., Intel SGX, AMD SEV). Even the operating system can't access the data. Used by Azure Confidential Ledger.

---

## Networking & P2P

### Peer-to-Peer (P2P)
A network architecture where nodes communicate directly with each other, not through a central server. Every node is both a client and a server. Used by all blockchains for block and transaction propagation.

### Gossip Protocol
A P2P communication pattern where nodes randomly share information with a subset of peers, who share with their peers, etc. Like gossip in a social network — information spreads exponentially. Used in Fabric and Besu for efficient block propagation.

### Bootstrap Peer
The first node a new node contacts to join the network. The bootstrap peer provides a list of other peers. After initial connection, the new node discovers peers organically.

### Peer Discovery
The process of finding other nodes on the network. Can be seed-based (bootstrap list), DNS-based (SRV records), or DHT-based (distributed hash table, like Kademlia). In permissioned networks, peer discovery is typically explicit (known addresses).

### WebSocket
A protocol providing full-duplex communication over a single TCP connection. Used for persistent P2P connections between blockchain nodes. Enables real-time block and transaction propagation.

### Mesh Network
A P2P topology where every node connects to every other node (full mesh) or to a subset (partial mesh). Maximizes resilience but increases connection overhead. Used in small consortium networks.

---

## Governance

### On-Chain Governance
Decision-making processes encoded in smart contracts and recorded on the ledger. Voting is conducted via transactions. Approved proposals execute automatically. Transparent and auditable.

### Off-Chain Governance
Decision-making processes conducted outside the blockchain — meetings, email, legal agreements. Decisions are then implemented manually. Hyperledger Fabric channel configuration changes are off-chain governance.

### Proposal
A formal suggestion for changing the network: adding a member, updating configuration, upgrading a contract, modifying protocol parameters. In on-chain governance, proposals are submitted as transactions to a governance contract.

### Quorum (Governance)
The minimum participation required for a vote to be valid. Example: "At least 60% of members must vote." Different from consensus quorum (which is about node agreement).

### Voting Threshold
The percentage of votes required to pass a proposal. Example: "75% of voting members must approve." Configurable based on proposal type — routine changes might need simple majority, major changes might need supermajority.

---

## State & Storage

### Key-Value Store (KV Store)
A database model where data is stored as key-value pairs. Most blockchain world states are KV stores. Keys are typically namespaced strings (e.g., `account:alice`). Values are typically JSON. Simple, fast, but limited queryability without external indexing.

### SQLite
An embedded, file-based SQL database. Used as the world state store in lightweight blockchains. Supports full SQL including JOINs, aggregations, and JSON functions. In WAL mode, provides concurrent read/write performance. Single-file, portable, zero-configuration.

### Write-Ahead Logging (WAL)
A database technique where changes are written to a log before being applied to the main database. Provides crash recovery. In WAL mode, readers don't block writers and vice versa. Critical for blockchain performance.

### CouchDB
A document-oriented NoSQL database used by Hyperledger Fabric for rich queries. Supports Mango query language. Must be deployed alongside each Fabric peer. Alternative to LevelDB (key-range queries only).

### LevelDB
A key-value database library by Google. Used as the default state database in Hyperledger Fabric. Fast key lookups and range scans. No rich query support — you can query by key or key range, nothing more.

### Index
A database structure that speeds up queries. Without an index, a query scans every row (O(n)). With an index, it uses a faster lookup (O(log n)). Blockchain state databases typically index by key, timestamp, and block height.

---

## Development & Operations

### Chaincode
Hyperledger Fabric's term for smart contract. Written in Go, Java, or Node.js. Packaged, installed on peers, approved by organizations, and committed to channels. Complex lifecycle compared to non-Fabric smart contracts.

### Solidity
The primary smart contract language for Ethereum and EVM-compatible blockchains. JavaScript-like syntax. Compiled to EVM bytecode. Requires understanding of gas, storage layout, and security patterns (reentrancy, overflow).

### CorDapp
R3 Corda's term for distributed application. Composed of contracts (validation rules) and flows (multi-step transaction protocols). Written in Kotlin or Java. State machine-based architecture.

### Sandbox
An isolated execution environment for smart contracts. Prevents contracts from accessing system resources (filesystem, network, process). Enforces execution timeouts. MiniLedger's sandbox removes `process`, `require`, `fetch`, `setTimeout`, and `eval`. Fabric uses Docker containers. Ethereum uses the EVM.

### Gas
In Ethereum, the unit measuring computational cost of executing a transaction. Every operation (ADD, STORE, CALL) costs gas. Users pay gas fees to validators. Designed to prevent infinite loops and spam. Not needed in permissioned networks (known participants, no economic spam prevention required).

### TPS (Transactions Per Second)
The number of transactions a blockchain can process per second. Permissioned blockchains typically achieve 100-5,000 TPS. Public blockchains: 7-15 TPS (Bitcoin), 15-45 TPS (Ethereum L1). Enterprise blockchains rarely need high TPS — 100-500 TPS covers most use cases.

### Latency
The time from transaction submission to confirmation. Permissioned blockchains with Raft/PBFT: 50ms-2 seconds. Public blockchains: 10-60 minutes (Bitcoin, for reasonable finality), 12 seconds (Ethereum block time, ~5 minutes for finality).

### Bootstrap Node
The first node in a network, responsible for initializing the genesis block. Other nodes join by connecting to the bootstrap node first.

### Block Explorer
A web dashboard for viewing blockchain data: blocks, transactions, state, peers, consensus status. Usually a separate service. MiniLedger includes a built-in block explorer — no external tool required.

---

## Standards & Frameworks

### DSCSA (Drug Supply Chain Security Act)
US regulation requiring pharmaceutical supply chain traceability. Mandates interoperable, electronic systems for tracking prescription drugs. Blockchain is a natural fit for the immutable, multi-party audit trail DSCSA requires.

### HIPAA (Health Insurance Portability and Accountability Act)
US regulation governing protected health information (PHI). Requires audit controls, access controls, integrity controls, and transmission security. Blockchain audit trails address HIPAA's technical safeguards.

### SOC2 (System and Organization Controls 2)
An auditing standard for service organizations. Evaluates security, availability, processing integrity, confidentiality, and privacy. Requires evidence of controls — blockchain provides tamper-proof evidence of access controls and change management.

### GDPR (General Data Protection Regulation)
EU regulation on data protection and privacy. Requires lawful basis for processing, right of access, right to erasure, and data portability. Blockchain's immutability creates tension with GDPR's "right to be forgotten" — addressed by storing only hashes or encrypted data on-chain with off-chain personal data.

### MiCA (Markets in Crypto-Assets)
EU regulation establishing a unified framework for crypto-assets, issuers, and service providers. Effective 2024-2025. Relevant for enterprise blockchain projects involving tokenized assets in the EU.

### ISO 20022
A global standard for financial messaging. Defines message formats for payments, securities, trade services, and cards. Increasingly adopted by blockchain-based financial systems for interoperability with traditional finance (SWIFT, RTGS).

### ISAE 3402
International standard for assurance reports on controls at service organizations. Equivalent to SOC2 internationally. Blockchain audit trails serve as verifiable evidence of control effectiveness.

---

## Common Misconceptions Addressed

**"Blockchain is a database replacement"** → Blockchain is a specific tool for multi-party, trustless coordination. It's not a general-purpose database. Use PostgreSQL for your application data; use blockchain for the shared, verifiable layer between organizations.

**"Blockchain means cryptocurrency"** → No. Permissioned/enterprise blockchains have nothing to do with cryptocurrency. They don't use tokens as economic incentives because all participants are known and bound by legal agreements.

**"Blockchain is slow"** → Public blockchains are slow by design (decentralization tradeoff). Permissioned blockchains with Raft/PBFT can achieve 100-5,000 TPS with sub-second latency — more than enough for enterprise use cases.

**"Blockchain is immutable, so you can never delete anything"** → You can't modify committed blocks. But you can "tombstone" records (mark as deleted) at the application layer. GDPR "right to erasure" is handled by storing personal data off-chain and only hashes on-chain.

**"Smart contracts are only for crypto"** → Smart contracts are just trusted, automated business logic. An escrow contract that releases funds when both parties confirm delivery is a smart contract — no cryptocurrency involved.

---

## Quick Reference: Acronyms

| Acronym | Full Form | Context |
|---------|-----------|---------|
| DLT | Distributed Ledger Technology | Broad category |
| CFT | Crash Fault Tolerance | Consensus |
| BFT | Byzantine Fault Tolerance | Consensus |
| PBFT | Practical Byzantine Fault Tolerance | Consensus |
| IBFT | Istanbul Byzantine Fault Tolerance | Consensus (Besu/Quorum) |
| PoW | Proof of Work | Consensus (Bitcoin) |
| PoS | Proof of Stake | Consensus (Ethereum) |
| PoA | Proof of Authority | Consensus (Permissioned ETH) |
| PKI | Public Key Infrastructure | Identity |
| CA | Certificate Authority | Identity |
| ACL | Access Control List | Privacy |
| TEE | Trusted Execution Environment | Confidential Computing |
| SGX | Software Guard Extensions (Intel) | Confidential Computing |
| WAL | Write-Ahead Logging | Database |
| TPS | Transactions Per Second | Performance |
| KV | Key-Value | Storage model |
| P2P | Peer-to-Peer | Networking |
| API | Application Programming Interface | Development |
| SDK | Software Development Kit | Development |
| CLI | Command Line Interface | Operations |
| JSON-LD | JSON for Linked Data | Structured data / Schema.org |
| DSCSA | Drug Supply Chain Security Act | US Pharma regulation |
| GDPR | General Data Protection Regulation | EU Privacy regulation |
| HIPAA | Health Insurance Portability and Accountability Act | US Healthcare regulation |

---

*About the Author*

**Prasad Kumkar** is the Founder & CEO of ChainScore Labs. Over the last 5+ years, he has worked with teams building exchanges, DeFi infrastructure, smart contracts, tokenization systems, and protocol-level blockchain products, helping founders make architecture, security, and go-live decisions for production Web3 systems.
