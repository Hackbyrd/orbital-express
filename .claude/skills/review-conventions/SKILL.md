---
name: review-conventions
description: Self-audit changed/new code against this codebase's conventions before declaring work done, or review a diff/PR for convention violations. Use after implementing a feature/action/task/migration, or when the user asks to "review for conventions", "check this follows our patterns", or "audit this code".
---

# Review against conventions (self-audit)

Run this against the files you created/changed BEFORE saying a task is done, or when reviewing a diff. Go through every applicable item; for each, point to the file:line and fix violations. The authoritative rules are `docs/conventions.txt` and the README — this is the fast checklist.

## Every JS file
- [ ] Header comment → `'use strict'` → env → built-ins → third-party → services → helpers → models → queues (`queue.get('XQueue')` instances, right after models) → consts → `module.exports` (before methods) → methods.
- [ ] Imports ordered by increasing length; plain requires before destructured.
- [ ] Every named function closed with `// END <name>`.
- [ ] No `require` of a feature's own `services/socket` from an action it's called by (use the context object).

## Actions / controllers / routes
- [ ] Action name `V{version}{Action}[By{Role}][On{Device}]`; file matches.
- [ ] JSDoc lists route, auth, `Roles`, `req.args`, `Success`, and **every** `Error:` code.
- [ ] Uses `req.args` (never `req.body`/`req.query`); POST/GET only; `req.args = value` after Joi (type coercion).
- [ ] Joi-validates args; HTTP action returns `errorResponse(req, ...)` (or `errorResponseRollback(t, ...)` inside a transaction); socket/task **throws**; `catch` re-throws (no manual 500).
- [ ] Returned records exclude sensitive fields (`attributes: { exclude: models.x.getSensitiveData() }`).
- [ ] Action AND controller have JSDoc headers (route, auth, `Roles`, args, Success, every Error).
- [ ] Flat success `{ status, success: true, ...payload }`; status 200/201/202 correct; no `data` nesting.
- [ ] Controller is thin (role → action → `res.status(result.status).json(result)`, `next(error)`); route registered in feature + global `routes.js`.
- [ ] Role/device variants are separate methods (no role `if/else` in one); pure logic extracted to `helper.js`.
- [ ] Generated via `yarn gen` (not hand-created); `actions/index.js` updated by the generator.

## Models / migrations
- [ ] UUID v4 PK; `paranoid: true`; `tableName` PascalCase plural; `sensitiveData`/`privateData` + `getSensitiveData()`/`getPrivateData()` where there are sensitive fields.
- [ ] FKs in `associate` with explicit `onDelete`/`onUpdate` + plain-English comment; every FK indexed.
- [ ] Booleans `is/has/can/does`; FK cols `<entity>Id`; vendor IDs prefixed; column order (id→FK→vendor→custom→timestamps).
- [ ] ENUM type name ALL CAPS no underscores; ENUM values ALL_CAPS_WITH_UNDERSCORES, synced with the constants array.
- [ ] Owner FK carried onto descendants + composite FK guard where applicable.
- [ ] Named indexes `{Table}_{col}_{idx|unique}`, identical in model AND migration.
- [ ] Migration filename convention; wrapped in a transaction; timestamps defined in migration; model change mirrored; `schema.sql` updated.

## Constants / i18n / errors
- [ ] New enums/statuses in `helpers/constants.js` with the dual-export (object + array) pattern; no hardcoded literals in code.
- [ ] New strings as `NAMESPACE[snake_case]` in `languages/en.js` (+ all locales); `yarn lang` run.
- [ ] New `ERROR_CODES` in feature `error.js`, grouped by action; three-part naming (`NAMESPACE_STATUS_DESC` key, `NAMESPACE.STATUS_DESC` `.error`).

## Tests
- [ ] Every new action/task has a test; **every** `ERROR_CODE` is asserted; who-cannot (auth rejection) tested.
- [ ] Asserts response AND DB state; fixtures used as baselines (mutated in-test).
- [ ] Passes with `npx jest <path> --runInBand` (Postgres + Redis up).

## Dependencies / commands
- [ ] Any new package installed `--exact` (no `^`/`~` in `package.json`).
- [ ] Ran `yarn lang` if i18n changed; ran the relevant tests.

Report findings as a short list (✓ / ✗ file:line), fix the ✗ items, then re-check.
