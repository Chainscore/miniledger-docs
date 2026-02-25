import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MiniLedger — Private Blockchain Framework for Node.js',
  tagline: 'Zero-config, embeddable, SQL-queryable distributed ledger',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://miniledger.dev',
  baseUrl: '/',

  organizationName: 'Chainscore',
  projectName: 'miniledger',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'MiniLedger',
        description: 'Zero-config private blockchain framework for Node.js with Raft consensus, smart contracts, SQL queries, and a built-in block explorer.',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cross-platform',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: {
          '@type': 'Organization',
          name: 'Chainscore Labs',
          url: 'https://chainscorelabs.com',
        },
      }),
    },
    {
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Chainscore Labs',
        url: 'https://chainscorelabs.com',
        logo: 'https://miniledger.dev/img/logo.svg',
      }),
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Chainscore/miniledger/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: 'ALL',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/Chainscore/miniledger/tree/main/website/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    metadata: [
      { name: 'keywords', content: 'private blockchain, enterprise blockchain, consortium blockchain, hyperledger alternative, distributed ledger, embeddable blockchain, permissioned blockchain, blockchain framework, node.js blockchain, SQL blockchain' },
      { name: 'author', content: 'Chainscore Labs' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'og:type', content: 'website' },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'MiniLedger',
      logo: {
        alt: 'MiniLedger Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api-reference/rest-api',
          label: 'API',
          position: 'left',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/Chainscore/miniledger',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started/installation' },
            { label: 'API Reference', to: '/docs/api-reference/rest-api' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Chainscore/miniledger',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/miniledger',
            },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Blog', to: '/blog' },
            {
              label: 'Chainscore Labs',
              href: 'https://chainscorelabs.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Chainscore Labs. Apache-2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
