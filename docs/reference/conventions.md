# Conventions Quick-Reference

Dense reference — tables and lists, not prose. For rationale, see `README.md` and `docs/conventions.txt`.

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Code variables | camelCase | `firstName`, `isActive` |
| Feature folders (`app/`) | Singular PascalCase | `Order`, `UserSession` |
| Controllers | Plural | `users.js`, `orders.js` |
| Actions | Singular, formula below | `V1Login`, `V1CreateByAdmin` |
| Tasks | Same as action + `Task` suffix | `V1ExportTaskByAdmin` |
| DB table names | Plural PascalCase | `Users`, `UserOrders` |
| DB column names | camelCase | `firstName`, `createdAt` |
| DB ENUM type names | ALL CAPS, no spaces/underscores/dashes | `ACTIVE`, `PENDINGPAYMENT` |
| FK columns | `<entity>Id` | `userId`, `userOrderId` |
| Multiple FKs to same table | Role prefix | `hostUserId`, `bookerUserId` |
| Third-party vendor IDs | Vendor prefix | `stripeId`, `twilioId` |
| Index names | `{Table}_{col}_{idx\|unique}` | `Users_email_unique` |
| Boolean columns | Linking-verb prefix | `isActive`, `hasPassword`, `canInvite`, `doesRequireApproval` |
| Constants | UPPER_CASE with underscores | `ERROR_CODES`, `LOCALE` |
| Folder/file names | Lowercase, dashes allowed | `my-helper.js`, `auth-migration.md` |
| API route URLs | Lowercase, no separators | `/v1/users/logoutall`, `/v1/orders/updateemail` |
| Page URLs | Lowercase with dashes | `/sign-in`, `/user-profile` |
| Translation keys | `NAMESPACE[snake_case_key]` | `GLOBAL[unauthorized]`, `USER[profile_not_found]` |
| Socket rooms | ALL_CAPS_WITH_UNDERSCORES | `USER`, `CONVERSATION` |
| Socket events | ALL_CAPS_WITH_UNDERSCORES, `FEATURE_ACTION` | `MESSAGE_CREATED` |

---

## Action & Task Naming Formula

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| Segment | Rule |
|---|---|
| `V{version}` | Always first. API version number. |
| `{ActionName}` | PascalCase. What it does. |
| `By{Role}` | Only when behavior genuinely differs by role. |
| `On{Device}` | Only when behavior genuinely differs by platform. |

**Device suffixes:** `OniOS`, `OnAndroid`, `OnMobile`, `OnWeb` — omit if all platforms behave the same.

| Example | Meaning |
|---|---|
| `V1Login` | All roles, all devices |
| `V1CreateByAdmin` | Admin only, all devices |
| `V1UpdateByUser` | User only, all devices |
| `V1ExportTaskByAdmin` | Background job, admin only |
| `V1UpdateByAdminOnMobile` | Admin only, iOS + Android |
| `V1SyncTaskByUserOniOS` | Background job, user only, iOS only |

**Actions** = real-time requests that return a response immediately.
**Tasks** = background jobs (worker process). Always append `Task`.

---

## HTTP Rules

| Rule | Detail |
|---|---|
| Methods | POST and GET only — never PUT, PATCH, DELETE |
| POST | Default for anything that sends data or mutates state |
| GET | Only when args fit cleanly in the URL query string |
| Request args | Always `req.args` — never `req.body` or `req.query` directly |
| URL params | `req.params` only for dynamic path segments (e.g. third-party webhooks) |

---

## Response Shape

Always flat — no `data` nesting.

```js
return {
  status: 200,
  success: true,
  user: { ... },   // named after what you return
  token: '...'     // additional fields at same flat level
};
```

| Status | When |
|---|---|
| `200` | Default (reads, updates, queries, login) |
| `201` | Action creates a new resource / DB record |
| `202` | Action hands work off to a background job |

---

## Error Rules

| Context | How to error |
|---|---|
| HTTP actions | `return errorResponse(req, ERROR_CODES.X, status)` |
| Tasks & socket-invoked actions | `throw new Error(ERROR_CODES.X)` |
| 500 errors | Never return manually — let `middleware/error.js` handle it |

---

## Generator Rules

| Rule | Command |
|---|---|
| Scaffold a feature | `yarn gen Feature` |
| Scaffold an action | `yarn gen Feature -a V1Action` |
| Scaffold a task | `yarn gen Feature -t V1Task` |
| Scaffold a mailer | `yarn gen Feature -m Mailer` |
| Remove scaffold | `yarn del Feature -a V1Example` (never `rm`) |
| Remove task scaffold | `yarn del Feature -t V1ExampleTask` |

**Never hand-create feature files. Never use `rm` on generated files.**
`yarn del` removes the entry from `actions/index.js` / `tasks/index.js`. `rm` does not — it leaves a broken export.
Immediately after scaffolding, delete the generator's placeholder files with `yarn del`.

---

## JS File Structure (every `.js` file, top to bottom)

```
1.  Header comment         — what the file is + what its methods do
2.  'use strict';
3.  ENV variables          — destructured from process.env
4.  Built-in node modules  — fs, path, crypto, ...
5.  Third-party modules    — lodash, joi, moment-timezone, ...
6.  Services               — from services/ (including services/queue.js)
7.  Helpers                — from helpers/, constants, feature helper.js
8.  Models                 — const models = require('.../models')
9.  Queues                 — queue.get('XQueue') instances (right after models)
10. Module-level consts    — optional
11. module.exports         — BEFORE the method definitions
12. Method definitions
```

**Import ordering within each section:** increasing length. Plain whole-module requires first, then destructured, each group ordered by increasing length.

```js
// third-party — plain first (by length), then destructured (by length)
const _ = require('lodash');
const joi = require('joi');
const moment = require('moment-timezone');

// services
const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
```

---

## Module Export Convention

`module.exports` goes **before** the method definitions (methods are hoisted via function declarations).

```js
// ... requires, module-level consts ...

module.exports = { myFunction, anotherFunction };

function myFunction() { ... } // END myFunction
function anotherFunction() { ... } // END anotherFunction
```

---

## Function End Comment

Close every named function with `// END functionName`.

```js
function V1Login(req, res) {
  ...
} // END V1Login
```

Applies to all functions: actions, tasks, helpers, services, middleware.

---

## Comment Headers

**Action header:**
```js
/**
 * <DESCRIPTION>
 *
 * POST <URL>
 *
 * Must be logged in | Must be logged out | Can be both
 * Roles: ['admin']
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): The email of the user
 *   password - (STRING - REQUIRED): The unhashed password
 *   age      - (NUMBER - OPTIONAL): The age of the user
 * }
 *
 * Success: Return logged in user.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   401: Please confirm your email to log in.
 */
```

**General function/method header:**
```js
/**
 * <DESCRIPTION>
 *
 * @arg1 - (NUMBER - REQUIRED) [DEFAULT - 100]: <description>
 * @arg2 - (NUMBER - OPTIONAL) [DEFAULT - 100]: <description>
 *
 * return: true / false or <{ OBJECT }>
 */
```

---

## No Magic Strings

Any string literal used in more than one place (statuses, types, roles, locales, enum-like values) lives once in `helpers/constants.js` and is referenced by name.

```js
// WRONG
if (user.locale === 'en') { ... }

// RIGHT
if (user.locale === LOCALE.EN) { ... }
```

**Exception:** migrations stay literal (frozen historical snapshots). Add a `// = SOME.CONSTANT` comment instead of importing.

Use the `add-constant` skill when introducing new enum-like values.

---

## Foreign Key & Ownership Rules

Carry the owning entity's FK onto **every descendant table**, not just the immediate parent.

```
User -> UserOrder -> UserOrderItem

UserOrder.userId          -> Users.id
UserOrderItem.userOrderId -> UserOrders.id
UserOrderItem.userId      -> Users.id   ← also here (required for flat queries + security scope)
```

**Drift guardrail (required):**
1. Add `UNIQUE (id, userId)` on the parent table.
2. On the child, add composite FK `(userOrderId, userId)` referencing `UserOrders(id, userId)`.

Postgres then rejects any child whose `userId` does not match its parent's `userId`.

**Column order in every table:**
1. Primary key `id`
2. Foreign keys
3. Third-party vendor IDs
4. Feature-specific columns
5. Sequelize auto-generated: `deletedAt`, `createdAt`, `updatedAt`

---

## Auth Conventions

| Concept | Detail |
|---|---|
| Token model | Short-lived access token (JWT, ~15m) + long-lived refresh token (opaque, ~60d) |
| Access token | Signed with `ACCESS_TOKEN_SECRET`; carries `sub`, `type`, `tokenVersion` |
| Access token transport | Response body; sent as `Authorization: jwt-<type> <token>` |
| Refresh token | 256-bit random opaque string — **never store raw**, store SHA-256 hash only |
| Refresh token transport | `httpOnly + Secure + SameSite=strict` cookie (web); also body (mobile) |
| Rotation | Every `/refresh` revokes the current session, issues a new one |
| Reuse detection | Replayed rotated token → revoke all user sessions + bump `tokenVersion` |
| Instant revocation | Bump `<Type>.tokenVersion` to invalidate all access tokens |
| Audience | Per type AND client kind: `user-web`, `user-app`, `admin-web`, `admin-app` |
| Client kind | `X-Client` header (`web`\|`app`); stored on session |
| Platform | `X-Platform` header (metadata only); stored on session; never in token audience |
| Adding a user type | Add entry to `AUTH_TYPES` in `middleware/auth.js` + Passport strategy + `<Type>Sessions` table |

---

## Socket Conventions

| Rule | Detail |
|---|---|
| Always use `getIO()` | Never import `io` directly — it's `null` at require-time |
| Emit after commit | Always emit AFTER `t.commit()`, never before |
| Room naming | ALL_CAPS_WITH_UNDERSCORES; instance rooms use `socketWrapper(id)` |
| Event naming | ALL_CAPS_WITH_UNDERSCORES, format `FEATURE_ACTION` |
| Circular deps | Actions imported by `socket.js` use the context object pattern, not `getIO()` |
| Testing | Never guard emits with `if (NODE_ENV !== 'test')` — mock with `jest.spyOn` |

---

## Translation Key Convention

```
NAMESPACE[key_name]
```

| Part | Rule |
|---|---|
| `NAMESPACE` | ALL_CAPS. Feature name or `GLOBAL` for shared strings |
| `key_name` | all_lowercase_with_underscores — no camelCase, no dashes |

Global strings: `languages/en.js`. Feature strings: `app/FeatureName/languages/en.js`.
Compiled by `yarn lang` into `locales/en.json` — **never edit `locales/*.json` directly**.

---

## helpers/schemas.js Rules

| Rule | Detail |
|---|---|
| Naming | Every export ends in `Schema` |
| Placement | Only add if used in 2+ actions; one-offs stay inline |
| No required/optional | Schemas are functions; callers chain `.required()` or `.optional()` at the call site |
| Composition | Embed into action-level schemas via `.keys()` or direct embedding |

---

## Test File Location

| Source file | Test file |
|---|---|
| `app/<Feature>/actions/V1Action.js` | `app/<Feature>/tests/integration/V1Action.test.js` |
| `app/<Feature>/tasks/V1Task.js` | `app/<Feature>/tests/tasks/V1Task.test.js` |
| `app/<Feature>/helper.js` | `app/<Feature>/tests/helper.test.js` |
| `helpers/<name>.js` | `test/helpers/<name>.test.js` |
| `services/<name>.js` | `test/services/<name>.test.js` |

Never drop a test directly in `test/` root.

---

## Package Versioning

Always install **exact versions** — no `~` or `^` ranges.

```sh
yarn add <module> --exact          # regular dependency
yarn add <module> --exact --dev    # dev dependency
```

Semver reference: `MAJOR.MINOR.PATCH` (e.g. `v2.3.2`).

---

## Common Variable Names

| Variable | Meaning |
|---|---|
| `err` | Error from `await` with a `.catch()` (not in try/catch) |
| `error` | Error caught in a `try/catch` block |
| `req` | Express request |
| `res` | Express response |
| `result` | General result variable |
| `args` | Arguments |

---

## Model Rules (Quick Summary)

| Rule | Detail |
|---|---|
| Primary keys | UUID v7 |
| Soft deletes | `paranoid: true`; use `scope(null)` to bypass |
| FK indexes | Always index foreign key columns |
| Named indexes | `{Table}_{col}_{idx\|unique}` in both model and migration |
| One user type = one table | Never a single table with a role column |
