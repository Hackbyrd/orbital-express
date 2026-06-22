---
name: add-migration
description: Create a database migration to add a new table or alter an existing one (add columns, indexes, constraints) in this Sequelize/Postgres codebase. Use when the user asks to "add a migration", "add/change a column", "create a table migration", or "add an index/constraint".
---

# Write a migration

Migrations are the source of truth for the **real** database (dev/prod). The test DB is built from the models via `sync`, so when you add a column also add it to the **model**. Read README "Migrations" + "Database Conventions".

## Filename convention (critical — it documents the change)
- **New table:** `<timestamp>-create-<Model>-model.js` (Model singular PascalCase)
- **Alter table:** `<timestamp>-add-cols-<colA>-and-<colB>-to-<TablePlural>-tbl.js`
- **Add index:** `<timestamp>-add-index-<colA>_<colB>-to-<TablePlural>-tbl.js`

Generate the file, then fill it. Two documented ways (both produce a timestamped file you then rename to the convention above):
- `yarn model` — for a NEW table; `yarn migration` — for ALTERing a table. Both create a generically-named file in `migrations/` — **rename it** to the convention.
- Or call the CLI directly with the right name (no rename needed):
  ```
  ./node_modules/.bin/sequelize migration:create --name create-<Model>-model
  ./node_modules/.bin/sequelize migration:create --name add-cols-<col>-to-<TablePlural>-tbl
  ```

## Rules
- **Wrap `up` and `down` in `queryInterface.sequelize.transaction(async t => { ... }, { transaction: t })`** on every call.
- **Never** delete columns/tables or rename in place (rollback safety). To rename: add new column, copy data, drop the old one much later. We don't auto-destroy data.
- IDs: `DataTypes.UUID` with no DB-level default (the model's `defaultValue: () => uuidv7()` always provides the ID before insert). FK column types must match the referenced PK type.
- **Named indexes**, `{Table}_{col}_{idx|unique}`, matching the model's `indexes` array exactly. `addIndex(table, [cols], { name, unique, transaction: t })`.
- Foreign keys: `references: { model, key }`, explicit `onDelete`/`onUpdate`. For self-referencing or composite FKs use `addConstraint(table, { fields, type:'foreign key', name, references:{ table, field }, onDelete, onUpdate, transaction: t })`.
- **Flattened ownership:** when data is nested, carry **every ancestor's id** onto the descendant — not just the immediate parent, but the parent's parent, on up to the top-level owner (e.g. `userId`). It looks redundant on purpose: it flattens the hierarchy so you can query "all X for *any* ancestor" (and scope security to `userId`) as a single indexed `where` with **no joins**. The duplication can't drift because a **composite FK** enforces it (parent needs a `UNIQUE (id, userId)`; child FKs `(parentId, userId)` → parent `(id, userId)`, so Postgres rejects any mismatch). See README "Carry the Owner Foreign Key Down to Every Descendant".
- You may (and are encouraged to) run data-backfill SQL in the migration after `addColumn` — e.g. populate a new NOT NULL column from an existing one so it's ready immediately, instead of a separate script.
- Column order in `createTable` attrs: id → FKs → vendor IDs → custom → `deletedAt`/`createdAt`/`updatedAt`.
- **Timestamps:** all times are UTC. `createdAt`/`updatedAt`/`deletedAt` are auto-managed by the model (`timestamps: true`) but **must be defined explicitly in the migration** attrs.
- **ENUMs:** type name is ALL CAPS, no underscores/spaces/dashes (e.g. `ORDERSTATUS`); values are ALL_CAPS_WITH_UNDERSCORES (e.g. `PENDING_REVIEW`). Keep ENUM values in sync with the matching `constants.js` array.
- Booleans `is/has/can/does`; FK cols `<entity>Id`; vendor IDs prefixed.
- Add-index migration filename: `<timestamp>-add-index-<colA>_<colB>-to-<TablePlural>-tbl.js`.

## Then
- Mirror the change in the **model** (`app/<Feature>/model.js`) — column def and/or `indexes` entry — so `sync` (tests) matches.
- Update `database/schema.sql` documentation.
- `down` must cleanly reverse `up` (remove indexes/constraints before dropping table/column).
