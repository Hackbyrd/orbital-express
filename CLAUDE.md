# CLAUDE.md

This project's agent guide is **`AGENTS.md`** (tool-agnostic, canonical). Read it — it's imported below.

@AGENTS.md

## Claude Code specifics

- **Skills** live in `.claude/skills/`. They auto-invoke when a task matches their description, or run them explicitly (e.g. `/create-feature`). Prefer the skill for any task it covers.
- **Nested context:** `app/CLAUDE.md` (if present) loads automatically when you work inside `app/`. Keep deep, area-specific notes there rather than bloating this file.
- **Full rulebook:** `docs/conventions.txt` is the authoritative, detailed rules — read it on demand for anything ambiguous; `AGENTS.md` summarizes the non-negotiables.
- **Personal settings** go in `.claude/settings.local.json` (gitignored). Shared, committed settings go in `.claude/settings.json`.
- **Docs stay in sync (enforced):** a committed PostToolUse hook (`.claude/hooks/doc-sync-reminder.py`, wired in `.claude/settings.json`) fires whenever you edit any documentation surface (`documentation.html`, `README.md`, `docs/*`, `AGENTS.md`, `CLAUDE.md`, `database/schema.sql`, any `SKILL.md`) and reminds you to reconcile the others. Follow the **`sync-docs`** skill — a doc change isn't done until the parallel surfaces and the relevant skill(s) agree.
