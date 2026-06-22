# Migrations

Migrations are the authoritative record of every schema change. Each file is a
frozen snapshot — run in sequence, they produce the current database state. Never
edit a migration that has already been applied in any environment.

---

## Creating a migration

Two ways to generate the file:

```bash
# Directly — no rename needed when you supply the right name:
./node_modules/.bin/sequelize migration:create --name add-cols-status-to-orders-tbl
./node_modules/.bin/sequelize migration:create --name create-products-model

# Shortcuts (produce a generic name — rename to convention before filling):
yarn migration   # alter-table template
yarn model       # new-table template
```

Both drop a timestamped file into `migrations/`. Rename it to match the filename
convention before editing. Alternatively, run the **add-migration** skill for
step-by-step guidance that also handles the model update, index naming, and
`schema.sql` sync:

```
/add-migration
```

---

## Migration file anatomy

Below is a fully annotated example that adds a `status` column and its index to an
existing `Orders` table.

```js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ─── UP ──────────────────────────────────────────────────────────────────────
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {

      // 1. Add the column.
      //    Use literal strings — migrations are frozen snapshots, never import
      //    constants or model files.
      await queryInterface.addColumn('Orders', 'status', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',   // literal; matches the constant value, not the key
      }, { transaction: t });

      // 2. (Optional) backfill data immediately — useful when adding NOT NULL cols.
      //    Write inline SQL rather than importing models or services.
      await queryInterface.sequelize.query(
        `UPDATE "Orders" SET status = 'PENDING' WHERE status IS NULL`,
        { transaction: t },
      );

      // 3. Add an index.
      //    Name pattern: {Table}_{col}_{idx|unique}
      //    Must match the index name declared in the Sequelize model.
      await queryInterface.addIndex('Orders', ['status'], {
        name: 'Orders_status_idx',
        transaction: t,
      });

    });
  }, // END up

  // ─── DOWN ────────────────────────────────────────────────────────────────────
  async down(queryInterface /*, Sequelize */) {
    return queryInterface.sequelize.transaction(async (t) => {

      // Mirror of up — remove in reverse order.
      await queryInterface.removeIndex('Orders', 'Orders_status_idx', { transaction: t });
      await queryInterface.removeColumn('Orders', 'status', { transaction: t });

    });
  }, // END down

}; // END migration
```

Key points:

- **Always wrap in a transaction.** Both `up` and `down` must use
  `queryInterface.sequelize.transaction(async t => { ... })` and pass
  `{ transaction: t }` to every call. If any step fails the whole migration rolls
  back cleanly.
- **`up` and `down` are symmetric.** Everything added in `up` is removed in `down`,
  in reverse order.
- **Literal strings only.** Do not `require` constants, models, or helpers. The file
  must be self-contained and runnable at any point in history.
- **Index names** follow `{Table}_{col}_{idx|unique}` and must be declared
  identically in both the migration and the Sequelize model definition.
- **Data backfill is encouraged.** After `addColumn`, write inline SQL to populate
  the new column immediately — especially when it is NOT NULL — so the app never
  sees a half-migrated state.
- **Never delete or rename columns/tables directly.** To rename: add the new column,
  copy data in the migration, drop the old column only after the deploy is confirmed
  stable. This preserves rollback safety.

---

## Running migrations

```bash
yarn migrate        # development — applies all pending migrations
yarn migrate:prod   # production
yarn rollback       # undo the last migration (dev only)
```

> `yarn rollback` is a dev convenience. Never run it in production without a
> coordinated deploy plan — it mutates live schema state.

---

## Migration conventions

| Convention | Detail |
|---|---|
| **File name** | `{action}-{description}-tbl` — e.g. `add-cols-status-to-orders-tbl`, `create-products-tbl`, `remove-legacy-token-from-users-tbl` |
| **FK columns** | Always add an index for every new FK column |
| **Owner FK on descendants** | When a descendant table gains an owner FK (e.g. `userId` on a child record), include a composite FK constraint that ties it to the parent row as well |
| **Index names** | `{Table}_{col}_{idx}` for non-unique, `{Table}_{col}_{unique}` for unique — must match the model |
| **Frozen snapshots** | Use literal strings — never import `constants.js`, models, or any app code |
| **Idempotency** | Each migration runs exactly once per environment; never modify an applied migration |

---

## Creating a new table

Full example with UUID primary key, standard timestamps, paranoid soft-delete
(`deletedAt`), and indexes.

```js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('Products', {

      // ── Primary key ──────────────────────────────────────────────────────────
      // No DB-level default — the model's defaultValue: () => uuidv7() always
      // provides the ID before insert. UUID v7 is time-ordered (better index perf).
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },

      // ── Owner FK (carry on every descendant) ─────────────────────────────────
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      // ── Domain columns ───────────────────────────────────────────────────────
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },

      // ── Standard timestamps ──────────────────────────────────────────────────
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      // ── Paranoid soft-delete ─────────────────────────────────────────────────
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

    });

    // ── Indexes ───────────────────────────────────────────────────────────────
    // FK index (required for every FK column)
    await queryInterface.addIndex('Products', ['userId'], {
      name: 'Products_userId_idx',
    });

    // Composite FK — ties (userId, id) to the owner row on the parent table,
    // protecting the descendant from orphaned records even with soft-deletes.
    await queryInterface.addConstraint('Products', {
      fields: ['userId', 'id'],
      type: 'foreign key',
      name: 'Products_userId_id_fk',
      references: { table: 'Users', field: 'id' },   // composite on parent PK
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Non-unique index on a frequently filtered column
    await queryInterface.addIndex('Products', ['status'], {
      name: 'Products_status_idx',
    });

  }, // END up

  async down(queryInterface /*, Sequelize */) {

    await queryInterface.dropTable('Products');

  }, // END down

}; // END migration
```

> `paranoid: true` in the Sequelize model pairs with the `deletedAt` column here.
> Queries automatically filter `WHERE deletedAt IS NULL`; use `scope(null)` to
> bypass the filter when needed.

---

## The schema.sql file

`database/schema.sql` is the human-readable documentation of the current database
state. It is **not executed** — it is a reference snapshot.

After every migration, update `database/schema.sql` to reflect the new table or
column. The **add-migration** skill includes this step. Keep the column order and
comment style consistent with the existing file header.

```
-- Run /add-migration — it handles schema.sql sync automatically.
```
