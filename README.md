# Orbital Express

An opinionated Express.js + Sequelize framework for building production-grade APIs fast. Feature-folder architecture, generator-first workflow, built-in auth, background jobs, real-time, i18n, and AI-native skills.

**→ Full documentation: [hackbyrd.github.io/orbital-express](https://hackbyrd.github.io/orbital-express/)**

---

## Quick start

```bash
npx create-orbital-app my-api
```

## What it is

- **Feature-folder architecture** — model, routes, actions, tasks, tests, and i18n for a feature live in one folder under `app/`
- **Generator-first** — `yarn gen Feature` scaffolds everything; `yarn del` removes it cleanly
- **Auth out of the box** — access + revocable refresh tokens, multiple user types, Google OAuth
- **Background jobs** — Bull/Redis queue with typed task files
- **Real-time** — Socket.IO with JWT authentication
- **AI-native** — skills for Claude Code, Cursor rules, GitHub Copilot instructions, MCP server

## Links

- [Documentation](https://hackbyrd.github.io/orbital-express/)
- [Getting started](https://hackbyrd.github.io/orbital-express/guide/getting-started)
- [create-orbital-app](https://github.com/Hackbyrd/create-orbital-app)
- [orbital-express-mcp](https://www.npmjs.com/package/orbital-express-mcp)
