# Feature Development Workflow

The end-to-end lifecycle for building and modifying features. Building a feature is **one process**. Path A and Path B run the **exact same steps** and differ in only **two** places:

| Step | Path A — new feature | Path B — modify existing |
|---|---|---|
| **Scaffold** | Scaffold the **whole folder** (`yarn gen <Feature>`) plus the actions/tasks/mailers inside. | Folder exists, so skip *that one* command — but you **still scaffold the new actions/tasks/mailers** (`yarn gen <Feature> -a/-t/-m`). |
| **Migration** | `yarn model` — creates the whole **new table**. | `yarn migration` — **alters** the existing table (add columns). |

**Everything else is identical, and you scaffold in BOTH paths.** "Modifying doesn't scaffold" is wrong — adding a method scaffolds an action, adding a job scaffolds a task, adding an email scaffolds a mailer. Path B only skips the one-time *whole-folder* scaffold because the folder already exists.

**They compose — most real features are a MIX.** One product feature might create a new `Bookings` table (A), add a `defaultBookingId` column to `Users` (B), and add a new action to the existing `CalendarAccount` feature (B) — all in one change. Plan **all** the schema changes together in Step 0, then run the steps for each table touched. Use whichever skills apply (`create-feature` and/or `modify-feature`).

This doc is the high-level map. Always follow the rules in [conventions.txt](conventions.txt) and the README.

---

## Step 0 — Plan first (both paths)

The product team decides *what* the feature is; engineering decides *how*. Before writing code:

1. **Design the schema** — which table(s), which columns (types, FKs, defaults, indexes). Write it into [`database/schema.sql`](../database/schema.sql) (documentation; not executed). Follow the column-order / naming template at the top of that file.
2. **Plan the surface** — which **actions** (real-time endpoints) and **tasks** (background jobs) are needed, and which user types/roles use them.
3. **For a net-new table/feature, get sign-off on the schema + action/task plan before scaffolding.** Once agreed, execute the rest end-to-end. (For small Path-B additions, just proceed.)

---

## The steps, in order (both paths)

**schema → scaffold → model → migration → routes → controller → actions/tasks → helpers/services → test → run.** Only the **scaffold** and **migration** steps differ between A and B (see the table above); the rest is the same.

1. **Schema** — design/extend the table + columns in `schema.sql` (Step 0).
2. **Scaffold** —
   - **A:** `yarn gen <Feature>` (singular PascalCase) creates the whole folder + adds the model to `database/sequence.js`; then scaffold its actions/tasks/mailers.
   - **B:** folder exists — scaffold only the **new** pieces (`yarn gen <Feature> -a V1<Action>` / `-t V1<Action>Task` / `-m <Mailer>`).
   - Either way, **never hand-create — you always scaffold.**
3. **Model** — fill in (A) or add fields to (B) `app/<Feature>/model.js` by hand from `schema.sql` (UUID id, columns, FKs in `associate`, named indexes, `paranoid`, sensitive/private arrays). The test DB syncs from the model, so it must exist before tests run.
4. **Migration** —
   - **A:** `yarn model` → `<ts>-create-<Feature>-model.js` (creates the table).
   - **B:** `yarn migration` → `<ts>-add-cols-<col>-and-<col2>-to-<TablePlural>-tbl.js` (adds columns/indexes — NOT a whole table). Never drop/rename in place — add new, backfill, remove later.
   - Both transaction-wrapped, named indexes matching the model.
5. **Routes** — add `router.all('/v1/<plural>/<action>', controller.V1X)` in the feature `routes.js` (lowercase, no separators); register the feature in the **global `routes.js`** (A only — already registered for B).
6. **Controller** — thin method per route: pick the action by role/device (`req.admin`/`req.user`/`req.device`), `res.status(result.status).json(result)`, `next(error)` on throw.
7. **Actions and/or tasks** — write each scaffolded action (Joi validate → `errorResponse` → logic → flat success) / task (`throw` on fail → `return true`); register task processors in `worker.js`. Add supporting code as the logic needs: **languages** (`languages/en.js` + `yarn lang`), **error codes** (`error.js`), **constants**, **mailers**.
8. **Helpers and/or services** — extract pure logic into the feature `helper.js`, or the global `helpers/` if shared across features; write/extend a global `services/` wrapper for a third party / shared infra.
9. **Test** — write a test for everything you wrote: an integration test per action + a test per task (every error code, who-cannot); `helper.test.js` for feature helpers; `test/helpers/` & `test/services/` for any global helper/service touched. Add fixtures (`test/fixtures/fix1/<feature>.js` + `yarn sql fix1`).
10. **Run tests** — `npx jest app/<Feature>/tests --runInBand` (Postgres + Redis up), then `yarn test` for the full suite. Finish with the `review-conventions` self-audit.

> Note: model/migration land right after the scaffold because everything after reads/writes the table and the test DB syncs from the model. A feature folder must map to a real table.

---

## Where scaffolding helps vs where you write by hand

- **Scaffolding (`yarn gen`):** feature folders, actions (`-a`), tasks (`-t`), mailers (`-m`). Always use it — it produces correct structure and auto-maintains `actions/index.js`, `tasks/index.js`, and `sequence.js`.
- **By hand:** the model fields and the migration body — write these yourself so the columns exactly match the agreed schema. (Scaffolds exist for both but you fill in the real fields.)
