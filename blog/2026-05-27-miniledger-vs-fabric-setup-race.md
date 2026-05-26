---
slug: miniledger-vs-fabric-setup-race
title: "MiniLedger vs Hyperledger Fabric: The 15-Minute Setup Race"
description: "A side-by-side, step-by-step comparison: setting up MiniLedger vs Hyperledger Fabric from scratch. Timed. Commands shown. Results compared. Spoiler: one finishes in 10 seconds, the other is still installing Docker."
keywords: [miniledger vs fabric setup, fabric setup time, blockchain setup comparison, how long to set up fabric, miniledger quick start, hyperledger fabric first transaction time, blockchain developer experience comparison, fabric vs miniledger speed, private blockchain setup speed, blockchain platform setup race]
authors: [prasad]
tags: [comparison, setup, tutorial, fabric]
image: /img/og-image.png
---

# MiniLedger vs Hyperledger Fabric: The 15-Minute Setup Race

Most blockchain comparisons are feature matrices. This one is a stopwatch. Two platforms. Two terminals. One goal: go from nothing to a running 3-node consortium with a submitted transaction and a verified block.

We timed every step. Here's what happened.

<!-- truncate -->

## The Rules

- **Starting state:** Fresh machine. Node.js and Docker installed (Fabric requires Docker; MiniLedger doesn't). No pre-downloaded images. No pre-written configs.
- **Goal:** Submit a transaction, see it in a committed block, query the state.
- **3-node consortium:** Three organizations, each running a node.
- **Timing:** Wall clock, from first command to completed goal.

---

## MiniLedger: 47 Seconds

### Step 1: Install (3 seconds)
```bash
npm install miniledger
# ⏱️ 3s
```

### Step 2: Start Bootstrap Node (5 seconds)
```bash
npx miniledger init --data-dir ./org1
npx miniledger start --data-dir ./org1 --bootstrap --p2p-port 4442 --http-port 4441 &
# ⏱️ 5s — blockchain is running
# Output: Node ID: node-7a3f. Consensus: leader. API: http://localhost:4441
```

### Step 3: Start Nodes 2 and 3 (10 seconds)
```bash
# Node 2
npx miniledger init --data-dir ./org2
npx miniledger start --data-dir ./org2 --p2p-port 4443 --http-port 4444 \
  --bootstrap-peers ws://localhost:4442/ws &

# Node 3
npx miniledger init --data-dir ./org3
npx miniledger start --data-dir ./org3 --p2p-port 4445 --http-port 4446 \
  --bootstrap-peers ws://localhost:4442/ws &
# ⏱️ 10s — 3-node Raft cluster is running
```

### Step 4: Submit Transaction (2 seconds)
```bash
curl -s -X POST http://localhost:4441/tx \
  -H "Content-Type: application/json" \
  -d '{"key":"shipment:SHIP-001","value":{"status":"created","origin":"Zurich"}}'
# ⏱️ 2s — transaction submitted
```

### Step 5: Verify Block (2 seconds)
```bash
curl -s http://localhost:4441/blocks | head -c 200
# ⏱️ 2s — block visible on all 3 nodes
```

### Step 6: Query State (2 seconds)
```bash
curl -s -X POST http://localhost:4441/state/query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM world_state WHERE key = \"shipment:SHIP-001\""}'
# ⏱️ 2s — state returned
```

### Step 7: Open Dashboard (3 seconds)
```bash
open http://localhost:4441/dashboard
# ⏱️ 3s — block explorer, SQL console, governance page, all live
```

### Step 8: One-Command Demo Alternative (20 seconds)
```bash
npx miniledger demo
# ⏱️ 20s — 3-node cluster, smart contracts, governance, dashboard — one command
# No init. No config. No manual node startup.
```

**Total: 47 seconds (manual) or 20 seconds (demo command).**
**Commands: 7 (manual) or 1 (demo).**
**Containers: 0. Processes: 3. Dependencies: Node.js.**

---

## Hyperledger Fabric: Still Running After 15 Minutes

### Step 1: Install Fabric Binaries and Docker Images (3-5 minutes)
```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.0
# ⏱️ ~4 min — downloading binaries, Docker images (2.5GB+)
# docker pull hyperledger/fabric-peer:2.5.0
# docker pull hyperledger/fabric-orderer:2.5.0
# docker pull hyperledger/fabric-ca:1.5.0
# docker pull couchdb:3.1
# ... 10+ images
```

### Step 2: Generate Crypto Material (1-2 minutes)
```bash
# Write cryptogen.yaml for 3 orgs, 1 peer each
# Run cryptogen
cryptogen generate --config=./crypto-config.yaml
# ⏱️ ~1 min — certificates, MSP directories, admin certs
```

### Step 3: Generate Channel Configuration (2-3 minutes)
```bash
# Write configtx.yaml — orderer config, org configs, channel config, profiles
# Run configtxgen
configtxgen -profile ThreeOrgsChannel -outputCreateChannelTx ./channel.tx -channelID mychannel
configtxgen -profile ThreeOrgsOrdererGenesis -outputBlock ./genesis.block
# ⏱️ ~2 min — genesis block, channel transaction
```

### Step 4: Write Docker Compose (5-10 minutes)
```yaml
# docker-compose.yaml
# Orderer container (1)
# Peer containers (3)
# CouchDB containers (3)
# CA containers (3)
# CLI container (1)
# Total: 11 containers with volumes, networks, environment variables
# ~200 lines of YAML
```

### Step 5: Start the Network (1-2 minutes)
```bash
docker-compose up -d
# ⏱️ ~1 min — containers starting, CouchDB initializing, peers booting
```

### Step 6: Create Channel and Join Peers (2-3 minutes)
```bash
# Create channel
docker exec cli peer channel create -o orderer:7050 -c mychannel -f /channel.tx

# Join peers (one command per peer)
docker exec cli peer channel join -b mychannel.block
# ⏱️ ~2 min — channel created, peers joined
```

### Step 7: Install and Approve Chaincode (5-8 minutes)
```bash
# Package chaincode
peer lifecycle chaincode package mycc.tar.gz --path /chaincode --lang golang --label mycc_1

# Install on each peer (3 commands)
peer lifecycle chaincode install mycc.tar.gz

# Approve from each org (3 commands)
peer lifecycle chaincode approveformyorg -o orderer:7050 --channelID mychannel --name mycc --version 1 --package-id $CC_PACKAGE_ID --sequence 1

# Commit
peer lifecycle chaincode commit -o orderer:7050 --channelID mychannel --name mycc --version 1 --sequence 1
# ⏱️ ~7 min — chaincode lifecycle complete
```

### Step 8: Submit Transaction
```bash
peer chaincode invoke -o orderer:7050 -C mychannel -n mycc \
  -c '{"Args":["CreateAsset","shipment:SHIP-001","created","Zurich"]}'
# ⏱️ ~30s — transaction submitted
```

### Step 9: Query
```bash
peer chaincode query -C mychannel -n mycc \
  -c '{"Args":["ReadAsset","shipment:SHIP-001"]}'
```

**Total: ~25-40 minutes. Commands: 25+. Containers: 11. Dependencies: Docker, Docker Compose, Go toolchain, Fabric binaries.**

---

## Side-by-Side

| Metric | MiniLedger | Hyperledger Fabric |
|--------|-----------|-------------------|
| **Total time** | **47 seconds** | **~30 minutes** |
| **Commands** | 7 | 25+ |
| **Containers** | 0 | 11 |
| **YAML files written** | 0 | 3 (crypto-config, configtx, docker-compose) |
| **Certificates manually managed** | 0 | 3 orgs × 2-3 users each |
| **Chaincode deployment** | N/A (optional) — transaction was direct | 7-step lifecycle |
| **Dashboard** | Built-in, running at :4441 | Separate tool (Hyperledger Explorer) |
| **Disk space used** | ~2MB (SQLite + blocks) | ~3GB (Docker images + containers) |
| **Learning required** | `npm install` | Fabric architecture, Docker, PKI, channels, chaincode lifecycle |

---

## What This Means

The setup gap isn't 20% or 50%. It's 38x. MiniLedger finishes in 47 seconds what takes Fabric 30 minutes — and that's for an experienced Fabric developer who's done this before. For a first-timer, Fabric setup is a 1-2 day project.

But the setup gap is the least important gap. The real difference is:

- **Every developer can run the full consortium on their laptop.** MiniLedger: 3 terminals, 3 commands each. Fabric: 11 Docker containers requiring 8GB+ RAM — not every laptop can run the full stack.

- **CI/CD is trivial.** MiniLedger: `npm install && npx miniledger start` in your pipeline. Fabric: Docker-in-Docker, crypto material generation, container orchestration.

- **The setup gap predicts the operations gap.** If it takes 38x longer to set up Fabric, it takes roughly 38x more effort to operate it in production. The setup complexity isn't a one-time cost — it's the preview of your operational reality.

---

## Try It Yourself

```bash
# MiniLedger — 20 seconds
npx miniledger demo

# Hyperledger Fabric — 30+ minutes
# Follow the Fabric test network tutorial
# https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html
```

Time both. Compare the experience. Then ask yourself: which platform would your partners actually deploy?

[Full comparison →](/blog/miniledger-vs-hyperledger-fabric)

---

*About the Author*

**Prasad Kumkar** is the Founder & CEO of ChainScore Labs. Over the last 5+ years, he has worked with teams building exchanges, DeFi infrastructure, smart contracts, tokenization systems, and protocol-level blockchain products, helping founders make architecture, security, and go-live decisions for production Web3 systems.
