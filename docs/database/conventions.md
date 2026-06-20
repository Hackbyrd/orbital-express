# Database Conventions

## UUID Primary Keys

Always UUID v4, generated at the ORM level (`defaultValue: DataTypes.UUIDV4`).

```javascript
id: {
  type: DataTypes.UUID,
  allowNull: false,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
  validate: { isUUID: 4 }
}
```

Why not auto-increment integers: UUIDs are unpredictable and safe to expose in URLs. ORM-level generation means you know the ID before the insert — useful when constructing related records or returning a job payload before the database write confirms.

---

## Soft Deletes (`paranoid: true`)

When `paranoid: true` is set on a model, calling `model.destroy()` never issues a SQL `DELETE`. Instead it sets the `deletedAt` timestamp. All standard queries (`findOne`, `findAll`, `findByPk`) automatically filter out soft-deleted records.

```javascript
// normal query — soft-deleted record returns null
await models.user.findByPk(userId);

// scope(null) — bypasses paranoid filter, returns the record
await models.user.scope(null).findOne({ where: { id: userId } });
```

Set `paranoid: false` on models where you want hard deletes (e.g. session records, log entries, anything with no reason to retain after deletion).

---

## Naming Conventions

| Thing | Convention | Examples |
|---|---|---|
| Table names | Plural PascalCase | `Users`, `Orders`, `UserSessions` |
| Column names | camelCase | `firstName`, `userId`, `createdAt` |
| FK columns | `<entity>Id` | `userId → Users.id` |
| Multiple FKs to same table | Role prefix | `hostUserId`, `guestUserId` both → `Users.id` |
| Vendor/third-party IDs | Vendor prefix | `stripeId`, `twilioId`, `auth0Id` |
| Index names | `{Table}_{col}_{idx\|unique}` | `Users_email_unique`, `Orders_userId_idx` |
| ENUM type names | ALL CAPS, no separators | `ACTIVE`, `PENDING`, `INREVIEW` |

### Column Order in Every Table

1. Primary key `id`
2. Foreign keys
3. Third-party vendor IDs
4. Feature-specific columns
5. Sequelize auto-managed: `deletedAt`, `createdAt`, `updatedAt`

---

## Always Index Foreign Keys

Postgres foreign key constraints give referential integrity but create no index. Every `WHERE userId = x` query on a table without that index is a full table scan at scale. No exceptions.

```javascript
indexes: [
  { name: 'Orders_userId_idx', fields: ['userId'] },
  { name: 'Orders_email_unique', fields: ['email'], unique: true }
]
```

Rules:
- **Always index FK columns.** No exceptions.
- **Index any column with a unique constraint.** Use the `indexes` array with `unique: true` — not `unique: true` on the column definition directly.
- **Always set an explicit `name` on every index** — both in the model and in the migration — using `{TableName}_{columnName}_{unique|idx}`. Never rely on auto-generated names.

The model `indexes` array and the migration `addIndex` calls must define exactly the same indexes with exactly the same names.

---

## Flattened Ownership (Carry the Owner FK to Every Descendant)

Carry the owning entity's foreign key onto every descendant table — not just the immediate parent.

```
User -> UserOrder -> UserOrderItem
```

| Column | Table | References |
|---|---|---|
| `userId` | `UserOrders` | `Users.id` |
| `userOrderId` | `UserOrderItems` | `UserOrders.id` |
| `userId` | `UserOrderItems` | `Users.id` — **also here** |

### Why

The owner id is your security scope. Almost every query is "things belonging to this user." With `userId` on every table, every access-control check and list query is a flat `WHERE userId = x` — no JOINs required:

```javascript
// join-free, fully indexed
await models.userOrderItem.findAll({ where: { userId } });
```

Reads vastly outnumber writes. Trades a little redundant storage for join-free reads at scale.

### Required: Composite Foreign Key to Prevent Drift

The redundant `userId` column on a child table can fall out of sync if an order is reassigned. Prevent this at the database level with a composite foreign key:

```javascript
// 1. Add UNIQUE (id, userId) on the parent so it can be a composite FK target
await queryInterface.addConstraint('UserOrders', {
  fields: ['id', 'userId'],
  type: 'unique',
  name: 'UserOrders_id_userId_unique',
  transaction: t
});

// 2. Add composite FK on the child — Postgres rejects any item whose userId
//    doesn't match its order's userId
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

### Scope Rule

- **Always** carry the top-level owner (`userId`) to every descendant. Non-negotiable.
- Carry intermediate ancestor keys onto a deep leaf **only when you actually query that leaf by that intermediate level.** Don't add every ancestor key reflexively.

---

## Boolean Columns

Must start with a linking verb so they read as a yes/no question.

| Prefix | Example |
|---|---|
| `is` | `isActive`, `isVerified` |
| `has` | `hasPassword`, `hasCompletedOnboarding` |
| `can` | `canInviteOthers`, `canEdit` |
| `does` | `doesRequireApproval`, `doesAllowGuests` |
| `should` | `shouldNotify`, `shouldAutoRenew` |

Never a bare noun: `connectionsOnly` → `isConnectionsOnly`.

---

## Sensitive and Private Data

Define at the top of every `model.js` that has sensitive fields:

```javascript
const sensitiveData = ['salt', 'password', 'passwordResetToken'];
const privateData = sensitiveData.concat(['phone', 'birthdate', 'lastOnlineAt']);
```

- **`sensitiveData`** — never exposed to anyone under any circumstances. Excluded from `defaultScope` automatically.
- **`privateData`** — extends `sensitiveData` with fields that are private between users (the owner can see their own `phone`; other users cannot).

Expose via static methods on the model:

```javascript
User.getSensitiveData = () => sensitiveData;
User.getPrivateData   = () => privateData;
```

---

## Associations

Always specify `onDelete` and `onUpdate` explicitly on every association.

- `CASCADE` — child record follows the parent. Use when the child has no meaning without the parent.
- `SET NULL` — FK is nulled when the parent is deleted. Use when the child should survive (e.g. a message should not be deleted because the sender's account was deleted).

Always add a plain-English comment on each association describing the relationship.

```javascript
User.associate = models => {
  // A user has many order records
  User.hasMany(models.userOrder, {
    as: 'userOrders',
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};
```

---

## `database/schema.sql`

Documentation of every table. **Never executed.** Read-only reference so engineers can scan the full schema in one place without jumping between model files.

The column-order template is at the top of the file. Keep it up to date whenever a migration adds or removes columns.

---

## `database/sequence.js`

Defines the table creation order for fixtures and seed data — Sequelize needs to insert parent rows before child rows due to FK constraints. Updated automatically by `yarn gen` when a new feature is scaffolded. Do not edit manually unless you are adding a table that the generator does not know about.
