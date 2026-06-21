import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Orbital Express',
  description: 'An opinionated Express.js + Sequelize framework for building production-grade APIs',
  base: '/orbital-express/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/orbital-express/favicon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Orbital Express' }],
    ['meta', { property: 'og:description', content: 'An opinionated Express.js + Sequelize framework for building production-grade APIs' }],
    ['meta', { property: 'og:image', content: 'https://hackbyrd.github.io/orbital-express/og-image.png' }],
    ['meta', { property: 'og:url', content: 'https://hackbyrd.github.io/orbital-express/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Orbital Express' }],
    ['meta', { name: 'twitter:description', content: 'An opinionated Express.js + Sequelize framework for building production-grade APIs' }],
  ],

  markdown: {
    lineNumbers: true,
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/conventions' },
      {
        text: 'GitHub',
        link: 'https://github.com/Hackbyrd/orbital-express',
        target: '_blank',
      },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'What is Orbital Express', link: '/guide/introduction' },
          { text: 'Installation & First Run', link: '/guide/getting-started' },
          { text: 'Repo Structure Explained', link: '/guide/project-structure' },
          { text: 'The Origin Story', link: '/guide/the-origin' },
          { text: 'Why JavaScript, Not TypeScript', link: '/guide/javascript-not-typescript' },
          { text: 'Why Vue.js, Not React', link: '/guide/vue-not-react' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'The Feature Folder', link: '/core/feature-folder' },
          { text: 'The Request Lifecycle', link: '/core/request-lifecycle' },
          { text: 'Writing Actions', link: '/core/actions' },
          { text: 'The Data Layer', link: '/core/models' },
          { text: 'Errors & i18n', link: '/core/errors' },
        ],
      },
      {
        text: 'Authentication',
        items: [
          { text: 'Auth Overview', link: '/auth/overview' },
          { text: 'User Types', link: '/auth/user-types' },
          { text: 'Session Management', link: '/auth/session' },
        ],
      },
      {
        text: 'Background Jobs',
        items: [
          { text: 'Bull Queue', link: '/background-jobs/overview' },
          { text: 'Cron Jobs', link: '/background-jobs/cron' },
        ],
      },
      {
        text: 'Real-Time',
        items: [
          { text: 'Socket.IO', link: '/realtime/sockets' },
        ],
      },
      {
        text: 'Testing',
        items: [
          { text: 'Test Architecture', link: '/testing/overview' },
          { text: 'Testing Patterns', link: '/testing/patterns' },
        ],
      },
      {
        text: 'Internationalization',
        items: [
          { text: 'i18n & Localization', link: '/i18n/localization' },
        ],
      },
      {
        text: 'Database',
        items: [
          { text: 'DB Conventions', link: '/database/conventions' },
          { text: 'Migrations', link: '/database/migrations' },
        ],
      },
      {
        text: 'Generator',
        items: [
          { text: 'CLI Generator', link: '/generator/cli' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Conventions Quick-Reference', link: '/reference/conventions' },
          { text: 'JS File Structure', link: '/reference/file-structure' },
          { text: 'Constants & Enums', link: '/reference/constants' },
          { text: 'Operations & Deploy', link: '/reference/operations' },
        ],
      },
      {
        text: 'Tutorials',
        items: [
          { text: 'Build Your First Feature', link: '/tutorials/first-feature' },
          { text: 'Add Authentication', link: '/tutorials/add-auth' },
          { text: 'Add Real-Time', link: '/tutorials/real-time' },
        ],
      },
      {
        text: 'Releases',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Release Guide', link: '/release-guide' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Hackbyrd/orbital-express' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/hackbyrd' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present <a href="https://www.linkedin.com/in/hackbyrd" target="_blank">Jonathan Chen (Hackbyrd)</a>',
    },

    editLink: {
      pattern: 'https://github.com/Hackbyrd/orbital-express/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },
})
