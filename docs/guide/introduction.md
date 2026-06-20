# What is Orbital Express?

Orbital Express is an opinionated Express.js + Sequelize framework for building production-grade backend APIs in Node.js. It takes the best structural ideas from Django and Ruby on Rails and applies them to the JavaScript ecosystem — giving you a consistent, scalable project architecture without having to design one from scratch.

The framework is built around a single core idea: **everything related to a feature lives in one folder**. No more jumping between `controllers/`, `models/`, `routes/`, and `tests/` directories every time you want to understand or change one thing. In Orbital Express, the `app/Order/` folder has the model, routes, controller, actions, tasks, tests, translations, and mailers — all in one place.

::: info What Orbital Express is not
Orbital Express is not a code generator or a scaffold tool in isolation. It is a full architectural pattern — conventions, file structure, generator tooling, background job system, socket layer, auth model, and testing approach — all working together. You follow the conventions; the framework handles the rest.
:::

---

## The Philosophy

### Feature-Folder Architecture

The fundamental organizing principle of Orbital Express is borrowed from Django: **group code by feature, not by type**.

A "feature" in Orbital Express maps directly to a database table. When you add an `Orders` table, you create an `app/Order/` folder. Everything you build around that table — the API actions, the model, the background tasks, the tests — lives inside that folder.

Compare this to the Rails-style approach most Node.js developers default to:

::: code-group

```
// Orbital Express — feature-based
app/
  Order/
    controller.js
    model.js
    routes.js
    actions/
      V1Create.js
      V1Cancel.js
    tests/
      integration/
        V1Create.test.js
        V1Cancel.test.js
```

```
// Rails-style — type-based
controllers/
  order.js
models/
  order.js
routes/
  order.js
tests/
  order.js
```

:::

The feature-based approach pays dividends as the codebase grows. When you have 100 features, the Rails-style layout means constantly navigating between four or more top-level directories to work on one thing. With feature folders, you open one directory and everything you need is there.

### Opinionated Conventions That Scale

Orbital Express makes decisions for you — deliberately. The naming conventions, file structure, HTTP methodology, auth model, and database patterns are all specified. This is not a limitation; it is the point.

When conventions are established and followed consistently, any engineer on the team can open any file in the codebase and know exactly what they are looking at and where to find what they need. Onboarding is faster. Code reviews are easier. Bugs are easier to locate.

The conventions cover:

- How every `.js` file is structured (section ordering, import ordering)
- How actions are named (`V1CreateByAdmin`, `V1CancelOnMobile`)
- How HTTP responses are shaped (flat, no `data` nesting)
- How database tables are designed (UUID PKs, soft deletes, FK ownership chains)
- How tests are written and what they assert

### Generator-First Development

You never hand-create feature files in Orbital Express. The generator scaffolds the correct structure:

```bash
yarn gen Order              # scaffold the Order feature folder
yarn gen Order -a V1Cancel  # add a new action to an existing feature
yarn gen Order -t V1ReportTask  # add a background task
yarn gen Order -m OrderMailer   # add a mailer
```

After scaffolding, remove the generator's placeholder files with `yarn del` (not `rm` — the `del` command also removes broken exports from the index files):

```bash
yarn del Order -a V1Example
```

This generator-first workflow ensures every new file starts in the right place with the right structure. It is not optional — hand-creating files leads to missing exports, wrong locations, and drift from the conventions.

### AI-Native

Orbital Express ships with a skills system (`.claude/skills/`) — step-by-step playbooks for every common task. These are read by AI coding assistants to execute tasks correctly: creating features, adding actions, writing tests, adding migrations, configuring auth, and more.

The skills are not marketing copy. They are the actual instructions the AI follows to produce correct Orbital Express code. This means AI assistance on an Orbital Express codebase produces consistent, convention-compliant output rather than creative improvisation.

---

## Who Is It For?

**Backend engineers building REST APIs with Node.js** who want a more structured foundation than plain Express but do not want the complexity overhead of a framework like NestJS.

**Teams that want consistency at scale.** When your codebase has 50+ features and 10+ engineers, consistency becomes load-bearing. Orbital Express enforces it structurally.

**Junior engineers learning production patterns.** The conventions are explicit and documented. A junior engineer following the framework learns patterns used in production — real auth, real background jobs, real test structure — not toy examples.

::: tip Who should NOT use it
If you are building a public REST API that external developers will consume and you need HATEOAS, OpenAPI-first design, or strict REST semantics, Orbital Express's opinionated POST/GET-only approach may not match your requirements. It is optimized for internal APIs where you own both the frontend and the backend.
:::

---

## Key Design Decisions

### POST and GET Only

Orbital Express uses only POST and GET. There is no PUT, PATCH, or DELETE.

The REST HTTP method convention was designed for document-centric systems. It breaks down when you have real business logic. What method is `V1ArchiveAndNotifyUser`? DELETE because archiving? PATCH because updating a status? POST because there are side effects?

```javascript
// REST approach — the method choice is ambiguous
DELETE /v1/users/123          // is this soft-delete? hard-delete? archive?
PATCH  /v1/users/123/archive  // mixing PATCH with a verb path?

// Orbital Express — the action name carries all the semantic meaning
POST /v1/users/archive        // V1Archive — unambiguous
POST /v1/users/closeaccount   // V1CloseAccount — clear, even with multiple side effects
```

The rule: use POST for almost everything. Use GET only when there is no request body and the arguments fit cleanly in the URL query string (list/search endpoints).

### `req.args` Everywhere

The `args.js` middleware normalizes request arguments onto `req.args`. For POST requests this is `req.body`. For GET requests this is `req.query`. You never touch `req.body` or `req.query` directly in an action.

```javascript
// Never do this
async function V1Update(req, res) {
  const { firstName } = req.body;   // wrong
  const { page } = req.query;       // wrong
}

// Always do this
async function V1Update(req, res) {
  const { firstName, page } = req.args;  // correct — works for POST and GET
}
```

This means you never need to think about whether the endpoint is POST or GET when you are writing action logic. `req.args` is always the right place to look.

### UUID Primary Keys and Soft Deletes

Every table uses UUID v4 primary keys (not auto-increment integers). Every table uses Sequelize's `paranoid: true` for soft deletes — records are never physically removed unless explicitly bypassed with `scope(null)`.

```javascript
// model.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // ...columns
  }, {
    paranoid: true  // adds deletedAt; destroyed records are filtered, not removed
  });
};
```

### Flat Response Shape

Every action response is flat. There is no `data` wrapper object.

```javascript
// Wrong — nested data wrapper
res.status(200).json({ status: 200, success: true, data: { user } });

// Correct — flat
res.status(200).json({ status: 200, success: true, user });
```

Status codes: `200` default, `201` on create, `202` when a background job is enqueued.

### Exact Dependency Pinning

Every dependency is pinned to an exact version. No `~` or `^` ranges.

```bash
yarn add lodash --exact       # installs 4.17.21, not ^4.x
yarn add jest --exact --dev
```

This guarantees every developer, every CI run, and every deploy installs an identical dependency tree. Range versions let the package manager silently install a different version on a fresh checkout — which is how "works on my machine" bugs happen.

### No Magic Strings

Any string literal used in more than one place lives in `helpers/constants.js` and is referenced by name.

```javascript
// Wrong
if (order.status === 'pending') { ... }
if (user.role === 'admin') { ... }

// Correct
const { ORDER_STATUS, USER_ROLE } = require('../../../helpers/constants');
if (order.status === ORDER_STATUS.PENDING) { ... }
if (user.role === USER_ROLE.ADMIN) { ... }
```

Migrations are the one exception — they are frozen snapshots and stay literal.

---

## The Stack

| Layer | Technology |
|---|---|
| HTTP server | Express.js v4.x |
| ORM | Sequelize (PostgreSQL) |
| Background jobs | Bull + Redis |
| Real-time | Socket.IO |
| Auth | Passport.js (JWT — access + refresh token model) |
| Testing | Jest + Supertest |
| Email | Nodemailer |
| Internationalization | Custom i18n (compiled via `yarn lang`) |
| Runtime | Node.js v22.x |

### The Three Processes

A full Orbital Express deployment runs three processes:

```bash
yarn s      # web server — handles API requests (index.js → server.js via throng)
yarn w      # worker — processes background jobs from Bull queues (worker.js)
yarn cron   # clock — enqueues scheduled tasks on a cron schedule (cronjobs.js)
```

In development you run all three locally. In production they are separate dynos (or equivalent).

The web server uses `throng` to spin up one worker per CPU core. The cron process runs as a single instance.

### Redis — Project-Local in Development

Orbital Express does not use a system-wide Redis installation. Each project builds and runs its own Redis binary from the repo root (`redis/` directory, gitignored). This pins every project to its own Redis version.

```bash
# Start project-local Redis
yarn redis

# Stop it
yarn redis:stop
```

In production, a managed Redis service is used (Heroku Redis, Redis Cloud, etc.). The repo-local Redis is for local development only.

::: warning Redis is required for more than just jobs
Redis backs Bull (background jobs), Socket.IO (pub/sub across dynos), and rate limiting in production. The test suite also requires Redis to be running. Start it before running `yarn test`.
:::

---

## Comparison with Other Frameworks

| | Orbital Express | NestJS | AdonisJS | Plain Express |
|---|---|---|---|---|
| **Architecture** | Feature-folder (Django-style) | Module-based (Angular-style) | MVC (Rails-style) | Unopinionated |
| **Language** | JavaScript (CommonJS) | TypeScript (required) | TypeScript or JS | Either |
| **HTTP methods** | POST + GET only | All methods (REST) | All methods (REST) | All methods |
| **ORM** | Sequelize | TypeORM / Prisma / MikroORM | Lucid (custom) | Your choice |
| **Background jobs** | Bull (built-in) | Plugin (Bull via module) | Adonis Jobs | Your choice |
| **Auth** | Built-in (access + refresh JWT) | Guards + Passport (configure yourself) | Built-in (multiple drivers) | Your choice |
| **Generator tooling** | `yarn gen` / `yarn del` | `nest generate` | `node ace make:*` | None |
| **AI skills system** | Yes (.claude/skills/) | No | No | No |
| **Opinionation level** | High | Medium-high | High | None |
| **Learning curve** | Low (JS, explicit conventions) | High (TS decorators, DI) | Medium | None (no guardrails) |

**NestJS** is the right choice if you want TypeScript, Angular-style dependency injection, and a large ecosystem of official modules. It is heavier and more complex. Orbital Express is simpler and more explicit.

**AdonisJS** is the closest Rails analog in the Node.js world — it even has a strong CLI and an ORM designed for it. Orbital Express differs primarily in its feature-folder structure vs. AdonisJS's type-based folder layout, and in its POST/GET-only HTTP philosophy.

**Plain Express** gives you nothing — no structure, no conventions, no auth model, no job system. Every team that starts with plain Express eventually builds their own conventions. Orbital Express is those conventions, already made and documented.

---

## The File Structure in One View

```
repo root
├── app/                  # every feature — one folder per table
│   └── Order/
│       ├── controller.js
│       ├── model.js
│       ├── routes.js
│       ├── actions/
│       ├── tasks/
│       ├── tests/
│       ├── languages/
│       └── mailers/
│
├── index.js              # web entry point (throng cluster)
├── server.js             # Express app: middleware, routes, socket, error handler
├── worker.js             # background job worker entry point
├── cronjobs.js           # cron clock entry point
├── routes.js             # global route aggregator
├── models.js             # global model aggregator
│
├── middleware/           # id, args, auth, error, exit
├── services/             # queue, redis, socket, email, passport, ...
├── helpers/              # constants, cruqd, logic, validate, ...
│
├── database/
│   ├── schema.sql        # human-readable documentation of every table
│   ├── sequence.js       # table-creation order (auto-maintained by generator)
│   ├── seed/             # dev seed data
│   └── backups/          # DB dumps
├── migrations/           # ordered schema changes
│
├── languages/            # global i18n source strings
├── locales/              # compiled i18n output (never edit by hand)
├── mailers/              # global email templates
│
├── config/               # per-environment .env files + config glue
├── docs/                 # all deep documentation
├── test/                 # global test entry: fixtures, helper/service tests
└── .claude/skills/       # AI playbooks for every common task
```

::: tip Start here
The [Getting Started](/guide/getting-started) guide walks through everything you need to get the server running locally, including Postgres, Redis, and environment variables. Do that first, then come back to the guide.
:::

---

## Next Steps

- [Project Structure](/guide/project-structure) — every folder explained in depth
- [Your First Feature](/tutorials/first-feature) — scaffold, implement, and test an end-to-end feature
- [Actions](/core/actions) — how to write API actions correctly
- [Background Tasks](/background-jobs/overview) — Bull queues, workers, and the task pattern
- [Authentication](/auth/overview) — the two-token model and how auth middleware works
- [Testing](/testing/overview) — integration tests, fixtures, and what to assert
