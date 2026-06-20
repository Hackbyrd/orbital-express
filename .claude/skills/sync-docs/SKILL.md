---
name: sync-docs
description: Keep all documentation in sync. Use whenever you edit ANY documentation surface — documentation.html, README.md, docs/conventions.txt, AGENTS.md, CLAUDE.md, or any .claude/skills/*/SKILL.md — to propagate the same change to the other surfaces that need it. A change to one doc is never done until the others are reconciled.
---

# Keep the documentation in sync

This project documents the same conventions in several places, for different audiences. **They must agree.** Whenever you change one, you are responsible for propagating the change to every other surface that covers the same thing — in the *same* unit of work, not "later." A convention that says one thing in the README and another in a skill is worse than no docs.

## The documentation surfaces (the canonical set)

| Surface | Audience / purpose |
|---|---|
| `documentation.html` | The big Stripe-style single-page onboarding site for humans. Deep, narrative, examples. |
| `README.md` | The full human onboarding doc in the repo. Deep explanations, kept in sync with `documentation.html`. |
| `docs/conventions.txt` | The terse, **authoritative** rulebook. When rules conflict, this wins — so it must always reflect the decision. |
| `AGENTS.md` | Canonical, tool-agnostic agent guide (Cursor/Codex/Copilot read this directly). Golden rules + skill index. |
| `CLAUDE.md` | Claude Code entry point — imports `AGENTS.md`; Claude-specific notes only. |
| `.claude/skills/*/SKILL.md` | Step-by-step playbooks an agent executes. The *operational* form of the conventions. |
| `database/schema.sql` | Documentation of every table (column-order / naming template at top). |
| `docs/*.md`, `docs/*.txt` | Topic docs (auth-migration, workflow, etc.). |

## The rule

> **Editing one documentation surface is not complete until you have checked every other surface for the same content and updated the ones that need it.**

This applies in both directions: change the README → check the HTML, conventions, AGENTS, and the relevant skill(s). Change a skill → check whether the rule it encodes also lives in the README/HTML/conventions/AGENTS. Etc.

## Procedure (run this every time)

1. **Name the change.** State in one sentence what convention/fact/example changed (e.g. "shared logic goes in a private `V1Create` in the action file, not `helper.js`").
2. **Find every place it lives.** Grep the canonical set for the topic — file names, function names, keywords, the old wording:
   ```
   grep -rniE "<keyword1|keyword2|old phrasing>" \
     documentation.html README.md docs/ AGENTS.md CLAUDE.md database/schema.sql .claude/skills/
   ```
3. **Decide per surface** whether it needs the change. Match the depth to the audience: HTML/README get the full explanation + example; `conventions.txt` gets the terse rule; AGENTS.md gets a golden-rule line only if it's that important; the relevant **skill** gets the operational step/Note. Not every change touches every surface — but you must *consider* each.
4. **Apply the edits** to all surfaces that need it, keeping wording/examples consistent (don't let two surfaces describe the same thing differently).
5. **Update the skills too.** This is the step most easily forgotten. If the change alters how a task is done, the matching `SKILL.md` (and its `description` if scope changed) must reflect it. Ask: "which skill would an agent run for this task, and does it still give correct instructions?"
6. **Report what you synced.** End your turn by listing which surfaces you updated and which you checked-but-left-unchanged (so the reconciliation is auditable).

## Mapping cheat-sheet (where the same topic tends to live)

- **An action/endpoint convention** (POST/GET, response shape, role/device split, shared private function, helper.js usage) → `documentation.html` §5–§6, `README.md` (Actions sections), `docs/conventions.txt`, `.claude/skills/add-action` (+ `add-query-action`).
- **A DB/model/migration rule** (UUID PK, paranoid, named indexes, flattened ownership, composite FK) → `documentation.html` §7, `README.md` (Database sections), `docs/conventions.txt`, `database/schema.sql`, `.claude/skills/add-migration`, `create-feature`, `modify-feature`.
- **Error/i18n rules** → HTML §8, README, conventions, `.claude/skills/add-error-code`, `add-locale`.
- **Background jobs / sockets** → HTML §9/§10, README, conventions, `.claude/skills/add-task`, `add-cronjob`, `add-socket-event`.
- **Auth** → HTML §11, README, `docs/auth-migration.md`, conventions, `.claude/skills/add-auth-user-type`.
- **Setup / ops / env files / commands** → HTML §3/§17, README, `.claude/skills/setup-and-ops`.
- **A golden rule** worth surfacing to every agent → add/adjust the numbered list in `AGENTS.md` (and, if it's a hard rule, `docs/conventions.txt`).

## Done means

All surfaces that cover the changed topic now say the same thing, the relevant skill(s) give correct steps, and you've stated what you synced. If you genuinely only touched a surface that nothing else duplicates (e.g. a one-off appendix note), say so explicitly — that's the only case where "just one file" is complete.
