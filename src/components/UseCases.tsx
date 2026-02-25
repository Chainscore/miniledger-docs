import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../pages/index.module.css';

const useCases = [
  { title: 'Supply Chain', description: 'Immutable record of goods movement across organizations with full provenance tracking.' },
  { title: 'Audit Trails', description: 'Tamper-proof logs for compliance, finance, and healthcare with cryptographic verification.' },
  { title: 'Tokenization', description: 'Issue and transfer digital tokens with smart contracts — asset-backed, loyalty, or utility.' },
  { title: 'IoT Data Integrity', description: 'Sensor data committed to an immutable ledger with per-device identity and signatures.' },
  { title: 'Compliance', description: 'Timestamped, cryptographically signed record keeping for regulatory requirements.' },
  { title: 'Multi-Party Workflows', description: 'Shared ledger between organizations without a central authority — each party runs a node.' },
];

export default function UseCases(): React.JSX.Element {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Built for Real Use Cases</h2>
          <p className={styles.sectionSubtitle}>
            From supply chain to financial audit trails — MiniLedger handles enterprise
            distributed ledger scenarios without the enterprise complexity.
          </p>
          <div className={styles.cardGrid3}>
            {useCases.map((u) => (
              <div key={u.title} className={styles.card}>
                <h3 className={styles.cardTitle}>{u.title}</h3>
                <p className={styles.cardDesc}>{u.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.sectionInner} style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>Get Started</h2>
          <div className={styles.heroInstall}>
            <code>npm install miniledger</code>
          </div>
          <div className={styles.heroButtons} style={{ marginTop: '1.5rem' }}>
            <Link className={styles.btnPrimary} to="/docs/getting-started/installation">
              Read the Docs
            </Link>
            <Link
              className={styles.btnSecondary}
              href="https://github.com/Chainscore/miniledger"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
