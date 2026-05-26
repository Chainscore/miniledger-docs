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

const rows = [
  { key: 'account:alice', version: '9', value: '{ balance: 1000 }' },
  { key: 'account:bob', version: '9', value: '{ balance: 725 }' },
  { key: 'shipment:7f2', version: '8', value: '{ status: "cleared" }' },
];

export default function CodeExample(): React.JSX.Element {
  return (
    <section id="quickstart" className={styles.sectionAlt}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>From install to queryable ledger state</h2>
          <p className={styles.sectionSubtitle}>
            Start a private ledger, submit signed transactions, and inspect state
            with SQL from the same application runtime.
          </p>
        </div>

        <div className={styles.codeShowcase}>
          <div className={styles.codePanel}>
            <CodeBlock language="typescript" title="app.ts">
              {code}
            </CodeBlock>
          </div>

          <div className={styles.queryPanel}>
            <div className={styles.queryHeader}>
              <span>world_state</span>
              <code>SELECT key, value FROM world_state;</code>
            </div>
            <table className={styles.queryTable}>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Version</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>{row.version}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
