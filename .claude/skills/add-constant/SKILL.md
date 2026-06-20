---
name: add-constant
description: Add a global constant or enum (e.g. a status set, role list, type list) to helpers/constants.js using the dual-export pattern. Use when the user introduces a new enum/status/type, or you'd otherwise hardcode a string literal like 'PENDING' or 'ADMIN' in code.
---

# Add a global constant / enum

`helpers/constants.js` is the single source of truth for global constants. **No magic strings:** any string literal that is — or is likely to be — used in more than one place (locales, statuses, types, roles, enum-like values) must be defined once here and referenced. Never hardcode `'ADMIN'`, `'PENDING'`, or `'en'` in actions/tasks/models — use `ADMIN_ROLE.ADMIN`, the status constant, `LOCALE.EN`, etc. Read README "helpers/constants.js".

> Example: `defaultValue: 'en'` → `defaultValue: constants.LOCALE.EN`; `joi...default('en')` → `.default(LOCALE.EN)`. If a constant for the value doesn't exist yet, add it (below) rather than typing the literal.

## Rules
- Constant names are `ALL_CAPS_WITH_UNDERSCORES`.
- **Dual-export pattern** — every enum-style constant is exported in two forms, defined as an adjacent pair:
  - **Object (singular name)** — for value lookup in code (autocomplete, typo-safe).
  - **Array (plural name)** — for Joi validation (`joi.string().valid(...XS)`) and iteration.
  ```javascript
  // order statuses
  ORDER_STATUS:  { PENDING: 'PENDING', ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED' }, // object — lookup
  ORDER_STATUSES: ['PENDING', 'ACTIVE', 'COMPLETED'],                              // array — validation
  ```
- **Naming the pair:** prefer natural singular/plural (`WEEKDAY`/`WEEKDAYS`, `PRODUCT_TYPE`/`PRODUCT_TYPES`). Fall back to an `_ARR` suffix only when the plural is awkward (`POST_GENERATED_BY` / `POST_GENERATED_BY_ARR`). Don't mix conventions arbitrarily.
- Group related constants under a comment header; keep the object/array pair adjacent; order alphabetically within a group.

## Usage
```javascript
const { ORDER_STATUS, ORDER_STATUSES } = require('../../../helpers/constants');

if (req.order.status === ORDER_STATUS.PENDING) { ... }      // object for lookup
status: joi.string().valid(...ORDER_STATUSES).required()     // array for Joi
```

## Notes
- **Migrations stay literal.** DB migrations are frozen historical snapshots — do NOT import `helpers/constants` into them (a later rename would rewrite history). Keep the literal and add a `// = SOME.CONSTANT` comment. Live code (models, actions, tasks) uses the constant.
- ENUM **column** values in the DB follow the same set — keep the model's `DataTypes.ENUM(...XS)` and migration ENUM values in sync with the array.
- As the file grows it can be split into `helpers/constants/<domain>.js` with an `index.js` that re-exports everything — a zero-breaking-change migration (import paths stay `../../../helpers/constants`).
