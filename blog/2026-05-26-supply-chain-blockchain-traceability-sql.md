---
slug: supply-chain-blockchain-traceability-sql
title: "Building a Supply Chain Traceability System with Blockchain and SQL Queries"
description: "A complete tutorial on building a supply chain traceability system using a private blockchain with SQL-queryable state. Track products from manufacturer to retailer with real-time SQL dashboards and cryptographic proof of custody."
keywords: [supply chain blockchain implementation, blockchain traceability system, supply chain DLT, chain of custody blockchain, blockchain supply chain tracking, product provenance blockchain, supply chain blockchain tutorial, blockchain for logistics, pharmaceutical supply chain blockchain, food traceability blockchain]
authors: [prasad]
tags: [supply-chain, tutorial, enterprise, sql]
image: /img/og-image.png
---

# Building a Supply Chain Traceability System with Blockchain and SQL Queries

Supply chains are a textbook blockchain use case: multiple independent organizations, each updating the status of goods as they move, with no single party trusted by everyone to maintain the system of record.

The challenge with most supply chain blockchain implementations is queryability. You can verify that a record exists, but answering "show me all shipments currently in customs that have been there for more than 48 hours" typically requires an external indexing layer.

This tutorial shows you how to build a complete supply chain traceability system where the blockchain state is **directly queryable with SQL** — no separate database, no sync lag, no extra infrastructure.

<!-- truncate -->

## The Scenario

We're building a pharmaceutical cold chain tracking system for a consortium of:

- **Manufacturer** (PharmaCorp) — produces temperature-sensitive vaccines
- **Logistics Provider** (ColdChain Logistics) — transports shipments in refrigerated containers
- **Customs Broker** (BorderClear) — handles import/export documentation
- **Distributor** (MediDistribute) — receives and distributes to hospitals
- **Regulator** (HealthAuthority) — audits the entire chain for compliance

Each organization runs a MiniLedger node. All nodes form a Raft cluster. Every custody transfer, temperature reading, and document submission is recorded on the shared ledger.

## Step 1: Set Up the Consortium

Each organization initializes their node:

```bash
# On each organization's server
npm install miniledger
npx miniledger init
```

The first node (PharmaCorp) starts as the bootstrap peer:

```bash
# PharmaCorp starts first
npx miniledger start --bootstrap
# Output: Node ID: node-pharmacorp-7a3f
#         P2P listening on ws://0.0.0.0:4442/ws
#         HTTP API on http://0.0.0.0:4441
```

Other members join the existing cluster:

```bash
# ColdChain Logistics joins
npx miniledger join --bootstrap ws://pharmacorp-node:4442/ws
# Syncing blocks... 100%
# Joined cluster. Node is now a follower.

# BorderClear joins
npx miniledger join --bootstrap ws://pharmacorp-node:4442/ws

# MediDistribute joins
npx miniledger join --bootstrap ws://pharmacorp-node:4442/ws

# HealthAuthority joins (read-only, audit purposes)
npx miniledger join --bootstrap ws://pharmacorp-node:4442/ws
```

## Step 2: Define the Data Model

Our supply chain data model uses prefixed keys to organize records:

```
shipment:VAC-2026-0042          — Shipment header
shipment:VAC-2026-0042:item:PALLET-A  — Pallet within shipment
shipment:VAC-2026-0042:item:PALLET-B
shipment:VAC-2026-0042:event:001     — Custody transfer event
shipment:VAC-2026-0042:event:002
shipment:VAC-2026-0042:temp:001      — Temperature reading
shipment:VAC-2026-0042:temp:002
shipment:VAC-2026-0042:doc:001       — Associated document
product:FluVax-Batch-2026-03         — Product catalog entry
organization:pharmacorp              — Organization profile
organization:coldchain
```

## Step 3: Create Shipments (Manufacturer)

PharmaCorp creates a new shipment record:

```bash
curl -X POST http://pharmacorp-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042",
    "value": {
      "type": "shipment",
      "product": "FluVax-2026",
      "batch": "FluVax-Batch-2026-03",
      "quantity": 50000,
      "unit": "doses",
      "origin": "PharmaCorp Facility, Zurich",
      "destination": "MediDistribute Warehouse, Rotterdam",
      "required_temp_min": 2.0,
      "required_temp_max": 8.0,
      "status": "created",
      "created_by": "pharmacorp",
      "created_at": "2026-05-15T08:00:00Z",
      "estimated_delivery": "2026-05-20T18:00:00Z"
    }
  }'
```

Add pallet-level detail:

```bash
curl -X POST http://pharmacorp-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042:item:PALLET-A",
    "value": {
      "type": "pallet",
      "shipment_id": "VAC-2026-0042",
      "pallet_id": "PALLET-A",
      "product": "FluVax-2026",
      "quantity": 25000,
      "iot_sensor_id": "SENSOR-8842-A",
      "status": "packed",
      "packed_at": "2026-05-15T07:45:00Z"
    }
  }'

curl -X POST http://pharmacorp-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042:item:PALLET-B",
    "value": {
      "type": "pallet",
      "shipment_id": "VAC-2026-0042",
      "pallet_id": "PALLET-B",
      "product": "FluVax-2026",
      "quantity": 25000,
      "iot_sensor_id": "SENSOR-8842-B",
      "status": "packed",
      "packed_at": "2026-05-15T07:45:00Z"
    }
  }'
```

## Step 4: Record Custody Transfers

When ColdChain Logistics picks up the shipment, they record a custody transfer:

```bash
curl -X POST http://coldchain-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042:event:001",
    "value": {
      "type": "custody_transfer",
      "shipment_id": "VAC-2026-0042",
      "from": "pharmacorp",
      "to": "coldchain",
      "location": "PharmaCorp Loading Dock, Zurich",
      "timestamp": "2026-05-15T10:30:00Z",
      "condition_check": "passed",
      "notes": "All pallets verified. Temperature within range at pickup."
    }
  }'

# Update shipment status
curl -X POST http://coldchain-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042",
    "value": {
      "type": "shipment",
      "product": "FluVax-2026",
      "batch": "FluVax-Batch-2026-03",
      "quantity": 50000,
      "unit": "doses",
      "origin": "PharmaCorp Facility, Zurich",
      "destination": "MediDistribute Warehouse, Rotterdam",
      "required_temp_min": 2.0,
      "required_temp_max": 8.0,
      "status": "in_transit",
      "current_location": "En route to Basel",
      "current_custodian": "coldchain",
      "last_event": "custody_transfer",
      "updated_at": "2026-05-15T10:30:00Z"
    }
  }'
```

Each custody transfer creates a verifiable proof that the previous custodian handed off the goods and the new custodian accepted them in acceptable condition.

## Step 5: Log IoT Temperature Readings

ColdChain's refrigerated containers have IoT sensors that submit temperature readings every 15 minutes:

```bash
curl -X POST http://coldchain-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042:temp:001",
    "value": {
      "type": "temperature_reading",
      "shipment_id": "VAC-2026-0042",
      "pallet_id": "PALLET-A",
      "sensor_id": "SENSOR-8842-A",
      "celsius": 4.2,
      "timestamp": "2026-05-15T11:00:00Z",
      "location": "A2 Highway, km 34"
    }
  }'
```

In production, an IoT gateway would batch these submissions. For now, we send them individually to demonstrate the pattern.

## Step 6: Document Attachments

BorderClear submits customs documentation linked to the shipment:

```bash
curl -X POST http://borderclear-node:4441/tx \
  -H "Content-Type: application/json" \
  -d '{
    "key": "shipment:VAC-2026-0042:doc:001",
    "value": {
      "type": "document",
      "shipment_id": "VAC-2026-0042",
      "document_type": "customs_declaration",
      "reference": "CUS-2026-88421",
      "status": "cleared",
      "cleared_at": "2026-05-16T14:20:00Z",
      "cleared_by": "borderclear",
      "document_hash": "sha256:a1b2c3d4e5f6...",
      "storage_url": "https://docs.borderclear.com/CUS-2026-88421.pdf"
    }
  }'
```

Documents themselves aren't stored on-chain (that would bloat the ledger). Instead, we store a cryptographic hash of the document and a URL to the original. Anyone can verify that the document at the URL hasn't been altered by comparing its hash to the on-chain record.

## Step 7: SQL Queries for Real-Time Visibility

This is where the system becomes powerful. Because MiniLedger's world state is SQLite, all supply chain data is queryable with standard SQL — no external indexing, no data pipeline, no sync lag.

### Dashboard: All Shipments by Status

```bash
curl -X POST http://localhost:4441/state/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT json_extract(value, \"$.status\") as status, COUNT(*) as count FROM world_state WHERE key LIKE \"shipment:%\" AND key NOT LIKE \"%:%:%\" GROUP BY status ORDER BY count DESC"
  }'
```

Expected output:

```json
[
  { "status": "in_transit", "count": 12 },
  { "status": "delivered", "count": 47 },
  { "status": "customs_clearance", "count": 3 },
  { "status": "created", "count": 8 }
]
```

### Compliance: Shipments with Temperature Excursions

```sql
SELECT
  s.key as shipment_key,
  json_extract(s.value, '$.product') as product,
  t.value as reading_json
FROM world_state s
JOIN world_state t ON t.key LIKE s.key || ':temp:%'
WHERE s.key LIKE 'shipment:%'
  AND s.key NOT LIKE '%:%:%'
  AND CAST(json_extract(t.value, '$.celsius') AS REAL) NOT BETWEEN
      CAST(json_extract(s.value, '$.required_temp_min') AS REAL)
      AND CAST(json_extract(s.value, '$.required_temp_max') AS REAL)
ORDER BY json_extract(t.value, '$.timestamp') DESC
```

This query joins shipment headers with temperature readings and finds any reading outside the required range. Regulators can run this query at any time to identify compliance issues — no need to ask each organization for their data separately.

### Logistics: Average Transit Time by Route

```sql
SELECT
  json_extract(s.value, '$.origin') as origin,
  json_extract(s.value, '$.destination') as destination,
  COUNT(*) as shipment_count,
  AVG(
    (julianday(json_extract(e2.value, '$.timestamp')) -
     julianday(json_extract(e1.value, '$.timestamp'))) * 24
  ) as avg_transit_hours
FROM world_state s
JOIN world_state e1 ON e1.key = s.key || ':event:001'
JOIN world_state e2 ON e2.key LIKE s.key || ':event:%'
  AND json_extract(e2.value, '$.type') = 'custody_transfer'
  AND json_extract(e2.value, '$.to') = json_extract(s.value, '$.destination_party')
WHERE s.key LIKE 'shipment:%'
  AND s.key NOT LIKE '%:%:%'
  AND json_extract(s.value, '$.status') = 'delivered'
GROUP BY origin, destination
ORDER BY avg_transit_hours DESC
```

### Audit: Complete History of a Single Shipment

```sql
SELECT key, value FROM world_state
WHERE key LIKE 'shipment:VAC-2026-0042%'
ORDER BY key
```

This returns every record linked to `VAC-2026-0042` — the header, pallets, events, temperature readings, and documents. A regulator can reconstruct the entire lifecycle of a shipment with a single SQL query.

## Step 8: Dashboard with Programmatic API

Build a supply chain dashboard using the programmatic API:

```javascript
import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './medi-distribute-ledger' });
await node.init();
await node.start();

// Get active shipments
const activeShipments = await node.query(`
  SELECT key, json_extract(value, '$.product') as product,
         json_extract(value, '$.status') as status,
         json_extract(value, '$.current_location') as location,
         json_extract(value, '$.current_custodian') as custodian
  FROM world_state
  WHERE key LIKE 'shipment:%'
    AND key NOT LIKE '%:%:%'
    AND json_extract(value, '$.status') NOT IN ('delivered', 'cancelled')
  ORDER BY json_extract(value, '$.created_at') DESC
`);

// Get temperature alerts (last 24 hours)
const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
const alerts = await node.query(`
  SELECT s.key as shipment_key,
         json_extract(s.value, '$.product') as product,
         json_extract(t.value, '$.celsius') as temp,
         json_extract(t.value, '$.timestamp') as reading_time,
         json_extract(s.value, '$.required_temp_min') as min_temp,
         json_extract(s.value, '$.required_temp_max') as max_temp
  FROM world_state s
  JOIN world_state t ON t.key LIKE s.key || ':temp:%'
  WHERE s.key LIKE 'shipment:%'
    AND CAST(json_extract(t.value, '$.celsius') AS REAL) NOT BETWEEN
        CAST(json_extract(s.value, '$.required_temp_min') AS REAL)
        AND CAST(json_extract(s.value, '$.required_temp_max') AS REAL)
    AND json_extract(t.value, '$.timestamp') > ?
  ORDER BY json_extract(t.value, '$.timestamp') DESC
`, [oneDayAgo]);

console.log(`Active shipments: ${activeShipments.length}`);
console.log(`Temperature alerts (24h): ${alerts.length}`);
```

## Step 9: Privacy for Competitive Data

Not all data should be visible to all consortium members. ColdChain's pricing, for example, is competitive information that shouldn't be visible to other logistics providers.

MiniLedger's per-record encryption handles this:

```javascript
// ColdChain submits a private record
await node.submit({
  key: 'shipment:VAC-2026-0042:logistics:PALLET-A',
  value: {
    type: 'logistics_detail',
    shipment_id: 'VAC-2026-0042',
    carrier_rate: 4250.00,           // Confidential
    fuel_surcharge: 320.00,          // Confidential
    vehicle_id: 'TRUCK-CH-4421',
    driver_id: 'DRV-0921'
  },
  privacy: {
    readers: [
      'pk_node-pharmacorp',    // Shipper needs to see costs
      'pk_node-coldchain',     // ColdChain themselves
      'pk_node-regulator'      // Regulator for audit
    ],
    writers: ['pk_node-coldchain'],
    public: false
  }
});
```

Other consortium members see the record exists (the key is visible) but the value is encrypted ciphertext. Only nodes in the `readers` list can decrypt and read the contents.

## Step 10: Smart Contract for Automatic Compliance Checks

Deploy a smart contract that automatically flags temperature excursions:

```javascript
// Deployed as a contract on the ledger
const temperatureMonitor = {
  checkReading(ctx, shipmentId, sensorId, celsius, timestamp) {
    // Get shipment requirements
    const shipment = ctx.get(`shipment:${shipmentId}`);

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    const { required_temp_min, required_temp_max } = shipment;

    // Store the reading
    const readingKey = `shipment:${shipmentId}:temp:${Date.now()}`;
    ctx.set(readingKey, {
      type: 'temperature_reading',
      shipment_id: shipmentId,
      sensor_id: sensorId,
      celsius,
      timestamp
    });

    // Check compliance
    if (celsius < required_temp_min || celsius > required_temp_max) {
      // Auto-flag the shipment
      shipment.status = 'temperature_excursion';
      shipment.last_alert = timestamp;
      shipment.alert_temp = celsius;
      ctx.set(`shipment:${shipmentId}`, shipment);

      // Create an alert event
      ctx.set(`shipment:${shipmentId}:alert:temp-${Date.now()}`, {
        type: 'temperature_alert',
        shipment_id: shipmentId,
        sensor_id: sensorId,
        recorded_temp: celsius,
        acceptable_range: `${required_temp_min}-${required_temp_max}°C`,
        timestamp
      });

      ctx.log(`TEMPERATURE EXCURSION: ${shipmentId} at ${celsius}°C`);
    }
  }
};

export default temperatureMonitor;
```

This contract runs automatically when temperature readings are submitted. If a reading is out of range, it immediately flags the shipment and creates an alert — no separate monitoring system required.

## The Architecture at a Glance

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PharmaCorp  │   │  ColdChain   │   │ BorderClear  │
│   (Node 1)   │   │   (Node 2)   │   │   (Node 3)   │
│              │   │              │   │              │
│ ┌──────────┐ │   │ ┌──────────┐ │   │ ┌──────────┐ │
│ │MiniLedger│ │   │ │MiniLedger│ │   │ │MiniLedger│ │
│ │  (Raft)  │◄┼───┼─┤  (Raft)  │◄┼───┼─┤  (Raft)  │ │
│ └──────────┘ │   │ └──────────┘ │   │ └──────────┘ │
│              │   │              │   │              │
│ IoT Gateway  │   │ Temp Sensors │   │ Doc Upload   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────┴──────┐   ┌──────────────┐
                    │    Raft     │   │  Regulator   │
                    │  Consensus  │   │ (Read-Only)  │
                    │   Layer     │   │              │
                    └─────────────┘   │ SQL Queries  │
                                      │  + Dashboard │
                                      └──────────────┘
```

## Key Takeaways

1. **SQL queryability eliminates the indexing tax.** Traditional supply chain blockchains need external databases for dashboards. With MiniLedger, you query the ledger directly — real-time, no sync lag.

2. **Per-record privacy handles competitive data.** Logistics providers can keep their pricing confidential while sharing shipment status. No channels, no separate ledgers.

3. **Smart contracts automate compliance.** Temperature monitoring, custody verification, and regulatory reporting can all be encoded in contracts that execute automatically.

4. **Document hashing proves integrity without bloat.** Store hashes on-chain, documents off-chain. Anyone can verify the document matches the hash — cryptographic proof without bloating the ledger.

5. **Consortium governance manages membership.** Adding a new logistics provider or customs broker goes through on-chain voting, not manual channel reconfiguration.

---

Read the full [supply chain example](/docs/examples/supply-chain) in the docs, or see the [SQL queries guide](/docs/guides/sql-queries) for more query patterns.

---

*About the Author*

**Prasad Kumkar** is the Founder & CEO of ChainScore Labs. Over the last 5+ years, he has worked with teams building exchanges, DeFi infrastructure, smart contracts, tokenization systems, and protocol-level blockchain products, helping founders make architecture, security, and go-live decisions for production Web3 systems.
