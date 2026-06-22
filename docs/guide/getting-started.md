# Getting Started

Orbital Express is an opinionated Express.js + Sequelize (PostgreSQL) framework for building really good backend APIs fast. It combines Django's **feature-based folder structure** with Rails' Model-View-Controller concept, and layers in a background-job system (Bull/Redis) and real-time Socket.IO alongside the web server.

This guide gets you from zero to a running local environment. If you have not read [What is Orbital Express?](../index.md) yet, do that first — it explains the mental model before you touch any code.

---

## Prerequisites

Before you install anything, make sure your machine has:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v22.x.x | Use [nvm](../nvm.txt) to pin the version per project |
| **PostgreSQL** | 14+ | Must be running before `yarn migrate` or `yarn test` |
| **Redis** | 7+ | See [Redis setup](#redis-project-local) below — do **not** install system-wide |
| **Yarn** | 1.x (classic) | `npm install -g yarn` |

::: tip Knowledge assumed
Orbital Express is not a "hello world" starter. This guide assumes you understand JavaScript (ES6+), Node.js, and the basic request/response lifecycle of an Express app. If any of those feel shaky, read up on them before continuing.
:::

---

## Installation

There are two ways to start a new project. **Option A is recommended.**

### Option A — `create-orbital-app` (Recommended)

The fastest way to start. The CLI scaffolds a complete, configured project in seconds — picks your database name, auth providers, email provider, and optional integrations, then wires them all up for you.

```bash
npx create-orbital-app my-api
```

That's it. Answer the prompts, then:

```bash
cd my-api
cp config/.env.template config/.env.development
# fill in your environment variables
createdb my_api_dev
createdb my_api_test
yarn migrate
yarn s
```

::: tip Source
`create-orbital-app` is a separate open-source package — view the source at [github.com/Hackbyrd/create-orbital-app](https://github.com/Hackbyrd/create-orbital-app).
:::

---

### Option B — Clone the repo manually

If you want to start from the raw framework repo and configure everything yourself:

```bash
git clone https://github.com/Hackbyrd/orbital-express.git my-api
cd my-api
yarn install
```

All dependencies are pinned to **exact versions** — no `^` or `~` ranges anywhere in `package.json`. Keep it that way.

::: warning Always pin exact versions
When you add any new dependency, always pass `--exact`:

```bash
yarn add <module> --exact          # regular dependency
yarn add <module> --exact --dev    # dev dependency
```

Range versions (`^1.2.3`, `~1.2.3`) let the package manager silently install a different version on a fresh checkout or CI run. Exact pins guarantee every developer, every CI run, and every deploy installs the identical dependency tree.
:::

---

## Redis — Project-Local Setup {#redis-project-local}

Orbital-Express does **not** use a system-wide Redis (`brew install redis` is not what we want here). Each project builds and runs its own copy of Redis inside the repo, pinned to the version the project expects.

The `redis/` folder is gitignored (it is a large binary), so every developer installs it once:

1. Download a release from <http://download.redis.io/releases/>.
2. Build it:
   ```bash
   cd redis-x.x.x
   make && make test
   ```
3. Rename the folder to `redis/` at the repo root.
4. Inside `redis/`, create a `vX.X.X.txt` file noting the version — so the team knows which version this project expects.
5. Start Redis with:
   ```bash
   yarn redis
   ```
   Stop it with `yarn redis:stop`.

Full details are in [docs/redis.txt](../redis.txt). Redis must be running for the worker process, Socket.IO, and the test suite.

::: tip Local dev only
The project-local Redis is purely for running the app on your machine. In production, connect to a **managed Redis** (Heroku Redis, Redis Cloud, etc.) via the `REDIS_URL` config var. You never build Redis from the repo in a deployed environment.
:::

---

## Configuration

All environment variables live in per-environment files under `config/`. The committed template is `config/.env.template` — it is the canonical reference for every variable the app accepts.

### Create your local env files

```bash
cp config/.env.template config/.env.development
cp config/.env.template config/.env.test
```

Fill in the values for each file. The `.env.development` and `.env.test` files are gitignored — they never appear in the repository.

::: warning Use a separate database for tests
`DATABASE_URL` in `.env.test` must point to a **different** Postgres database than development. The test suite drops and recreates tables on every run.
:::

### Required variables

The source of truth is always `config/.env.template`, but these are the minimum needed to boot:

| Variable | What it is |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` — selects which `.env.*` loads |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection (Bull queues + Socket.IO adapter) |
| `ACCESS_TOKEN_SECRET` | Signing secret for the short-lived access JWT |
| `REFRESH_TOKEN_SECRET` | Signing secret for refresh tokens — must differ from the access secret |
| `ACCESS_TOKEN_EXPIRES_IN` | Access-token lifetime, e.g. `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token lifetime, e.g. `60d` |

::: warning All auth vars in every env file
`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, and `REFRESH_TOKEN_EXPIRES_IN` must be present in **every** env file, including `.env.test`. If they are missing from `.env.test`, auth tests fail in confusing ways. Keep the two secrets distinct, and never commit real secrets — only `.env.template` is committed.
:::

Every time you add a new config variable to the app, update `.env.template` so the next developer who pulls your changes knows it exists.

### How the config loads

`config/config.js` is what the Sequelize CLI reads to run migrations — it is pointed at by `.sequelizerc` at the repo root. It loads the matching `.env.<env>` by `NODE_ENV` and exports one block per environment.

`database/index.js` is the Sequelize connection used by the running app server — it reads the same `DATABASE_URL`. Two separate entry points, same database.

---

## Running Locally

Orbital-Express has **three processes**. You need all three running during development:

```bash
yarn s      # web server (index.js → server.js, clustered via throng)
yarn w      # background worker (worker.js — processes Bull queue jobs)
yarn cron   # cron daemon (cronjobs.js — enqueues scheduled work)
```

### Why three processes?

| Process | What it does |
|---|---|
| **Web server** (`yarn s`) | Handles all incoming HTTP and WebSocket requests. |
| **Worker** (`yarn w`) | Runs background jobs — tasks that are too slow or heavy for the request/response cycle (report generation, third-party API calls, bulk operations). |
| **Cron** (`yarn cron`) | A clock process — triggers scheduled work (e.g. "send a daily email at noon"). Typically enqueues a worker task rather than doing the work itself. |

The cron process should run as **exactly one instance** in production. The web server and worker can scale horizontally.

::: tip Development shortcut
In local development you can open three terminal tabs, one per process. In production these are separate dynos/containers.
:::

For the full command reference, database backup/restore, Heroku deploy steps, health probes, and ngrok webhook testing, see the [Operations & Deploy reference](../reference/operations).

---

## Your First Migration

Once Postgres is running and your `config/.env.development` is configured:

```bash
yarn migrate
```

This applies all pending migrations in `migrations/` to your development database, in order. The Sequelize CLI reads `config/config.js`, which picks up `DATABASE_URL` from `.env.development`.

```bash
yarn migrate:prod    # run against production DATABASE_URL
yarn rollback        # roll back the last migration (development)
```

::: warning Never edit schema.sql to change the database
`database/schema.sql` is documentation — it is never executed. The real schema changes live in `migrations/`. Always create a migration file via:

```bash
sequelize migration:create --name descriptive-name
```

Then record the same change in `database/schema.sql` so every developer can read the full schema in one place.
:::

---

## Running Tests

```bash
yarn test
```

The test command runs three things in sequence: `yarn lang` (compiles and validates i18n), applies test fixtures, then runs the full Jest suite with `--runInBand`.

::: warning Postgres and Redis must be running
The integration tests hit a real Postgres database (pointed at by `DATABASE_URL` in `.env.test`) and a real Redis. Start both before running `yarn test`.
:::

Test files mirror source file locations exactly:

- Feature action tests → `app/<Feature>/tests/integration/`
- Feature task tests → `app/<Feature>/tests/tasks/`
- Global helper tests → `test/helpers/<name>.test.js`
- Global service tests → `test/services/<name>.test.js`

---

## Project Layout at a Glance

Almost everything you build day-to-day lives in `app/` — one folder per feature (one per database table). Everything else at the repo root is shared infrastructure.

```
repo root
├── app/                  # ALL features — one folder per feature (table)
├── index.js              # web entry point (clustered via throng)
├── server.js             # Express app: middleware, routes, socket, error handler
├── worker.js             # background worker — registers all queue task processors
├── cronjobs.js           # cron clock — schedules jobs
├── routes.js             # global route aggregator (mounts every feature's routes.js)
├── models.js             # global model aggregator (scans app/*/model.js)
├── middleware/           # global Express middleware (id, args, auth, error, exit)
├── services/             # third-party wrappers + shared infra (queue, redis, socket, email…)
├── helpers/              # small pure utility functions shared across features
├── database/             # schema.sql, sequence.js, seed/, backups/, index.js
├── migrations/           # ordered schema changes applied by yarn migrate
├── languages/            # global i18n source strings (compiled by yarn lang)
├── locales/              # compiled i18n output — never edit by hand
├── config/               # per-environment .env files + config glue
├── docs/                 # all deep documentation
└── test/                 # global test entry: fixtures, helper/service unit tests
```

The `app/` folder is where you spend most of your time. Each feature folder holds everything related to that feature:

```
app/
└── Order/
    ├── model.js
    ├── routes.js
    ├── controller.js
    ├── actions/
    │   ├── index.js
    │   ├── V1Create.js
    │   └── V1Get.js
    ├── tasks/
    ├── tests/
    ├── languages/
    └── mailers/
```

---

## Scaffolding Your First Feature

The generator is the **only** way to create new feature files. Never create them by hand.

```bash
yarn gen Order                    # scaffold the Order feature folder
yarn gen Order -a V1Create        # add an action to an existing feature
yarn gen Order -t V1ProcessTask   # add a background task
yarn gen Order -m OrderMailer     # add a mailer
```

After scaffolding, immediately remove the generator's default placeholder files:

```bash
yarn del Order -a V1Example       # removes the placeholder action + its export entry
```

::: warning Use yarn del, not rm
`yarn del` removes the file **and** cleans up its entry in `actions/index.js` (or `tasks/index.js`). Using `rm` directly leaves a broken export pointing at a deleted file.
:::

After generating, run `yarn lang` to compile i18n, then `yarn test` to confirm the scaffold passes the suite.

---

## Next Steps

- [Project Structure](./project-structure.md) — every folder explained in depth.
- [Feature-Based Development](/core/feature-folder) — how to build a feature end-to-end.
- [Authentication](/auth/overview) — the two-token model, session management, and adding new user types.
- [Background Jobs & Cron](/background-jobs/overview) — tasks, queues, and scheduled work.
- [Testing](/testing/overview) — fixtures, integration tests, and what to assert.
- [`docs/conventions.txt`](../conventions.txt) — the authoritative rulebook. When anything is ambiguous, this wins.
