---
name: create-feature
description: Scaffold and wire a brand-new feature (a database table + its API) end-to-end in this Express/Sequelize codebase. Use when the user asks to "create/add a feature", "add a new table/model and endpoints", or names a new domain entity (e.g. Order, Product, Post) to build CRUD/query around.
---

# Create a feature end-to-end (Path A — new table + folder)

Build a brand-new feature: a new database table → a new feature folder. **Feature folder names are singular PascalCase** (`Order`, not `Orders`). For editing an existing feature/adding columns, use the **`modify-feature`** skill. **These compose** — a single product feature often needs a new table AND changes to existing ones; do both (plan all schema changes together in Step 0, then run this skill per new table and `modify-feature` per existing table touched). Full lifecycle: [docs/workflow.md](docs/workflow.md). Rules: `docs/conventions.txt` + README.

Do the steps **in this order**: schema → scaffold → model → migration → routes → controller → actions/tasks → helpers/services → test → run. The model/migration come **right after the scaffold** (the table must exist before anything builds on it). This is the SAME process as `modify-feature` — the only differences there are that you skip the whole-folder scaffold (the folder exists, but you still scaffold new actions/tasks/mailers) and use `yarn migration` (ALTER) instead of `yarn model` (create table).

## 0. Plan first (get sign-off before scaffolding)
- Design the table + columns and write them into `database/schema.sql` (the column-order/naming template is at the top). Booleans `is/has/can/does`; FKs `<entity>Id`; carry the owner FK onto descendants; named indexes.
- Decide the **actions** (endpoints) and **tasks** (background jobs) and which roles use them.
- **Present the schema + action/task plan and get a quick sign-off** (this is the product/eng boundary). Then execute the rest autonomously.

## Steps
1. **Schema:** design the table + columns in `database/schema.sql` and get sign-off (Step 0).
2. **Scaffold:** `yarn gen <Feature>` (whole folder + adds the model to `database/sequence.js`), then scaffold its actions/tasks/mailers (`-a`/`-t`/`-m`). **Never hand-create — always scaffold.**
   - **Remove the generator's default scaffold files immediately after:** `yarn del <Feature> -a V1Example` and `yarn del <Feature> -t V1ExampleTask` — also delete `app/<Feature>/tests/helper.test.js` via `yarn del <Feature>` or the appropriate flag. **Never use `rm` directly** — `yarn del` automatically removes the entry from `actions/index.js` / `tasks/index.js`; `rm` does not, leaving a broken export pointing at a deleted file.
3. **Model:** fill in `app/<Feature>/model.js` by hand from `schema.sql`: `id` = `DataTypes.UUID` + `DataTypes.UUIDV4` + `primaryKey` + `validate: { isUUID: 4 }`; regular columns (FKs go in `associate`, not the attributes block); options `timestamps: true`, `paranoid: true`, `freezeTableName: true`, `tableName: '<Plural>'`, `defaultScope` excluding `sensitiveData`; `indexes` named `{Table}_{col}_{idx|unique}` (index every FK); `associate` with explicit `onDelete`/`onUpdate`; `getSensitiveData()`/`getPrivateData()` if it has sensitive fields. The test DB syncs from the model, so it must exist before tests run.
4. **Migration:** create the table migration — see **`add-migration`** (`yarn model` → `<ts>-create-<Feature>-model.js`, transaction-wrapped, attrs + named indexes matching the model, by hand).
5. **Routes:** add `router.all('/v1/<plural>/<action>', controller.V1X)` in `app/<Feature>/routes.js` (lowercase, no separators), then register the feature in the **global `routes.js`**.
6. **Controller:** thin method per route — pick the action by role/device (`req.admin`/`req.user`/`req.device`), `res.status(result.status).json(result)`, `next(error)` on throw. Version+action name only (role/device live on the actions).
7. **Actions and/or tasks:** write each scaffolded action — see **`add-action`**/**`add-query-action`** — and task — see **`add-task`** (register processors in `worker.js`). Add supporting code as the logic needs: **constants** (`add-constant`), **error codes** (`add-error-code`), **i18n** (`add-locale` + `yarn lang`), **mailers** (`add-mailer`).
8. **Helpers and/or services:** extract pure logic into the feature `helper.js`, or the global `helpers/` if shared across features; write/extend a global **service** (`services/`) when wrapping a third party / shared infra.
9. **Test** (see **`write-tests`**): an integration test per action + a test per task (every error code, who-cannot); a `helper.test.js` for feature helpers; and `test/helpers/` / `test/services/` for any global helper/service you touched. Add fixtures (`add-fixtures`): `test/fixtures/fix1/<feature>.js` + `yarn sql fix1` (+ dev seed in `database/seed/set1/` if useful).
10. **Run tests:** `npx jest app/<Feature>/tests --runInBand` (Postgres + Redis up), then `yarn test`. Finish with the **`review-conventions`** self-audit.

> A feature folder must map to a real table — no featureless folders. Model/migration land right after the scaffold precisely because everything after reads/writes the table and the test DB syncs from the model.

## Manual wiring the generator can't do
- Feature routes into the **global `routes.js`**; controller methods for each action.
- Task processor registration in `worker.js`.
- The model fields and migration body (write by hand); fixtures + `yarn sql fix1`; dev seed data.
