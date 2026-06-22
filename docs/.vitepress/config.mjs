import { defineConfig } from 'vitepress'

const enSidebar = [
  {
    text: 'Why Orbital Express',
    items: [
      { text: 'The Philosophy', link: '/philosophy/' },
      { text: 'The Origin Story', link: '/philosophy/the-origin' },
      { text: 'JavaScript, Not TypeScript', link: '/philosophy/javascript-not-typescript' },
      { text: 'Vue.js, Not React', link: '/philosophy/vue-not-react' },
      { text: 'One Repo, Not Microservices', link: '/philosophy/one-repo' },
    ],
  },
  {
    text: 'Getting Started',
    items: [
      { text: 'What is Orbital Express', link: '/guide/introduction' },
      { text: 'Installation & First Run', link: '/guide/getting-started' },
      { text: 'Repo Structure Explained', link: '/guide/project-structure' },
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
    text: 'AI & Claude Code',
    items: [
      { text: 'MCP Server & Skills', link: '/ai/overview' },
    ],
  },
  {
    text: 'Releases',
    items: [
      { text: 'Changelog', link: '/changelog' },
      { text: 'Release Guide', link: '/release-guide' },
    ],
  },
]

const zhTWSidebar = [
  {
    text: '為何選擇 Orbital Express',
    items: [
      { text: '設計理念', link: '/zh-TW/philosophy/' },
      { text: '起源故事', link: '/zh-TW/philosophy/the-origin' },
      { text: '為何選擇 JavaScript 而非 TypeScript', link: '/zh-TW/philosophy/javascript-not-typescript' },
      { text: '為何選擇 Vue.js 而非 React', link: '/zh-TW/philosophy/vue-not-react' },
      { text: '單一儲存庫而非微服務', link: '/zh-TW/philosophy/one-repo' },
    ],
  },
  {
    text: '快速入門',
    items: [
      { text: '什麼是 Orbital Express', link: '/zh-TW/guide/introduction' },
      { text: '安裝與初次執行', link: '/zh-TW/guide/getting-started' },
      { text: '專案結構說明', link: '/zh-TW/guide/project-structure' },
    ],
  },
  {
    text: '核心概念',
    items: [
      { text: '功能資料夾', link: '/zh-TW/core/feature-folder' },
      { text: '請求生命週期', link: '/zh-TW/core/request-lifecycle' },
      { text: '撰寫 Action', link: '/zh-TW/core/actions' },
      { text: '資料層', link: '/zh-TW/core/models' },
      { text: '錯誤處理與多語系', link: '/zh-TW/core/errors' },
    ],
  },
  {
    text: '身份驗證',
    items: [
      { text: '身份驗證概覽', link: '/zh-TW/auth/overview' },
      { text: '使用者類型', link: '/zh-TW/auth/user-types' },
      { text: 'Session 管理', link: '/zh-TW/auth/session' },
    ],
  },
  {
    text: '背景任務',
    items: [
      { text: 'Bull 佇列', link: '/zh-TW/background-jobs/overview' },
      { text: '定時任務', link: '/zh-TW/background-jobs/cron' },
    ],
  },
  {
    text: '即時通訊',
    items: [
      { text: 'Socket.IO', link: '/zh-TW/realtime/sockets' },
    ],
  },
  {
    text: '測試',
    items: [
      { text: '測試架構', link: '/zh-TW/testing/overview' },
      { text: '測試模式', link: '/zh-TW/testing/patterns' },
    ],
  },
  {
    text: '國際化',
    items: [
      { text: '多語系與本地化', link: '/zh-TW/i18n/localization' },
    ],
  },
  {
    text: '資料庫',
    items: [
      { text: '資料庫慣例', link: '/zh-TW/database/conventions' },
      { text: '資料庫遷移', link: '/zh-TW/database/migrations' },
    ],
  },
  {
    text: '產生器',
    items: [
      { text: 'CLI 產生器', link: '/zh-TW/generator/cli' },
    ],
  },
  {
    text: '參考文件',
    items: [
      { text: '慣例快速參考', link: '/zh-TW/reference/conventions' },
      { text: 'JS 檔案結構', link: '/zh-TW/reference/file-structure' },
      { text: '常數與列舉', link: '/zh-TW/reference/constants' },
      { text: '運維與部署', link: '/zh-TW/reference/operations' },
    ],
  },
  {
    text: '教學',
    items: [
      { text: '建立第一個功能', link: '/zh-TW/tutorials/first-feature' },
      { text: '加入身份驗證', link: '/zh-TW/tutorials/add-auth' },
      { text: '加入即時功能', link: '/zh-TW/tutorials/real-time' },
    ],
  },
  {
    text: 'AI 與 Claude Code',
    items: [
      { text: 'MCP Server 與 Skills', link: '/zh-TW/ai/overview' },
    ],
  },
  {
    text: '版本發布',
    items: [
      { text: '更新日誌', link: '/zh-TW/changelog' },
      { text: '發布指南', link: '/zh-TW/release-guide' },
    ],
  },
]

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

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Why', link: '/philosophy/' },
          { text: 'Guide', link: '/guide/introduction' },
          { text: 'Reference', link: '/reference/conventions' },
          { text: 'GitHub', link: 'https://github.com/Hackbyrd/orbital-express', target: '_blank' },
        ],
        sidebar: enSidebar,
      },
    },
    'zh-TW': {
      label: '繁體中文',
      lang: 'zh-TW',
      themeConfig: {
        nav: [
          { text: '首頁', link: '/zh-TW/' },
          { text: '理念', link: '/zh-TW/philosophy/' },
          { text: '指南', link: '/zh-TW/guide/introduction' },
          { text: '參考文件', link: '/zh-TW/reference/conventions' },
          { text: 'GitHub', link: 'https://github.com/Hackbyrd/orbital-express', target: '_blank' },
        ],
        sidebar: zhTWSidebar,
        editLink: {
          pattern: 'https://github.com/Hackbyrd/orbital-express/edit/main/docs/:path',
          text: '在 GitHub 上編輯此頁面',
        },
        outlineTitle: '本頁目錄',
        returnToTopLabel: '回到頂部',
        sidebarMenuLabel: '選單',
        darkModeSwitchLabel: '深色模式',
      },
    },
  },

  themeConfig: {
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
