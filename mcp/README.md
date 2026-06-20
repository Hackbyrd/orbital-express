# orbital-express-mcp

MCP server for [Orbital Express](https://github.com/orbital-express/orbital-express) — gives AI assistants full framework knowledge: conventions, skills, and documentation.

## What it does

When connected, your AI assistant (Claude, etc.) can:

- **Follow the exact Orbital Express conventions** — naming, file structure, HTTP rules, DB patterns
- **Execute step-by-step skills** — create a feature, add an action, write a migration, add auth
- **Search the docs** — find answers about auth, background jobs, sockets, testing, etc.

## Setup

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

That's it. Claude now knows Orbital Express.

## Available tools

| Tool | Description |
|---|---|
| `get_framework_overview` | Best first call — architecture, golden rules, command cheat sheet |
| `list_skills` | List all 18 skills with descriptions |
| `get_skill` | Get the full step-by-step playbook for a skill |
| `get_conventions` | Full conventions rulebook — naming, HTTP, DB, testing rules |
| `list_docs` | List all documentation pages |
| `get_docs_page` | Get a specific doc page by slug |
| `search_docs` | Full-text search across all docs and skills |

## Example

Once connected, you can say to Claude:

> "Add a Booking feature with V1Create and V1Query actions"

Claude will call `get_skill("create-feature")` and `get_skill("add-action")` automatically and follow the exact Orbital Express playbook end-to-end.
