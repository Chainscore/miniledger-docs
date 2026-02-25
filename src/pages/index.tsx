import React from 'react';
import Layout from '@theme/Layout';
import Hero from '../components/Hero';
import Features from '../components/Features';
import CodeExample from '../components/CodeExample';
import Comparison from '../components/Comparison';
import UseCases from '../components/UseCases';

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Private Blockchain Framework for Node.js"
      description="MiniLedger is a zero-config, embeddable, SQL-queryable private blockchain framework for Node.js. The lightweight alternative to Hyperledger Fabric for enterprise distributed ledger applications."
    >
      <main>
        <Hero />
        <Features />
        <CodeExample />
        <Comparison />
        <UseCases />
      </main>
    </Layout>
  );
}
