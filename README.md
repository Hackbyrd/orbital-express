# Welcome to Orbital-Express

A better way to organize and develop on your express.js node application. Built for developers who need a more opinionated structure for their express.js applications and for helping engineering teams scale their developer experience — so you can build really good backend APIs fast.

> **Orbital-Express** is the framework/architecture documented here. You apply it to build your own product on top of Orbital-Express. Everything below describes the Orbital-Express way of building APIs.




## Important

### Orbital-Express assumes you already have the base foundation of JavaScript, node.js and express.js

- Use node.js v22.x.x
- Use express.js v4.x.x
- Knowledge of ES6 and Advanced JavaScript is highly **recommended**

[View Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet)

### Always Install the EXACT Version of Every Node Module

When you add a dependency, **always pin the exact version**. Never use a tilde (`~`) or caret (`^`) range. This applies to **both** regular dependencies and devDependencies — no exceptions.

```bash
yarn add <module> --exact         # regular dependency
yarn add <module> --exact --dev   # dev dependency
```

**Why:** Range versions (`~1.2.3`, `^1.2.3`) let the package manager silently install a *different* version on a fresh checkout or CI run — which is how you get "works on my machine" bugs and non-reproducible builds. An exact pin (`1.2.3`) guarantees every developer, every CI run, and every deploy installs the identical dependency tree. Open [package.json](package.json): every entry is an exact version with no `~` or `^`. Keep it that way.




---

## Before You Begin

Please go through ["docs/setup.txt"](docs/setup.txt) to set up your environment. Once set up, you'll be able to run the server and tests.

### Redis — run it project-local (not system-wide)

We **do not** install Redis globally (no `brew install redis`). Instead, each project builds and runs its **own** copy of Redis inside the repo. This keeps every project pinned to its own Redis version, so upgrading one project never breaks another. The `redis/` folder is **gitignored** (it's a large binary), so every developer installs it once locally:

1. Download a release from <http://download.redis.io/releases/>.
2. Build it: `cd redis-x.x.x && make && make test`.
3. Rename the folder to just `redis/` (at the repo root).
4. Inside `redis/`, create a `vX.X.X.txt` file noting the version you installed — so the team can see which version this project expects. (This file is local/gitignored too.)
5. Start it with **`yarn redis`** (stop with `yarn redis:stop`). That's it.

Full steps are in [docs/redis.txt](docs/redis.txt). Redis must be running for the worker, sockets, and the test suite. (Same idea as our exact-version node modules: pin infra per-project so it's reproducible and modular.)

> **Local development only.** This project-local Redis is purely for running the app on your machine. In production we use a **managed Redis** (e.g. Heroku Redis / Redis Cloud) provisioned as an add-on — you never build or run Redis from the repo in production; the deploy connects to the managed instance via the `REDIS_URL` config var.




---

## Getting Started

### Option A — `create-orbital-app` (Recommended)

The fastest way to start a new project. The CLI scaffolds a complete, configured project in seconds:

```bash
npx create-orbital-app my-api
```

Answer the prompts (database name, auth providers, integrations), then follow the printed next steps. Source: [github.com/Hackbyrd/create-orbital-app](https://github.com/Hackbyrd/create-orbital-app)

### Option B — Clone the repo manually

```bash
git clone https://github.com/Hackbyrd/orbital-express.git my-api
cd my-api
yarn install
```

Then follow the setup steps below.

---

This opinionated framework was built and modeled after two of the most famous web frameworks in the world, Python/Django and Ruby on Rails. The combined Django's feature-based development with Ruby on Rails Model-View-Controller concept. We believe together, they make a really solid structure. **This guide assumes you have some experience in building API/web applications and understand the basic flow of an API. Ideally, you should have some experience with other web frameworks.**




### Feature-Based Development / Structure (Django's Approach)

If you don't know what this means, let me explain. To put it simply, when we build out a new feature, we group everything (routes, controller, actions, models, tests etc..) that is related to that feature into one **"Feature Folder"**. In our case, all **"Feature Folders"** can be found under the **"app/"** directory (more on this later). By contrast, popular frameworks like Ruby on Rails separate their the code out by model, view, route, test and controller folders and within those folders contain the feature-related files. See below.

:white_check_mark: Here is an example of a Feature-Based structure:

```
- my-app
  - app
    - FeatureFolder1
      - controller.js
      - model.js
      - routes.js
      - test.js
    - FeatureFolder2
      - controller.js
      - model.js
      - routes.js
      - test.js
    - FeatureFolder3
      - controller.js
      - model.js
      - routes.js
      - test.js
```

:x: Here is an example of Ruby on Rails Structure:

```
- my-app
  - controllers
    - feature1.js
    - feature2.js
    - feature3.js
  - models
    - feature1.js
    - feature2.js
    - feature3.js
  - routes
    - feature1.js
    - feature2.js
    - feature3.js
  - tests
    - feature1.js
    - feature2.js
    - feature3.js
```

### Wait, What is a Feature Exactly?

You can think of a **Feature** as just a database table. For example, let's say you want to add a new table in the database called **"Orders"**. So naturally after we create that table, the next step is to create API methods around it such as, **Read**, **Create**, **Update**, **Delete**, and **Query** methods. As you can see, you are beginning to design the actions that are related to "Orders". During this implementation process, you will need to create API routes, models, controllers, and the action itself as well as tests surrounding those actions. Therefore, you could say you are working on the **"Orders"** feature. Everytime you create a new database table, you are essentially about to work on a new **"Feature Folder"**. We'll go more in detail of all the folders that are included in a Feature Folder later on in this guide.

### Why Feature-Based Is Better

The main reason why feature-based is better is because it allows developers to work and focus on one selected feature, without potentially overlapping with other developers working on other features. This way you will run into less merge conflicts and confusion. Additionally, as your codebase because very large and you start to have 100s of features, you will find the Ruby on Rails approach to be extremely difficult to navigate around in your code editor, because you'll be jumping back and forth and scrolling up and down between the folders, thereby wasting so much time and adding to your frustration. Having the all the code related to a single feature grouped together into one folder allows for a better developer experience as the project scales in terms of number of files and folders.



Now that we gotten that out of the way, let's continue learning more about how this framework operates.




---

## The Repo at a Glance (Project Structure)

Before we go folder-by-folder in depth, here is the whole layout in one place. The key mental model: **almost everything you build lives in `app/`** (one folder per feature). Everything else at the repo root is the **global layer** — shared infrastructure, cross-feature code, and the three process entry points.

```
repo root
├── app/                  # ★ ALL features live here — one folder per feature (table)
│
├── index.js              # web entry point → boots server.js (clustered via throng)
├── server.js             # builds the Express app: middleware, routes, socket, error handler
├── worker.js             # worker entry point — registers every queue's task processors
├── cronjobs.js           # cron entry point — schedules jobs on a clock
├── routes.js             # GLOBAL route aggregator — mounts every feature's routes.js
├── models.js             # GLOBAL model aggregator — scans app/*/model.js into one `models` object
│
├── middleware/           # global Express middleware (id, args, auth, error, exit) — every request
├── services/             # global SERVICES — third-party wrappers + big shared infra (see below)
├── helpers/              # global HELPERS — small pure functions shared across features (see below)
│
├── database/             # everything about the DB except the per-feature models
│   ├── schema.sql        #   human-readable documentation of every table (never executed)
│   ├── sequence.js       #   the ORDER tables are created in (FK deps) — generator updates it, never by hand
│   ├── seed/             #   dev seed data (set1/…) loaded by `yarn seed`
│   ├── backups/          #   DB dumps from `yarn backup`; `yarn restore` reads these
│   └── index.js          #   the Sequelize connection
├── migrations/           # the real, ordered schema changes applied by `yarn migrate`
├── models/               # (essentially empty — models live in app/*/model.js; models.js aggregates)
│
├── languages/            # GLOBAL i18n source strings (en.js, …) — compiled into locales/
├── locales/              # COMPILED i18n output (generated by `yarn lang` — never edit by hand)
├── mailers/              # GLOBAL email templates (feature-specific ones live in app/<F>/mailers/)
│
├── config/               # per-environment .env files (gitignored, local to each dev) + config glue
├── docs/                 # all the deep docs (conventions.txt, workflow.md, auth-migration.md, …)
├── scripts/              # standalone scripts you run by hand (compile-lang, password helpers, …)
├── redis/                # project-local Redis build (gitignored; local dev only)
│
├── test/                 # global test entry: stitches feature tests + fixtures + helper/service tests
│   ├── app/              #   stitches together each feature folder's tests
│   ├── fixtures/         #   test-DB baseline data (fix1/…) — the test analog of database/seed
│   ├── helpers/          #   unit tests for GLOBAL helpers
│   └── services/         #   unit tests for GLOBAL services
│
├── public/  views/       # static assets & server-rendered views (e.g. email preview)
└── AGENTS.md  CLAUDE.md   # agent guides
```

### The global layer, folder by folder

Each of these has its own in-depth section later; this is the orientation map.

- **`app/`** — **Every feature.** One singular-PascalCase folder per table (`app/Order/`), holding its model, routes, controller, actions, tasks, tests, i18n, mailers. This is where ~all your day-to-day work happens.
- **`routes.js` (root)** — the **global route aggregator**. Each feature has its own `routes.js`; this root file mounts them all. Register a new feature here once.
- **`models.js` (root)** — the **global model aggregator**. The `models/` folder is essentially empty on purpose: models live in `app/<F>/model.js`, and `models.js` scans them all into a single `models` object you `require` everywhere (`models.order`, `models.user`).
- **`cronjobs.js` (root)** — the cron **clock** process; defines what gets enqueued on what schedule. `yarn cron`; exactly one instance in production.
- **`middleware/`** — global Express middleware run on every request: `id`, `args`, `auth`, `error`, `exit`.
- **`services/`** — **services** are third-party wrappers and bigger-than-a-helper shared infrastructure: `queue.js` (Bull), `redis.js`, `socket.js`, `email.js`, `language.js`, `passport.js`, `postgres.js`, plus vendor wrappers (e.g. `google.js`, `outlook.js`). Reach for a service when something is stateful, wraps an external system, or is too substantial to be a plain helper.
- **`helpers/`** — **global helpers** are small, pure utility functions shared across multiple features (`constants.js`, `cruqd.js`, `logic.js`, `schemas.js`, `validate.js`). **The rule:** a helper used by only one feature goes in that feature's `helper.js`; the moment it's shared across features, promote it to the global `helpers/` folder. Don't leave shared logic duplicated in feature folders.
- **`database/`** — everything about the DB except the per-feature models: `schema.sql` (documentation of every table), `sequence.js` (table-creation order — the generator maintains this automatically; **never edit it by hand**), `seed/` (dev data via `yarn seed`), `backups/` (`yarn backup`/`restore`), and the connection (`index.js`).
- **`migrations/`** — the real, ordered schema changes applied to dev/prod by `yarn migrate`.
- **`languages/` → `locales/`** — `languages/` holds the global i18n *source* strings; `yarn lang` compiles them into `locales/*.json` (compiled output — never hand-edit). Feature strings live in `app/<F>/languages/`.
- **`mailers/`** — global email templates; feature-specific emails live in `app/<F>/mailers/`.
- **`config/`** — per-environment `.env.*` files (gitignored, local to each developer) plus the config glue that loads them.
- **`docs/`** — all the deep documentation (`conventions.txt` is the authoritative rulebook, plus `workflow.md`, `auth-migration.md`, …).
- **`scripts/`** — standalone scripts you run **by hand** (one-off or manual maintenance), not part of the request/worker/cron flow.
- **`redis/`** — the project-local Redis build (gitignored). Local dev only; production uses a managed Redis.
- **`test/`** — the global test entry point. `test/app/` stitches together each feature's tests; `test/fixtures/` holds test-DB baselines; `test/helpers/` and `test/services/` hold unit tests for the **global** helpers and services.

> **Global helpers and services need tests too.** It's easy to test features and forget the global layer. **Any time you add or change a global helper (`helpers/*.js`) or a global service (`services/*.js`), write/update its unit test** in `test/helpers/` or `test/services/`, named after the file it tests. These are pure unit tests (no server, no DB, no lifecycle hooks). Treat it as part of the build routine.

---

## The Entry Points (index.js, worker.js, cronjobs.js)

Every app needs an entry point. In our case, the file that kicks everything off and starts this web server is **"index.js"**. But wait there's more. This framework was also build to support a background worker server via **"worker.js"** and a cronjob process via **"cronjobs.js"**. Why? Because every app will eventually need background jobs and cronjobs (more details below). To get the app up and running, you will need to start all three servers. Run the following commands below:




Either of these commands run the index.js file. This file runs the actually web server to process any API requests coming in.

> yarn server
>
>
>

> yarn s




Either of these commands run the worker.js file. This file runs the background jobs. What's a background job? You can think of it as way to run code that may take longer to process compared to a normal API request or a task you just want to run in the background, outside of a normal API request. So for example, what if you need to generate a report and it could take up to 5 mins to generate because of just how intensive the task is. Instead of writing an API request to do this task, you write the function to process this task in on the background job server. This way, once it's completed, we can notify the correct parties that the task is complete.

> yarn worker
>
>
>

> yarn w




This command runs the cronjob.js file. What is a cronjob? You can think of it as a task that is triggered by time. Basically you are scheduling a task to occur at a certain time. For example, let's say you want your app to send out an email to all the users on their daily account details every day at 12pm noon. You would create a cronjob to do this because it is being executed at a certain time. Quick hint, its common to use cronjobs and background jobs together. In the example with the daily account details, you would create a cronjob that gets triggered every day at 12pm. That cronjob would then create a background task that will actually do the processing of the details needed and send that information to the user.

> yarn cron




---

## index.js / server.js

As mentioned previously, the **"index.js"** file is the entry point to run the web server. If you dive deeper into the code, you will find that we setting up a server cluster so that we can spin up a new server for every CPU process there is on the server. We are using the node module **"throng"** to help us achieve this concurrency. The actual server can be found in the file **"server.js"**. You can see we reference server.js in the index.js code.




### Server.js and Middlewares Explained

The server.js file is where the actual server is created and configured, including all the middlewares we want to include in our API. If you look at the code, you'll notice we are using many third-party node modules. These modules are actually added to our server as **middleware** via

> app.use()

What is middleware? To understand this, we must think of the lifecycle of an API request.




Incoming API Request (req) > middleware1(req) > middleware2(req) > middleware3(req) > Outgoing Response back to client giving them the result of their request.


A middleware is just a component (function/method) that you pass the request object of the API request to. It performs an action and it may or may not update the request object. After if performs its action, it then calls the next middleware (component) down the chain until there is nothing left to call, in which case, that's when a response is returned.




The middleware lifecycle can simply be thought of as just passing in a request object down a chain of functions until there are no functions left to call, in which case, we return the final result (response) back to the web client (Front-End).




We won't explain all the server.js middleware node modules that we included, but please note that the **order** of the middlewares that are being added matters because it reflects in what order the incoming request object is being processed. In server.js, the last middleware that runs is the routes middleware, but if dig deeper into the routes files of each **"Feature Folder"**, the next middleware down the chain is the controller, then in the controller, the actions will be called, then after the actions, we either return an error (if this is the case, the error middleware will be called) or we return success (in this case there are no more middlewares left to execute so we return the response/result of the request back to the client).




---

## Custom Middlewares

We have a ##"middleware"## folder where you can add your own custom middlewares. We already created a few in which case you can check out the files individually and read the comments to understand what they do.

[middleware/id.js](middleware/id.js)

[middleware/args.js](middleware/args.js)

[middleware/auth.js](middleware/auth.js)

[middleware/error.js](middleware/error.js)

[middleware/exit.js](middleware/exit.js)




The most important one to know is the **"args.js"** file. In short, we create and append a variable to the **req** object called **req.args**. This variable contains the request body IF it is a POST request, or the request query IF it is a GET request. We do this because you as the developer don't need to know or remember if the API request you are working on is a POST or a GET. All you need to know is that the arguments are going to be attach to **req.args** so you can focus on building your feature.

`args.js` also does one more thing: it runs `parseUrlQueryFilter` from [helpers/cruqd.js](helpers/cruqd.js) on `req.args` for every request. This converts bracket-notation filter operators (e.g. `date[gte]=2024-01-01`) into Sequelize operators automatically, so by the time `req.args` reaches your action the operators are already converted and you can pass them straight into a `where` clause. See the **helpers/cruqd.js** section for the full filter convention.

### Graceful shutdown (`middleware/exit.js`)

`exit.js` is a different kind of middleware — it exists for **shutting the process down cleanly**. Every deploy, restart, crash-restart, or `Ctrl-C` sends the process a **`SIGTERM`** (`SIGINT` for Ctrl-C). If the process just died, in-flight requests would be dropped and DB/Redis/socket connections left dangling. `exit.js` prevents that, and it spans both entry points:

- **`exit.middleware`** — registered in `server.js`, runs on every request. Normally it just calls `next()`. Once shutdown has started it short-circuits with **`503 SERVICE_UNAVAILABLE`** + a `Connection: close` header, so the load balancer stops routing new work here and clients don't reuse the dying connection.
- **`gracefulExit(server)`** — the drain itself, wired into the signal handlers in **`index.js`**.

```javascript
// index.js — each clustered worker (throng) registers the handlers after it starts listening
server.listen(PORT, () => {
  process.on('SIGTERM', async () => await gracefulExit(server)); // deploy / restart / kill
  process.on('SIGINT',  async () => await gracefulExit(server)); // Ctrl-C in dev
});

// middleware/exit.js — drain in order, then exit
async function gracefulExit(server) {
  if (isShuttingDown) return;   // re-entrant guard
  isShuttingDown = true;        // exit.middleware now answers new requests with 503
  setTimeout(() => process.exit(1), 30000); // safety net: force-exit if draining hangs

  await queue.closeAll();   // stop background-job processing
  await socket.close();     // close socket.io
  await models.db.close();  // close the Sequelize/Postgres pool
  server.close(() => process.exit(0)); // stop accepting connections, exit clean once in-flight requests finish
}
```

Full sequence on a deploy: **SIGTERM → flip the flag (new requests get 503) → finish in-flight requests → close queue/sockets/DB → `server.close()` → `process.exit(0)`**, with a 30-second hard cap so a stuck connection can't block the deploy. Because `index.js` clusters one worker per CPU via `throng`, each worker registers its own handlers and drains independently.

---

### HTTP Method Philosophy — POST and GET only

This framework intentionally uses only **POST** and **GET**. We do not use PUT, PATCH, DELETE, or any other HTTP method.

**The core problem with REST methods:** The REST convention was designed for a document-centric web where GET fetches a resource, PUT replaces it, DELETE removes it. That model breaks down almost immediately when building real business logic. What HTTP method is `V1ArchiveAndNotifyUser`? Is it DELETE because you're archiving? PATCH because you're updating a status field? POST because you're triggering a side effect? There is no right answer — and that's the problem. You're burning mental energy on a categorization that doesn't matter and sometimes has no correct answer.

It gets worse: a single action can be both an update and a delete at the same time. A "close account" action might soft-delete the user, update their status, cancel their subscription, and send a confirmation email. Which HTTP method is that? The question is meaningless. The action name already tells you everything: `V1CloseAccount` is unambiguous. `DELETE /v1/users/123` is not.

**The REST counterargument — and why it doesn't apply here:** REST purists will point to HTTP caching (GET is cacheable), idempotency guarantees (PUT/DELETE are idempotent), and self-documenting APIs. These are real properties — for public APIs where you want to meet external developer expectations. For an internal API where you own both the frontend and the backend, these benefits evaporate. You handle caching in your state management layer, you implement idempotency in your business logic, and your action names are already more self-documenting than any HTTP verb.

**The rule:** Use POST for almost everything. Use GET only when the request has no body and the arguments fit cleanly in the URL query string. The action name carries all the semantic meaning — the HTTP method is just a transport detail.

---

### `req.args` vs `req.params`

There are two ways arguments reach an action and they serve different purposes:

**`req.args`** — all arguments passed by the client, normalized by `middleware/args.js`. For POST requests this is `req.body`. For GET requests this is `req.query`. You never touch `req.body` or `req.query` directly in an action — always use `req.args`.

**`req.params`** — dynamic path segments defined in the route with `:param` syntax. These come directly from Express and are not normalized.

```javascript
// routes.js
router.all('/v1/users/:id/update', controller.V1Update);

// In the action — params for the URL segment, args for the request payload
async function V1Update(req, res) {
  const userId = req.params.id;   // from the URL path: /v1/users/123/update
  const { firstName } = req.args; // from the request body or query string
}
```

**When to use which:**

Use `req.params` when the resource identity is part of the URL path itself — e.g. a webhook callback URL that a third party calls with an ID baked in, or a public-facing URL where the ID needs to be in the path for SEO or readability reasons.

Use `req.args` for everything else. Most internal API actions pass IDs and all other arguments through the request body (POST) and access them via `req.args`. This is the default — reach for `req.params` only when the route genuinely needs a dynamic path segment.

---

## Authentication

Authentication uses a **two-token model** (short-lived access token + long-lived, revocable refresh token) built on Passport, with **one strategy + one session table per user type** (User, Admin, …). The full design and migration history live in [docs/auth-migration.md](docs/auth-migration.md); this section is the working reference. For OAuth credential provisioning, see [docs/google-oauth-setup.md](docs/google-oauth-setup.md).

### The two tokens

| Token | Lifetime | Form | Stored? | Sent |
|---|---|---|---|---|
| **Access token** | ~15 min (`ACCESS_TOKEN_EXPIRES_IN`) | Stateless JWT (`jsonwebtoken`) | No | Every request, `Authorization: jwt-<type> <token>` |
| **Refresh token** | ~60 days (`REFRESH_TOKEN_EXPIRES_IN`) | Opaque 256-bit random string | Yes — **SHA-256 hash** in `UserSessions`/`AdminSessions` | Only to `/refresh` and `/logout` (httpOnly cookie on web, body on mobile) |

The access token is signed with `ACCESS_TOKEN_SECRET` and carries `sub` (user id), `type` (`'user'`/`'admin'`), `tokenVersion`, plus enforced `exp`, `iss`, and `aud` (audience).

**Audience is per user type AND client kind.** The `TOKEN_AUDIENCE` constant is nested — `USER: { WEB: 'user-web', APP: 'user-app' }`, `ADMIN: { WEB: 'admin-web', APP: 'admin-app' }`. The client *kind* is the real security boundary: **`web`** = browser/cookie client, **`app`** = native/token client (mobile *and* native desktop). Login reads the **`X-Client`** header (`web`/`app`, defaults to `web`), mints the one matching audience, and **stores the client on the session row** so refresh re-mints the same audience without depending on the header again. Each JWT strategy enforces `audience` as the **array** of its type's client audiences (`['user-web','user-app']`) — so a `jwt-user` token from web or app authenticates against the user API, but an admin token never will.

**Platform is metadata, not a security boundary.** OS/device detail — `web`/`ios`/`android`/`ipados`/`macos`/`windows` — is read from the **`X-Platform`** header and stored on the session's `platform` column (alongside `userAgent`/`ipAddress`). It's for analytics and per-platform session management (e.g. "log out all my iPhones"), and deliberately does **not** affect the token audience. Don't encode OS in the audience — it adds no isolation (same user, same API) and just bloats the accept-array. The refresh token is **opaque and stored server-side (hashed)** so it can be revoked — that's the whole reason it isn't a JWT. The helpers live in [helpers/logic.js](helpers/logic.js) (`createAccessToken`, `createRefreshToken`, `hashToken`) and the session mechanics in [helpers/session.js](helpers/session.js).

> **Frontend note:** the access token is returned in the **response body** (`token`), not a cookie. Hold it in memory and send it via the `Authorization` header. Only the refresh token is a cookie.

#### Audience vs Platform — the principle

Two distinct axes, easy to conflate — keep them separate:

| | What it answers | Granularity | Where it lives |
|---|---|---|---|
| **Audience** (`aud`) | "What *kind* of client, for security isolation?" | Coarse — `type` × (`web` \| `app`) | The token claim; enforced in the JWT strategy |
| **Platform** | "What OS/device, for analytics & management?" | Rich — `web`/`ios`/`android`/`ipados`/`macos`/`windows` | Session `platform` column |

The audience is a **security** boundary, so it stays coarse: the only thing that changes a token's security model is the user type (privilege) and whether it's a browser/cookie client vs a native/token client. OS/device adds *no* isolation (same user, same API), so it never goes in the audience — it's descriptive metadata.

**Client header usage:**
- Web app → `X-Client: web` (platform defaults to `web`)
- Native app → `X-Client: app` + `X-Platform: ios|android|ipados|macos|windows`
- A native desktop app (macOS/Windows) is `app`, not a platform-specific client kind. A web dashboard *running on* macOS is still `web`.

**Adding a new platform** later (e.g. `linux`, `tv`) is just a new entry in the `PLATFORMS` constant — no audience or strategy changes. **Adding a new client kind** (rare — only if it has a genuinely different token security model) means extending `TOKEN_AUDIENCE`; the strategy's `Object.values(...)` array picks it up automatically.

### Login → request → refresh → logout

1. **Login** (`V1Login`) — verifies credentials, mints an access token, creates a session row storing the refresh token's hash, sets the `jwt-<type>-refresh` httpOnly+Secure+SameSite=strict cookie, and returns `{ token, refreshToken, <user|admin> }` with status `201`.
2. **Every request** — `middleware/auth.js` reads the `Authorization` scheme, runs the matching Passport JWT strategy ([services/passport.js](services/passport.js)), which verifies the signature/`exp`/`iss`/`aud`, loads the record, and checks `tokenVersion`. `verifyJWTAuth` then attaches the record to `req.user` / `req.admin` and sets the locale.
3. **Refresh** (`V1Refresh`) — reads the refresh token (cookie or body), and **rotates** it: the presented session is revoked and a new one issued (linked via `replacedBySessionId`). Returns a fresh access token + refresh token. Public endpoint (the access token is usually expired by now).
4. **Logout** (`V1Logout`) — revokes the current session and clears the cookie. **Logout-all** (`V1LogoutAll`) — revokes every session and **bumps `tokenVersion`**, instantly invalidating all outstanding access tokens.

### How `req.user` / `req.admin` get populated

`middleware/auth.js` is driven by a single `AUTH_TYPES` registry — `[{ scheme, strategy, reqKey }]`. To add a new authenticated user type, add one entry (and a Passport strategy + session table). The three middleware functions:
- `attachJWTAuth` — puts a Passport authenticator for each type on `req.JWTAuth`.
- `JWTAuth` — matches the `Authorization` scheme via exact prefix (`jwt-admin <token>`) and runs that strategy; if no recognized scheme, calls `next()` (the route may be public — the controller enforces auth).
- `verifyJWTAuth` — moves the authenticated record onto the right key (`req.admin` for `jwt-admin`, etc.) and sets the locale.

### Security properties

- **Rotation + reuse detection:** every refresh issues a new token and revokes the old one. If an already-rotated token is replayed (theft signal), **all** of that user's sessions are revoked and `tokenVersion` is bumped.
- **Instant revocation:** bump `tokenVersion` (logout-all, password change, compromise) to kill every access token immediately — checked in the JWT strategy.
- **No raw refresh tokens stored** — only SHA-256 hashes; a DB leak exposes nothing usable.
- **Timing-safe login:** a dummy bcrypt compare runs even when the account isn't found, preventing email enumeration.
- The same access token authenticates **socket connections** (`services/socket.js` verifies it identically, including `tokenVersion`).

### Error handling in auth actions

`V1Login`/`V1Refresh` are HTTP actions → return `errorResponse(req, ...)` on failure. Invalid/expired/replayed refresh tokens return `401 <NAMESPACE>.UNAUTHORIZED_INVALID_REFRESH_TOKEN`.

---

## Security Posture

Most of security falls out of following the conventions; a few pieces are global infrastructure. The whole picture:

| Area | What's in place |
|---|---|
| **Auth tokens** | Short-lived access JWT + opaque refresh token; refresh is **SHA-256-hashed at rest**, rotated on every use, with reuse detection and `tokenVersion` instant revocation. JWT algorithm is **pinned to `HS256`** (signer in `helpers/logic.js` + both verify strategies in `services/passport.js`). |
| **Passwords** | **bcrypt**, cost = `BCRYPT_ROUNDS` (currently 12 — a dedicated constant, never tied to password length). Login runs a dummy bcrypt compare when the account isn't found (timing-safe, prevents email enumeration) and rejects inactive/soft-deleted accounts. |
| **Session cookie** | Refresh cookie is `httpOnly` + `secure` (prod) + `sameSite: 'strict'` — the CSRF defense. |
| **Rate limiting** | Production: a global per-IP limiter on every request + a **stricter limiter on credential endpoints** (login, refresh, password reset/change) in `server.js`. Redis-backed (shared across dynos) with an in-memory fallback so a Redis hiccup can't crash boot. |
| **Transport** | `helmet()`, CORS **allowlist** (`ALLOWED_ORIGINS`, not `*`), forced SSL redirect in prod, `trust proxy` for correct client IPs behind Heroku. |
| **Injection** | All queries go through Sequelize (parameterized); every action validates `req.args` with Joi before touching the DB. |
| **Data exposure** | Sensitive columns excluded from responses via the model `defaultScope` / `getSensitiveData()`; queries are owner-scoped so one user can't read another's rows. |
| **Encryption at rest** | `services/secure.js` = **AES-256-GCM** (authenticated, per-message IV) for reversibly-stored sensitive fields. Access / refresh / encryption use **distinct secrets**. |
| **Request size** | Body limit capped at 5 MB (raise only on specific upload routes) so a giant payload can't exhaust memory. |

**Your part — the per-feature checklist.** The framework gives you the perimeter; each feature must still be correct. For every action: validate `req.args` with Joi, **scope every query to the owner**, **exclude sensitive fields**, gate by role/type in the controller, and **write a "who-cannot" test** (logged-out → 401, wrong type → 401/403). See "Testing: What to Assert".

---

## The Config Folder / Environment Set Up

When building any application, its common to have variables be different depending on what environment we are in. There are four main environments that we have:




- Production
- Staging
- Development
- Test

Each of these environments will have their own set of config variables containing sensitive information like API keys, secret keys, etc. that can be used across the entire application codebase. By default, we provide a file called

> .env.template

This can be found under the **config** folder. It is up to you to create your own config files for each environment you need. The following is an example of what we recommend creating in the config folder:

- config
  - .env.development
  - .env.production
  - .env.staging
  - .env.test

You should copy the contents of the **.env.template** and create the files above and paste the copied content into the newly created config file. Then fill in all the config variables. The **.env.development**, **.env.production**, **.env.staging** and **.env.test** files are added to the .gitignore for security reasons and therefore **WILL NOT** show up on github. This is because you don't want other random people getting access to your important API keys and variables. Every time you add a new config variable, we recommend updating the **.env.template** file because this will be included in the git repository and any new developers who pull your changes or develop on your project can add the correct config variables need to run your project servers.

#### The variables you must set

The source of truth is always `config/.env.template`, but at minimum the app needs these to run:

| Variable | What it is |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` — selects which `.env.*` loads and drives env-specific behavior. |
| `DATABASE_URL` | Postgres connection string for this environment (a **separate** DB for `.env.test`). |
| `REDIS_URL` | Redis connection (Bull queues + the Socket.IO adapter). Local project-Redis in dev; a managed add-on in prod. |
| `ACCESS_TOKEN_SECRET` | Signing secret for the short-lived access JWT. Must be **distinct** from the refresh secret. |
| `REFRESH_TOKEN_SECRET` | Signing secret for refresh tokens — must differ from the access secret. |
| `ACCESS_TOKEN_EXPIRES_IN` | Access-token lifetime, e.g. `15m`. |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token lifetime, e.g. `60d`. |

> **All four auth vars must be in EVERY env file — including `.env.test`.** If they're missing from `.env.test`, the auth tests can't mint tokens and the suite fails in confusing ways. Keep the two secrets distinct, and never commit real secrets (only `.env.template` is committed).



### More on .env.staging and .env.production


In practice, you don't actually need to store the .env.staging and .env.production config files in your local development. It is optional. The only use case where you should store these files on your local computer is if you ever want to connect directly to your staging or production servers and run the code locally on your computer. For example, you could run a /scripts file on your local computer using the .env.production config and it should connect to your production database directly. You might want to do this if you need to run a quick fix via a script. Also, it is important to note that staging and production are basically the same thing. We just call it staging because you can't name two files .env.production on your local computer. In reality, when you deploy to a service like Heroku or AWS, they treat all deployments as a production environment, and there is no such thing as a staging environment. Again everything is a production environment when you deploy. We just call it staging to help us not get confused between the two environments ourselves since we are choosing one production app to be our staging / testing app and the other production app to be the main app we launch for users to use.



### config/config.js

In the **config** folder you'll find another file called **config.js**. This file is used to configure our ORM, Sequelize's migration tool. In short, it's the configuration the **Sequelize-CLI** uses to connect to the database to run migrations (`yarn migrate`, `yarn rollback`, `yarn model`, `yarn migration`). Please note, that we have to configure this AGAIN in the **database/index.js** file seperately. We will go into more detail in the **Database Folder / Configuration** section below.

**How the CLI finds it.** The Sequelize CLI runs as its own process — it never boots your app, so it can't use `database/index.js`. It reads a standalone config instead, pointed at by **`.sequelizerc`** at the repo root:

```javascript
// .sequelizerc
const path = require('path');
module.exports = { config: path.resolve('config', 'config.js') };
```

`config/config.js` then loads the matching `.env.<env>` by `NODE_ENV` (so `DATABASE_URL` is populated) and exports one block per environment — `development` / `test` / `production` — each pointing at `DATABASE_URL` (`use_env_variable: 'DATABASE_URL'`), `dialect: 'postgres'`, `decimalNumbers: true`, with SSL on in production. This is **why `NODE_ENV` matters when you run a migration**: it selects which block (and which `.env` file) the CLI uses — `yarn migrate` (development) vs `yarn migrate:prod` (production). Both this file and `database/index.js` ultimately read the same `DATABASE_URL`, so they're two doors into the same database: one for the CLI/migrations, one for the running app.

### heroku-sync.js

In heroku, you need to add the config variables manually and sometimes this can be very time consuming and this process may be prone to errors. So we created the **heroku-sync.js** file to sync your **config/.env.production** or your **config/.env.staging** file to your deployed app on heroku with a single command. Example below.

> node ./config/heroku-sync .env.production myapp true

Please check out [config/heroku-sync.js](config/heroku-sync.js) for more details.




---

## Database Folder / Configuration

In the **database** folder, there are few important things to note.

1. The Set Up via index.js
2. The Schema via schema.sql
3. The Backups via backups folder
4. The Seed Data via seed folder
5. The Ordering of the table creation via sequence.js




### 1 .The Set Up via index.js

**index.js** is where we set up the configuration for the API server to connect to the database. As mentioned earlier, if you remember, we also connect to the database in the **config/config.js** file but for a different reason, the sequelize migrations. By contrast, the **database/index.js** is configuration sequelize ORM for the actual web app API server. You need to have both set up correctly.




### 2. The Schema via schema.sql

This file may be misleading, because its a .sql file. Are we uploading this to PostgreSQL as our database schema? NO, we are not. This is purely for our notes and we should record ANY changes to the database here. You can think of this file are our master database schema plan for the entire application. However, the actual place where we modify the database is in the **migrations** folder. It is **strongly** recommended that you make updates here whenever you make a database change and you take notes on all the columns and tables so that yourself and future developments can view one file and understand what is going on in your application. I understand the trades off to doing this is maintaining a file when you can just go off of the models files. If you want to do that, you will be shooting yourself in the foot as the app gets more complex and you start to deal with hundreds of tables and thousands of columns. Since every new engineer you onboard will be jumping around your app like a monkey trying to grab his banana. Maintain this file and you will move faster and your futureself plus future engineers will thank you.




### 3. The Backups via backups folder

One thing we find ourselves doing very often is backing up the database, whether its for development purposes or just to keep a backup somewhere. That's what this folder is for. To store any backup. We have a built in command to make this very easy.

> yarn backup

Yes, that's it. It will make of backup of the current database and store it in this **database/backups** folder automatically. You can find the actual command in the **package.json** "scripts" section. Try it out!




But having a backup isn't enough, we also need a way to restore it back to the actual database. Dont' worry, we have a command for that as well.

> yarn restore

This will drop the current database and replace it with the backup. You can also find this command in the **package.json** "scripts" section.




### 4. The Seed Data via seed folder

This is the folder where we put our seed data for our development database. We will also have a seperate seed data folder (called fixtures) for tests but more on that later one. What is seed data? Basically, seed data is data we create ahead of time in the form of a JavaScript object so that we can load that data into the database instead of manually creating it over and over again via API requests. You can think of it as a template or a snapshot of data we want to have in our development database.

The structure of the seed data folder is the following:

- database
  - seed
    - set1
      - table1
      - table2
      - table3
    - set2
      - table1
      - table2
      - table3

You might be asking, "what is a set"? A set folder is just there to help you separate out different versions of what data you want to upload in the database.

**Best Practices**:

I do recommend not creating so many different **"sets"**. Just create a few with the bare minimum, otherwise you'll find yourself trying to update all the sets every time you add a new table or column into the database.




### 5. The Ordering of the table creation via sequence.js

This file you don't really need to modify because it is updated automatically when you generate or destroy a feature via the commands we will highlight in the next section (**yarn gen** or **yarn del**). Basically, if you open up the file, you will see that its an array of all the existing tables. The order of the elements in this array matter a lot. This is because when we upload seed data OR fixture data (for testing), there are table foreign keys and dependencies. For example, what if you have two tables called "Company" and "User" and a "User" belongs to a "Company". You have to add the "Company" seed data/fixtures first before you add the "User" seed data/fixtures. Please don't modify this file unless you have to manually override something.




---

## JavaScript File Structure (Every `.js` File)

Every JavaScript file in the codebase follows the same top-to-bottom structure. This consistency means any engineer can open any file and know exactly where to look. The scaffolded action/task templates already follow it — use them as the reference example.

**The order:**

1. **Header comment** — what the file is for and what its methods do.
2. **`'use strict';`** — always, right after the header.
3. **ENV variables** — destructured from `process.env`.
4. **Built-in node modules** — `fs`, `path`, `crypto`, etc.
5. **Third-party node modules** — `lodash`, `joi`, `moment-timezone`, etc.
6. **Services** — from the global `services/` folder (this includes `require`-ing the queue **service**, `services/queue.js`).
7. **Helpers** — from `helpers/` (constants included) and the feature's own `helper.js`.
8. **Models** — `const models = require('.../models');`.
9. **Queues** — the queue **instances** you grab via `queue.get('XQueue')`, right after models. (The `queue` service itself is required up in Services — this section is for the actual queue handles.)
10. **Module-level variables/constants** — any constants the file needs.
11. **`module.exports`** — listing every method the file exports.
12. **The method definitions** — the actual functions.

**The one hard rule about `module.exports`:** it must come **before** the method definitions, but **not necessarily at the very top** — any constants or variables the file needs can sit above it (steps 9 → 10). What matters is `module.exports` is above the functions (which works because function declarations are hoisted). See the **Module Export Convention**.

**Ordering within each section — increasing length.** Within every import section, order the lines by increasing length so the block forms a clean ramp. And within a section, put **plain whole-module requires first** (assigning the whole module to a variable), ordered by increasing length, **then the destructured imports**, also ordered by increasing length.

```javascript
/**
 * USER V1Login ACTION
 *
 * Logs a user in and returns an access token + refresh token.
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// built-in node modules
const fs = require('fs');
const path = require('path');

// third-party node modules  ← plain requires first, increasing length
const _ = require('lodash');
const joi = require('joi');
const moment = require('moment-timezone');
const passport = require('passport');

// services  ← plain requires (by length), THEN destructured (by length)
const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { issueSession } = require('../../../helpers/session');
const { createAccessToken, parseDurationMs, resolveClient } = require('../../../helpers/logic');

// models
const models = require('../../../models');

// queues — grab the queue INSTANCES right after models (the `queue` service is required above)
const UserQueue = queue.get('UserQueue');

// module-level constants (optional) — may sit above module.exports
const MAX_ATTEMPTS = 5;

// methods
module.exports = {
  V1Login
};

// ... method definitions below, each closed with `// END <name>` ...
```

> **Why increasing-length ordering?** It's purely visual — a consistent ragged-right ramp makes the import block scannable and makes diffs that add an import obvious. It's a soft aesthetic rule, but follow it for new code so files stay uniform.

---

## The App Directory and Features

---

### The Feature Generator (`app/feature.js`)

Creating a new feature involves a lot of files — controller, model, routes, worker, error, helper, actions, tasks, mailers, languages, and tests for all of it. To avoid writing this boilerplate by hand every time, we have a built-in scaffolding generator at `app/feature.js`. **Always use it. Never create feature folders or action/task files by hand.**

The generator is accessed via `yarn gen` and `yarn del`. Every generated file comes pre-filled with the correct structure, imports, naming conventions, and comments so you can start writing logic immediately.

**Naming rule: feature names must always be singular and PascalCase.**
```
Order     ✅
order     ❌
Orders    ❌
orders    ❌
```

---

#### Generate a complete new feature folder

```bash
yarn gen FeatureName
```

Example:
```bash
yarn gen Order
```

This creates the entire `app/Order/` folder structure in one command:
- `controller.js` — with a `V1Example` method wired up
- `model.js` — with example column definitions for every Sequelize data type
- `routes.js` — with an example route
- `worker.js` — with queue setup and error/stall handlers
- `helper.js` — empty, ready for feature-specific helpers
- `error.js` — with commented-out example error codes
- `actions/index.js` — aggregator, auto-managed
- `actions/V1Example.js` — full action template with Joi validation, error handling, socket and queue examples
- `tasks/index.js` — aggregator, auto-managed
- `tasks/V1ExampleTask.js` — full task template
- `mailers/OrderExampleMail/index.ejs` — email template
- `languages/en.js` (and all other configured locales)
- `tests/integration/V1Example.test.js` — full integration test template with all role groups
- `tests/tasks/V1ExampleTask.test.js` — full task test template
- `tests/helper.test.js` — empty helper test file

It also automatically adds the new model name to `database/sequence.js` so fixture and seed data loads in the correct order.

**After generating a full feature, immediately remove the placeholder scaffold files using `yarn del` — never `rm`.** `yarn del` automatically removes the entry from `actions/index.js` / `tasks/index.js`; `rm` does not, leaving a broken export pointing at a deleted file:

```bash
yarn del Order -a V1Example       # removes placeholder action + test
yarn del Order -t V1ExampleTask   # removes placeholder task + test
# also remove tests/helper.test.js via the appropriate flag
```

**You still need to manually:**
1. Add the feature's routes to the global `routes.js`
2. Create the migration file for the new database table (`yarn model`)
3. Add fixture data for the new table to `test/fixtures/fix1/`
4. Add seed data if needed to `database/seed/set1/`

---

#### Generate a new action inside an existing feature

```bash
yarn gen FeatureName -a V1ActionName
```

Example:
```bash
yarn gen Order -a V1Create
```

This creates:
- `app/Order/actions/V1Create.js` — full action template
- `app/Order/tests/integration/V1Create.test.js` — full integration test template
- Automatically updates `app/Order/actions/index.js` to include the new action (sorted alphabetically)

**After generating an action, you still need to manually:**
1. Add the route to `app/Order/routes.js`
2. Add the controller method to `app/Order/controller.js`

---

#### Generate a new background task inside an existing feature

```bash
yarn gen FeatureName -t V1TaskName
```

Example:
```bash
yarn gen Order -t V1ProcessOrder
```

This creates:
- `app/Order/tasks/V1ProcessOrder.js` — full task template
- `app/Order/tests/tasks/V1ProcessOrder.test.js` — full task test template
- Automatically updates `app/Order/tasks/index.js` to include the new task (sorted alphabetically)

**After generating a task, you still need to manually:**
1. Register the task processor in `app/Order/worker.js`

---

#### Generate a new mailer inside an existing feature

```bash
yarn gen FeatureName -m MailerName
```

Example:
```bash
yarn gen Order -m OrderConfirmation
```

This creates `app/Order/mailers/OrderOrderConfirmation/index.ejs`. Note: the feature name is automatically prepended to the mailer name if not already present.

---

#### Delete a feature, action, task, or mailer

```bash
yarn del FeatureName                    # deletes entire feature folder + removes from sequence.js
yarn del FeatureName -a V1ActionName    # deletes action file + test + removes from actions/index.js
yarn del FeatureName -t V1TaskName      # deletes task file + test + removes from tasks/index.js
yarn del FeatureName -m MailerName      # deletes mailer folder
```

Delete is the reverse of generate. For actions and tasks, it also cleans up the corresponding test file and removes the entry from the relevant `index.js` automatically.

**After deleting an action, you still need to manually:**
1. Remove the route from `routes.js`
2. Remove the controller method from `controller.js`

**After deleting a task, you still need to manually:**
1. Remove the processor registration from `worker.js`

---

#### The `stringify` helper (for maintaining `feature.js` itself)

```bash
yarn str /absolute/path/to/file.js
```

This is a utility for the developer who needs to update the generator templates inside `feature.js`. Since the templates are stored as JavaScript strings, editing them directly is painful. The workflow is: edit the actual template file → run `yarn str` on it → copy the output into the relevant template function in `feature.js`. You will rarely need this unless you are changing what the generator produces.

---

### Naming Conventions for Actions and Tasks

This is one of the most important conventions in the entire framework. Every action and task name follows a strict formula that makes its purpose, version, role, and device target immediately readable from the name alone — no need to open the file.

---

#### The Formula

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| Segment | Required | Description |
|---|---|---|
| `V{version}` | Always | API version number. Always comes first. |
| `{ActionName}` | Always | PascalCase description of what the action does. `Create`, `Update`, `Login`, `Query`, etc. |
| `By{Role}` | When behavior differs by role | The user type or role that calls this method. `ByAdmin`, `ByUser`, `ByPartner`. |
| `On{Device}` | When behavior differs by device | The client platform. `OniOS`, `OnAndroid`, `OnMobile`, `OnWeb`. |

---

#### Versioning (`V1`, `V2`, ...)

The version prefix serves one critical purpose: it lets you ship a completely rewritten version of an action without breaking clients that still use the old one. `V1Login` and `V2Login` can coexist in the same routes file simultaneously. When you eventually deprecate `V1`, you know exactly what to remove. Never skip the version prefix — even if you're certain you'll never need a V2, the cost of adding it is zero and the cost of retrofitting it later is high.

```javascript
// both can exist at the same time in routes.js
router.all('/v1/users/login', controller.V1Login);
router.all('/v2/users/login', controller.V2Login);
```

---

#### Role Suffix (`By{Role}`)

When an action behaves differently depending on who is calling it, create a separate method for each role rather than branching inside one method. Even if the methods share 60–70% of the same code today, keep them separate. The controller picks which one to call. Do not couple the methods together to save lines.

The reason is scale: as the codebase grows, admin behavior and user behavior will diverge. A change for one role will accidentally break the other if they share a method. Two separate methods are independently editable, independently testable, and independently understandable.

```javascript
// controller.js routes to the correct method based on role
if (req.admin)       method = 'V1UpdateByAdmin';
else if (req.user)   method = 'V1UpdateByUser';
else                 return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
```

```
V1Create              → no role distinction, all roles do the same thing
V1CreateByAdmin       → admin-specific behavior
V1CreateByUser        → user-specific behavior
V1CreateByAdminManager → specific role within a user type (e.g. admin with Manager role)
```

**Sharing the bulk of the logic — a private `V1Create` in the same file (not `helper.js`).** Very often the two role methods are ~90% identical. When that happens, **do not** push the shared body into `helper.js`. Instead, in the same action file, write a third function — `V1Create` — that does the shared bulk of the work, and have both `V1CreateByUser` and `V1CreateByAdmin` call it. That function is **not exported and is never referenced by the controller**; it's a private internal worker living right next to the two public methods. The real work still lives in the action file — it's just not exported.

```javascript
// only the two role methods are exported — the controller calls these
module.exports = {
  V1CreateByUser,
  V1CreateByAdmin
};

// PUBLIC: user entry point — does the user-specific bit, then delegates
async function V1CreateByUser(req, res) {
  // ...user-only validation / defaults...
  return V1Create(req, { isAdmin: false });
} // END V1CreateByUser

// PUBLIC: admin entry point — does the admin-specific bit, then delegates
async function V1CreateByAdmin(req, res) {
  // ...admin-only validation / extra fields...
  return V1Create(req, { isAdmin: true });
} // END V1CreateByAdmin

// PRIVATE: the 90% shared logic. NOT in module.exports, NOT called by the controller.
async function V1Create(req, { isAdmin }) {
  // ...validate, transaction, write, queue, socket — the bulk of the action...
  return { status: 201, success: true, order: newOrder };
} // END V1Create
```

**When to use `helper.js` instead.** `helper.js` is for **small**, pure, reusable bits (a calculation, a formatter) — things worth unit-testing in isolation. When the shared piece is the *majority* of the action, keep it as a private `V1Create` in the action file so the logic stays where you'd look for it. Rule of thumb: **small slice → `helper.js`; big shared body → private function in the action.** Don't reflexively move everything into `helper.js`.

---

#### Device Suffix (`On{Device}`)

When an action behaves differently depending on the client platform, append the device target. Only split on device when the behavior genuinely differs — do not create separate methods just for the sake of it.

```
On{Device} options:
  OniOS      → iOS app only
  OnAndroid  → Android app only
  OnMobile   → iOS and Android behave identically, but differ from web
  OnWeb      → Web browser only
  (none)     → All platforms behave the same
```

A full example combining all segments:
```
V1UpdateByAdminOnMobile
│  │      │        │
│  │      │        └─ device: iOS and Android behave the same way
│  │      └─────────── role: admin only
│  └────────────────── action: updating a record
└───────────────────── version: v1
```

---

#### Actions vs Tasks — the `Task` suffix

An **action** is called in real time via an HTTP request and returns a response immediately. A **task** is a background job that runs in a worker process outside of the request lifecycle.

The naming convention is identical — same version, role, and device rules — but **tasks always append `Task` to the action name**. This makes it unambiguous from the name alone whether something is a real-time action or a background job, without needing to check which folder it lives in.

```
V1Create           → action  (real-time API request, returns a response)
V1CreateTask       → task    (background job, runs in worker)

V1ExportByAdmin    → action  (triggers the export, returns immediately)
V1ExportTaskByAdmin → task   (does the actual export work in the background)
```

The typical pattern is: an action receives the request, validates arguments, enqueues the background task, and returns a `jobId` immediately. The task then does the heavy lifting asynchronously.

---

#### Complete naming reference

```
// Actions — real-time, return a response
V1Login                         all roles, no device distinction
V1CreateByAdmin                 admin only, no device distinction
V1CreateByUser                  user only, no device distinction
V1UpdateByAdminOniOS            admin only, iOS only
V1UpdateByAdminOnAndroid        admin only, Android only
V1UpdateByAdminOnMobile         admin only, iOS and Android behave the same
V1UpdateByAdminOnWeb            admin only, web only
V1UpdateByAdminManagerOnMobile  admin with Manager role, mobile only

// Tasks — background jobs, always append Task
V1CreateTask                    background version of V1Create
V1ExportTaskByAdmin             background export triggered by admin
V1SyncTaskByUserOnMobile        background sync triggered by user on mobile
```

---

Below is an example of what a FeatureFolder contains. This is where you will spend most of your development time on.

```
- FeatureFolder
  - actions
    - index.js
    - action1.js
    - action2.js
  - languages
      - en.js
      - es.js
  - mailers
      - ExampleEmail
        - index.ejs
        - preview.html
      - ExampleEmail2
        - index.ejs
        - preview.html
  - tasks
      - index.js
      - task1.js
      - task2.js
  - tests
    - integration
      - action1.test.js
      - action2.test.js
    - tasks
      - task1.test.js
      - task2.test.js
    - helper.test.js
  - controller.js
  - error.js
  - helper.js
  - model.js
  - routes.js
  - worker.js
```

### The General Workflow

The goal of having this feature folder structure is to make sure we create a repeatable process when developing new features or making updates to features. When you break it down, what is a backend API actually doing? We are essentially creating a layer of code that just connects to a database and makes updates to that database. We generally do this in two ways.



The first way is a direct action that is made via an HTTP/HTTPS request from the client-side frontend, or in other words, an API request. Naturally, if we want to build an action that updates the feature folder, we can create an update action and place that in the actions folder. In this flow, after the req object is passed in through all the middleware that was defined in the server.js (remember the order matters) it then hits the feature folder code, starting with the routes.js, then the req object is passed to the controller.js, in the controller, we figure out which action is called and then return a response. That is the general lifecycle of an API request. Majority of your development will go through this flow.



The second way is instead of making changes and updates via an API request, we can also create background jobs via adding jobs to a queue. We do this if we know we need to perform a task in the background. The best example of this is when we need to do something that takes longer to process, like exporting a list of 1,000,000 records from the database or running some complex math algorithm that may take hours. If you tried to do this via an API request (the first method explained), the client-side (the end-user) might have to wait a long time before they get the response back from the request they made. So in this scenario, it is better to respond quickly to their request and state that we are processing their request via a background task and when it is done, we will notify the end-user via a notification by email, phone, or socket push. It is important to also note that there are two ways we can trigger a background job. The first way is what was just described, you can have an API request create a background job in the action itself, just like the example above for exporting a large dataset. The second way is to trigger it is via a cronjob (we explain what a cronjob is earlier above). An example is you can set up a cronjob to create a background job every set period of time to do some task such as resetting inventory for a restaurant on a daily basis. In this flow, everytime a background job is created either in an action or via a cronjob, it goes through the worker.js to figure out which task to run and then  that task is called.




## Let's Explore Each Section More In-Depth

### Model.js

When you create a feature folder, it is **strongly** recommended that it is tied to a database table. You **should not** create a feature folder without it relating to an actual database table. This is bad practice and defeats the purpose of this entire structure.

The purpose of this file is to define the table schema and its behavior for Sequelize (our ORM). Every file that needs to interact with the database imports the global `models` object — which auto-aggregates all feature `model.js` files at startup, the same way routes and errors are aggregated. You never import a feature model directly; you always go through `models`.

**Important distinction:** The `model.js` file is what the ORM uses at runtime to query and mutate data. It can be freely updated. The `migrations/` files are what actually modify the database schema — once a migration is deployed, it cannot be edited. `database/schema.sql` is purely a documentation file — it has no runtime relevance and is never executed. It exists so engineers can scan the full schema in one place without jumping between model files.

---

#### File Structure

Every `model.js` follows the same layout, top to bottom:

**1. Sensitive and private data arrays** — defined at the top of the file, before the model.

```javascript
const sensitiveData = ['salt', 'password', 'passwordResetToken'];
const privateData = sensitiveData.concat(['phone', 'birthdate', 'lastOnlineAt']);
```

- **`sensitiveData`** — fields that are never exposed to anyone under any circumstances (passwords, salts, tokens). The `defaultScope` automatically excludes these from every query so it is impossible to accidentally leak them.
- **`privateData`** — extends `sensitiveData` with fields that are private *between users*. The authenticated user can see their own `phone`, but another user viewing their profile cannot. Use `getSensitiveData()` when returning data to the record's owner. Use `getPrivateData()` when returning data about one user to another.

**2. The `id` column — always UUID**

```javascript
id: {
  type: DataTypes.UUID,
  allowNull: false,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
  validate: { isUUID: 4 }
}
```

Always UUID v4, always generated at the ORM level (`DataTypes.UUIDV4`). The advantage of ORM-level generation is that you know the ID before the insert — useful when constructing related records or returning a job payload before the database write confirms.

**3. Foreign key placeholder comment**

```javascript
// All foreign keys are added in associations
```

Do not define foreign key columns in the field definition block. They are added automatically by Sequelize when you define associations at the bottom of the file. The comment serves as a reminder of this.

**4. Regular columns** — all feature-specific fields go here.

**5. Model options** — passed as the second argument to `sequelize.define()`:

```javascript
{
  timestamps: true,      // auto-manages createdAt and updatedAt — never define these manually
  paranoid: true,        // soft deletes: destroy() sets deletedAt instead of issuing DELETE
  freezeTableName: true, // prevents Sequelize from auto-pluralizing the model name
  tableName: 'Users',    // must be PascalCase and plural
  defaultScope: {
    attributes: { exclude: sensitiveData } // sensitive fields excluded from every query automatically
  },
  hooks: { ... },
  indexes: [ ... ]
}
```

**On `paranoid: true`:** When enabled, calling `model.destroy()` never issues a SQL `DELETE`. Instead it sets the `deletedAt` timestamp. All standard queries (`findOne`, `findAll`, `findByPk`) automatically filter out records where `deletedAt IS NOT NULL` — the record is invisible to normal queries. To see soft-deleted records (e.g. in a test assertion or a task that needs to process deleted accounts), bypass the default scope with `scope(null)`:

```javascript
// normal query — soft-deleted record returns null
await models.user.findByPk(userId);

// scope(null) — bypasses paranoid filter, returns the record
await models.user.scope(null).findOne({ where: { id: userId } });
```

Set `paranoid: false` on models where you want hard deletes (e.g. session records, log entries, anything with no reason to retain after deletion).

**6. Indexes**

```javascript
indexes: [
  { name: 'Users_defaultAvailabilityProfileId_idx',  fields: ['defaultAvailabilityProfileId'] },
  { name: 'Users_phone_unique',                       fields: ['phone'],                 unique: true },
  { name: 'Users_email_unique',                       fields: ['email'],                 unique: true },
  { name: 'Users_passwordResetToken_unique',          fields: ['passwordResetToken'],    unique: true }
]
```

Three rules:
- **Always index foreign key columns.** Postgres foreign key constraints give you referential integrity but create no index. Every `WHERE userId = x` query on a table without that index is a full table scan at scale. No exceptions.
- **Index any column that needs a unique constraint.** Use the `indexes` array with `unique: true` rather than adding `unique: true` directly to the column definition — this gives you more control and is consistent.
- **Always set an explicit `name` on every index** — both here in the model and in the migration — using the same convention: `{TableName}_{columnName}_{unique|idx}`. Never rely on auto-generated names.

The model `indexes` array and the migration `addIndex` calls must stay in sync — they should define exactly the same indexes with exactly the same names. The migration is what actually creates the index in Postgres. The model tells Sequelize about it for query optimization.

**7. Associations**

```javascript
User.associate = models => {
  User.hasMany(models.userSession, {
    as: 'userSessions',
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};
```

Always use `onDelete` and `onUpdate` explicitly. The two options are:
- `CASCADE` — when the parent is deleted/updated, the child record follows. Use this for records that have no meaning without the parent.
- `SET NULL` — when the parent is deleted, the foreign key is set to null rather than deleting the child. Use this when the child record should survive.

Always add a comment on each association describing the relationship in plain English. Associations get complex fast and comments make the file navigable.

---

#### Carry the Owner Foreign Key Down to Every Descendant (Flattened Ownership)

This is one of the most important schema conventions in the framework, and it is the one junior engineers push back on the hardest — so read this whole section.

**The setup.** Imagine a three-level hierarchy:

```
User  →  UserOrder  →  UserOrderItem
```

The "textbook normalized" way is to give each table a foreign key **only to its immediate parent**:

```
UserOrder.userId         → User.id
UserOrderItem.userOrderId → UserOrder.id
// UserOrderItem has NO direct userId
```

This looks clean. It is also the wrong call for an application schema.

**The problem.** Answer the most common question you will ever ask: *"What are all the order items belonging to this user?"* With the normalized schema, you **cannot** query `UserOrderItems` directly — you have to JOIN through `UserOrders` to reach `userId`.

**The convention.** Carry the **owning entity's foreign key onto every descendant**, not just the immediate parent — even though it looks redundant:

```
UserOrder.userId          → User.id
UserOrderItem.userOrderId → UserOrder.id
UserOrderItem.userId      → User.id   ← yes, ALSO here, even though it seems duplicated
```

Now the common query is trivial, fully indexed, and join-free:

```javascript
await models.userOrderItem.findAll({ where: { userId } });
```

**Why juniors resist this — and why they're wrong.** It violates the "don't repeat data" instinct drilled into everyone learning database normalization. But normalization rules were written to prevent *update anomalies* in transactional textbook examples, not to optimize the read patterns of a real application. In practice: the **owner id is also your security scope**, and reads vastly outnumber writes.

**The catch you MUST handle: drift.** Solve this at the database level with a **composite foreign key** so `UserOrderItem.userId` can never drift out of sync with its parent order's `userId`. See the full migration example in `docs/conventions.txt`.

**Scope rule — don't overdo it.** Always carry the **top-level owner** (`userId`) down to every descendant; it's your scope key and it's non-negotiable. Carry *intermediate* ancestors onto a deep leaf **only when you actually query that leaf by that intermediate level.** Don't reflexively add every ancestor key to every table.

---

**8. Static methods** — defined directly on the Model after the `associate` block:

```javascript
User.getSensitiveData = () => sensitiveData;
User.getPrivateData   = () => privateData;
User.validatePassword = async (password, hash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => err ? reject(err) : resolve(result));
  });
};
```

`getSensitiveData()` and `getPrivateData()` are the standard methods every model with sensitive fields must implement.

### Routes.js

The purpose of this file is to define the routes for this feature folder. You will notice we include the controller at the top of the file. This is because we want to make sure we are calling the correct controller method for each route. Therefore, each route should correspond to an action in the controller. We define a route via the following pattern / convention:


```
router.all('/version/feature_folder_name_plural/action_name', controller.VersionAction);
```

example:

```
router.all('/v1/admins/login', controller.V1Login);
```

As you can see above, this route is a version 1 route, we can add future versions like a v2 later. The reason why we define version is because as you build and maintain your API, you will eventually have to upgrade or make updates to your endpoints but you still want to keep the old API routes so older legacy code on the front-end or users of your older API endpoints won't feel the need to upgrade immediately. This allows you to maintain multiple versions of your API as you undergo a steady deprecation process. In the route you also will notice we are working in the admin feature folder. Remember, we pluralize admins here as a standard practice. Lastly, we add the action name without the versioning. Keep in mind our route convention is all lowercase and no spaces, dashes, or underscores. So if you had to have two words like UpdateOrders it would appear as '/v1/admins/updateorders' (and `V1LogoutAll` → `/v1/users/logoutall`). The path simply mirrors the action name lowercased. **Why:** every URL is predictable straight from the action name and there's no hyphen-vs-underscore bikeshedding. Note this is the opposite of *page* URLs, which are lowercase-with-dashes.


Just a reminder, all the feature folder routes will get aggregated and add to the global routes.js file.




### Controller.js

The controller is a thin routing layer. Its only job is to look at the incoming request, determine which action to call based on the user's role and device, call it, and return the result. No business logic lives here.

#### Actions aggregator

At the top of every controller, actions are imported via the feature's `actions/index.js`:

```javascript
const actions = require('./actions');
```

`actions/index.js` re-exports every action file in the folder. This means the controller always has access to every action in the feature without importing them individually. Critically, **this file is auto-managed by the scaffolding** — `yarn gen` and `yarn del` add and remove entries automatically and keep them sorted alphabetically. Never edit it by hand.

#### Controller method naming

Controller methods follow a strict two-part naming convention: **version + action name only**. No role or device suffix — those belong on the action methods inside the action files.

```
Controller method:   V1Update        ← version + action only
Action methods:      V1UpdateByAdmin, V1UpdateByUser, V1UpdateByAdminOnMobile
```

#### The method body — exact pattern

Every controller method follows the same structure without exception:

```javascript
/**
 * Update and return updated user
 *
 * /v1/users/update
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Update(req, res, next) {
  let method = null;

  // determine which action to call based on role
  if (req.admin)
    method = 'V1UpdateByAdmin';
  else if (req.user)
    method = 'V1UpdateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // call the action and return the result
  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error); // passes unhandled errors to middleware/error.js
  }
} // END V1Update
```

Three things to note:

1. **Auth rejection happens here, before the action is called.** If the user type doesn't have access, return `401` immediately. Never let the wrong role reach the action.
2. **The action returns a plain object** — `{ status, success, ...data }`. The controller calls `res.status(result.status).json(result)` to send it. The action never touches `res` directly for the final response.
3. **`next(error)` is how unhandled errors reach the error middleware.** If the action throws (or a promise rejects inside the `try` block), `catch` calls `next(error)` which passes it to `middleware/error.js` to handle the 500. Never `return res.status(500)` manually — just let it propagate.

For actions that require no auth check (public endpoints), skip the role check and assign `method` directly:

```javascript
async function V1Login(req, res, next) {
  let method = 'V1Login'; // public — no role check needed

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Login
```

#### JSDoc header

Every controller method has a comment header showing the route, auth requirement, and allowed roles:

```javascript
/**
 * Update and return updated user
 *
 * /v1/users/update
 *
 * Must be logged in          ← or "Must be logged out" or "Can be logged in or logged out"
 * Roles: ['admin', 'user']   ← empty array [] if no role restriction
 */
```

### User Types: One Table Per Type (Not One Table With a Role Column)

You'll notice the controller branches on `req.admin` vs `req.user` — these are two **completely separate** authenticated user types, backed by two separate database tables (`Admins` and `Users`), each its own feature folder. This is a deliberate and important architectural decision.

**The pattern:** When you have a fundamentally different *kind* of user, you create a **separate database table (and feature folder) for it** — each with its own auth fields, its own model, its own actions, and its own login/auth strategy. A typical product has:

```
Admins   → internal staff who log into the admin dashboard
Users    → regular end-users who log into the main app
Partners → (example) business partners who log into a partner portal
```

**The anti-pattern (do NOT do this):** A single `Users` table with a `role` column (`role: 'admin' | 'user' | 'partner'`).

**Why one table per type is the right call:**

1. **They diverge.** Two kinds of users start out looking similar but their data and behavior pull apart over time.
2. **Separate auth and separate portals.** Each type logs in through a different front-end and a different auth flow.
3. **Security isolation.** A bug in user-facing code can never accidentally expose or escalate an admin.
4. **Decoupling and scale.** Adding a fifth user type is just `yarn gen NewType` — a new table and feature folder — with zero risk to the existing four.

**The distinction that matters — "type" vs "role":**

- A **user type** is a fundamentally different kind of actor with its own login portal → **separate table**. (`Admin`, `User`, `Partner`)
- A **role** is a variation *within* a single type that shares the same login → **a column on that type's table**. For example, an `Admin` might have a `role` of `Manager` or `Support` — same `Admins` table, same admin login, just different permissions.

So: different login portal → new table. Same login, different permission level → a role column on the existing table.

### Actions Folder

We store all the actions in this folder. Every actions folder has an index.js that we include only once in the controller.js file. In the actions/index.js file we include all the actions here and this is automatically updated if you use our yarn commands

```
// Generate action: yarn gen FeatureFolder -a ActionName
yarn gen Admin -a V1Login

// Delete action: yarn del FeatureFolder -a ActionName
yarn del Admin -a V1Login
```

This will automatically create the action file and add it to the index.js file. This is a very powerful feature because it allows us to add/remove actions very quickly and easily. The action file name, as mentioned previously in the controller section, is the same as the action method name but with just the VersionNumber and the ActionName. Then we defined the more granular methods inside the file. For example, if the filename of the example above would just be V1Login.js found in the actions folder.



Inside the action file, we will write the meat of the action. This is where we will write the logic for the action.

### Actions Folder Structure: Deep Dive

When using yarn gen, the action file is automatically created for you with a pre-filled structure and template. Please follow it religiously.

```
// 1. at the top we have a comment header that describes what the action is doing
/**
 * ADMIN V1Read ACTION
 */

// 2. then we have the 'use strict' statement
'use strict';

// 3. then we have native node modules
const fs = require('fs');

// 4. then we have third-party node modules
const stripe = require('stripe');

// 5. then we have services
const queue = require('../../../services/queue');

// 6. then we have the helper methods
const { LIST_STRING_REGEX } = require('../../../helpers/constants');
const { someMethod } = require('../helpers');

// 7. then we have the models
const models = require('../../../models');

// 8. we write the module.exports and list out ALL the methods we will define in this file.
module.exports = {
  V1ReadByAdmin,
  V1ReadByUser,
};
```

DO NOT do the following two things:

1. Do not define the actual function instead of this module.export {}.
2. Do not export each method individually on the same line you define the function.

:white_check_mark: Here is an example of what you should do:

```
// put at top of file
module.exports = {
  V1ReadByAdmin,
  V1ReadByUser,
};

// define methods after exporting
async function V1ReadByAdmin(req) {}
async function V1ReadByUser(req) {}
```

:x: Don't do this:

```
// DO NOT export and define methods at the same time
module.exports = {
  V1ReadByAdmin: async function(req) {},
  V1ReadByUser: async function(req) {},
};
```

Alright, let's continue with the rest of the file structure.

```javascript
/**
 * Read and return an admin
 *
 * GET  /v1/admins/read
 * POST /v1/admins/read
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.args = {
 *   @id - (STRING - OPTIONAL) [DEFAULT - req.admin.id]: The id of an admin
 * }
 *
 * Success: Return an admin.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Read(req, res) {

  const schema = joi.object({
    id: joi.string().uuid().default(req.admin.id).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  req.args = value;

  try {
    const findAdmin = await models.admin.findByPk(req.args.id, {
      attributes: { exclude: models.admin.getSensitiveData() }
    });

    if (!findAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    };
  } catch (error) {
    throw error;
  }
} // END V1Read
```

The actions folder is where we write the majority of our backend logic so get familiar with the structure. If you follow these convention, the codebase will become extremely easy to follow and maintainable over time no matter how many engineers come and go.

> **Testing requirement:** Every `ERROR_CODE` listed in an action's JSDoc header comment must have a corresponding test. The JSDoc comment is not just documentation — it is your test checklist. Before considering an action done, go through every error listed and confirm there is a test that triggers it and asserts the correct response.

---

### An action can call other actions (and enqueue tasks)

Actions are just exported functions, so one action can `require` and call another to reuse its logic instead of duplicating it — and it can `queue.get(...).add(...)` to hand work off to a background task. The full toolbox is available inside an action: read, transaction, edit, enqueue jobs, emit sockets, and call other actions. **Caveat:** an action expects a `req`-shaped first argument (`req.args`, often `req.user`/`req.admin`, the i18n helpers); if the callee reaches deep into `req`/`res`, extract the shared logic into a helper that both call rather than shimming a fake `req`.

### Success Response Shape

Every action returns a plain object. The controller takes that object and calls `res.status(result.status).json(result)`. The shape is always flat:

```javascript
return {
  status: 200,       // HTTP status code — always required
  success: true,     // always true for a success response — always required
  admin: { ... },    // the actual payload — name it after what you're returning
  token: 'abc123'    // additional fields at the same level if needed
};
```

**Which success status code to use:**

| Code | When |
|---|---|
| `200` | The default for everything — reads, updates, queries, logins, and any action that doesn't fit the two cases below. |
| `201` | The action **creates a new resource** (a new database record). `V1Create`, signup, anything that results in a row being inserted and returned. |
| `202` | The action's real work is **handed off to a background job** and the response is just an acknowledgement. The work isn't done yet — it's accepted for processing. |

**Why flat, not nested under `data`?** We don't nest because every action returns semantically different keys anyway — the client already has to know whether to expect `admin`, `user`, `token`, or `order` for each endpoint. Wrapping everything in `data` adds one extra level of destructuring everywhere without actually solving that inconsistency. Flat is cleaner and simpler.




### Tests Folder

> **The most important rule in this entire framework: tests are not optional. Every action and every task must have a corresponding test. No exceptions.**

---

#### Writing Testable Code

Before writing a single test, you need to write code that *can* be tested. The rule is: **separate your logic from your I/O.**

Every action or task does roughly three things:
1. **Load** — fetch data from the database and/or call external APIs
2. **Process** — run the actual business logic on that data
3. **Save** — write results back to the database or trigger downstream side effects

The logic in step 2 should live in its own function — either in the feature's `helper.js` or as a clearly separated function within the action/task. That function takes plain inputs and returns a plain output. It does not call the database. It does not call external APIs. It is pure.

**Good — logic extracted, each piece independently testable:**
```javascript
// helper.js
function calculateOrderResult(order, charge) {
  const tax = order.amount * 0.08;
  const total = order.amount + tax;
  const status = charge.status === 'succeeded' ? 'paid' : 'failed';
  return { tax, total, status, chargeId: charge.id };
}

// V1ProcessOrder.js
async function V1ProcessOrder(req) {
  const order = await models.order.findByPk(req.args.id);
  const charge = await stripeService.charge({ amount: order.amount });
  const result = calculateOrderResult(order, charge);
  await models.order.update(result, { where: { id: order.id } });
  return { status: 200, success: true };
}
```

This is the core principle: **test logic exhaustively at the unit level, test integration minimally at the integration level.**

---

The **tests** folder lives inside every feature folder and contains three sections:

```
- FeatureFolder
  - tests
    - integration
      - V1Action1.test.js
      - V1Action2.test.js
    - tasks
      - V1Task1.test.js
      - V1Task2.test.js
    - helper.test.js
```

`integration/` contains one test file per action. These are full end-to-end integration tests — they spin up the real server, connect to the real test database, and fire real HTTP requests via `supertest`. Each file follows a strict structure:

```javascript
describe('Admin.V1Login', () => {
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));
  let adminFix = null;

  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/login';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  beforeAll(async () => {
    app = await require('../../../../server');
  });

  beforeEach(async () => {
    adminFix = adminFixFn();
    AdminQueue = queue.get('AdminQueue');
    await AdminQueue.obliterate({ force: true });
    await socket.get();
    await reset();
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[logged-out] should login successfully', async () => {
      const res = await request(app).post(routeUrl).send({ email: adminFix[0].email, password: adminFix[0].password });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
    });
  });
});
```

**Test files only — load the env before reading `process.env`.** This is unique to test files: you must load the test env via `require('dotenv').config(...)` **before** you destructure `process.env`.

A few important rules for integration tests:

1. **Always fixture as a function.** Wrap fixture `require` calls in a function and reassign in `beforeEach`. Never share a fixture object directly between tests.
2. **Always obliterate queues in `beforeEach`.** Start every test with an empty Redis queue.
3. **Reset the database in the outer `beforeEach`; populate at the narrowest scope that needs the data.**
4. **If an action enqueues a background job, verify the job was created in the integration test.**
5. **Always close all connections in `afterAll`.**
6. **Group tests by role using `describe`.**

`tasks/` contains one test file per background task. Instead of making an HTTP request, you call the task function directly and then assert on the **output and side effects**.

---

### Testing: Authentication

Most actions require a logged-in user. The convention is to call the login helper from `helpers/tests.js` at the top of each test case that needs authentication:

```javascript
const { adminLogin, userLogin } = require('../../../../helpers/tests');

it('[admin] should update self successfully', async () => {
  const { token } = await adminLogin(app, routeVersion, request, admin1);

  const res = await request(app)
    .post(routeUrl)
    .set('authorization', `jwt-admin ${token}`)
    .send({ firstName: 'New Name' });

  expect(res.statusCode).toBe(200);
});
```

The jwt prefix in the `authorization` header (`jwt-admin`, `jwt-user`) must match the user type.

---

### Testing: What to Assert

Every test should assert two things:

**1. The response** — always check the HTTP status code, the `success` flag, and the shape of the returned data. For error cases, compare the full response body against `errorResponse(i18n, ERROR_CODES.YOUR_ERROR_CODE)`.

**2. The database state** — after a write operation, always query the database directly via models to confirm the change actually landed. Never trust the response alone.

If the action also enqueues a background job, add a third assertion — check Redis for the job.

**Every ERROR_CODE must have a test.** The JSDoc header of every action lists every error it can return. That list is your test checklist.

**Test who cannot do something.** For every role that does NOT have access to an action, there must be a test asserting the correct rejection.

**Test names must describe behavior, not code:**
```javascript
// good — describes behavior
it('[admin] should fail to update timezone if value is not a valid IANA timezone', ...)
it('[logged-out] should fail to update admin', ...)

// bad — describes code
it('test update timezone', ...)
it('should work', ...)
```

---

### Testing: Third-Party APIs

**Scenario 1: The third party has a test environment.** Use it. Point `.env.test` at the third-party's sandbox credentials and let real requests run. Do not mock anything.

**Scenario 2: The third party has no test environment.** Mock at the service wrapper level using `jest.spyOn()`. Never mock the third-party library directly — always mock the method on your own `services/` wrapper.

```javascript
const stripeService = require('../../../../services/stripe');

beforeEach(async () => {
  chargeStub = jest.spyOn(stripeService, 'charge').mockResolvedValue({
    id: 'ch_test_123',
    status: 'succeeded',
    amount: 5000
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

**The rules for mocking:**

1. **Always mock at the service wrapper, never the third-party library.**
2. **Default to `jest.spyOn()`. Use `jest.mock()` only when the dependency is loaded at module level.**
3. **Always call `jest.restoreAllMocks()` in `afterEach` when using `jest.spyOn()`.**
4. **Assert that the mock was called** with `expect(stub).toHaveBeenCalledTimes(1)`.

---

### Testing: Database Scopes (`scope(null)`)

When you need to verify that a record was soft-deleted, bypass the default scope using `.scope(null)`:

```javascript
const user = await models.user.scope(null).findOne({ where: { id: userId } });
expect(user.deletedAt).not.toBeNull();
```

---

### Testing: Socket Emits

Never guard socket emits with `if (NODE_ENV !== 'test')`. Instead, use `jest.spyOn()` to mock `getIO()`:

```javascript
const socket = require('../../../../services/socket');

beforeEach(async () => {
  mockEmit = jest.fn();
  mockTo   = jest.fn(() => ({ emit: mockEmit }));
  jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo });
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

---

### Queue reliability & idempotency

Bull is **at-least-once** — a job can run more than once (a retry, or stall-recovery when a worker dies mid-process). `services/queue.js` sets reliability defaults on **every** queue:

```javascript
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000
}
```

**Tasks must be idempotent** (retries + stall-recovery re-run them): guard on state, use upserts/unique constraints, wrap multi-step writes in a transaction, and dedupe the enqueue with a deterministic `jobId` when you must not double-queue.

### Worker.js

Every feature folder has a `worker.js`. This file is the **router for background jobs** — it registers which task function handles which job name in the queue.

```javascript
module.exports = () => {
  const AdminQueue = queue.get('AdminQueue');

  AdminQueue.process('V1ExportTask', tasks.V1ExportTask);

  AdminQueue.on('failed',  async (job, error) => queueError(error, AdminQueue, job));
  AdminQueue.on('stalled', async job          => queueError(new Error('Queue Stalled.'), AdminQueue, job));
  AdminQueue.on('error',   async error        => queueError(error, AdminQueue));
} // END worker.js
```

**The three things every feature `worker.js` must do:**
1. **Get the queue** — `queue.get('FeatureNameQueue')`.
2. **Register processors** — one `queue.process(jobName, taskFn)` line per task.
3. **Register the three event handlers** — `failed`, `stalled`, and `error`. Always all three.

---

### Tasks Folder

Tasks are background jobs. **A task is basically the same as an action** — same file structure and conventions, same Joi validation, and the same toolbox inside: it reads and writes the database, opens transactions, can enqueue further jobs, can emit socket events, and can call actions. The only differences: instead of receiving `(req, res)` it receives a single `job` object (arguments come from `job.data` instead of `req.args`), and on failure it **throws** instead of returning `errorResponse` (success is `return true`).

```javascript
async function V1ExportTask(job) {
  const schema = joi.object({
    adminId: joi.string().uuid().required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));
  job.data = value;

  try {
    const admin = await models.admin.findByPk(job.data.adminId);
    // ... export logic ...
    return true;
  } catch (error) {
    throw error;
  }
} // END V1ExportTask
```

**Key differences between a task and an action:**

| | Action | Task |
|---|---|---|
| Called by | HTTP request via controller | Bull queue processor in `worker.js` |
| Arguments | `req.args` | `job.data` |
| Validation | `errorResponse(req, ...)` on fail | `throw new Error(...)` on fail |
| Success return | `{ status: 200, success: true, ... }` | `true` |
| Error handling | Returns error response to client | Throws — Bull marks job failed |

---

#### The Aggregate + Singular Task Pattern

When a background job needs to process every record in a large table, **never do it all in one task**. Instead, use two layers:

- **The aggregate task** — queries the database for all target records and enqueues one singular task per record.
- **The singular task** — processes exactly one record.

```
V1CheckAllUsersTask        → aggregate (fans out)
V1CheckUserTask            → singular  (does the work)
```

---

#### How a Job Gets Created

A job is added to the queue from one of three places:

1. **From an action** — when an API request kicks off a background process
2. **From another task** — the aggregate + singular pattern
3. **From a cronjob** — time-triggered, defined in `cronjobs.js`

### helper.js

This file is very self explanatory. Just add any helper methods that are specific to this feature folder here.

### error.js

Every feature folder has an `error.js` that defines all the error codes for that feature. These are automatically aggregated into the global `ERROR_CODES` object in `services/error.js` at startup.

#### Error Code Structure

```javascript
ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
  error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
  status: 400,
  messages: ['ADMIN[invalid_login_credentials]']
}
```

#### Key Naming Convention

**JS object key**: `NAMESPACE_STATUS_DESCRIPTION` — all caps, underscores throughout.
**`.error` string**: `NAMESPACE.STATUS_DESCRIPTION` — a **dot** separates the namespace from the rest.

Both follow the same **three-part structure**:
```
NAMESPACE   _   STATUS_PHRASING   _   SPECIFIC_DESCRIPTION
ADMIN       _   BAD_REQUEST       _   INVALID_LOGIN_CREDENTIALS
```

#### The `messages` Array

`messages` is an array of i18n translation keys. This lets one error code carry multiple phrasings for different contexts. You select which message to use by passing its index to `errorResponse`.

#### Grouping by Action

Organize error codes with inline comments by the action that owns them:

```javascript
const LOCAL_ERROR_CODES = {
  // V1Login
  ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: { ... },

  // V1Create
  ADMIN_BAD_REQUEST_ADMIN_ALREADY_EXISTS: { ... },
};
```

### Languages Folder

Each feature folder can contain a `languages/` subdirectory with one file per supported locale (e.g. `en.js`). These are the source of truth for all user-facing strings in that feature. They are **never used directly at runtime** — they are compiled into the global `locales/` JSON files by `yarn lang`.

**Key naming convention:** Every key must be namespaced with the feature name in brackets.

```
NAMESPACE[key_name]
```

```javascript
// app/Admin/languages/en.js
module.exports = {
  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]':    'Admin account is inactive.',
};
```

**Interpolation:** Use `{{variable}}` syntax for dynamic values.

```javascript
'ADMIN[reset_email_success_message]': 'An email has been sent to {{email}}. Please check your email.',
```

---

## Global Services

The **services** directory is where you put your own wrappers on any third-party APIs you are using. We **HIGHLY RECOMMEND** writing your own wrappers instead of directly using these API node modules directly in your main code. This is because you should be de-coupling your third-party code instead of directly using it in your platform. The reason why you do this is so your app is not soley dependent on this library/service you are using and you can easily switch it out in the future. Also it makes it easier to modify and test.

1. email.js
2. error.js
3. language.js
4. socket.js

### The Error Lifecycle

**4xx client errors** (bad input, auth failures, business rule violations) — you handle these explicitly in your action using `errorResponse`. They never reach the error middleware.

**5xx unhandled errors** (thrown exceptions, rejected promises that bubble up) — Express catches these and routes them to the error middleware. You should never return a 500 manually; just `throw` or let a rejected promise propagate.

### services/error.js

This is the central error registry for the entire application. It defines global error codes, auto-aggregates all feature error codes, and exports the helper functions used everywhere.

#### Global `ERROR_CODES`

```javascript
BAD_REQUEST_INVALID_ARGUMENTS  // 400 — Joi validation failed
UNAUTHORIZED                   // 401 — missing or invalid auth
INTERNAL_SERVER_ERROR          // 500 — unhandled server error
SERVICE_UNAVAILABLE            // 503 — server shutting down
```

#### `errorResponse(i18n, errorCode, errorMessage, statusCode)`

Formats the standard error response sent to the client:

```json
{
  "success": false,
  "status": 400,
  "error": "ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS",
  "message": "The email and/or password you entered is incorrect."
}
```

#### `errorResponseRollback(databaseTransaction, i18n, errorCode, errorMessage, statusCode)`

Identical to `errorResponse` but rolls back an open database transaction first. Use this any time you open a Sequelize transaction and hit an error before the commit.

#### `joiErrorsMessage(errors)`

Extracts a clean string from Joi's validation error object. Always use this instead of accessing `error.details` directly.

#### `queueError(error, queue, job)`

Called in every feature `worker.js` on the `failed`, `stalled`, and `error` events from Bull. Logs the error server-side and in production sends an urgent error email with full context.

### middleware/error.js

Registered as the **last** middleware in `server.js` with `app.use(error)`. Express routes any unhandled thrown error here automatically — you never call it directly.

```javascript
// server.js — error middleware MUST be registered after all routes
app.use('/', router);
app.use(error); // ← always last
```

---

## Socket Architecture (`services/socket.js`)

The socket layer is built on [Socket.IO](https://socket.io/) with a Redis adapter (`@socket.io/redis-adapter`) so events broadcast correctly across multiple Node processes (horizontal scaling).

### How it boots

In `server.js`, `socket.get(newServer)` is called once with the HTTP server. It creates the Socket.IO `Server`, wires up the Redis pub/sub adapter, and stores the live `io` instance in a module-level variable.

### Getting the `io` instance

**Never import `io` directly from `socket.js`.** Always use `getIO()`:

```javascript
const { getIO, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper } = require('../../../services/socket');

const io = getIO();
io.to(SOCKET_ROOMS.GLOBAL).emit(SOCKET_EVENTS.MESSAGE_CREATED, data);
```

### Circular dependency — why actions take a context object

`services/socket.js` imports feature actions at the top of the file. This means those action files **cannot** `require('../../../services/socket')` — they'd create a cycle. The solution is the **context object pattern**: `socket.js` passes `{ io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper }` as a second argument when calling those actions.

### SOCKET_ROOMS and SOCKET_EVENTS

All room and event names are `ALL_CAPS_WITH_UNDERSCORES`. Both the server and the client must use the exact same string. Since these are defined as constants in `socket.js` and exported, import them from there — never hardcode the string.

### Emitting from actions

```javascript
const io = getIO();
const room = `${SOCKET_ROOMS.CONVERSATION}${socketWrapper(id)}`;
io.to(room).emit(SOCKET_EVENTS.MESSAGE_CREATED, data);
```

**Rule: always emit AFTER `t.commit()`.** If you emit before committing the transaction and the commit fails, the client receives an event for a record that doesn't exist in the database. Emit is the last thing that happens before `return`.

### Error handling in socket actions

Socket-invoked actions handle validation and errors **like tasks, not like HTTP actions** — on failure they **throw** instead of returning `errorResponse`.

---

## Global Languages / Locales

### Source Files

Translation strings live in two places:

| Location | Namespace | Purpose |
|---|---|---|
| `languages/en.js` | `GLOBAL[key]` | Strings shared across the entire app |
| `app/FeatureName/languages/en.js` | `FEATURENAME[key]` | Strings scoped to one feature |

### Compiled Output (`locales/`)

Running `yarn lang` merges all source strings and writes `locales/en.json`. **Never edit `locales/*.json` directly.** Edit the source JS files and re-run `yarn lang`.

### Runtime Service (`services/language.js`)

**`getLocalI18n()`** — returns a fresh, isolated i18n instance. **This is what you use in tasks, services, and anywhere outside of an Express action.**

```javascript
const i18n = getLocalI18n();
i18n.setLocale(job.data.locale || 'en');
const message = i18n.__('ADMIN[reset_email_success_message]', { email: user.email });
```

### Locale in Tasks (Background Jobs)

When you enqueue a job that will produce user-facing strings, pass the locale in `job.data`:

```javascript
Queue.add('V1SendWelcomeEmailTask', {
  userId: user.id,
  locale: req.user.locale,
});
```

### Key Safety

Two mechanisms prevent missing translation keys from reaching users silently:

**Compile-time (`validateKeys`):** After `yarn lang` compiles the locale files, it scans all JS files and verifies every key exists in the compiled default locale. In `test` and `production` environments this throws and aborts the process.

**Runtime (`missingKeyFn`):** If a key is somehow missing at runtime, the i18n middleware throws in `test` and `production`.

---

## Global Helpers

The **helpers** directory is where you should place all your global helper methods that are used across your entire application.

1. constants.js
2. cruqd.js
3. logic.js
4. tests.js
5. validate.js

---

### helpers/constants.js

This is the single source of truth for every global constant in the application. If a value is used in more than one place, it belongs here. Never hardcode string literals like `'ADMIN'` or `'PENDING'` directly in actions or tasks — always reference the constant.

#### The dual export pattern — object + array

Every enum-style constant is exported in two forms:

**Object (singular name)** — used for value lookup and safe referencing in code.

**Array (plural name)** — used for Joi validation (`joi.string().valid(...ADMIN_ROLES)`) and iteration.

```javascript
ADMIN_ROLE:  { ADMIN: 'ADMIN', MANAGER: 'MANAGER', EMPLOYEE: 'EMPLOYEE' },
ADMIN_ROLES: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
```

---

### helpers/cruqd.js

**CRUQD** stands for **Create, Read, Update, Query, Delete**. This file contains helper functions that make it easier to work with Sequelize — specifically for the Query pattern.

#### `getOffset(page, limit)`

Converts a page number and page size into a Sequelize `offset` value.

```javascript
getOffset(1, 20) // → 0
getOffset(2, 20) // → 20
```

#### `getOrdering(cols)`

Converts a comma-separated column string into a Sequelize `order` array. Prefix with `-` for descending.

```javascript
getOrdering('-createdAt')        // → [['createdAt', 'DESC']]
getOrdering('lastName,-createdAt') // → [['lastName', 'ASC'], ['createdAt', 'DESC']]
```

#### `convertStringListToWhereStmt(whereStmt, args, list)`

Converts a comma-separated string of IDs in `req.args` into a Sequelize `Op.in` where clause.

#### `parseUrlQueryFilter(args)` — the most important one

Converts bracket-notation operators into Sequelize operators:

```javascript
// Client sends:
{ "createdAt[gte]": "2024-01-01", "createdAt[lte]": "2024-12-31" }

// parseUrlQueryFilter converts to:
{ createdAt: { [Op.gte]: "2024-01-01", [Op.lte]: "2024-12-31" } }
```

This runs automatically on every request via `middleware/args.js`.

---

### helpers/schemas.js

Contains reusable Joi schemas shared across multiple actions. Every export must be suffixed with `Schema`. **Schemas are returned as functions** so callers can chain `.required()` or `.optional()` at the point of use.

```javascript
const { addressSchema, phoneSchema } = require('../../../helpers/schemas');

const schema = joi.object().keys({
  name:    joi.string().required(),
  phone:   phoneSchema().required(),
  address: addressSchema().optional(),
});
```

---

## Global Tests

The **test** directory is the entry point to run tests. When you run

> yarn test

you are essentially running all the tests in this **test** directory. There are four directories

1. app
2. fixtures
3. helpers
4. services

### app directory

The app directory stitches together all the test files from the app feature folders via [test/app/index.js](test/app/index.js).

### fixtures

The fixtures directory is similar to the database/seed directory but instead of loading data into the development database, we are loading test data into the test database.

#### Why fixtures load as SQL, not JavaScript (the `yarn sql` step)

`populate()` runs in **every test's `beforeEach`** — potentially hundreds of times in a single run. `yarn sql fix1` runs once up front and **compiles the JS fixtures into a single flat SQL file** of raw `INSERT` statements. Then `populate('fix1')` simply executes that pre-built SQL **directly against the database** — no ORM, no JS parsing, no validations. **You don't run `yarn sql` by hand.** `yarn test` runs it for you.

#### Fixtures are Baselines, Not Scenarios

A fixture set represents a **baseline** — a clean, minimal, representative starting state. It is not a scenario. Do not create a fixture set for every test case.

**The right approach:** Load the baseline fixture, then mutate it in the test to create the specific scenario you need.

```javascript
it('[logged-out] should fail to login if account is inactive', async () => {
  const admin1 = adminFix[0];
  await models.admin.update({ isActive: false }, { where: { id: admin1.id } });
  const res = await request(app).post(routeUrl).send({ email: admin1.email, password: admin1.password });
  expect(res.statusCode).toBe(400);
});
```

#### Fixture files must have comments explaining every record

Every object in a fixture file should have a comment explaining its role in the baseline and any intentional relationships.

### helpers and services

The last two folders are just there for you to place the tests for the global helpers and global services. These are pure unit tests — they do not boot a server, connect to a database, or manage socket connections.

---

## Mailers

We need a way to effectively create emails with good developer experience. That's what the mailers directory is for.

### Global vs Feature Folder Mailers

Each mailer folder follows the following structure:

```
- mailers
  - MailerFolder1
    - index.ejs
    - preview.html
```

The **index.ejs** is the actual html file that contains the code for the email. The **preview.html** is autogenerated by the **gulpfile.js**.

---

## Migrations

Migrations are used to create and update database tables. We use the [sequelize](https://sequelize.org/) library to manage our migrations. The migrations are located in the **migrations** directory.

When naming the migration file, we follow the following convention:

```
// For creating a new table (model)
Format: DATE-create-MODEL_NAME_SINGULAR-tbl.js
Example: 20230609205440-create-Admin-tbl.js

// For updating existing table columns
Format: DATE-add-cols-COL_ONE_NAME-and-COL_TWO_NAME-to-TABLE_NAME_PLURAL-tbl.js
Example: 20230703230712-add-cols-refundedByAdminId-and-refundedByPartnerId-to-OrderRefunds-tbl.js

// For adding an index to table
Format: DATE-add-index-COL_ONE_NAME_COL_TWO_NAME-to-TABLE_NAME_PLURAL-tbl.js
Example: 20230703230712-add-index-refundedByAdminId_refundedByPartnerId-to-OrderRefunds-tbl.js
```

#### Database Conventions

**Table names** — PascalCase and plural:
```
Users, Admins, CalendarAccounts, ConversationUsers
```

**Column names** — always camelCase:
```
firstName, deletedAt, passwordResetToken
```

**Column ordering** — define columns top-to-bottom in this order:
```sql
CREATE TABLE IF NOT EXISTS Examples (
  -- 1. Primary key — always first
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),

  -- 2. Foreign keys
  otherTableId UUID NOT NULL REFERENCES OtherTables(id),

  -- 3. Third-party vendor IDs
  stripeId VARCHAR DEFAULT NULL,

  -- 4. Customized columns
  col1 INT NOT NULL DEFAULT 1,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,

  -- 5. Autogenerated by Sequelize — always last
  deletedAt TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
```

**Boolean columns** — must begin with a linking/auxiliary verb: `is`, `has`, `can`, `does`, or `should`.

**Foreign key columns** — name them `<entity>Id` in camelCase.

**Timestamps** — all timestamps are stored in UTC. Never store local time.

**Wrap all migrations in a transaction** — both `up` and `down` must use `queryInterface.sequelize.transaction()`.

**Index naming** — always set an explicit `name` on every index: `{TableName}_{columnName}_{unique|idx}`

---

## Custom Scripts

This is where you place any custom script you want to write. For example, if you want to scrape data or perform a one time database operation, put the script in this folder.

---

## The Gulpfile

The [gulpfile.js](gulpfile.js) is a service that is running in the background. When running, it is constantly watching for changes in certain files.

To run the gulpfile run this

> yarn gulp

Our gulpfile specifically watches for the following:

1. If we make changes to the mailers index.ejs files, it will re-compile and update the preview.html
2. If we make changes to the languages JavaScript files, it will re-compile and update the locales JSON files.

---

## Testing Inbound Webhooks Locally (ngrok)

Some third parties don't just respond to requests you make — they **call a webhook URL on your server** when something happens on their side. **ngrok** solves this by opening a secure public tunnel to a port on your machine.

```bash
yarn ngrok:auth <token>   # one-time setup
yarn ngrok                # open a public tunnel to the local server (port 8000)
```

Full ngrok notes live in [docs/ngrok.txt](docs/ngrok.txt).

---

## Health & Readiness Probes

Two infrastructure endpoints defined in `routes.js`:

- **`GET /health` (liveness)** — "is the process up?" No dependency checks. Returns `200` while the process is up.
- **`GET /ready` (readiness)** — "can I serve traffic right now?" Checks `models.db.authenticate()` + a Redis `ping`. Returns `503` if a dependency is unreachable.

---

## Deploying to Heroku

The framework was built to work with Heroku's ecosystem. Do the following to get this app deployed on heroku.

1. Create a Heroku app
2. Add Heroku PostgreSQL database package
3. Add Heroku Redis database package
4. Add config variables, either manually or using the config/heroku-sync.js
5. Connect your project's Github's main branch to this Heroku app.
6. Click Deploy.
7. Add a custom domain name with SSL certificate (Optional)

Basically, all you have to do is push to main branch and then click deploy and it will automatically deploy. The main server, the worker server and the cronjobs server will automatically deploy. We set this up in the [Procfile](Procfile) for Heroku to know what we want to deploy. The Procfile's **`release` phase runs on every deploy: `yarn migrate:prod`** — it applies pending migrations. If the release phase fails, the new release doesn't go live.

---

## Troubleshooting — Common Gotchas

| Symptom | Cause & fix |
|---|---|
| Tests **hang** and never exit after passing | Connections weren't closed. Every test file needs an `afterAll` that closes the queue, socket, DB, and app. |
| Test suite won't start; error about a missing i18n key | You used a `.__('KEY')` that isn't defined. Add it to `languages/*.js` and run `yarn lang`. |
| Env variables come back `undefined` in a test | You read `process.env` **before** loading dotenv. In test files, `require('dotenv').config(...)` must run before you destructure `process.env`. |
| A job is enqueued but **nothing happens** | The worker isn't running. Background jobs only run while `yarn w` is up (and Redis). |
| A scheduled cronjob never fires | The clock process isn't running — start `yarn cron` (and `yarn w` to process what it enqueues). |
| A row you know exists comes back `null` | A default scope (usually soft-delete) is hiding it. Use `Model.scope(null)` to bypass. |
| Parallel test suites fail intermittently | Run with `--runInBand` — suites share one test DB and race otherwise. |
| `401` on a request you expected to be authed | The `Authorization` header prefix must match the type: `jwt-user` / `jwt-admin`. |
| Connection refused on boot | Postgres and/or Redis aren't running. Both are required for the app **and** the test suite. |
| i18n / locale changes don't show up | You edited `locales/*.json` directly — those are compiled output. Edit `languages/*.js` and run `yarn lang`. |

---

## More Documentation

### Conventions

Please read the [docs/conventions.txt](docs/conventions.txt) file to get a better understanding of the best practices and conventions we are using throughout the application.

### Built-In Command Line Commands

Please read [docs/commands.txt](docs/commands.txt) file to see what commands you can use to save you time on writing boilerplate code and just executing without remembering the specific commands.
