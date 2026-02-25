import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/demo',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/multi-node-cluster',
        'guides/smart-contracts',
        'guides/governance',
        'guides/privacy-encryption',
        'guides/sql-queries',
        'guides/programmatic-api',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/rest-api',
        'api-reference/cli',
        'api-reference/node-api',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/consensus',
        'architecture/storage',
        'architecture/networking',
        'architecture/identity',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/supply-chain',
        'examples/token-ledger',
        'examples/audit-trail',
      ],
    },
    'comparison',
  ],
};

export default sidebars;
