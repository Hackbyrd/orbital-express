# Constants & Enums

## The no magic strings rule

Any string used in more than one place lives in `helpers/constants.js`. Reference `LOCALE.EN`, not `'en'`. Reference `STATUS.ACTIVE`, not `'active'`. If a string literal appears — or is likely to appear — in more than one file, it belongs in constants.

## helpers/constants.js structure

```js
const LOCALE = { EN: 'en', ES: 'es', FR: 'fr' }
const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending' }
```

Each constant is a plain object whose keys are UPPER_CASE shorthand and whose values are the canonical string (or number) the rest of the codebase uses.

## The dual export pattern

```js
module.exports = { LOCALE, LOCALE_ARR: Object.values(LOCALE), STATUS, STATUS_ARR: Object.values(STATUS) }
```

Why: some places need the object (for dot-access in code), some need the array (for Joi `.valid()` validation). Exporting both from the same source keeps them in sync automatically.

## Naming rules

- The object name is `UPPER_CASE` (`LOCALE`, `STATUS`, `TOKEN_TYPE`).
- Values can be lowercase strings (`LOCALE.EN = 'en'`) — that is fine and intentional.
- The array variant appends `_ARR` (`LOCALE_ARR`) or uses a plural name — be consistent within the file.

## Adding a new constant

Use the `add-constant` skill. Never add raw strings anywhere else. The skill ensures the constant and its `_ARR` twin are both exported and that all call sites are updated to reference the constant.

## Migrations stay literal

Migrations are frozen snapshots of schema state at a point in time. They use literal strings, not constants. That is intentional and correct — migrations are never refactored, so the duplication is acceptable and expected.

## Examples of what lives here

- `LOCALE` — language codes (`en`, `es`, `fr`)
- `STATUS` — entity statuses (`active`, `inactive`, `pending`)
- `ROLE` — user roles (`admin`, `member`, etc.)
- `TOKEN_TYPE` — token kinds (`access`, `refresh`)
- Any other enum-like set used in two or more places
