import React from 'react';
import styles from '../pages/index.module.css';

const features = [
  {
    title: 'No platform ceremony',
    description:
      'No Docker, Kubernetes, certificate authorities, orderer services, or separate ledger runtime to operate.',
  },
  {
    title: 'Queryable ledger state',
    description:
      'World state lives in SQLite, so product teams can inspect ledger data with ordinary SQL instead of custom query APIs.',
  },
  {
    title: 'Embeddable by default',
    description:
      'Import MiniLedger into a Node.js or TypeScript service and ship a ledger as part of the application.',
  },
];

const enterpriseFeatures = [
  { title: 'Raft consensus', description: 'Leader election, log replication, and fault tolerance across multi-node private clusters.' },
  { title: 'JavaScript contracts', description: 'Deploy plain JavaScript functions that read and write ledger state without Solidity, Go, or Kotlin.' },
  { title: 'Per-record privacy', description: 'AES-256-GCM field encryption with ACL-based access control, without channel sprawl.' },
  { title: 'On-chain governance', description: 'Propose, vote, and execute network changes through quorum-based governance flows.' },
  { title: 'Explorer included', description: 'Use the dashboard for blocks, transactions, state browsing, SQL console, and full-text search.' },
  { title: 'P2P networking', description: 'Run a WebSocket mesh with peer discovery, reconnection, and chain synchronization.' },
];

const solutionGroups = [
  {
    title: 'Application teams',
    items: ['Embed the ledger in a service', 'Keep data local and inspectable', 'Avoid a new infrastructure platform'],
  },
  {
    title: 'Enterprise workflows',
    items: ['Audit trails', 'Supply chain provenance', 'Compliance evidence'],
  },
  {
    title: 'Consortium pilots',
    items: ['Multi-party shared state', 'Peer-to-peer synchronization', 'Governance from day one'],
  },
];

export default function Features(): React.JSX.Element {
  return (
    <>
      <section id="solutions" className={styles.solutionBand}>
        <div className={styles.sectionInner}>
          <div className={styles.solutionLayout}>
            <div>
              <h2 className={styles.solutionTitle}>Built for private ledgers that need to ship</h2>
              <p className={styles.solutionText}>
                MiniLedger gives engineering teams the control model of a private
                blockchain with the deployment shape of a normal Node.js dependency.
              </p>
            </div>
            <div className={styles.solutionGrid}>
              {solutionGroups.map((group) => (
                <div key={group.title} className={styles.solutionColumn}>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Why teams choose MiniLedger</h2>
            <p className={styles.sectionSubtitle}>
              A lightweight alternative to Hyperledger Fabric, R3 Corda, and Quorum
              for teams that need a private blockchain without the operational burden.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <div key={feature.title} className={styles.featureCard}>
                <span className={styles.cardNumber}>0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Enterprise-grade primitives, Node-native shape</h2>
            <p className={styles.sectionSubtitle}>
              The core primitives are built in, but exposed in a way that feels
              familiar to product engineers.
            </p>
          </div>
          <div className={styles.capabilityGrid}>
            {enterpriseFeatures.map((feature) => (
              <div key={feature.title} className={styles.capabilityCard}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
