---
name: write-tests
description: Write or audit Jest integration/task/unit tests in this codebase following its conventions (real DB, fixtures-as-baselines, every error code tested, auth-rejection tests, --runInBand). Use when the user asks to "write/add tests", "test this action/task", or "improve test coverage".
---

# Write tests

Tests use **Jest + supertest against a real Postgres + Redis** (no DB mocks). Read README "Tests Folder", "Writing Testable Code", "Testing: *" sections. **Postgres and Redis must be running**, and the suite runs **`--runInBand`** (parallel suites race on `sync({force:true})`).

## Writing testable code (do this BEFORE testing)
**Separate logic from I/O.** An action/task does three things: **load** (DB/API), **process** (business logic), **save** (DB/side effects). Extract the *process* step into a **pure function** in `helper.js` (or the global `helpers/logic.js`) — plain inputs → plain output, no DB, no API, no `req`. Then:
- Test that pure function **exhaustively** in `helper.test.js` (every edge case — fast, no DB/server/mocks).
- Test the action/task **integration once** (the happy path + error/auth cases) — its only job is to verify *wiring* (loaded the right record, called the service, wrote the result). Don't re-run every logic edge case through the full HTTP+DB stack.
- If you can't test a piece of logic without a running DB, that's the signal to extract it.

## Where tests live (mandatory — never put a test file anywhere else)
- `app/<Feature>/tests/integration/V1<Action>.test.js` — one per action (full HTTP via supertest).
- `app/<Feature>/tests/tasks/V1<Task>.test.js` — one per task (call the task fn directly, assert side effects).
- `app/<Feature>/tests/helper.test.js` — pure unit tests for `app/<Feature>/helper.js` (no server/DB).
- `test/helpers/<name>.test.js` — pure unit tests for files in `helpers/<name>.js`.
- `test/services/<name>.test.js` — pure unit tests for files in `services/<name>.js`.

**Never drop a test directly in `test/`** — every test file lives in a sub-folder that mirrors where its source lives. A test for `services/email.js` goes in `test/services/email.test.js`; a test for `helpers/logic.js` goes in `test/helpers/logic.test.js`.

## File header (test files only)
- `require('path')` then **load the test env before reading `process.env`**: `require('dotenv').config({ path: '.../.env.test' })` must come **before** `const { ... } = process.env`. dotenv populates `process.env`; destructure first and every env var is blank/undefined. Then the standard import block (built-ins → third-party → services → helpers → models → queues) + test utils (`supertest`, `reset`/`populate`, login helpers). The generated test template already has this order — don't reorder it.

## Lifecycle (integration/task)
- `beforeAll`: `app = await require('../../../../server')`.
- `beforeEach`: reset fixtures (`_.cloneDeep` fresh copy), `queue.get(...).obliterate({force:true})`, `await socket.get()`, `await reset()` (wipes + `sync`), then `await populate('fix1')` (at the narrowest scope that needs it — per-role `describe` for integration; outer `beforeEach` for tasks).
- `afterAll`: `queue.closeAll()`, `socket.close()`, `models.db.close()`, `app.close()`.

## Rules (non-negotiable)
1. **Every action and task has a test** — and so does **every global helper and service.** When you add or change a file in `helpers/*.js` or `services/*.js`, add/update its pure unit test in `test/helpers/` or `test/services/` (named after the file). Don't forget the global layer — it's easy to test features and skip it.
2. **Every `ERROR_CODE` in the action's JSDoc has a test** that triggers it and asserts `expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.X))`. The JSDoc error list is your checklist.
3. **Test who CANNOT do it** — logged-out → 401; wrong user type → 401/403. Authorization gaps are how security bugs ship.
4. **Assert response AND DB state** after writes (don't trust one alone). Add a 3rd assertion for enqueued jobs when the action enqueues.
5. **Fixtures are baselines** — load `fix1`, then mutate in the test (`models.x.update(...)`) for the scenario. Don't make a fixture per scenario.
6. **Test names describe behavior:** `[role] should <outcome> when <condition>`.
7. **`scope(null)`** to assert on soft-deleted/scope-hidden rows.

## Auth in tests
- `const { token } = await userLogin(app, routeVersion, request, userFix[0])` (or `adminLogin`), then `.set('authorization', `jwt-user ${token}`)`.
- Refresh/logout helpers: `refresh(app, v, request, 'users', refreshToken)`, `logout(...)`.
- Multiple users: log each in separately and keep tokens distinct.

## Mocking 3rd parties
- Prefer the vendor's **sandbox** (e.g. SMS test code `'000000'`). Otherwise mock **your service wrapper**, never the library: `jest.spyOn(services/xWrapper, 'method')`. `jest.restoreAllMocks()` in `afterEach`. Use `jest.mock()` only when the dep is required at module top-level.

## Sockets
- Emits: `jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo })` and assert `mockTo`/`mockEmit`. Never guard emits with `NODE_ENV`.
- Socket-only actions: call the action directly with `(args, { io: socket.getIO(), SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper })`.

## Run
`npx jest <path> --runInBand` for a file; `yarn test` for everything (runs `yarn lang` + `yarn sql fix1` first — so add new i18n keys before running, or it throws on missing keys).
