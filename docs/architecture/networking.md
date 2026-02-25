---
title: Networking — WebSocket Mesh
description: MiniLedger's peer-to-peer networking layer built on WebSocket mesh, including the handshake protocol, peer discovery, chain synchronization, message types, and health checks.
keywords: [miniledger networking, websocket mesh, peer to peer, p2p blockchain, peer discovery, blockchain sync, handshake protocol, websocket blockchain, chain synchronization]
sidebar_position: 4
---

# Networking — WebSocket Mesh

MiniLedger nodes communicate over a WebSocket mesh network using the [`ws`](https://github.com/websockets/ws) library. The networking layer handles peer connections, message routing, chain synchronization, and health monitoring.

## Architecture

```
┌──────────────────────────────────────────────┐
│                 PeerManager                   │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ WsServer  │  │ WsClient  │  │ MessageRouter│ │
│  │ (inbound) │  │ (outbound)│  │  (dispatch) │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘ │
│        │              │               │        │
│        └──────┬───────┘               │        │
│               │                       │        │
│        ┌──────┴──────┐                │        │
│        │ Peer Map     │◀──────────────┘        │
│        │ (nodeId->Peer)│                        │
│        └─────────────┘                         │
├──────────────────────────────────────────────┤
│                 BlockSync                     │
│  ├── syncFromPeers()                          │
│  ├── handleSyncRequest()                      │
│  └── handleSyncResponse()                     │
└──────────────────────────────────────────────┘
```

### Components

| Component | Responsibility |
|---|---|
| **PeerManager** | Top-level coordinator. Manages the peer map, handles handshakes, broadcasts messages, runs health checks. |
| **WsServer** | Listens for inbound WebSocket connections on the configured P2P port. |
| **WsClient** | Initiates outbound WebSocket connections to known peers. |
| **MessageRouter** | Dispatches incoming messages to registered handlers by `MessageType`. |
| **Peer** | Represents a single connected peer with its metadata (nodeId, publicKey, orgId, chainHeight, status). |
| **BlockSync** | Handles chain synchronization -- fetching missing blocks from peers with a higher chain. |

## Message Protocol

All messages are JSON-serialized `MessageEnvelope` objects sent over WebSocket frames:

```typescript
interface MessageEnvelope<T = unknown> {
  version: number;        // Protocol version
  type: MessageType;      // Message type enum
  from: string;           // Sender's nodeId (16-char hex)
  timestamp: number;      // Unix timestamp in milliseconds
  payload: T;             // Type-specific payload
}
```

### Message Types

MiniLedger defines 14 message types organized by function:

#### Handshake

| Type | Direction | Purpose |
|---|---|---|
| `HANDSHAKE` | Initiator -> Receiver | Introduce self with identity and chain height |
| `HANDSHAKE_ACK` | Receiver -> Initiator | Accept or reject the connection |

#### Block Propagation

| Type | Direction | Purpose |
|---|---|---|
| `BLOCK_ANNOUNCE` | Proposer -> All | Announce a newly created block |
| `BLOCK_REQUEST` | Any -> Any | Request blocks by height range |
| `BLOCK_RESPONSE` | Any -> Any | Respond with requested blocks |

#### Transaction Propagation

| Type | Direction | Purpose |
|---|---|---|
| `TX_BROADCAST` | Any -> All | Broadcast a new transaction to all peers |
| `TX_FORWARD` | Follower -> Leader | Forward a transaction to the Raft leader |

#### Raft Consensus

| Type | Direction | Purpose |
|---|---|---|
| `CONSENSUS_REQUEST_VOTE` | Candidate -> All | Request votes during leader election |
| `CONSENSUS_REQUEST_VOTE_REPLY` | Voter -> Candidate | Grant or deny vote |
| `CONSENSUS_APPEND_ENTRIES` | Leader -> Followers | Heartbeat and log replication |
| `CONSENSUS_APPEND_ENTRIES_REPLY` | Follower -> Leader | Acknowledge replicated entries |

#### Chain Synchronization

| Type | Direction | Purpose |
|---|---|---|
| `SYNC_REQUEST` | Behind node -> Ahead node | Request missing blocks by height range |
| `SYNC_RESPONSE` | Ahead node -> Behind node | Respond with requested blocks |

#### Peer Management & Health

| Type | Direction | Purpose |
|---|---|---|
| `PEER_LIST` | Any -> Newly connected | Share known peers for discovery |
| `PING` | Any -> All | Health check with chain height |
| `PONG` | Any -> Sender | Health check reply with chain height |

## Connection Lifecycle

### Outbound Connection

When a node wants to connect to a peer (either from initial config or via peer discovery):

```
Node A                                    Node B
  │                                          │
  │── ws.connect("ws://nodeB:9000") ────────▶│  (WsClient)
  │                                          │  (WsServer accepts)
  │── HANDSHAKE ────────────────────────────▶│
  │   { nodeId, publicKey, orgId,            │
  │     chainHeight, listenPort }            │
  │                                          │── validate handshake
  │                                          │── register peer
  │◀──────────────────── HANDSHAKE_ACK ──────│
  │   { nodeId, publicKey, orgId,            │
  │     chainHeight, accepted: true }        │
  │                                          │
  │◀──────────────────── PEER_LIST ──────────│
  │   { peers: [{nodeId, publicKey,          │
  │     address, orgId}, ...] }              │
  │                                          │
  │   (both sides are now "connected")       │
```

### Inbound Connection

The process is the same but initiated by the remote peer. The `WsServer` accepts the raw WebSocket connection, and the remote peer sends the first `HANDSHAKE` message.

### Self-Connection and Duplicate Rejection

The handshake handler rejects two scenarios:

```typescript
// Reject self-connections
if (payload.nodeId === this.opts.nodeId) {
  peer.close();
  return;
}

// Reject duplicate connections
if (this.peers.has(payload.nodeId)) {
  peer.close();
  return;
}
```

## Handshake Protocol

The handshake payload contains the information needed to establish trust and assess chain state:

```typescript
interface HandshakePayload {
  nodeId: string;        // 16-char hex identifier
  publicKey: HexString;  // Full Ed25519 public key (64 hex chars)
  orgId: string;         // Organization identifier
  chainHeight: number;   // Current chain height
  listenPort: number;    // P2P listen port (for discovery)
  listenAddress?: string; // Optional listen address
}
```

The acknowledgment includes an `accepted` flag and optional rejection reason:

```typescript
interface HandshakeAckPayload {
  nodeId: string;
  publicKey: HexString;
  orgId: string;
  chainHeight: number;
  accepted: boolean;
  reason?: string;
}
```

After a successful handshake:
1. The peer is added to the `peers` map keyed by `nodeId`.
2. The peer's `status` is set to `"connected"`.
3. The receiver shares its known peer list for discovery.
4. A `peer:connected` event is emitted, which may trigger chain sync.

## Peer Discovery

MiniLedger uses a gossip-style peer discovery protocol. When a new peer connects, the node shares its list of known connected peers:

```typescript
private sharePeerList(peer: Peer): void {
  const peerList: PeerListPayload = {
    peers: Array.from(this.peers.values())
      .filter(p => p.nodeId !== peer.nodeId && p.status === "connected")
      .map(p => ({
        nodeId: p.nodeId,
        publicKey: p.publicKey,
        address: p.address,
        orgId: p.orgId,
      })),
  };
  peer.send(createMessage(MessageType.PeerList, this.opts.nodeId, peerList));
}
```

When a node receives a `PEER_LIST` message, it connects to any unknown peers:

```typescript
private handlePeerList(msg: MessageEnvelope, _peer: Peer): void {
  const payload = msg.payload as PeerListPayload;
  for (const p of payload.peers) {
    if (p.nodeId === this.opts.nodeId) continue;  // Skip self
    if (this.peers.has(p.nodeId)) continue;         // Skip known
    if (p.address) {
      this.connectTo(p.address);  // Discover and connect
    }
  }
}
```

This means that in a cluster, you only need to configure one or two initial peers (`network.peers` in config). The rest will be discovered automatically.

### Discovery Example

```
Initial state: A knows B, C knows B

1. A connects to B                    B connects to C
   A ←→ B                             B ←→ C

2. B shares peer list with A:         B shares peer list with C:
   "I also know C at ws://C:9000"     "I also know A at ws://A:9000"

3. A connects to C                    C connects to A (or vice versa)
   A ←→ B ←→ C
    ↖─────────↗

Result: Full mesh — A ←→ B ←→ C ←→ A
```

## Health Checks (Ping/Pong)

The `PeerManager` runs a health check loop every 5 seconds:

```typescript
this.healthTimer = setInterval(() => {
  this.pingAll();
}, 5000);
```

Each ping includes the sender's current chain height:

```typescript
interface PingPayload {
  chainHeight: number;
}

interface PongPayload {
  chainHeight: number;
}
```

When a peer responds with a `PONG`, its `chainHeight` is updated locally. This information is used by `BlockSync` to identify which peers have a longer chain.

If a peer's WebSocket connection drops (e.g., network failure or node shutdown), the `onPeerDisconnected` handler removes it from the peer map and emits a `peer:disconnected` event.

## Chain Synchronization (BlockSync)

When a node detects that a peer has a higher chain (via handshake `chainHeight` or ping/pong), it initiates block synchronization.

### Sync Process

```
Node A (behind, height=5)           Node B (ahead, height=20)
  │                                      │
  │── SYNC_REQUEST ─────────────────────▶│
  │   { fromHeight: 6, toHeight: 55 }   │
  │                                      │── fetch blocks 6-55
  │◀───────────────── SYNC_RESPONSE ─────│
  │   { blocks: [...], hasMore: false }  │
  │                                      │
  │── apply blocks 6..20                 │
  │── height is now 20                   │
```

### Sync Details

1. **Find best peer**: Scan all connected peers for the one with the highest `chainHeight`.
2. **Batch requests**: Request blocks in batches of 50 (`SYNC_BATCH_SIZE`).
3. **Apply sequentially**: Each received block is applied to the local chain via `applyBlock()`.
4. **Timeout**: If a peer does not respond within 10 seconds, the request is cancelled and the batch returns empty.
5. **Continue until caught up**: Repeat batch requests until the local height matches the peer's height.

```typescript
async syncFromPeers(): Promise<void> {
  const peers = this.peerManager.getConnectedPeers();
  let bestPeer = null;
  let bestHeight = this.getChainHeight();

  // Find peer with highest chain
  for (const peer of peers) {
    if (peer.chainHeight > bestHeight) {
      bestHeight = peer.chainHeight;
      bestPeer = peer;
    }
  }

  if (!bestPeer) return;  // Already at the highest

  let currentHeight = this.getChainHeight();
  while (currentHeight < bestHeight) {
    const from = currentHeight + 1;
    const to = Math.min(from + SYNC_BATCH_SIZE - 1, bestHeight);
    const blocks = await this.requestBlocks(bestPeer, from, to);
    if (blocks.length === 0) break;  // Timeout or error

    for (const block of blocks) {
      this.applyBlock(block);
    }
    currentHeight = this.getChainHeight();
  }
}
```

### Sync Triggers

Sync is triggered in two situations:

1. **Peer connected**: When a new peer connects and has a higher chain, sync starts automatically.
2. **On demand**: The node orchestrator can invoke sync programmatically.

## Broadcasting

The `PeerManager` provides two broadcasting methods:

### `broadcast(msg)` -- Send to All Peers

```typescript
broadcast(msg: MessageEnvelope): void {
  for (const peer of this.peers.values()) {
    if (peer.status === "connected") {
      peer.send(msg);
    }
  }
}
```

Used for: `TX_BROADCAST`, `PING`, `BLOCK_ANNOUNCE`.

### `sendTo(nodeId, msg)` -- Send to Specific Peer

```typescript
sendTo(nodeId: string, msg: MessageEnvelope): void {
  const peer = this.peers.get(nodeId);
  if (peer && peer.status === "connected") {
    peer.send(msg);
  }
}
```

Used for: Raft consensus messages (targeted at specific nodes), `TX_FORWARD` (targeted at the leader), sync responses.

## Configuration

Networking behavior is controlled by the `network` section of the configuration:

```json
{
  "network": {
    "p2pPort": 9000,
    "apiPort": 3000,
    "listenAddress": "0.0.0.0",
    "peers": [
      "ws://node-b:9000",
      "ws://node-c:9000"
    ]
  }
}
```

| Setting | Default | Description |
|---|---|---|
| `p2pPort` | `9000` | Port for WebSocket P2P connections |
| `apiPort` | `3000` | Port for the REST API |
| `listenAddress` | `"0.0.0.0"` | Address to bind the P2P server |
| `peers` | `[]` | Initial peer addresses to connect to on startup |

## Peer Object

Each peer is represented by a `Peer` object with the following properties:

| Property | Type | Description |
|---|---|---|
| `nodeId` | `string` | 16-character hex identifier (short ID of public key) |
| `publicKey` | `HexString` | Full Ed25519 public key |
| `orgId` | `string` | Organization identifier |
| `address` | `string` | WebSocket address (e.g., `ws://host:port`) |
| `status` | `string` | Connection status: `"connecting"`, `"connected"`, `"disconnected"` |
| `chainHeight` | `number` | Last known chain height (updated via ping/pong) |

## Events

The `PeerManager` emits the following events:

| Event | Payload | When |
|---|---|---|
| `peer:connected` | `(nodeId, peer)` | Handshake completed successfully |
| `peer:disconnected` | `(nodeId)` | Peer WebSocket connection closed |

The node orchestrator listens to `peer:connected` to trigger sync and Raft voter list updates.

## Security Considerations

- **No authentication at the transport layer**: MiniLedger currently trusts that peers providing a valid handshake (with a public key and org ID) are legitimate members of the network. Future versions may add mTLS or challenge-response authentication.
- **Message integrity**: All blocks and transactions are cryptographically signed. A peer cannot forge blocks or transactions without the proposer's private key.
- **Self-connection prevention**: The handshake handler rejects connections from the node's own `nodeId`.
- **Duplicate prevention**: Only one connection per `nodeId` is maintained.
