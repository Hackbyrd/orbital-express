# Operations & Deploy

Everything you need to run the app locally, manage the database, test, deploy, and debug infrastructure.

---

## Command Cheat Sheet

| Command | What it does |
|---|---|
| `yarn s` | Start the web server (nodemon, port 8000, dev env) |
| `yarn w` | Start the background worker (nodemon, dev env) |
| `yarn cron` | Start the cron/clock daemon (nodemon, dev env) |
| `yarn lang` | Compile `languages/*.js` → `locales/*.json` and validate all i18n keys |
| `yarn gen <Feature>` | Scaffold a new feature folder |
| `yarn gen <Feature> -a V1Action` | Scaffold a new action inside a feature |
| `yarn gen <Feature> -t V1Task` | Scaffold a new background task inside a feature |
| `yarn gen <Feature> -m Mailer` | Scaffold a new mailer inside a feature |
| `yarn del <Feature> -a V1Action` | Remove a scaffolded action (also removes its export from `actions/index.js`) |
| `yarn del <Feature> -t V1Task` | Remove a scaffolded task |
| `yarn mg` / `yarn migrate` | Run pending migrations (development) |
| `yarn migrate:prod` | Run pending migrations (production) |
| `yarn rb` / `yarn rollback` | Roll back the last migration (development) |
| `yarn rollback:prod` | Roll back the last migration (production) |
| `yarn backup` | `pg_dump` the dev DB to `database/backups/backup.sql` |
| `yarn restore` | Drop, recreate, and restore the dev DB from `database/backups/backup.sql` |
| `yarn redis` | Start a local Redis server (project-local build) |
| `yarn redis:stop` | Stop the local Redis server |
| `yarn sql fix1` | Compile JS fixtures into `test/fixtures/fix1.sql` (run automatically by `yarn test`) |
| `yarn test` / `yarn t` | Full test suite: `yarn lang` → `yarn sql fix1` → jest `--runInBand` |
| `yarn ngrok` | Open a public tunnel to port 8000 (for inbound webhook testing) |
| `yarn ngrok:auth <token>` | One-time ngrok auth token setup |
| `yarn gulp` | Start the Gulp watcher (auto-recompile mailer previews and locales on file change) |
| `yarn format` / `yarn lint` | Run the code formatter |
| `yarn seed` | Load seed data into the development database |
| `yarn knowledge [product] [--prune]` | Upsert product knowledge from `knowledge/` into the DB (idempotent; `--prune` removes rows no longer in the manifest) |

---

## Running Locally

The app has three processes. Run each in a separate terminal:

```bash
yarn s     # web server — handles HTTP requests (port 8000)
yarn w     # worker — processes Bull background jobs from Redis queues
yarn cron  # clock — fires scheduled cronjobs and enqueues jobs on schedule
```

**Why three terminals?** Each process has a distinct responsibility. The web server never runs jobs directly — it enqueues them and returns immediately. The worker dequeues and processes them. The clock triggers scheduled work on time. If the worker is not running, enqueued jobs pile up in Redis and never execute. If the clock is not running, no scheduled work fires.

Both **Postgres and Redis must be running** before starting any of the three processes. The app will fail to boot without them.

```bash
yarn redis   # start local Redis if not already running
```

---

## Environment Setup

Copy the template and fill in the required values:

```bash
cp config/.env.template config/.env.development
cp config/.env.template config/.env.test
```

**Required variables:**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `ACCESS_TOKEN_SECRET` | JWT signing secret for access tokens |
| `REFRESH_TOKEN_SECRET` | JWT signing secret for refresh tokens |
| `PORT` | HTTP port (default: 8000) |
| `API_VERSION` | e.g. `v1` |

Use separate databases for development and test — the test suite calls `sync({ force: true })` which wipes and recreates the schema before every run.

---

## Database Management

### Migrations

```bash
yarn mg              # apply pending migrations (development)
yarn migrate:prod    # apply pending migrations (production)
yarn rb              # roll back the last migration (development)
yarn rollback:prod   # roll back the last migration (production)
```

Generate a new migration file:

```bash
# New table (model)
./node_modules/.bin/sequelize model:create --env development --name NewModel --attributes col:type

# New columns on an existing table
./node_modules/.bin/sequelize migration:create --env development --name add-cols-colName-to-TableName-tbl
```

Rename the generated file to the project convention immediately after generation — see [docs/conventions.txt](../conventions.txt) for the format.

### Backup & Restore

```bash
yarn backup    # pg_dump orbital_dev > database/backups/backup.sql
yarn restore   # drop + recreate orbital_dev, then restore from backup
```

Use `yarn backup` before any risky migration in development.

---

## Deploying to Heroku

### Procfile

```
release: yarn migrate:prod
web:     node --optimize_for_size --max_old_space_size=480 --gc_interval=100 index.js
worker:  node --optimize_for_size --max_old_space_size=480 --gc_interval=100 worker.js
clock:   node --optimize_for_size --max_old_space_size=480 --gc_interval=100 cronjobs.js
```

The `release` phase runs `yarn migrate:prod` on every deploy. If it fails, the new release does not go live. This guarantees migrations always run before new code takes traffic.

Run exactly **one clock dyno** in production. Running two would double-fire every scheduled job.

### First-time Setup

1. Create a Heroku app.
2. Add the Heroku PostgreSQL and Heroku Redis add-ons.
3. Set config variables — either manually in the Heroku dashboard or via `config/heroku-sync.js`.
4. Connect the repo's `main` branch to the Heroku app.
5. Click Deploy.
6. (Optional) Add a custom domain and SSL certificate.

### Environment Variables

Sync local env to Heroku:

```bash
node config/heroku-sync.js
```

This script reads your local config file and pushes the values to `heroku config:set`. Review it before running — it will overwrite any variable already set on the app.

### Shipping Knowledge Content to Production

The `Procfile` release phase also runs `yarn knowledge --prune production` on every deploy. This upserts the committed `knowledge/` folder into the production DB (idempotent) and prunes rows no longer in the manifests. To ship updated knowledge content:

1. Regenerate the `knowledge/` folder: `yarn export:content`
2. Commit the updated files.
3. Deploy — the release phase handles the rest.

---

## Health & Readiness Probes

Two infrastructure endpoints are defined in `routes.js`. They bypass the action/controller pattern intentionally — they are infra, not features. The global rate limiter has a `skip` for both so probes are never throttled.

| Endpoint | Type | What it checks | Used for |
|---|---|---|---|
| `GET /health` | Liveness | Process is up — **no dependency checks** | Platform restart decision |
| `GET /ready` | Readiness | `db.authenticate()` + Redis `ping` | Load balancer drain |

During graceful shutdown, `middleware/exit.js` intercepts both and returns `503` before they reach the route handler — no extra drain logic needed in the handlers themselves.

**Heroku note:** Heroku routes by port-binding and restarts on crash rather than using readiness probes, so on Heroku `/health` is primarily for uptime monitors and `/ready` for dashboards. Both are essential if you move to k8s or ECS.

---

## ngrok — Testing Inbound Webhooks Locally

Third-party providers (Stripe, Google, Twilio, etc.) cannot reach `localhost`. ngrok opens a public tunnel to your local server so their webhook calls reach your handler during development.

```bash
yarn ngrok:auth <token>   # one-time setup — paste the token from your ngrok account dashboard
yarn ngrok                # open a public tunnel to port 8000
```

Usage:

1. Start the server: `yarn s`
2. Start the tunnel: `yarn ngrok`
3. ngrok prints a public URL like `https://abc123.ngrok.io`.
4. Register `https://abc123.ngrok.io/v1/<feature>/<webhookaction>` in the third party's dashboard.
5. Trigger an event on their side — the call flows through the tunnel to your local handler.

**Free-tier caveat:** The public URL changes every time you restart ngrok. Re-register the new URL with the provider after each restart.

Full notes in [docs/ngrok.txt](../ngrok.txt).

---

## Troubleshooting — Common Gotchas

| Symptom | Cause & fix |
|---|---|
| Tests hang and never exit after passing | Connections were not closed. Every test file needs an `afterAll` that closes the queue, socket, DB, and app. |
| Test suite won't start — missing i18n key error | A `.__('KEY')` call references a key not defined in `languages/*.js`. Add the key and run `yarn lang`. `yarn test` runs `yarn lang` first and fails fast. |
| Env variables are `undefined` in tests | `process.env` was read before `dotenv` loaded. In test files, `require('dotenv').config(...)` must run before destructuring `process.env`. |
| A job is enqueued but nothing happens | The worker is not running. Start `yarn w`. Background jobs only execute while the worker process is up with Redis available. |
| A scheduled cronjob never fires | The clock process is not running. Start `yarn cron` (and `yarn w` to process what it enqueues). In production, ensure exactly one clock dyno. |
| A row you know exists comes back `null` | A default scope (usually soft-delete / `paranoid: true`) is hiding it. Use `Model.scope(null).findByPk(...)` to bypass. |
| Parallel test suites fail intermittently | Run with `--runInBand`. Test suites share one test DB and race on `sync({ force: true })` without it. `yarn test` already passes this flag. |
| `401` on a request you expected to be authed | The `Authorization` header prefix must match the user type: `jwt-user` for users, `jwt-admin` for admins. |
| Connection refused on boot | Postgres and/or Redis are not running. Both are required to start the app and run the test suite. |
| i18n / locale changes do not show up | You edited `locales/*.json` directly. Those are compiled output — never edit them. Edit `languages/*.js` and run `yarn lang`. |
| FK constraint error when loading fixtures | `database/sequence.js` is out of order. Tables must be listed in dependency order (parent before child) so the SQL fixture inserts rows in the right sequence. |
| `yarn del` was skipped and a broken export remains | Running `rm` instead of `yarn del` leaves a dead export in `actions/index.js` or `tasks/index.js`. Always use `yarn del` — it removes the file and cleans the export. |
