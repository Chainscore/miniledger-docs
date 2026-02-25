import React from 'react';
import Link from '@docusaurus/Link';
import styles from '../pages/index.module.css';

export default function Hero(): React.JSX.Element {
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <img
          src="/img/logo.svg"
          alt="MiniLedger"
          className={styles.heroLogo}
          width={64}
          height={64}
        />
        <h1 className={styles.heroTitle}>MiniLedger</h1>
        <p className={styles.heroTagline}>
          Zero-config private blockchain framework for Node.js.
          <br />
          Embeddable, SQL-queryable, production-ready.
        </p>
        <div className={styles.heroInstall}>
          <code>npm install miniledger</code>
        </div>
        <div className={styles.heroButtons}>
          <Link className={styles.btnPrimary} to="/docs/getting-started/installation">
            Get Started
          </Link>
          <Link
            className={styles.btnSecondary}
            href="https://github.com/Chainscore/miniledger"
          >
            GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
