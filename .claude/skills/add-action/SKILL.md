---
name: add-action
description: Add a new HTTP action (endpoint) to an existing feature in this Express/Sequelize codebase. Use when the user asks to "add an action/endpoint/route" to a feature, e.g. "add a V1Cancel action to Order" or "add an update endpoint to Product".
---

# Add an action to an existing feature

Actions are the real-time API handlers. Naming: `V{version}{Action}[By{Role}][On{Device}]` (e.g. `V1Update`, `V1UpdateByAdmin`). Read README "Actions Folder" + "Actions Folder Structure: Deep Dive".

## Steps

1. **Scaffold:** `yarn gen <Feature> -a V1<Action>`. This creates `actions/V1<Action>.js` + its integration test and auto-updates `actions/index.js`. **Never hand-create.**

2. **Write the action** (`app/<Feature>/actions/V1<Action>.js`) following the JS file structure:
   - JSDoc header: description, route(s) (`GET`/`POST`), the i18n note, auth requirement (`Must be logged in`/`out`/`Can be both`), `Roles: [...]`, `req.params`, `req.args` (each arg typed: `@id - (NUMBER - OPTIONAL) [DEFAULT - ...]`), `Success`, and **every** `Error:` code (this list is your test checklist).
   - `const i18n = lang.getLocalI18n();`
   - Joi `schema` → validate `req.args` → on error `return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error))`; then `req.args = value;` (Joi has now coerced types: `'5'`→`5`).
   - Business logic in a `try`. When returning a record, exclude sensitive fields: `attributes: { exclude: models.<x>.getSensitiveData() }`.
   - For multi-step writes, open a transaction (`const t = await models.db.transaction()`); on a business-rule failure mid-transaction use `errorResponseRollback(t, req, ERROR_CODES.X)`; on success `t.commit()`. If you emit a socket event, emit **after** commit.
   - **Flat** success return: `{ status, success: true, ...payload }` (201 on create, 202 on background-job handoff, else 200). Name keys after content; never nest under `data`.
   - In the `catch`, `throw error` (let it propagate to the error middleware — never `return res.status(500)`).
   - `// END V1<Action>`.

3. **Controller** (`app/<Feature>/controller.js`): add the method to `module.exports` and define it with a **JSDoc header** (route, `Must be logged in`, `Roles`). Pick the action by role (`if (req.admin) method = 'V1<Action>ByAdmin'` …); `401` via `errorResponse(req, ERROR_CODES.UNAUTHORIZED)` if unauthorized; else `const result = await actions[method](req, res); return res.status(result.status).json(result);` and `return next(error)` in catch. For a public endpoint, skip the role check and set `method` directly. The controller can also branch on **device** (`req.device`) to pick an `On{Device}` variant (e.g. `V1SyncByUserOnMobile` vs `V1SyncByUserOnWeb`) — you select the action by role **and** device.

4. **Route:** add `router.all('/v1/<plural>/<action>', controller.V1<Action>)` in `app/<Feature>/routes.js`. **URL = lowercase, no separators, even for multi-word actions** — run the words together, mirroring the action name lowercased: `V1LogoutAll` → `/v1/users/logoutall` (never `logout_all`/`logout-all`/`logoutAll`); `updateemail`, `smssendcode`. (Why: predictable URLs, no hyphen-vs-underscore bikeshedding. Opposite of *page* URLs, which use lowercase-with-dashes.) **Only POST and GET** — never `PUT`/`PATCH`/`DELETE`. The action name already says what's happening (`V1Update`, `V1Delete`), so the verb is redundant; don't waste time deciding which verb fits. If it changes state, it's a POST; reads are GET. (`router.all` accepts either.)

5. **Error codes & i18n:** add any new `ERROR_CODES` to `app/<Feature>/error.js` and their `<FEATURE>[snake_case]` strings to `languages/en.js`; run `yarn lang`. (See the `add-error-code` skill for the structure/naming.)

6. **Tests:** fill the generated test (see `write-tests` skill) — happy path + **every** error code + who-cannot (auth rejection). Run `npx jest app/<Feature>/tests/integration/V1<Action>.test.js --runInBand`.

## Notes
- Role/device variants are **separate exported methods** (`V1CreateByAdmin`, `V1CreateByUser`) — never one method with a role `if/else`. Only these are exported and wired into the controller.
- **Sharing the bulk of the logic — a private `V1<Action>` in the same file (NOT `helper.js`).** When the role methods are ~90% identical, write a third function `V1<Action>` (plain, no role/device) in the **same action file** that does the shared work, and have both role methods call it. It is **not in `module.exports` and not referenced by the controller** — a private internal worker living next to the public methods. The real logic stays in the action file, just not exported.
- **Don't over-use `helper.js`.** `helper.js` is for **small**, pure, reusable bits (a calculation, a formatter) worth unit-testing in isolation. When the shared piece is the *majority* of the action, keep it as the private `V1<Action>` above — don't reflexively move big shared bodies into another file. Rule of thumb: **small slice → `helper.js`; big shared body → private function in the action.**
- **Feature `helper.js` vs global `helpers/`.** A helper used by only this feature goes in the feature's `helper.js`. The moment it's shared across multiple features, promote it to the global `helpers/` folder (and add a test in `test/helpers/`). Don't duplicate shared logic across feature folders.
- **An action can call other actions and enqueue tasks.** Actions are just exported functions — `require` and call another to reuse logic, or `queue.get(...).add(...)` to hand off background work. The full toolbox (read, transaction, edit, enqueue, emit sockets, call actions) is available. Caveat: the callee expects a `req`-shaped arg (`req.args`, often `req.user`/`req.admin`, i18n); if it reaches deep into `req`/`res`, extract shared logic into a helper both call instead of shimming a fake `req`.
- **Keep logic separate from I/O (for testing).** An action is load → process → save; pull the pure *process* step into a helper so it's unit-testable without a DB/server, keeping the action thin. If you can't test logic without a running DB, extract it. See `write-tests`.
- A socket-invoked action takes `(args, context)` and **throws** on validation failure (like a task), not `errorResponse`.
- Building a list/search endpoint with pagination/filtering/sorting? Use the **`add-query-action`** skill — it covers the `cruqd` helpers.
