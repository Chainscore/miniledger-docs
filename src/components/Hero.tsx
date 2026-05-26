import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../pages/index.module.css';

export default function Hero(): React.JSX.Element {
  return (
    <section className={styles.hero}>
      <div className={styles.heroImageStrip}>
        <img
          src="/img/dashboard-screenshot.png"
          alt="MiniLedger dashboard showing block height, peers, state keys, block rate, recent blocks, transactions, and consensus status"
          width={1280}
          height={720}
        />
      </div>

      <div className={styles.heroEditorial}>
        <div className={styles.heroScreenshotSmall}>
          <img
            src="/img/dashboard-screenshot.png"
            alt=""
            width={1280}
            height={720}
          />
        </div>

        <div className={styles.heroNote}>
          <span>PRIVATE LEDGER / NODE.JS</span>
          <h2>Embedded ledger infrastructure without the platform weight.</h2>
          <p>
            Blocks, transactions, peer state, governance, and SQL-readable world
            state stay close to the application instead of becoming a separate
            operations program.
          </p>
          <div className={styles.heroNoteLinks}>
            <Link to="/docs/getting-started/quickstart">Quickstart</Link>
            <Link to="#architecture">Architecture</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
