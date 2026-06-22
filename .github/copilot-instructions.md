# GitHub Copilot Instructions — Orbital Express

This project uses **Orbital Express**, an opinionated Express.js + Sequelize framework.
Full conventions are in `AGENTS.md`. The rules below are non-negotiable.

## Never hand-create feature files

Use the generator for everything:
```bash
yarn gen Feature              # full feature scaffold
yarn gen Feature -a V1Action  # add an action
yarn gen Feature -t V1Task    # add a background task
yarn del Feature -a V1Action  # remove generated files (never use rm)
```

## Feature-folder structure

Every feature lives in `app/<FeatureName>/`. One folder = everything for that feature:
model, routes, actions, tasks, tests, languages, mailers.

## HTTP conventions

- POST and GET only — no PUT, PATCH, DELETE
- Use `req.args` — never `req.body` or `req.query`
- Responses are flat: `{ status, success: true, ...payload }` — no `data` wrapper
- Status codes: `200` default, `201` on create, `202` on background-job handoff
- Route URLs are lowercase, no separators (`/v1/users/logoutall` not `/v1/users/logout-all`)

## Naming

- Actions: `V{version}{Action}[By{Role}][On{Device}]` (e.g. `V1CreateOrder`, `V1ListOrdersByAdmin`)
- Tasks: same as actions + `Task` suffix (e.g. `V1CreateOrderTask`)
- Feature folders: singular PascalCase (`Order`, not `Orders`)
- Constants: `UPPER_CASE` — defined in `helpers/constants.js`, never inline magic strings
- Booleans: `is/has/can/does` prefix (e.g. `isActive`, `hasAccess`)
- FK columns: `<entity>Id` camelCase (e.g. `userId`, `orderId`)

## Errors

- HTTP actions: `return errorResponse(req, ERROR_CODES.X, ...)`
- Tasks and socket actions: `throw new Error(...)`
- Never `res.status(500).json(...)` — let `middleware/error.js` handle it

## Models

- UUID v4 primary keys
- `paranoid: true` on every model (soft-delete via `deletedAt`)
- Always index foreign keys
- Named indexes: `{Table}_{col}_{idx|unique}`

## Tests

- Every action has an integration test in `app/<Feature>/tests/integration/`
- Every task has a test in `app/<Feature>/tests/tasks/`
- Every `ERROR_CODE` in the action's JSDoc has a test case
- Always test who *cannot* do something (unauthorized, wrong role, wrong state)
- Run with `yarn test` (uses `--runInBand`; requires Postgres + Redis)

## i18n

- After editing any `app/<Feature>/languages/*.js` file, run `yarn lang`
- i18n keys: `NAMESPACE[snake_case]`

## Packages

- `yarn add <pkg> --exact` only — no `^` or `~` in versions

## JS file structure (every .js file)

```
// header comment
'use strict';

// env vars
// built-in Node modules
// third-party packages
// internal services
// internal helpers
// models
// queues (queue.get('XQueue'))
// module-level constants

module.exports = { ... };  // BEFORE method definitions

// method definitions — close each with: // END methodName
```

## Full conventions

See `AGENTS.md` and `docs/conventions.txt` for the complete rulebook.
