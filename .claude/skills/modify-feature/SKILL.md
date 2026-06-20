---
name: modify-feature
description: Modify an EXISTING feature — add columns to its table and/or add new actions/tasks/methods — without creating a new feature folder. Use when the user asks to "add a field/column", "update/extend a feature", "add an endpoint to an existing feature", or change behavior on a table that already exists.
---

# Modify an existing feature (Path B — no new folder)

For adding columns and/or methods to a feature that already exists. **This is the SAME process as `create-feature` — the same steps in the same order.** It differs in exactly **two** places: (1) **scaffold** — you skip the one-time *whole-folder* `yarn gen <Feature>` (the folder exists), but you **still scaffold every new action/task/mailer** (`yarn gen <Feature> -a/-t/-m`) — modifying is NOT "no scaffolding"; (2) **migration** — use `yarn migration` to ALTER (add columns), not `yarn model` to create a table. Everything else is identical. **Composes with `create-feature`** — one product feature can create new table(s) AND modify existing one(s); plan all schema changes together, then run `create-feature` per new table and this skill per existing table touched. Full order: schema → scaffold (new pieces) → model → migration → routes → controller → actions/tasks → helpers/services → test → run. Full lifecycle: [docs/workflow.md](docs/workflow.md).

## 0. Plan first
- Decide the new columns (types, defaults, FKs, indexes) and/or the new actions/tasks. Add the new columns to the table's block in `database/schema.sql` (documentation). For small additions just proceed; for anything substantial, confirm the plan.

## Steps (do only the parts your change needs) — order: schema → model+migration → routes/controller → actions/tasks → run
1. **Model + migration first (if adding columns):**
   - **Model:** add the new field definitions to `app/<Feature>/model.js` (and `indexes`/`associate` if the change adds FKs/indexes). Mirror exactly what you put in `schema.sql`.
   - **Migration — ALTER, not create:** make an add-columns migration (see `add-migration`): `yarn migration` → rename to `<ts>-add-cols-<colA>-and-<colB>-to-<TablePlural>-tbl.js`. `addColumn`/`addIndex`/`addConstraint`, transaction-wrapped, named indexes matching the model. **Never** drop or rename in place (rollback safety) — add new, backfill (you can run SQL right in the migration), remove the old one much later.
2. **Routes + controller** — for any new endpoints (feature `routes.js` + controller method).
3. **New actions and/or tasks** → `yarn gen <Feature> -a V1<Action>` / `-t V1<Action>Task`. **Immediately after scaffolding, remove the generator's default scaffold files** with `yarn del <Feature> -a V1Example` / `yarn del <Feature> -t V1ExampleTask` — also remove `tests/helper.test.js` if present. **Never use `rm` directly** — `yarn del` automatically removes the entry from `actions/index.js` / `tasks/index.js`; `rm` does not, leaving a broken export pointing at a deleted file. Then write the body (see `add-action`/`add-query-action`/`add-task`), register task processors in `worker.js`. **As you go**, add supporting code as needed — constants (`add-constant`), error codes (`add-error-code`), i18n (`add-locale` + `yarn lang`), mailers (`add-mailer`), helpers (feature `helper.js`, or global `helpers/` if shared), global services (`services/`) — **and write the test for each thing you write** (see `write-tests`): every new action/task gets a test, every new `ERROR_CODE` is asserted, who-cannot is covered, feature helpers get `helper.test.js`, global helpers/services get `test/helpers/`·`test/services/`. Update fixtures if a new column is required (`add-fixtures` + `yarn sql fix1`).
4. **Run tests:** `npx jest app/<Feature>/tests --runInBand` (Postgres + Redis up), then `yarn test`. Finish with the **`review-conventions`** self-audit.

## The ONLY two differences from `create-feature`
- **Scaffold:** skip the one-time `yarn gen <Feature>` (folder exists) — but **still scaffold new actions/tasks/mailers** with `yarn gen <Feature> -a/-t/-m`. You always scaffold; you just don't re-create the folder.
- **Migration:** `yarn migration` to **ALTER** (add columns), not `yarn model` to create a table. The model is an **edit**, not a new file — keep it in sync with `schema.sql`.
- Everything else (the order, scaffolding, conventions, helpers/services, tests, review) is **identical**.
