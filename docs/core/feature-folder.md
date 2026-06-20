# The Feature Folder

## What is a feature?

One table. One feature. One folder under `app/`.

Every resource in the system — users, orders, invoices, notifications — lives in its own self-contained folder. That folder owns every file related to that resource: the database model, routes, controller, actions, background tasks, emails, translations, and tests. Nothing leaks out; nothing is shared by default.

The rule is strict: **you should not create a feature folder without a corresponding database table.** A feature folder without a model is bad practice and defeats the purpose of the structure.

---

## Anatomy of a feature folder

A fully built-out feature looks like this:

```
app/Order/
├── model.js              # Sequelize model — table schema, associations, static methods
├── controller.js         # Thin routing layer — picks which action to call by role/device
├── routes.js             # Express routes — maps URLs to controller methods
├── worker.js             # Bull worker — registers task processors, handles errors/stalls
├── helper.js             # Feature-specific pure helpers (calculations, formatters)
├── error.js              # Feature-specific error codes (4xx)
├── actions/
│   ├── index.js          # Auto-managed aggregator — never edit by hand
│   ├── V1Create.js
│   ├── V1Query.js
│   └── V1UpdateByAdmin.js
├── tasks/
│   ├── index.js          # Auto-managed aggregator — never edit by hand
│   └── V1ProcessTask.js
├── mailers/
│   └── OrderConfirmation/
│       ├── index.ejs
│       └── preview.html
├── languages/
│   └── en.js             # i18n strings for this feature
└── tests/
    ├── integration/
    │   ├── V1Create.test.js
    │   ├── V1Query.test.js
    │   └── V1UpdateByAdmin.test.js
    ├── tasks/
    │   └── V1ProcessTask.test.js
    └── helper.test.js
```

### What each file does

| File | Responsibility |
|---|---|
| `model.js` | Defines the Sequelize model: columns, indexes, associations, soft-delete behavior, sensitive/private field lists, static methods. |
| `controller.js` | Receives the request, decides which action to call based on `req.admin` / `req.user` / device, calls it, returns the result. No business logic. |
| `routes.js` | Maps URL paths to controller methods. All routes get aggregated into the global `routes.js` at startup. |
| `worker.js` | Connects the feature's Bull queue to its task processors. Handles error and stall events. |
| `helper.js` | Small pure utilities specific to this feature — calculations, formatters, things worth unit-testing in isolation. |
| `error.js` | Feature-scoped error code definitions (4xx responses). Aggregated globally at startup. |
| `actions/index.js` | Re-exports every action in the folder. Auto-managed by `yarn gen` / `yarn del`. Never edit by hand. |
| `actions/V1*.js` | Individual action files — one per HTTP endpoint / role variant. |
| `tasks/index.js` | Re-exports every task in the folder. Auto-managed by `yarn gen` / `yarn del`. Never edit by hand. |
| `tasks/V1*Task.js` | Individual background task files — one per job type. |
| `mailers/*/index.ejs` | EJS email templates. One subfolder per email type. |
| `languages/en.js` | i18n keys for this feature. Compiled by `yarn lang`. |
| `tests/integration/` | Integration tests — one file per action, mirroring the actions folder. |
| `tests/tasks/` | Task tests — one file per task. |
| `tests/helper.test.js` | Unit tests for `helper.js`. |

---

## Why feature folders?

### No bouncing between type-based directories

In a type-based layout (`models/`, `controllers/`, `routes/`, etc.), touching one feature means opening five different directories. A change to Order logic requires editing `models/order.js`, `controllers/order.js`, `routes/orders.js`, `services/order.js`, and so on — jumping around the project constantly.

In a feature folder, everything for Order is in `app/Order/`. Open one directory, do all your work, close it.

### Parallel development without merge conflicts

Two engineers building two features never touch the same files. There are no shared `models/index.js` or `controllers/index.js` files that everyone modifies — aggregation is done automatically at startup. Teams of any size can develop features in parallel without coordinating on file ownership.

### Delete a feature by deleting one folder

Removing a feature from a type-based layout means hunting across the entire codebase. In this structure: `yarn del Order` — done.

### Scale to hundreds of features

The folder structure stays flat and searchable regardless of how many features exist. `app/` at 5 features looks exactly like `app/` at 500 features. There's no "it made sense when we had 10 models" problem to clean up later.

---

## The two workflows inside a feature

All backend work falls into one of two flows:

**1. HTTP action (real-time)**

The client makes a request → middleware runs → `routes.js` matches the URL → `controller.js` picks the action → the action reads/writes the database → returns `{ status, success, ...data }` → controller sends the response. The client waits for the result.

Use this for anything that completes quickly: creating a record, fetching a list, updating a field.

**2. Background task (async)**

The client makes a request → an action validates arguments, enqueues a job, and responds immediately with `202` and a `jobId`. The `worker.js` picks up the job → calls the matching task → the task does the heavy work. The client is notified later (email, socket push, polling).

Use this for anything slow: exporting a million rows, running a complex calculation, sending bulk notifications. Never make a client wait for something that takes more than a second.

Both flows are triggered from the feature folder. The action is the entry point for both.

---

## The generator

Creating a feature involves many files. To avoid writing boilerplate by hand, the framework provides a scaffolding generator at `app/feature.js`, accessed via `yarn gen` and `yarn del`.

**Always use the generator. Never create feature folders or action/task files by hand.**

Every generated file comes pre-filled with the correct structure, imports, naming conventions, and comments so you can start writing logic immediately rather than remembering how to wire up a worker or what the action template looks like.

---

### Generate a complete new feature folder

```bash
yarn gen Order
```

Creates the entire `app/Order/` folder in one command:

- `controller.js` — with a `V1Example` method wired up
- `model.js` — with example column definitions for every Sequelize data type
- `routes.js` — with an example route
- `worker.js` — with queue setup and error/stall handlers
- `helper.js` — empty, ready for feature-specific helpers
- `error.js` — with commented-out example error codes
- `actions/index.js` — auto-managed aggregator
- `actions/V1Example.js` — full action template with Joi validation, error handling, socket and queue examples
- `tasks/index.js` — auto-managed aggregator
- `tasks/V1ExampleTask.js` — full task template
- `mailers/OrderExampleMail/index.ejs` — email template
- `languages/en.js` (and all other configured locales)
- `tests/integration/V1Example.test.js` — full integration test template
- `tests/tasks/V1ExampleTask.test.js` — full task test template
- `tests/helper.test.js` — empty helper test file

It also automatically adds the new model name to `database/sequence.js` so fixture and seed data loads in the correct order.

**After generating a full feature, immediately remove the placeholder scaffold files using `yarn del` — never `rm`.**

`yarn del` automatically removes the entry from `actions/index.js` and `tasks/index.js`. `rm` does not — it leaves a broken export pointing at a deleted file:

```bash
yarn del Order -a V1Example       # removes placeholder action + its test
yarn del Order -t V1ExampleTask   # removes placeholder task + its test
# also remove tests/helper.test.js via the appropriate flag
```

**After generating, you still need to manually:**
1. Add the feature's routes to the global `routes.js`
2. Create the migration file for the new table (`yarn model`)
3. Add fixture data to `test/fixtures/fix1/`
4. Add seed data if needed to `database/seed/set1/`

---

### Generate a new action inside an existing feature

```bash
yarn gen Order -a V1Create
```

Creates:
- `app/Order/actions/V1Create.js` — full action template
- `app/Order/tests/integration/V1Create.test.js` — full integration test template
- Automatically updates `app/Order/actions/index.js` (sorted alphabetically)

**After generating an action, you still need to manually:**
1. Add the route to `app/Order/routes.js`
2. Add the controller method to `app/Order/controller.js`

---

### Generate a new background task inside an existing feature

```bash
yarn gen Order -t V1ProcessOrder
```

Creates:
- `app/Order/tasks/V1ProcessOrder.js` — full task template
- `app/Order/tests/tasks/V1ProcessOrder.test.js` — full task test template
- Automatically updates `app/Order/tasks/index.js` (sorted alphabetically)

**After generating a task, you still need to manually:**
1. Register the task processor in `app/Order/worker.js`

---

### Generate a new mailer inside an existing feature

```bash
yarn gen Order -m OrderConfirmation
```

Creates `app/Order/mailers/OrderOrderConfirmation/index.ejs`. The feature name is automatically prepended to the mailer name if not already present.

---

### Delete a feature, action, task, or mailer

```bash
yarn del Order                      # deletes entire feature folder + removes from sequence.js
yarn del Order -a V1Create          # deletes action + test + removes from actions/index.js
yarn del Order -t V1ProcessOrder    # deletes task + test + removes from tasks/index.js
yarn del Order -m OrderConfirmation # deletes mailer folder
```

`yarn del` is the reverse of `yarn gen`. For actions and tasks it also cleans up the test file and removes the entry from the relevant `index.js` automatically.

**After deleting an action, you still need to manually:**
1. Remove the route from `routes.js`
2. Remove the controller method from `controller.js`

**After deleting a task, you still need to manually:**
1. Remove the processor registration from `worker.js`

---

## Naming rules

### Feature names: singular PascalCase

```
Order     ✅
order     ❌   (lowercase)
Orders    ❌   (plural)
orders    ❌   (lowercase plural)
```

The folder name is singular even though the database table it owns is plural (`Orders`). Singular PascalCase is the convention throughout — model class, folder name, generator argument — and the generator handles the pluralization to the table name automatically.

### One feature per table

There is a strict one-to-one relationship between a feature folder and a database table. If you need to work with data from another feature's table, reference it by ID — you do not import the other feature's model directly. Cross-feature coupling through model imports creates hidden dependencies that make refactoring painful.

### Features are independent

Feature folders do not import from each other. If `Order` needs to know something about a `User`, it receives the `userId` (via the request or the database) and queries `models.user` through the global `models` object. There are no `require('../User/helper')` imports across feature boundaries.

---

## Action and task naming

Every action and task name follows a strict formula:

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| Segment | Required | Description |
|---|---|---|
| `V{version}` | Always | API version number. Always comes first. |
| `{ActionName}` | Always | PascalCase description of what the action does. |
| `By{Role}` | When behavior differs by role | `ByAdmin`, `ByUser`, `ByPartner`, etc. |
| `On{Device}` | When behavior differs by device | `OniOS`, `OnAndroid`, `OnMobile`, `OnWeb`. |

Tasks use the same formula but always append `Task` to the action name:

```
V1Create              → action  (real-time API request)
V1CreateTask          → task    (background job)

V1ExportByAdmin       → action  (receives request, enqueues job)
V1ExportTaskByAdmin   → task    (does the actual export work)
```

### Versioning

The version prefix lets you ship a rewritten version of an action without breaking clients on the old one. `V1Login` and `V2Login` can coexist in the same routes file simultaneously:

```javascript
router.all('/v1/users/login', controller.V1Login);
router.all('/v2/users/login', controller.V2Login);
```

Never skip the version prefix. The cost is zero; retrofitting it later is expensive.

### Role suffix

When an action behaves differently by role, create a separate method per role rather than branching inside one method. The controller routes to the correct one:

```javascript
async function V1Update(req, res, next) {
  let method = null;

  if (req.admin)       method = 'V1UpdateByAdmin';
  else if (req.user)   method = 'V1UpdateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Update
```

Two separate action files are independently editable and independently testable. As the codebase grows, admin behavior and user behavior diverge. Sharing a method couples them in ways that cause subtle bugs.

**When the two role methods share 90% of their logic**, do not push the shared body into `helper.js`. Instead, write a private function in the same action file and have both role methods call it. This function is not exported and is never called by the controller:

```javascript
// Only the two role methods are exported — the controller calls these
module.exports = {
  V1CreateByUser,
  V1CreateByAdmin
};

// PUBLIC: user entry point
async function V1CreateByUser(req, res) {
  // user-only validation / defaults
  return V1Create(req, { isAdmin: false });
} // END V1CreateByUser

// PUBLIC: admin entry point
async function V1CreateByAdmin(req, res) {
  // admin-only validation / extra fields
  return V1Create(req, { isAdmin: true });
} // END V1CreateByAdmin

// PRIVATE: shared logic — not exported, not called by the controller
async function V1Create(req, { isAdmin }) {
  // validate, write to DB, enqueue task, emit socket — the bulk of the action
  return { status: 201, success: true, order: newOrder };
} // END V1Create
```

`helper.js` is for **small**, pure, reusable pieces — a calculation, a formatter — things worth unit-testing in isolation. When the shared piece is the majority of the action, keep it as a private function in the action file so the logic stays where you would look for it.

### Device suffix

Only split on device when the behavior genuinely differs. Options:

```
OniOS       → iOS app only
OnAndroid   → Android app only
OnMobile    → iOS and Android behave identically, but differ from web
OnWeb       → web browser only
(none)      → all platforms behave the same
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

### Complete naming reference

```
// Actions — real-time, return a response
V1Login                          all roles, no device distinction
V1CreateByAdmin                  admin only, no device distinction
V1CreateByUser                   user only, no device distinction
V1UpdateByAdminOniOS             admin only, iOS only
V1UpdateByAdminOnAndroid         admin only, Android only
V1UpdateByAdminOnMobile          admin only, iOS and Android behave the same
V1UpdateByAdminOnWeb             admin only, web only
V1UpdateByAdminManagerOnMobile   admin with Manager role, mobile only

// Tasks — background jobs, always append Task
V1CreateTask                     background version of V1Create
V1ExportTaskByAdmin              background export triggered by admin
V1SyncTaskByUserOnMobile         background sync triggered by user on mobile
```

---

## Routes

Routes follow a strict URL convention: lowercase, no separators, even multi-word paths.

```javascript
router.all('/v1/orders/create',      controller.V1Create);
router.all('/v1/orders/updatebyid',  controller.V1UpdateById);
router.all('/v1/orders/logoutall',   controller.V1LogoutAll);  // run-together, no dashes
```

The URL is the action name lowercased, with the version in the path segment. This makes every URL predictable straight from the action name with no hyphen-vs-underscore decisions to make.

All feature routes are aggregated into the global `routes.js` at startup — add the feature's routes file there after generating a new feature.

---

## Controller

The controller is a thin routing layer. Its only job:

1. Look at the request (`req.admin`, `req.user`, device headers).
2. Determine which action to call.
3. Call it and return the result.
4. Pass unhandled errors to `next(error)`.

No business logic lives in the controller. The controller method naming convention is version + action name only — no role or device suffix (those belong on the action methods):

```
Controller method:   V1Update             ← version + action only
Action methods:      V1UpdateByAdmin, V1UpdateByUser, V1UpdateByAdminOnMobile
```

Every controller method follows this exact pattern:

```javascript
/**
 * Create a new order
 *
 * /v1/orders/create
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Create(req, res, next) {
  let method = null;

  if (req.admin)
    method = 'V1CreateByAdmin';
  else if (req.user)
    method = 'V1CreateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Create
```

The action returns a plain object `{ status, success, ...data }`. The controller calls `res.status(result.status).json(result)`. The action never touches `res` directly for the final response.

---

## Model

The model defines the Sequelize schema for the feature's table. Every `model.js` follows the same layout, top to bottom:

1. **Sensitive and private data arrays** — defined before the model, excluded from default scopes.
2. **The `id` column** — always UUID v4, always generated at the ORM level.
3. **Foreign key placeholder comment** — FKs are added by associations, not in the field block.
4. **Regular columns** — all feature-specific fields.
5. **Model options** — `timestamps`, `paranoid`, `freezeTableName`, `tableName`, `defaultScope`, `hooks`, `indexes`.
6. **Indexes** — always index FKs; always set explicit names using `{TableName}_{columnName}_{unique|idx}`.
7. **Associations** — `hasMany`, `belongsTo`, etc. with explicit `onDelete`/`onUpdate`.
8. **Static methods** — `getSensitiveData()`, `getPrivateData()`, and any feature-specific utilities.

Key rules:

- UUIDs, not auto-increment integers, for primary keys.
- `paranoid: true` enables soft deletes — `destroy()` sets `deletedAt` instead of issuing a DELETE. To see soft-deleted records, bypass with `scope(null)`.
- Always index foreign key columns. Postgres FK constraints give referential integrity but create no index. A `WHERE userId = x` on a table without that index is a full table scan at scale.
- Always carry the top-level owner FK (`userId`) down to every descendant table, not just the immediate parent. This keeps the most common query — "everything belonging to this user" — a flat, indexed, join-free `WHERE userId = x`. Enforce consistency at the database level with a composite foreign key so the redundant column can never drift.

---

## `stringify` utility

```bash
yarn str /absolute/path/to/file.js
```

A utility for developers who need to update the generator templates inside `app/feature.js`. Since templates are stored as JavaScript strings, editing them directly is painful. The workflow: edit the template file → run `yarn str` → copy the output into the relevant template function in `feature.js`. You will rarely need this unless you are changing what the generator produces.
