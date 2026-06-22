# AGENTS.md — Agent guide for Orbital-Express

Canonical, tool-agnostic instructions for any AI agent working in this repo (Claude Code reads it via `CLAUDE.md`; Cursor/Codex/Copilot read `AGENTS.md` directly). Keep this file concise — it points to the deep docs rather than duplicating them.

## What this is

**Orbital-Express** is an opinionated Express.js + Sequelize (PostgreSQL) framework for building really good backend APIs. **Feature-folder architecture** (Django + Rails hybrid): everything for a feature — model, routes, controller, actions, tasks, tests, i18n, mailers — lives in one folder under `app/`. A background-job system (Bull/Redis) and Socket.IO layer sit alongside.

## Where the knowledge lives (read these for depth)

- **`README.md`** — the full human onboarding doc. Deep explanations of every folder, pattern, and flow. Read the relevant section before non-trivial work.
- **`docs/conventions.txt`** — the terse, authoritative rulebook (naming, file structure, DB, auth, sockets, etc.). When a rule is ambiguous, this wins.
- **`database/schema.sql`** — documentation of every table (not executed). The column-order / naming template is at the top.
- **`docs/auth-migration.md`** — the access+refresh auth design and status.
- **`docs/google-oauth-setup.md`** — how to provision Google OAuth for "Sign in with Google".
- **`docs/workflow.md`** — the feature-development lifecycle (Path A new feature, Path B modify existing). The high-level map; the `create-feature`/`modify-feature` skills are the step-by-step.
- **`.claude/skills/`** — step-by-step playbooks for common tasks (see "Skills" below). Prefer running these.

> ⚠️ **Historical/outdated:** `docs/tests.txt` predates the current setup (it mentions mocha). Ignore it — `write-tests`, the README, and `conventions.txt` are authoritative.

## Golden rules (non-negotiable)

1. **Never hand-create feature files. Use the generator:** `yarn gen Feature`, `yarn gen Feature -a V1Action`, `yarn gen Feature -t V1Task`, `yarn gen Feature -m Mailer`. Then fill in the generated file. **Immediately after scaffolding, remove the generator's default placeholder files** with `yarn del` — never `rm`. `yarn del` automatically removes the entry from `actions/index.js` (or `tasks/index.js`); `rm` does not, leaving a broken export pointing at a deleted file: `yarn del <Feature> -a V1Example`, `yarn del <Feature> -t V1ExampleTask`, and delete `tests/helper.test.js` via the appropriate flag.
2. **Install exact versions only:** `yarn add <pkg> --exact` (and `--dev` for dev deps). Never `^`/`~`.
3. **JS file structure** (every `.js` file): header comment → `'use strict'` → env → built-ins → third-party → services → helpers → models → **queues** (`queue.get('XQueue')` instances, right after models; the queue *service* is required up in services) → module-level consts → `module.exports` (before the methods) → method definitions. Imports ordered by **increasing length**, plain requires before destructured. Close every function with `// END <name>`. (README: "JavaScript File Structure".)
4. **Naming:** actions `V{version}{Action}[By{Role}][On{Device}]`; tasks append `Task`; feature folders singular PascalCase; controllers plural, actions singular; constants `UPPER_CASE`; booleans start with `is/has/can/does`; FK columns `<entity>Id` → PascalCase plural table.
4b. **No magic strings.** Any string literal used — or likely to be used — in more than one place (statuses, types, roles, locales, enum-like values) lives once in `helpers/constants.js` and is referenced, e.g. `LOCALE.EN` not `'en'`. Use the `add-constant` skill. (Migrations stay literal — frozen snapshots.)
5. **HTTP:** POST and GET only. Use `req.args` (never `req.body`/`req.query`). Responses are **flat**: `{ status, success: true, ...payload }` — no `data` nesting. Status: `200` default, `201` on create, `202` on background-job handoff. Route URLs are **lowercase, no separators**, even multi-word (`V1LogoutAll` → `/v1/users/logoutall`, not `logout_all`/`-all`/camelCase).
6. **Errors:** HTTP actions return `errorResponse(req, ERROR_CODES.X, ...)`; tasks & socket-invoked actions `throw`. Never return a 500 manually — let it propagate to `middleware/error.js`.
7. **Models:** UUID v7 PKs (`defaultValue: () => uuidv7()` — require `{ v7: uuidv7 }` from `'uuid'`; `validate: { isUUID: 7 }`); `paranoid: true` soft-deletes (use `scope(null)` to bypass); always index FKs; carry the **owner FK onto every descendant** + protect with a composite FK; named indexes `{Table}_{col}_{idx|unique}` in BOTH model and migration.
8. **i18n:** keys are `NAMESPACE[snake_case]`; edit feature `languages/*.js`, then run **`yarn lang`** (it compiles `locales/` and validates keys — required, and `yarn test` runs it first).
9. **Tests:** every action and task has a test; every `ERROR_CODE` in the JSDoc has a test; test who **cannot** do something; fixtures are **baselines** you mutate in-test; run with **`--runInBand`** (the `yarn test` script already does). Postgres **and** Redis must be running. **Test file location mirrors source location** — never drop a test in `test/` root: feature action tests → `app/<Feature>/tests/integration/`, task tests → `app/<Feature>/tests/tasks/`, global helper tests → `test/helpers/<name>.test.js`, global service tests → `test/services/<name>.test.js`.
10. **One user type = one table** (Admin, User, …) — never a single table with a role column. Auth is access token + revocable refresh token; see the `add-auth-user-type` skill.
11. **Docs travel together.** The same conventions are documented in `documentation.html`, `README.md`, `docs/conventions.txt`, `AGENTS.md`, `CLAUDE.md`, `database/schema.sql`, and the `.claude/skills/`. Editing one is **not done** until you've reconciled the others that cover the same thing — including the relevant skill(s). Follow the `sync-docs` skill. (A PostToolUse hook reminds you on every doc edit.)

## Command cheat sheet

```
yarn gen <Feature>[-a V1X | -t V1XTask | -m Mailer]   # scaffold (always use this)
yarn del <Feature>[-a|-t|-m ...]                       # remove scaffold
yarn lang                                              # compile + validate i18n (after editing languages/)
sequelize migration:create --name <conv-name>         # new migration file (see add-migration skill)
yarn test                                             # full suite (lang + sql fix1 + jest --runInBand); needs Postgres + Redis
yarn s    yarn w    yarn cron                          # run web server / worker / cronjobs
```

## Skills (playbooks — prefer these for the matching task)

These are step-by-step playbooks. **Claude Code auto-discovers and invokes them** from `.claude/skills/` by their description (you don't need to reference them). **Other tools (Cursor/Codex/etc.) have no skill engine — open the file at the path below and follow it.**

| Use when | Playbook file |
|---|---|
| Building a new feature end-to-end (new table + folder) | `.claude/skills/create-feature/SKILL.md` |
| Modifying an existing feature (add columns/methods, no new folder) | `.claude/skills/modify-feature/SKILL.md` |
| Adding an action to an existing feature | `.claude/skills/add-action/SKILL.md` |
| Adding a list/search endpoint (pagination/filter/sort) | `.claude/skills/add-query-action/SKILL.md` |
| Adding a background task | `.claude/skills/add-task/SKILL.md` |
| Creating or altering a table | `.claude/skills/add-migration/SKILL.md` |
| Adding a new authenticated user type | `.claude/skills/add-auth-user-type/SKILL.md` |
| Adding a client error code (4xx) | `.claude/skills/add-error-code/SKILL.md` |
| Adding a global constant / enum | `.claude/skills/add-constant/SKILL.md` |
| Adding test fixtures / dev seed data | `.claude/skills/add-fixtures/SKILL.md` |
| Adding a transactional email | `.claude/skills/add-mailer/SKILL.md` |
| Scheduling recurring work | `.claude/skills/add-cronjob/SKILL.md` |
| Adding a real-time Socket.IO event | `.claude/skills/add-socket-event/SKILL.md` |
| Adding a language/locale or translation keys | `.claude/skills/add-locale/SKILL.md` |
| Writing/auditing integration or task tests | `.claude/skills/write-tests/SKILL.md` |
| Self-auditing changes against conventions before "done" | `.claude/skills/review-conventions/SKILL.md` |
| Keeping all docs in sync after editing any one of them | `.claude/skills/sync-docs/SKILL.md` |
| Setup, running servers, DB backup/restore/migrate, deploy | `.claude/skills/setup-and-ops/SKILL.md` |

When a task matches one, follow that playbook's steps. They reference the rules above and the README for rationale. **After any non-trivial change, run the `review-conventions` self-audit before declaring it done.**
