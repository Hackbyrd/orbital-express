---
name: setup-and-ops
description: Environment setup, running the servers, database backup/restore/migrate, i18n/email compilation, and Heroku deployment for this codebase. Use when the user asks to "set up / run the project", run migrations, back up/restore the DB, deploy, or asks what a yarn command does.
---

# Setup & operations

Operational reference for running and deploying the app. (For building features, use the build skills.) Read README "Before You Begin", "The Entry Points", "Config Folder", "Database Folder", "Deploying to Heroku". Full command cheat sheet, health probes, ngrok details, and troubleshooting table: `docs/reference/operations.md`.

## Prerequisites
- Node **v22.x**, Yarn. PostgreSQL running locally. Redis is **project-local** (see below). Both Postgres + Redis are required for the app and the test suite.

### Redis (project-local, not system-wide)
We don't `brew install` Redis — each project builds and runs its own copy inside the repo so the version is pinned per-project. The `redis/` folder is **gitignored**, so every developer installs it once:
1. Download a release from `http://download.redis.io/releases/`.
2. `cd redis-x.x.x && make && make test`.
3. Rename the folder to `redis/` (repo root).
4. Create `redis/vX.X.X.txt` noting the version (local/gitignored — tells the team which version this project expects).
5. Run **`yarn redis`** (stop: `yarn redis:stop`). Full steps: `docs/redis.txt`.

> **Local dev only.** The project-local Redis is just for your machine. Production uses a **managed Redis** add-on (Heroku Redis / Redis Cloud) reached via the `REDIS_URL` config var — never built/run from the repo on a deploy.

## First-time setup
1. `yarn install` — installs deps and runs `postinstall` → `yarn lang` (compiles `locales/`). **Pin exact versions** when adding deps: `yarn add <pkg> --exact`.
2. Create env files in `config/` from the template: copy `.env.template` → `.env.development`, `.env.test` (and `.env.production`/`.env.staging` only if connecting to prod locally). These are gitignored. Every new env var → also add it to `.env.template` (committed).
   - Required for auth: `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` (distinct), `ACCESS_TOKEN_EXPIRES_IN=15m`, `REFRESH_TOKEN_EXPIRES_IN=60d` — in **every** env file incl. `.env.test`.
3. Create the dev DB, run migrations: `yarn migrate`. Optionally `yarn seed` for dev seed data.

## Running the three processes (each is a separate server)
- `yarn s` — web/API server (dev, nodemon, `.env.development`). `yarn server` / `yarn start` — web via the Procfile.
- `yarn w` / `yarn worker` — background worker (processes Bull queue jobs).
- `yarn cron` — clock process (cronjobs). Only ONE clock dyno in production.

## Database
- `yarn migrate` (alias `yarn mg`) / `yarn migrate:prod` — run pending migrations (dev/prod). `yarn rollback` (alias `yarn rb`) / `yarn rollback:prod` — undo the last migration.
- `yarn model` — generate a CREATE-table migration skeleton; `yarn migration` — generate an ALTER-table skeleton (then rename to the convention — see `add-migration`).
- `yarn backup` — dump the dev DB to `database/backups/`. `yarn restore` — drop + recreate from the backup (destructive).
- `yarn seed` — load `database/seed/` (local **dev** sample data; the dev cousin of test fixtures) into the dev DB.

## i18n / email / fixtures
- `yarn lang` — compile `languages/*.js` → `locales/*.json` and validate keys (run after editing translations; `yarn test` runs it first).
- `yarn gulp` — watch mailers/languages and regenerate `preview.html` / locales.
- `yarn sql fix1` — runs the converter `test/fixtures/sql.js` to compile the JS fixtures in `test/fixtures/fix1/*.js` into a flat `fix1.sql`. **Why:** `populate()` runs every test's `beforeEach`, so tests insert the pre-built SQL **directly** (no ORM) — 10–100× faster than loading JS per test. `yarn test` runs `yarn sql fix1` for you; run it by hand only to refresh after editing a fixture. Never edit the generated `.sql`.

## Tests
- `yarn test` (= `yarn lang && yarn sql fix1 && jest --runInBand`). Needs Postgres + Redis up. Run a subset with `npx jest <path> --runInBand`.

## Quality
- `yarn format` / `yarn lint` — run the formatter.

## Deploy (Heroku)
1. Create the Heroku app; add Heroku Postgres + Heroku Redis add-ons.
2. Sync config vars: `node ./config/heroku-sync .env.production <app-name> true` (or set them manually).
3. Connect the GitHub `main` branch and deploy. The `Procfile` defines the web, worker, and clock processes plus a **`release` phase that runs on every deploy: `yarn migrate:prod`** — it applies pending migrations. A failure in the release phase blocks the new release from going live.
4. (Optional) custom domain + SSL.

## Misc
- `yarn ngrok` — expose the local server (e.g. for webhook testing); `yarn ngrok:auth <token>` to configure.
