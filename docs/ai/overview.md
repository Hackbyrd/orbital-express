# AI & Claude Code

Orbital Express is built to work exceptionally well with AI coding assistants — specifically Claude Code. This page explains how to get the most out of AI when building on this framework.

---

## The MCP Server

The fastest way to give Claude full knowledge of Orbital Express is the official MCP (Model Context Protocol) server: **`orbital-express-mcp`**.

Once connected, Claude can look up conventions, retrieve skill playbooks, search the docs, and answer framework questions accurately — without you having to paste anything into the chat.

### Setup

Add this to your project's `.claude/settings.json`:

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

That's it. Claude Code picks this up automatically on the next session. The MCP server runs locally via `npx` — no separate install, no running process to manage.

::: tip Already included
If you created your project with `npx create-orbital-app`, the `.claude/settings.json` is already wired up for you.
:::

### What the MCP server gives Claude

Once connected, Claude has access to 7 tools it can call silently while helping you:

| Tool | What it does |
|---|---|
| `get_framework_overview` | Full AGENTS.md — architecture, golden rules, command cheat sheet |
| `get_conventions` | The complete conventions rulebook — naming, structure, HTTP, DB, auth, tests |
| `list_skills` | All available skill playbooks with descriptions |
| `get_skill` | Full step-by-step playbook for a specific skill |
| `list_docs` | All documentation pages with titles |
| `get_docs_page` | A specific documentation page by slug |
| `search_docs` | Full-text search across all docs, skills, and conventions |

You don't need to call these yourself. Claude uses them automatically when you ask it to build a feature, add an action, write a test, etc.

---

## Skills

Skills are step-by-step playbooks that tell Claude exactly how to do common tasks in this framework. They live in `.claude/skills/` and Claude Code auto-discovers them.

When you say something like "add a V1Create action to Order" or "write tests for this action", Claude reads the matching skill and follows the playbook instead of guessing.

### Available skills

| Skill | When Claude uses it |
|---|---|
| `create-feature` | Building a new feature end-to-end (new table + folder) |
| `add-action` | Adding an HTTP action to an existing feature |
| `add-query-action` | Adding a list/search/pagination endpoint |
| `add-task` | Adding a background job |
| `add-migration` | Creating or altering a database table |
| `add-auth-user-type` | Adding a new authenticated user type (Partner, Driver, etc.) |
| `add-error-code` | Adding a new client error code |
| `add-constant` | Adding a global constant or enum |
| `add-fixtures` | Adding test fixtures or seed data |
| `add-mailer` | Adding a transactional email |
| `add-cronjob` | Scheduling recurring work |
| `add-socket-event` | Adding a real-time Socket.IO event |
| `add-locale` | Adding a language or translation keys |
| `write-tests` | Writing or auditing integration tests |
| `review-conventions` | Self-auditing code against conventions before shipping |
| `sync-docs` | Keeping all documentation surfaces in sync |
| `sync-translations` | Updating zh-TW translations after English docs change |
| `release` | Cutting a new version — bump, changelog, tag |
| `setup-and-ops` | Setup, running servers, DB backup/restore, deploy |

### Running a skill manually

You can invoke any skill explicitly:

```
/create-feature
/add-action
/write-tests
/release
```

Or just describe what you want in plain English — Claude will trigger the right skill automatically.

---

## Why this works well

Orbital Express is intentionally designed to be AI-friendly:

**Plain JavaScript.** Claude knows JavaScript better than any other language. No TypeScript type hierarchies, no compilation step, no generated output to confuse the model. The code you wrote is the code Claude reads.

**Consistent conventions.** Every feature folder looks the same. Every action follows the same structure. Every model has the same patterns. When the codebase is consistent, AI assistance is accurate and fast — because the pattern from one feature predicts the pattern in every other feature.

**Explicit playbooks.** The skills aren't suggestions — they're the exact steps Claude follows. This means AI-generated code follows your conventions, not some generic pattern the model learned from random GitHub repos.

**One pattern per problem.** Orbital Express has one way to do routing, one way to do validation, one way to handle errors. When there's only one right answer, Claude gives you the right answer.

---

## Tips for working with Claude Code on Orbital Express

**Start with the overview.** At the beginning of a session, Claude will automatically call `get_framework_overview` to orient itself. You don't need to paste `AGENTS.md` into the chat.

**Name the skill explicitly if needed.** If Claude doesn't trigger the right skill automatically, just say it: "Use the create-feature skill to build an Order feature."

**Let Claude run the generator.** Skills include the `yarn gen` and `yarn del` commands. Don't create files by hand — tell Claude what you want and let it run the generator.

**Review before shipping.** After any non-trivial change, ask Claude to run `/review-conventions` — it self-audits the code against the conventions rulebook and flags anything that doesn't match.
