# AI Tools & Coding Assistants

Orbital Express is designed to work with any AI coding assistant — Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Windsurf, or whatever tool your team uses. The framework's consistency is what makes AI effective: every feature follows the same structure, so any AI can extend it correctly without guessing.

This page covers how to connect each tool to the framework's conventions, skills, and documentation.

---

## The MCP Server (Claude Code & Cursor)

The `orbital-express-mcp` package is the richest integration available. It gives any MCP-compatible AI assistant complete knowledge of the framework — conventions, skill playbooks, full documentation — served on demand.

**MCP is an open protocol.** It is not specific to Claude. Any tool that supports MCP clients can connect to `orbital-express-mcp`.

### Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "orbital-express": {
      "command": "npx",
      "args": ["-y", "orbital-express-mcp"]
    }
  }
}
```

This file is already included if you created your project with `npx create-orbital-app`.

### Cursor

Add to your project's `.cursor/mcp.json` (already included in the framework repo):

```json
{
  "mcpServers": {
    "orbital-express": {
      "command": "npx",
      "args": ["-y", "orbital-express-mcp"]
    }
  }
}
```

Cursor will pick this up automatically on next launch.

### Windsurf / other MCP-compatible tools

Add the same server config to your tool's MCP settings (location varies by tool):

```json
{
  "orbital-express": {
    "command": "npx",
    "args": ["-y", "orbital-express-mcp"]
  }
}
```

### What the MCP server exposes

Once connected, the AI can call these tools silently during your session:

| Tool | What it returns |
|---|---|
| `get_framework_overview` | Full `AGENTS.md` — architecture, golden rules, command cheat sheet |
| `get_conventions` | Complete conventions rulebook — naming, HTTP, DB, auth, tests |
| `list_skills` | All available skill playbooks with descriptions |
| `get_skill` | Full step-by-step playbook for a specific skill |
| `list_docs` | All documentation pages with titles |
| `get_docs_page` | A specific documentation page by slug |
| `search_docs` | Full-text search across all docs, skills, and conventions |

---

## AGENTS.md (OpenAI Codex, Cursor, and others)

`AGENTS.md` in the repo root is a tool-agnostic instruction file that any AI agent can read. OpenAI Codex reads it automatically. Cursor and Claude Code also read it as context. Many other tools support it or will soon.

It contains:
- Full framework architecture overview
- Every golden rule (naming, HTTP, DB, auth, errors, models, tests, i18n)
- The complete command cheat sheet
- A table of every available skill and when to use it

No setup needed — it's already in the repo. Any AI tool pointed at this codebase will find it.

---

## Cursor Rules

The `.cursor/rules/orbital-express.mdc` file (already in the repo) is a Cursor-native instruction file that applies automatically to every file in the project. It covers:

- The generator workflow (`yarn gen`, `yarn del`)
- Feature-folder structure
- HTTP conventions, naming rules, error handling
- The full list of available skills

Cursor reads this without any configuration.

---

## GitHub Copilot

`.github/copilot-instructions.md` (already in the repo) gives Copilot project-specific context that applies across all Copilot suggestions in this codebase. It covers the same conventions as the other integration files: generator usage, HTTP patterns, naming, errors, models, tests.

No setup needed.

---

## Skills — available to any AI

Skills are step-by-step playbooks stored in `.claude/skills/`. Claude Code auto-discovers and invokes them. For other tools, you can reference the skill files directly or ask the AI to read a specific skill before starting a task.

**For Claude Code and Cursor (via MCP):** The AI calls `get_skill` automatically.

**For other tools:** Point the AI at the skill file directly:

```
Read .claude/skills/create-feature/SKILL.md and follow it to build a new Order feature.
```

All 19 skills are in `.claude/skills/`. The skill files are plain Markdown — any AI can read them.

### Available skills

| Skill | What it does |
|---|---|
| `create-feature` | Full feature scaffold — new table, folder, model, routes, actions, tests |
| `add-action` | Add an HTTP action to an existing feature |
| `add-query-action` | Add a list/search/pagination endpoint |
| `add-task` | Add a background job |
| `add-migration` | Create or alter a database table |
| `add-auth-user-type` | Add a new authenticated user type (Partner, Driver, etc.) |
| `add-error-code` | Add a client error code |
| `add-constant` | Add a global constant or enum |
| `add-fixtures` | Add test fixtures or seed data |
| `add-mailer` | Add a transactional email |
| `add-cronjob` | Schedule recurring work |
| `add-socket-event` | Add a real-time Socket.IO event |
| `add-locale` | Add a language or translation keys |
| `write-tests` | Write or audit integration tests |
| `review-conventions` | Self-audit code against conventions before shipping |
| `sync-docs` | Keep all documentation surfaces in sync |
| `sync-translations` | Update zh-TW translations after English docs change |
| `release` | Cut a new version — bump, changelog, tag |
| `setup-and-ops` | Setup, servers, DB backup/restore, deploy |

---

## Why AI works well with this framework

AI coding assistants are pattern matchers. They are exceptionally good at extending consistent patterns and unreliable in arbitrary codebases where every engineer made different choices.

Orbital Express is consistent by design:
- Every feature folder has the same structure
- Every action follows the same shape
- Every error follows the same format
- Every test follows the same pattern

When you ask any AI to build a feature in this codebase, it reads the pattern that exists everywhere and extends it. The output is correct not because the AI is clever, but because the framework made "correct" the only recognizable path.

This is why it doesn't matter which AI tool you use. The framework does the heavy lifting. The AI just follows the pattern.

---

## Quick setup summary

| Tool | What to do |
|---|---|
| **Claude Code** | `.claude/settings.json` already included — MCP auto-connects |
| **Cursor** | `.cursor/mcp.json` + `.cursor/rules/orbital-express.mdc` already included |
| **GitHub Copilot** | `.github/copilot-instructions.md` already included |
| **OpenAI Codex** | `AGENTS.md` in repo root — read automatically |
| **Windsurf / other MCP tools** | Add `orbital-express-mcp` to your tool's MCP server config |
| **Any other AI** | Point it at `AGENTS.md` or any `.claude/skills/*/SKILL.md` file |
