import React from 'react';
import styles from '../pages/index.module.css';

const features = [
  {
    title: 'Zero Config',
    description:
      'No Docker, no Kubernetes, no certificate authorities. A single npm install gives you a production-ready private blockchain.',
  },
  {
    title: 'SQL Queries',
    description:
      'World state lives in SQLite. Run SELECT * FROM world_state directly against your ledger data — no custom query languages.',
  },
  {
    title: 'Embeddable',
    description:
      'Import as a library into any Node.js or TypeScript application. No separate processes, no infrastructure overhead.',
  },
];

const enterpriseFeatures = [
  { title: 'Raft Consensus', description: 'Production-grade leader election with log replication and automatic fault tolerance across multi-node clusters.' },
  { title: 'Smart Contracts', description: 'Write and deploy contracts in plain JavaScript. No Solidity, no Go, no Kotlin — just functions that read and write state.' },
  { title: 'Per-Record Privacy', description: 'AES-256-GCM field-level encryption with ACL-based access control. No channels needed, no complexity.' },
  { title: 'On-Chain Governance', description: 'Propose and vote on network changes directly on-chain. Quorum-based decision making with automatic execution.' },
  { title: 'Block Explorer', description: 'Built-in web dashboard with block/transaction drill-down, state browser, SQL console, and full-text search.' },
  { title: 'P2P Networking', description: 'WebSocket mesh with automatic peer discovery, reconnection, and chain synchronization across organizations.' },
];

export default function Features(): React.JSX.Element {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Why MiniLedger?</h2>
          <p className={styles.sectionSubtitle}>
            A lightweight alternative to Hyperledger Fabric, R3 Corda, and Quorum for teams that
            need a private blockchain without the operational burden.
          </p>
          <div className={styles.cardGrid3}>
            {features.map((f) => (
              <div key={f.title} className={styles.card}>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Enterprise-Grade Features</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need for a production consortium blockchain — without the complexity.
          </p>
          <div className={styles.cardGrid3}>
            {enterpriseFeatures.map((f) => (
              <div key={f.title} className={styles.card}>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
