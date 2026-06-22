---
layout: home

hero:
  name: "Orbital Express"
  text: "Build production APIs, faster."
  tagline: "An opinionated Express.js + Sequelize framework with feature-folder architecture, built-in auth, background jobs, and real-time support."
  image:
    src: /logo.svg
    alt: Orbital Express
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/Hackbyrd/orbital-express

features:
  - icon: 📁
    title: Feature-Folder Architecture
    details: Everything for a feature lives in one folder. No bouncing between controllers/, models/, routes/. Scale to hundreds of features without chaos.
  - icon: ⚡
    title: Generator-First
    details: Never hand-create files. yarn gen Order scaffolds the entire feature — model, routes, controller, actions, tests — in seconds.
  - icon: 🔐
    title: Auth Built In
    details: Dual-token JWT auth (access + refresh) with per-client audience isolation. User and Admin portals out of the box.
  - icon: 🔄
    title: Background Jobs
    details: Bull/Redis queue built into the framework. Actions enqueue work, tasks process it. Separate worker process, retry logic included.
  - icon: 📡
    title: Real-Time Ready
    details: Socket.IO integrated at the framework level. Emit after commit. Room-based broadcasting. Testable socket actions. <a href="/realtime/sockets">Read more →</a>
  - icon: 🤖
    title: AI-Native Skills
    details: 18 .claude/skills/ playbooks. Junior engineers describe what they need, the AI agent follows the playbook end-to-end.
---
