---
name: add-task
description: Add a background job (Bull/Redis task) to an existing feature in this Express/Sequelize codebase. Use when the user asks to "add a task/background job/worker", schedule async work, or fan out heavy processing (e.g. exports, notifications, syncs).
---

# Add a background task

Tasks run in the worker process, not the request lifecycle. Naming: same as actions but **append `Task`** (`V1ExportTask`). Read README "Tasks Folder", "The Aggregate + Singular Task Pattern", "How a Job Gets Created".

## Steps

1. **Scaffold:** `yarn gen <Feature> -t V1<Action>Task`. Creates `tasks/V1<Action>Task.js` + its test and updates `tasks/index.js`. **Never hand-create.**

2. **Write the task** (`app/<Feature>/tasks/V1<Action>Task.js`):
   - Receives a single `job` object; arguments come from `job.data` (not `req.args`).
   - JSDoc documents `@job.data` fields and `Success`.
   - Joi-validate `job.data`; on failure **`throw new Error(joiErrorsMessage(error))`** (tasks throw — no `errorResponse`, no `res`).
   - Do work in a `try`; on success `return true`; on error `throw` (Bull marks the job failed → `queueError`).
   - `// END V1<Action>Task`.

3. **Register the processor** (manual — the generator can't): in `app/<Feature>/worker.js` add `<Feature>Queue.process('V1<Action>Task', tasks.V1<Action>Task);` and ensure the `failed`/`stalled`/`error` handlers exist.

4. **Enqueue it** from wherever triggers it:
   - From an action: `const q = queue.get('<Feature>Queue'); const job = await q.add('V1<Action>Task', data); return { status: 202, success: true, jobId: job.id };`
   - From a cronjob (`cronjobs.js`) or another task (aggregate → singular fan-out).

5. **Large datasets → Aggregate + Singular pattern:** an aggregate task (`V1CheckAllOrdersTask`) queries targets and enqueues one singular task (`V1CheckOrderTask`) per record. Aggregate only fans out; all business logic lives in the singular task.

6. **Tests:** call the task function directly and assert side effects (DB/email/socket). Task tests do **not** assert enqueue — the action that enqueues does. Run `npx jest app/<Feature>/tests/tasks/V1<Action>Task.test.js --runInBand` (needs Postgres + Redis).

## Notes
- **A task is basically an action with a different trigger.** Same file structure and conventions, same toolbox: Joi validation, DB reads/writes, transactions, editing records, emitting socket events (via `socket.getIO()` — no `req`; emit after commit). Only the wiring differs (`job.data` not `req.args`; `throw` not `errorResponse`; `return true` not a response object).
- **A task can enqueue more jobs and can call actions.** `require` a feature's action and invoke its method to reuse logic in the background instead of duplicating it (e.g. `await V1GenerateReport({ args: {...} })`); use `queue.get(...).add(...)` to fan out further jobs. **Caveat:** actions expect a `req`-shaped arg (`req.args`, often `req.user`/`req.admin`, i18n helpers), so you must hand-build it. If the action reaches deep into `req`/`res`, extract the shared logic into a helper both call instead of shimming a fake `req`.
- **Keep logic separate from I/O (same as actions).** Extract the pure process step into a helper so it's unit-testable without a DB/worker; keep the task thin (load → process → save). See `write-tests`.
- **Tasks MUST be idempotent.** Bull is at-least-once — retries (`attempts: 5` + exponential backoff are set as `defaultJobOptions` in `services/queue.js`) and stall-recovery both re-run a task. Running it twice must be harmless: guard on state (`if (order.isProcessed) return true;`), use upserts/unique constraints, wrap multi-step writes in a transaction, and dedupe the enqueue with a deterministic `jobId` (`queue.add(name, data, { jobId: '...' })`) when you must not double-queue. You don't set retry/backoff per task — it's inherited; `queueError` escalates only on the *final* (attempts-exhausted) failure.
- Locale in tasks: `const i18n = lang.getLocalI18n(); i18n.setLocale(record.locale);` before translating.
- Tasks run as the system — no auth/tokens. If acting "as" a user, pass `userId` in `job.data`.
