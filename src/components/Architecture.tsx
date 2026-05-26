import React from 'react';
import styles from '../pages/index.module.css';

const nodes = [
  {
    label: 'Node app',
    detail: 'Embed MiniLedger in-process',
  },
  {
    label: 'Signed tx',
    detail: 'Submit state changes and contracts',
  },
  {
    label: 'Raft log',
    detail: 'Replicate blocks across peers',
  },
  {
    label: 'SQLite state',
    detail: 'Query current world state with SQL',
  },
];

const checks = [
  'Every write is signed, hashed, and committed to a block.',
  'Peers replicate through WebSocket mesh networking.',
  'State remains inspectable through SQL and the built-in explorer.',
];

export default function Architecture(): React.JSX.Element {
  return (
    <section id="architecture" className={styles.sectionAlt}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>A private ledger that fits inside your stack</h2>
          <p className={styles.sectionSubtitle}>
            MiniLedger keeps the blockchain primitives explicit while removing the
            infrastructure layer that makes most enterprise ledgers slow to adopt.
          </p>
        </div>

        <div className={styles.architectureGrid}>
          <div className={styles.flowPanel} aria-label="MiniLedger architecture flow">
            {nodes.map((node, index) => (
              <React.Fragment key={node.label}>
                <div className={styles.flowNode}>
                  <span className={styles.flowIndex}>0{index + 1}</span>
                  <strong>{node.label}</strong>
                  <span>{node.detail}</span>
                </div>
                {index < nodes.length - 1 && <div className={styles.flowLine} aria-hidden />}
              </React.Fragment>
            ))}
          </div>

          <div className={styles.opsPanel}>
            <div className={styles.opsHeader}>
              <span>Cluster posture</span>
              <strong>Production path</strong>
            </div>
            <ul className={styles.checkList}>
              {checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <div className={styles.hashRail} aria-label="Example ledger hashes">
              <span>4c7b561f...7fb800</span>
              <span>41dbf483...3bb1fc</span>
              <span>43e9fe4e...404ab1</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
