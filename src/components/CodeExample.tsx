import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from '../pages/index.module.css';

const code = `import { MiniLedger } from 'miniledger';

const node = await MiniLedger.create({ dataDir: './my-ledger' });
await node.init();
await node.start();

// Submit a transaction
await node.submit({ key: 'account:alice', value: { balance: 1000 } });

// Query state with SQL
const results = await node.query(
  'SELECT * FROM world_state WHERE key LIKE ?',
  ['account:%']
);`;

export default function CodeExample(): React.JSX.Element {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <h2 className={styles.sectionTitle}>Get Started in 5 Lines</h2>
        <p className={styles.sectionSubtitle}>
          Embed a private blockchain directly into your Node.js application.
        </p>
        <div className={styles.codeWrapper}>
          <CodeBlock language="typescript" title="app.ts">
            {code}
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}
