import React from 'react';
import styles from '../pages/index.module.css';

const rows = [
  { label: 'Setup time', mini: '10 seconds', fabric: 'Hours/days', corda: 'Hours', quorum: 'Hours' },
  { label: 'Dependencies', mini: 'npm install', fabric: 'Docker, K8s, CAs', corda: 'JVM, Corda node', quorum: 'JVM, Go-Ethereum' },
  { label: 'Config files', mini: '0 (auto)', fabric: 'Dozens of YAML', corda: 'Multiple configs', quorum: 'Genesis + static nodes' },
  { label: 'Consensus', mini: 'Raft (built-in)', fabric: 'Raft (separate orderer)', corda: 'Notary service', quorum: 'IBFT / Raft' },
  { label: 'Smart contracts', mini: 'JavaScript', fabric: 'Go / Java / Node', corda: 'Kotlin / Java', quorum: 'Solidity' },
  { label: 'State queries', mini: 'SQL', fabric: 'CouchDB queries', corda: 'JPA / Vault', quorum: 'No native query' },
  { label: 'Privacy', mini: 'Per-record ACLs', fabric: 'Channels (complex)', corda: 'Point-to-point', quorum: 'Private transactions' },
  { label: 'Governance', mini: 'On-chain voting', fabric: 'Off-chain manual', corda: 'Off-chain', quorum: 'Off-chain' },
  { label: 'Dashboard', mini: 'Built-in explorer', fabric: 'None (3rd party)', corda: 'None', quorum: 'None' },
  { label: 'Embeddable', mini: 'Yes (npm library)', fabric: 'No', corda: 'No', quorum: 'No' },
];

export default function Comparison(): React.JSX.Element {
  return (
    <section id="comparison" className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How it compares</h2>
          <p className={styles.sectionSubtitle}>
            MiniLedger is designed for teams that want a private ledger without
            adopting a full blockchain operations platform.
          </p>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.compTable}>
            <thead>
              <tr>
                <th></th>
                <th>MiniLedger</th>
                <th>Hyperledger Fabric</th>
                <th>R3 Corda</th>
                <th>Quorum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className={styles.compLabel}>{r.label}</td>
                  <td className={styles.compHighlight}>{r.mini}</td>
                  <td>{r.fabric}</td>
                  <td>{r.corda}</td>
                  <td>{r.quorum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
