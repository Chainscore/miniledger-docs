import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Architecture from '../components/Architecture';
import CodeExample from '../components/CodeExample';
import Comparison from '../components/Comparison';
import UseCases from '../components/UseCases';
import styles from './index.module.css';

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Private Blockchain Framework for Node.js"
      description="MiniLedger is a zero-config, embeddable, SQL-queryable private blockchain framework for Node.js. The lightweight alternative to Hyperledger Fabric for enterprise distributed ledger applications."
    >
      <main className={styles.landingPage}>
        <aside className={styles.identityPanel}>
          <div className={styles.identityContent}>
            <img
              src="/img/logo.svg"
              alt=""
              className={styles.identityLogo}
              width={56}
              height={56}
            />
            <h1>MiniLedger</h1>
            <p>
              A private blockchain framework for Node.js applications. Minimal
              infrastructure, inspectable state, and a built-in explorer.
            </p>
            <div className={styles.identityInstall}>
              <span>$</span>
              <code>npm install miniledger</code>
            </div>
            <div className={styles.identityLinks}>
              <Link to="/docs/getting-started/installation">Docs</Link>
              <Link href="https://github.com/Chainscore/miniledger">GitHub</Link>
            </div>
            <dl className={styles.identityMeta}>
              <div>
                <dt>Runtime</dt>
                <dd>Node.js</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>SQLite</dd>
              </div>
              <div>
                <dt>Consensus</dt>
                <dd>Raft</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className={styles.contentColumn}>
          <Hero />
          <Features />
          <Architecture />
          <CodeExample />
          <Comparison />
          <UseCases />
        </div>
      </main>
    </Layout>
  );
}
