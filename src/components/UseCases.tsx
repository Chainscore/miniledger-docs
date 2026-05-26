import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../pages/index.module.css';

const useCases = [
  {
    title: 'Audit and compliance trails',
    description:
      'Tamper-evident records for regulated workflows, financial controls, healthcare activity, and internal approvals.',
    fit: 'Best when every participant needs proof of what changed and when.',
  },
  {
    title: 'Supply chain provenance',
    description:
      'Track goods, documents, custody, and state changes across organizations with cryptographic verification.',
    fit: 'Best when multiple parties update a shared record but keep separate systems.',
  },
  {
    title: 'SaaS tenant ledgers',
    description:
      'Embed immutable histories, account movements, credits, loyalty points, or workflow state inside a product.',
    fit: 'Best when the ledger must be part of the application, not a sidecar platform.',
  },
  {
    title: 'Multi-party operations',
    description:
      'Run peer nodes across teams, partners, or subsidiaries while preserving local control and shared consensus.',
    fit: 'Best when governance and synchronization matter more than public-chain economics.',
  },
];

export default function UseCases(): React.JSX.Element {
  return (
    <>
      <section id="use-cases" className={styles.sectionAlt}>
        <div className={styles.sectionInner}>
          <div className={styles.useCaseLayout}>
            <div className={styles.useCaseIntro}>
              <h2 className={styles.sectionTitle}>Built for real enterprise workflows</h2>
              <p className={styles.sectionSubtitle}>
                Use MiniLedger when a normal database is not enough because multiple
                parties need a shared, signed, replayable history.
              </p>
            </div>
            <div className={styles.useCaseRows}>
              {useCases.map((useCase) => (
                <div key={useCase.title} className={styles.useCaseRow}>
                  <div>
                    <h3>{useCase.title}</h3>
                    <p>{useCase.description}</p>
                  </div>
                  <strong>{useCase.fit}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.sectionInner}>
          <div className={styles.ctaLayout}>
            <div>
              <h2>Start with a ledger your team can understand</h2>
              <p>
                Install MiniLedger, run a node locally, and scale into a private
                multi-party network when the workflow is ready.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <div className={styles.heroInstall}>
                <span>$</span>
                <code>npm install miniledger</code>
              </div>
              <div className={styles.heroButtons}>
                <Link className={styles.btnPrimary} to="/docs/getting-started/installation">
                  Read the docs
                </Link>
                <Link
                  className={styles.btnSecondary}
                  href="https://github.com/Chainscore/miniledger"
                >
                  View GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
