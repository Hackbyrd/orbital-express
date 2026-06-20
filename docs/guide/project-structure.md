# Project Structure

Orbital-Express uses a **feature-folder architecture** inspired by Django's app-based layout and Rails' MVC conventions. Almost everything you build lives in `app/` — one folder per database table. Everything else at the repo root is the **global layer**: shared infrastructure, cross-feature utilities, and the three process entry points.

## Full Tree

```
repo root
├── app/                        # ALL features — one singular-PascalCase folder per table
│   ├── User/
│   │   ├── actions/            # one file per action (V1Login.js, V1Register.js, …)
│   │   │   └── index.js        # barrel export for all actions in this feature
│   │   ├── tests/
│   │   │   ├── integration/    # action integration tests
│   │   │   └── tasks/          # task unit tests
│   │   ├── languages/          # feature-scoped i18n source strings
│   │   ├── mailers/            # feature-scoped email templates (optional)
│   │   ├── controller.js       # gates auth/type, dispatches to actions
│   │   ├── error.js            # feature-scoped ERROR_CODES
│   │   ├── helper.js           # feature-scoped utilities (promote to global when shared)
│   │   ├── model.js            # Sequelize model definition
│   │   ├── routes.js           # Express router for this feature
│   │   └── worker.js           # task definitions (background jobs) for this feature
│   ├── Admin/                  # same structure as User
│   └── feature.js              # generator template (do not edit)
│
├── index.js                    # web entry point — boots server.js via throng (clustered)
├── server.js                   # Express app: middleware stack, routes, socket, error handler
├── worker.js                   # worker entry point — registers all queue task processors
├── cronjobs.js                 # cron entry point — schedules jobs on the clock process
├── routes.js                   # GLOBAL route aggregator — mounts every feature's routes.js
├── models.js                   # GLOBAL model aggregator — scans app/*/model.js into one object
│
├── middleware/
│   ├── id.js                   # stamps every request with a unique requestId
│   ├── args.js                 # normalises req.body/req.query → req.args; parses filter operators
│   ├── auth.js                 # runs Passport JWT strategies; populates req.user / req.admin
│   ├── error.js                # catches thrown errors; formats and returns error responses
│   └── exit.js                 # graceful-shutdown middleware + gracefulExit() drain function
│
├── services/
│   ├── queue.js                # Bull queue manager (queue.get / queue.closeAll)
│   ├── redis.js                # Redis client singleton
│   ├── socket.js               # Socket.IO server + JWT verification
│   ├── email.js                # transactional email sending (nodemailer / SendGrid)
│   ├── language.js             # i18n lookup helper
│   ├── passport.js             # Passport JWT strategies (one per auth user type)
│   ├── postgres.js             # raw Postgres client (for queries outside Sequelize)
│   ├── secure.js               # AES-256-GCM encryption/decryption for sensitive fields
│   ├── error.js                # errorResponse(), ERROR_CODES, joiErrorsMessage
│   └── phone.js                # phone/SMS integration wrapper
│
├── helpers/
│   ├── constants.js            # global enums and status sets (UPPER_CASE, dual-export)
│   ├── cruqd.js                # Create/Read/Update/Query/Delete Sequelize helpers + filter parsing
│   ├── logic.js                # auth token helpers (createAccessToken, createRefreshToken, hashToken)
│   ├── schemas.js              # reusable Joi schema fragments
│   ├── session.js              # refresh-token session mechanics (issueSession, revokeSession)
│   ├── tests.js                # shared test utilities
│   └── validate.js             # Joi validation wrappers
│
├── database/
│   ├── schema.sql              # human-readable master schema (documentation only — never executed)
│   ├── sequence.js             # ordered array of all tables (generator-maintained — do not edit by hand)
│   ├── index.js                # Sequelize connection (used by the running app)
│   ├── seed/                   # dev seed data, loaded by `yarn seed`
│   │   └── set1/               # one folder per seed set; each subfolder is a table
│   └── backups/                # DB dumps from `yarn backup`; restored with `yarn restore`
│
├── migrations/                 # ordered Sequelize migration files (applied by `yarn migrate`)
├── models/                     # intentionally near-empty — models live in app/*/model.js
│
├── languages/                  # GLOBAL i18n source strings (en.js, …)
├── locales/                    # COMPILED i18n output from `yarn lang` — never edit by hand
├── mailers/                    # global email templates (feature mailers live in app/<F>/mailers/)
│
├── config/
│   ├── .env.template           # committed reference — copy and fill in for each environment
│   ├── .env.development        # gitignored
│   ├── .env.test               # gitignored
│   ├── .env.staging            # gitignored (optional, for connecting to staging locally)
│   ├── .env.production         # gitignored (optional, for connecting to prod locally)
│   ├── config.js               # Sequelize-CLI DB config (reads .env.* by NODE_ENV)
│   └── heroku-sync.js          # syncs a local .env file to a Heroku app
│
├── knowledge/                  # product knowledge base — .txt files + knowledge.js upsert script
├── docs/                       # all deep documentation (conventions.txt, workflow.md, …)
├── scripts/                    # standalone one-off scripts (run by hand, not in request flow)
├── redis/                      # project-local Redis build (gitignored — local dev only)
│
├── test/                       # global test harness
│   ├── app/                    # stitches together each feature's test files
│   ├── fixtures/               # test-DB baseline data (fix1/…) — the test analog of database/seed
│   ├── helpers/                # unit tests for global helpers (test/helpers/<name>.test.js)
│   └── services/               # unit tests for global services (test/services/<name>.test.js)
│
├── public/                     # static assets
├── views/                      # server-rendered views (e.g. email preview pages)
├── AGENTS.md                   # canonical agent guide (tool-agnostic)
└── CLAUDE.md                   # Claude Code specifics (imports AGENTS.md)
```

---

## The Three Entry Points

Orbital-Express runs as **three separate processes**. Each has its own entry point and is started independently. You need all three running in development.

### `index.js` — Web Server

```bash
yarn s        # shorthand
yarn server   # full form
```

The web entry point. It uses [throng](https://github.com/hunterloftis/throng) to fork one worker per CPU core, then boots `server.js` in each. Signal handlers are registered in each worker for graceful shutdown (`SIGTERM` / `SIGINT`).

**`server.js`** is where the actual Express app is assembled:

1. Third-party middleware (helmet, cors, body-parser, rate limiter, …)
2. Custom global middleware in order: `id` → `args` → `auth`
3. The global route aggregator (`routes.js`)
4. The error handler (`middleware/error.js`) — must be last

Every incoming HTTP request flows through this chain. The final handler in the chain is the action function inside a feature folder.

### `worker.js` — Background Job Worker

```bash
yarn w        # shorthand
yarn worker   # full form
```

The Bull worker process. It imports every feature's `worker.js` file (which registers task processor functions against named queues). When a background job is enqueued by an action, this process picks it up, runs it, and handles retries and failures.

Use background tasks when work is too slow or too risky for a synchronous API response: report generation, sending bulk emails, calling slow third-party APIs, post-processing uploads. The action enqueues the job and returns `202 Accepted` immediately; the worker does the actual work.

### `cronjobs.js` — Cron Clock

```bash
yarn cron
```

The clock process. It defines which tasks get enqueued on which schedule using cron expressions. **Exactly one instance** of this process should run in production — it is not clustered.

The common pattern: the cron job enqueues a background task (in `worker.js`) rather than doing the work itself. This separates scheduling from execution, keeps the clock process lightweight, and lets the work be retried independently.

```
Every day at 12:00 noon
       │
  cronjobs.js  ──enqueues──▶  Worker queue  ──runs──▶  background task
  (clock proc)                                          (does the real work)
```

---

## `routes.js` and `models.js` — Global Aggregators

### `routes.js` (root)

Every feature's `routes.js` defines its own Express `Router`. The root `routes.js` mounts them all onto the Express app. When you create a new feature, you register its router here once.

```javascript
// routes.js — register each feature's router
const userRoutes = require('./app/User/routes');
const orderRoutes = require('./app/Order/routes');

module.exports = (app) => {
  app.use('/', userRoutes);
  app.use('/', orderRoutes);
};
```

### `models.js` (root)

Models live in `app/<Feature>/model.js`, not in `models/`. The root `models.js` scans all feature model files and assembles them into a single `models` object. The `models/` directory is intentionally nearly empty — it is not where models are defined.

```javascript
// anywhere in the codebase
const models = require('./models');

models.user.findOne({ where: { id } });
models.order.findAll({ where: { userId } });
```

The aggregator also sets up Sequelize associations (after all models are loaded) so cross-feature associations can reference any model without circular-require issues.

---

## `app/` — The Heart of the Codebase

Every database table maps to one **feature folder** under `app/`. The folder name is **singular PascalCase** (`User`, `Order`, `InvoiceItem`). This is where almost all day-to-day development happens.

### What is a Feature?

A feature is everything built around one database table. When you add a `Bookings` table, you are building the `Booking` feature: the model, the routes, the controller, the actions (create, read, update, delete, query), the tests, the i18n strings, and the background tasks.

**Feature-folder layout:**

```
app/User/
├── actions/
│   ├── V1Login.js
│   ├── V1Logout.js
│   ├── V1LogoutAll.js
│   ├── V1Refresh.js
│   ├── V1Register.js
│   ├── V1Update.js
│   └── index.js          # barrel export — generator maintains this
├── tests/
│   ├── integration/      # one test file per action
│   └── tasks/            # one test file per background task
├── languages/            # feature-scoped i18n source strings
├── mailers/              # feature-scoped email templates
├── controller.js         # auth gating + action dispatch
├── error.js              # feature-scoped ERROR_CODES
├── helper.js             # utilities private to this feature
├── model.js              # Sequelize model + associations
├── routes.js             # Express Router (POST/GET only)
└── worker.js             # Bull task processor definitions
```

**The request flow inside a feature:**

```
routes.js  →  controller.js  →  actions/V1Action.js  →  (response or enqueue task)
                                         │
                                    model / helpers / services
```

`routes.js` maps URL paths to controller methods. The controller checks authentication and dispatches to the right action. The action validates `req.args` with Joi, runs business logic, calls the model, and returns a response.

**Always scaffold with the generator — never create feature files by hand:**

```bash
yarn gen User              # scaffold the full feature folder
yarn gen User -a V1Search  # add one action to an existing feature
yarn gen User -t V1SendEmailTask  # add a background task
yarn gen User -m Welcome   # add a mailer
yarn del User -a V1Example # remove a generated action (also removes it from index.js)
```

---

## `middleware/` — Global Request Pipeline

Every HTTP request passes through the global middleware stack in this order:

| File | What it does |
|---|---|
| `id.js` | Stamps `req.id` with a unique UUID. Returned in error responses as `requestId` for log correlation. |
| `args.js` | Normalises `req.body` (POST) or `req.query` (GET) into `req.args`. Also runs `parseUrlQueryFilter` to convert bracket-notation operators (`date[gte]=…`) into Sequelize operators. You never touch `req.body` or `req.query` directly in actions. |
| `auth.js` | Runs the Passport JWT strategy matching the `Authorization` header scheme (`jwt-user`, `jwt-admin`). On success, populates `req.user` or `req.admin` and sets the locale. On public routes, calls `next()` without error — the controller enforces auth. |
| `error.js` | The final Express error handler. Catches anything thrown from an action or passed to `next(err)`, formats it with `errorResponse`, and returns the appropriate HTTP status. Never return a 500 manually — let it propagate here. |
| `exit.js` | Dual-purpose: the `exit.middleware` short-circuits new requests with `503` once a shutdown signal is received; `gracefulExit(server)` drains queues, sockets, and the DB connection pool before the process exits. |

---

## `services/` — Third-Party Wrappers and Shared Infrastructure

Services are **stateful or substantial** shared infrastructure. If something wraps an external system, manages connections, or is too complex to be a plain function, it lives here.

| File | What it provides |
|---|---|
| `queue.js` | Bull queue manager. `queue.get('UserQueue')` returns a named queue instance. `queue.closeAll()` is called on graceful shutdown. |
| `redis.js` | Shared Redis client. Used internally by `queue.js` and `socket.js`; also used directly for caching or pub/sub. |
| `socket.js` | Socket.IO server. Verifies access tokens (including `tokenVersion`) on connection, the same way HTTP auth does. See [Real-Time / Socket.IO](/realtime/sockets) for the full architecture. |
| `email.js` | Transactional email dispatch. Accepts a rendered template and sends via the configured provider. |
| `language.js` | i18n lookup — reads from compiled `locales/` files. Used by actions and mailers via `lang.t(key, locale)`. |
| `passport.js` | One Passport JWT strategy per auth user type. Each strategy verifies signature, `exp`, `iss`, `aud`, and `tokenVersion`. The `AUTH_TYPES` registry in `middleware/auth.js` drives which strategy matches which `Authorization` scheme. |
| `postgres.js` | Raw `pg` client for queries that need to bypass Sequelize (migrations helpers, one-off admin queries). |
| `secure.js` | AES-256-GCM authenticated encryption for reversibly-stored sensitive fields. Uses a distinct secret from the auth tokens. |
| `error.js` | `errorResponse()`, the global `ERROR_CODES` map, and `joiErrorsMessage()` for Joi validation errors. |
| `phone.js` | SMS / phone number wrapper (Twilio or equivalent). |

**Rule of thumb:** if the module is a small, pure, stateless function it belongs in `helpers/`. If it wraps an external system, holds a connection, or has meaningful setup state, it belongs in `services/`.

---

## `helpers/` — Small Pure Utilities

Helpers are **small, pure, stateless functions** shared across features. No connections, no side effects.

| File | What it provides |
|---|---|
| `constants.js` | All global enums and status sets (e.g. `LOCALE`, `TOKEN_AUDIENCE`, `PLATFORMS`). Uses the dual-export pattern so constants are accessible both as named exports and as a single object. **No magic strings** — any literal used in more than one place lives here. |
| `cruqd.js` | Sequelize CRUD + Query helpers. `parseUrlQueryFilter` converts bracket-notation URL filters into Sequelize `Op` operators. |
| `logic.js` | Auth token utilities: `createAccessToken`, `createRefreshToken`, `hashToken`, `parseDurationMs`, `resolveClient`. |
| `schemas.js` | Reusable Joi schema fragments (e.g. pagination params, UUID validators) shared across feature actions. |
| `session.js` | Refresh-token session mechanics: `issueSession` (creates a session row), `revokeSession`, rotation logic. |
| `tests.js` | Shared test utilities (request builders, auth header helpers, assertion shortcuts). |
| `validate.js` | Joi validation wrappers used by actions before business logic runs. |

**Promotion rule:** if a helper starts in a feature's `helper.js` and you need it from a second feature, move it to `helpers/` and update both imports. Never duplicate shared logic across feature folders.

**Global helpers need tests.** Any time you add or modify a global helper, write or update its unit test in `test/helpers/<name>.test.js`. These are pure unit tests — no server, no DB.

---

## `database/` — Schema, Seed, and Backups

| Path | Purpose |
|---|---|
| `database/index.js` | Sequelize connection used by the running app. Separate from `config/config.js` which is only for the Sequelize CLI. |
| `database/schema.sql` | **Documentation only** — a human-readable record of every table and column. Never executed. Keep it updated whenever you change the DB; it is the fastest way for a new engineer to understand the full data model. |
| `database/sequence.js` | Ordered array of all table names. Controls the order seed data and fixtures are loaded (respects FK dependencies). **Maintained automatically by the generator** (`yarn gen` / `yarn del`) — do not edit by hand unless you have to manually override something. |
| `database/seed/` | Dev seed data, grouped into sets (`set1/`, `set2/`, …). Loaded with `yarn seed`. Keep the number of sets small — every new column means updating every set. |
| `database/backups/` | DB dumps created by `yarn backup`. Restored with `yarn restore` (drops and replaces the current DB). |

---

## `migrations/` — Schema Changes

Real, ordered Sequelize migration files. These are what actually alter the database in development and production. Create one with:

```bash
sequelize migration:create --name descriptive-name
```

Follow the `add-migration` skill for the full naming and content conventions. Migrations are frozen snapshots — never edit an already-applied migration; write a new one instead.

---

## `languages/` and `locales/` — Internationalisation

```
languages/       # source of truth — edit these
  en.js
  es.js
locales/         # compiled output — never edit by hand
  en.json
  es.json
```

Global i18n source strings live in `languages/`. Feature-specific strings live in `app/<Feature>/languages/`. After editing any source file, run:

```bash
yarn lang   # compiles languages/ → locales/ and validates all keys
```

`yarn test` runs `yarn lang` first — if keys are missing or invalid, the suite fails before any tests run.

For the full i18n reference — key naming, locale detection order, tasks vs actions, adding a new locale, key safety mechanisms — see **[docs/i18n/localization.md](../i18n/localization.md)**.

---

## `config/` — Environment Configuration

```
config/
├── .env.template     # committed — reference for all variables
├── .env.development  # gitignored
├── .env.test         # gitignored
├── .env.staging      # gitignored
├── .env.production   # gitignored
├── config.js         # Sequelize CLI config (reads .env.* by NODE_ENV)
└── heroku-sync.js    # syncs a .env file to a Heroku app
```

Copy `.env.template` to create each environment file. The minimum required variables:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` — selects which `.env.*` loads. |
| `DATABASE_URL` | Postgres connection string. Use a **separate DB** for `.env.test`. |
| `REDIS_URL` | Redis connection (Bull queues + Socket.IO adapter). |
| `ACCESS_TOKEN_SECRET` | JWT signing secret — must be **distinct** from the refresh secret. |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret — must differ from access secret. |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime, e.g. `15m`. |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime, e.g. `60d`. |

All four auth variables must appear in **every** env file including `.env.test`. Missing auth vars in the test env causes auth tests to fail in confusing ways.

`config/config.js` is read exclusively by the Sequelize CLI (via `.sequelizerc`). The running app connects through `database/index.js`. Both ultimately read the same `DATABASE_URL` — two doors into the same database.

---

## `test/` — Global Test Harness

```
test/
├── app/          # stitches together each feature's test files
├── fixtures/     # test-DB baseline data (fix1/, fix2/, …)
├── helpers/      # unit tests for global helpers
└── services/     # unit tests for global services
```

Feature test files live **inside the feature folder** (`app/<Feature>/tests/`), not at the root of `test/`. The `test/app/` directory stitches them together so Jest can discover them as a single suite.

`test/fixtures/` is the test analog of `database/seed/` — baseline data loaded into the test DB before the suite runs. Fixtures are the starting state; tests mutate in-place rather than creating everything from scratch.

Run the full suite:

```bash
yarn test   # runs: yarn lang → sql fix1 → jest --runInBand
```

PostgreSQL **and** Redis must be running. `--runInBand` is required because tests share a single test database and must not run in parallel.

---

## `scripts/` — One-Off Utilities

Standalone scripts you run by hand — not part of the request, worker, or cron flow. Examples: compile-lang utilities, password helpers, data-migration scripts, one-off admin tools. They read from the appropriate `.env.*` file and can connect to any environment's database directly.

---

## Why Feature-Folder Architecture?

Feature-based organisation keeps all code related to one concern in one place. Compare:

**Feature-based (Orbital-Express):**
```
app/
  Order/
    model.js        ← all in one place
    routes.js
    controller.js
    actions/
    tests/
  Invoice/
    model.js
    routes.js
    …
```

**Type-based (Rails-style):**
```
models/
  order.js
  invoice.js
routes/
  order.js
  invoice.js
controllers/
  order.js
  invoice.js
```

As the codebase grows to dozens or hundreds of features, the Rails-style layout forces constant back-and-forth across the tree. The feature-based layout means a developer working on `Order` stays in `app/Order/` almost entirely. Fewer merge conflicts, faster navigation, and a cleaner mental model of what each folder owns.
