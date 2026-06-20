# Data Layer / Models

Every feature folder is tied to a database table. The `model.js` file inside the folder defines that table's schema and behavior for Sequelize (the ORM). At startup, the global `models` aggregator auto-loads every `model.js` and makes them available via a single `models` object. You never import a model directly — you always go through `models`.

**Three distinct layers, three distinct roles:**

| Layer | File | Purpose |
|---|---|---|
| Runtime schema | `app/<Feature>/model.js` | ORM uses this to query and mutate data. Freely updatable. |
| Schema history | `database/migrations/` | What actually modifies the Postgres schema. Once deployed, never edited. |
| Human reference | `database/schema.sql` | Documentation only — never executed. Engineers scan this to understand the full schema without opening every model file. |

---

## Anatomy of a `model.js`

Every model file follows the same top-to-bottom layout. Below is a fully annotated example using the `User` model.

```javascript
/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 *
 * A User is an account. Users authenticate with email + password or
 * Sign in with Google (googleId set).
 */

'use strict';

// third-party
const bcrypt = require('bcrypt');

// helpers
const constants = require('../../helpers/constants');
```

### 1. Sensitive and private data arrays

Defined at the top of the file, before the model, so they can be referenced in both the `defaultScope` and the static methods.

```javascript
// Fields that are NEVER returned to anyone under any circumstances.
// The defaultScope automatically excludes these from every query.
const sensitiveData = ['salt', 'password', 'passwordResetToken', 'accessToken', 'refreshToken'];

// Extends sensitiveData with fields that are private between users.
// The authenticated user can see their own phone/birthdate; another user cannot.
const privateData = sensitiveData.concat(['phone', 'birthdate']);
```

- **`sensitiveData`** — credentials, tokens, secrets. Excluded by `defaultScope` so they can never be accidentally returned.
- **`privateData`** — extends `sensitiveData` with personally private fields. Use `getSensitiveData()` when returning data to the record's own owner; use `getPrivateData()` when returning data about one user to another user.

---

### 2. The `id` column — always UUID v4

```javascript
id: {
  type: DataTypes.UUID,
  allowNull: false,
  defaultValue: DataTypes.UUIDV4,  // generated at the ORM level, before the INSERT
  primaryKey: true,
  validate: { isUUID: 4 }
},
```

UUID v4, always. Generated at the ORM level so you know the ID before the database write — useful when constructing related records or returning a job payload before the insert confirms.

---

### 3. Foreign key placeholder

```javascript
// All foreign keys are added in associations
```

Do not define FK columns in the field definition block. Sequelize adds them automatically when you define associations. The comment is a reminder of this convention.

---

### 4. Regular columns

```javascript
timezone: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'UTC'
},

locale: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: constants.LOCALE.EN  // always reference constants, never string literals
},

isActive: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
},

email: {
  type: DataTypes.STRING,
  allowNull: false,
  // Do NOT set unique: true here — use the indexes array below instead
},

salt: {
  type: DataTypes.STRING,
  allowNull: false
},

password: {
  type: DataTypes.STRING,
  allowNull: false
},
```

---

### 5. Model options

```javascript
{
  timestamps: true,      // Sequelize auto-manages createdAt and updatedAt — never define these manually
  paranoid: true,        // Soft deletes: destroy() sets deletedAt instead of issuing DELETE
  freezeTableName: true, // Prevents Sequelize from auto-pluralizing the model name to derive the table
  tableName: 'Users',    // Must be PascalCase and plural

  defaultScope: {
    attributes: { exclude: sensitiveData }  // sensitiveData fields excluded from EVERY query automatically
  },

  hooks: {
    // Hash on beforeValidate (not beforeCreate) so salt/password are populated
    // before the notNull validation runs.
    // Guarded by changed('password') so it fires on create and on a real password
    // change, but NOT on ordinary profile updates (which would re-hash the existing hash).
    beforeValidate(user, options) {
      if (user.changed('password') && user.password) {
        user.salt = bcrypt.genSaltSync(constants.BCRYPT_ROUNDS);
        user.password = bcrypt.hashSync(user.password, user.salt);
      }
    }
  },

  indexes: [ ... ]  // see below
}
```

---

### 6. Indexes

Three rules:

1. **Always index every foreign key column.** Postgres foreign key constraints give you referential integrity but create no index. Every `WHERE userId = x` without an index is a full table scan at scale. No exceptions.
2. **Index every column with a unique constraint.** Use the `indexes` array with `unique: true`, not `unique: true` on the column definition — this gives you explicit naming and consistency.
3. **Always set an explicit `name` on every index** using the convention `{TableName}_{columnName}_{unique|idx}`. Never rely on auto-generated names. The model index name and the migration's `addIndex` name must match exactly.

```javascript
indexes: [
  // unique constraints
  { name: 'Users_email_unique',                fields: ['email'],                unique: true },
  { name: 'Users_googleId_unique',             fields: ['googleId'],             unique: true },
  { name: 'Users_passwordResetToken_unique',   fields: ['passwordResetToken'],   unique: true },

  // non-unique indexes (for columns you filter/sort by frequently)
  { name: 'Users_role_idx',                    fields: ['role'] },

  // FK index example (if Users had a foreign key)
  { name: 'Users_organizationId_idx',          fields: ['organizationId'] }
]
```

The `indexes` array in the model and the `addIndex` calls in the migration must stay in exact sync — same fields, same names.

---

### 7. Associations

```javascript
User.associate = models => {

  // User has many UserSessions (revocable refresh-token sessions)
  // Deleting a user cascades to all their sessions — sessions have no meaning without the user.
  User.hasMany(models.userSession, {
    as: 'userSessions',
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // User optionally belongs to an Organization
  // SET NULL: deleting the org does not delete the user — the user survives orphaned.
  User.belongsTo(models.organization, {
    as: 'organization',
    foreignKey: { name: 'organizationId', allowNull: true },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

}; // END associate
```

**`CASCADE` vs `SET NULL`:**
- **`CASCADE`** — when the parent is deleted/updated, the child follows. Use when the child has no meaning without the parent (e.g. a session without its user).
- **`SET NULL`** — when the parent is deleted, the FK is set to null. The child survives. Use when the child should outlive the parent (e.g. a message that should remain even if the sender is deleted).

Always add a comment on each association explaining the relationship in plain English. Associations get complex fast — comments make the file navigable.

---

### 8. Static methods

```javascript
// Returns the sensitiveData array — used by actions to exclude fields:
//   attributes: { exclude: models.user.getSensitiveData() }
User.getSensitiveData = () => sensitiveData;

// Returns the privateData array — for user-to-user visibility boundaries
User.getPrivateData = () => privateData;

// Compares a plaintext password against the stored hash
User.validatePassword = async (password, hash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => err ? reject(err) : resolve(result));
  });
};
```

`getSensitiveData()` and `getPrivateData()` are required on every model that has sensitive fields. `validatePassword()` (and similar) are feature-specific static utilities called from actions or passport strategies.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Table name | Plural PascalCase | `Users`, `UserOrders` |
| Model name (Sequelize) | Singular camelCase | `user`, `userOrder` |
| Column names | camelCase | `firstName`, `lastLoginAt` |
| Foreign key columns | `<entity>Id` | `userId`, `organizationId` |
| Boolean columns | `is/has/can/does` prefix | `isActive`, `hasPassword`, `canInvite` |
| Index names | `{Table}_{col}_{unique\|idx}` | `Users_email_unique` |

---

## Soft Deletes (`paranoid: true`)

When `paranoid: true` is set in model options, calling `instance.destroy()` never issues a `DELETE` statement. Instead it sets the `deletedAt` timestamp. Every standard query (`findOne`, `findAll`, `findByPk`) automatically adds `WHERE "deletedAt" IS NULL` — soft-deleted records are invisible to normal queries.

```javascript
// This user record survives in the database — deletedAt is set, not deleted
await user.destroy();

// Standard query — returns null (record is soft-deleted, filtered out by default)
await models.user.findByPk(userId);

// scope(null) — bypasses ALL default scopes, returns the raw record including deletedAt
await models.user.scope(null).findOne({ where: { id: userId } });
```

**Use `scope(null)` when:**
- Asserting in a test that a record was soft-deleted
- Writing admin/cleanup tasks that need to process deleted records
- Building a "restore deleted account" action

Set `paranoid: false` on models where hard deletes are correct — session records, log entries, anything with no reason to retain after deletion.

---

## Sensitive Data and the Default Scope

The `defaultScope` is the query scope applied to every Sequelize query on the model unless explicitly overridden. Its primary job is to exclude sensitive fields so they can never be accidentally returned:

```javascript
defaultScope: {
  attributes: { exclude: sensitiveData }
}
```

**The three visibility levels:**

```javascript
// 1. Public — what any authenticated caller sees (defaultScope applies)
const user = await models.user.findByPk(userId);
// → all columns except sensitiveData fields

// 2. Owner — what the user sees about themselves (exclude only truly secret fields)
const user = await models.user.scope(null).findOne({
  where: { id: req.user.id },
  attributes: { exclude: models.user.getSensitiveData() }
});
// → all columns except salt, password, etc.

// 3. Admin / raw — bypass everything (use sparingly, typically in auth strategies)
const user = await models.user.scope(null).findOne({ where: { id } });
// → all columns including sensitive fields (needed to validate a password)
```

The static methods `getSensitiveData()` and `getPrivateData()` are what make this pattern reusable across actions without hardcoding column names.

---

## Flattened Ownership: Carrying the Owner FK Down

This is one of the most important schema conventions in Orbital-Express. It is also the one that feels wrong to engineers who learned database normalization from textbooks. Read this section carefully.

### The problem with normalized-only schemas

Consider a three-level hierarchy:

```
User  →  UserOrder  →  UserOrderItem
```

The "textbook normalized" approach gives each table a FK only to its immediate parent:

```
UserOrder.userId          → Users.id
UserOrderItem.userOrderId → UserOrders.id
// UserOrderItem has NO direct userId
```

This looks clean. But now answer the most common query: *"What are all the order items belonging to this user?"*

You cannot query `UserOrderItems` directly. You have to JOIN through `UserOrders`:

```sql
SELECT i.* FROM "UserOrderItems" i
JOIN "UserOrders" o ON o.id = i."userOrderId"
WHERE o."userId" = :userId;
```

In Sequelize that means nested `include` chains just to filter by the user. Every additional level of nesting makes this worse.

### The convention: carry the owner FK to every descendant

```
UserOrder.userId          → Users.id          ← immediate parent to owner
UserOrderItem.userOrderId → UserOrders.id     ← to immediate parent
UserOrderItem.userId      → Users.id          ← ALSO to the top-level owner
```

Now the common query is trivial:

```javascript
// Join-free, indexed, fast at any scale
await models.userOrderItem.findAll({ where: { userId } });
```

**Why this is the right trade-off:**

- `userId` is your security scope. Almost every query in the system is "things belonging to *this* user." Having `userId` on every table means every access-control check and every list query is a flat `WHERE userId = x`. This is exactly why every multi-tenant SaaS carries `accountId`/`orgId` on every table regardless of depth.
- Reads vastly outnumber writes. Eliminating joins pays off at scale. The storage cost of a redundant UUID column is negligible.

### Preventing drift with a composite foreign key

The honest downside of a redundant `userId` column is that it can fall out of sync if an order is ever reassigned and the items aren't updated. We solve this at the database level.

**In the model associations:**

```javascript
// UserOrder: plain FK to user
UserOrder.associate = models => {
  UserOrder.belongsTo(models.user, {
    foreignKey: { name: 'userId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};

// UserOrderItem: FK to immediate parent AND a direct FK to the owner user
UserOrderItem.associate = models => {
  // immediate parent
  UserOrderItem.belongsTo(models.userOrder, {
    foreignKey: { name: 'userOrderId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  // owner — for join-free queries and security scoping
  UserOrderItem.belongsTo(models.user, {
    foreignKey: { name: 'userId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};
```

**In the migration:** add a composite FK so Postgres enforces that `item.userId` must equal its parent order's `userId`:

```javascript
// Step 1: UserOrders needs a unique constraint on (id, userId) to be a composite FK target.
// id is already the PK (unique), so (id, userId) is trivially unique — this just lets us
// reference both columns together as a FK target.
await queryInterface.addConstraint('UserOrders', {
  fields: ['id', 'userId'],
  type: 'unique',
  name: 'UserOrders_id_userId_unique',
  transaction: t
});

// Step 2: UserOrderItems.(userOrderId, userId) must match an existing UserOrders.(id, userId).
// Postgres now REJECTS any item insert or update where item.userId != order.userId.
// Drift is now impossible — the database enforces consistency.
await queryInterface.addConstraint('UserOrderItems', {
  fields: ['userOrderId', 'userId'],
  type: 'foreign key',
  name: 'UserOrderItems_userOrderId_userId_fkey',
  references: { table: 'UserOrders', fields: ['id', 'userId'] },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  transaction: t
});
```

You get the best of both worlds: join-free queries with a flat `userId` on the leaf table, and a hard database guarantee that it can never drift out of sync.

### Scope rule — don't overdo it

Always carry the **top-level owner** (`userId`) down to every descendant — it's your scope key and is non-negotiable.

Carry *intermediate* ancestor keys (e.g. `userOrderId` from a mid-level grouping) onto a deep leaf **only when you actually query that leaf by that intermediate level**. Don't reflexively add every ancestor key to every table — that multiplies the write burden for no benefit.

> Owner key: always. Intermediate keys: only when a real query needs them.

---

## `database/sequence.js`

```javascript
/**
 * The table order in which test fixture and seed data is added into the database.
 * Model name must be Lower-case & Singular (NOT the table name).
 */

'use strict';

module.exports = [
  'admin',
  'adminSession',
  'user',
  'userSession'
];
```

**What it does:** when the test framework (or seed scripts) populates the database from fixtures, it must insert rows in FK-safe order — parent tables before child tables. `sequence.js` defines that order.

**Why it matters:** if `userSession` were listed before `user`, the insert would fail because `UserSessions.userId` references `Users.id` which doesn't exist yet. The sequence is effectively the dependency graph for your data layer, expressed as a flat ordered array.

**When to update it:** the generator (`yarn gen FeatureName`) automatically appends the new model name to `sequence.js`. If you ever create a model manually (which you should not), add it yourself — place it after all models it depends on (its FK parents) and before any models that depend on it (its FK children).

---

## Full Annotated Model Example

The complete User model from the codebase, annotated inline:

```javascript
/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 */

'use strict';

// third-party
const bcrypt = require('bcrypt');

// helpers
const constants = require('../../helpers/constants');

// ─── Sensitive / Private Data ─────────────────────────────────────────────────

// These fields are excluded from EVERY query via defaultScope.
// Never add them to a response — the ORM enforces this automatically.
const sensitiveData = ['salt', 'password', 'passwordResetToken', 'accessToken', 'refreshToken'];

// Extends sensitiveData. Use getPrivateData() when returning data about one user to another.
const privateData = sensitiveData.slice();

// ─── Model Definition ─────────────────────────────────────────────────────────

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {

    // Always UUID v4, generated at the ORM level (not by the DB trigger)
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      validate: { isUUID: 4 }
    },

    // All foreign keys are added in associations

    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC'
    },

    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.LOCALE.EN
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    firstName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    lastName:  { type: DataTypes.STRING, allowNull: false, defaultValue: '' },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique enforced via indexes array below, not here
    },

    salt:     { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },

    passwordResetToken:  { type: DataTypes.STRING, allowNull: true },
    passwordResetExpire: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: { isDate: true }
    },

    isEmailConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    loginCount:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastLoginAt:      { type: DataTypes.DATE,    allowNull: true,  defaultValue: null },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.USER_ROLE.USER
    },

    // Bumped on password change or "log out everywhere" to instantly invalidate all
    // outstanding access tokens without touching the DB per-request.
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }

  }, {
    timestamps: true,      // auto-managed createdAt / updatedAt
    paranoid: true,        // soft deletes via deletedAt
    freezeTableName: true, // don't auto-pluralize 'user' → 'users'
    tableName: 'Users',    // PascalCase, plural

    defaultScope: {
      attributes: { exclude: sensitiveData }
    },

    hooks: {
      // Hash BEFORE validation so notNull on salt/password doesn't fail on create.
      // changed('password') guard: fires on create and real password changes only.
      beforeValidate(user) {
        if (user.changed('password') && user.password) {
          user.salt = bcrypt.genSaltSync(constants.BCRYPT_ROUNDS);
          user.password = bcrypt.hashSync(user.password, user.salt);
        }
      }
    },

    indexes: [
      // Unique constraints — defined here, not on the column, for explicit naming
      { name: 'Users_email_unique',               fields: ['email'],               unique: true },
      { name: 'Users_passwordResetToken_unique',  fields: ['passwordResetToken'],  unique: true },
      // Non-unique — frequently filtered
      { name: 'Users_role_idx',                   fields: ['role'] }
    ]
  });

  // ─── Associations ─────────────────────────────────────────────────────────

  User.associate = models => {

    // Each User has many UserSessions (revocable refresh-token sessions).
    // Sessions have no meaning without their user → CASCADE on delete.
    User.hasMany(models.userSession, {
      as: 'userSessions',
      foreignKey: 'userId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

  }; // END associate

  // ─── Static Methods ───────────────────────────────────────────────────────

  // Used by actions: attributes: { exclude: models.user.getSensitiveData() }
  User.getSensitiveData = () => sensitiveData;
  User.getPrivateData   = () => privateData;

  // Used by the passport local strategy and the changePassword action
  User.validatePassword = async (password, hash) => {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hash, (err, result) => err ? reject(err) : resolve(result));
    });
  };

  return User;
}; // END USER MODEL
```
