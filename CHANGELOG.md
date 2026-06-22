# Changelog

All notable changes to Orbital Express are documented here.

Versioning follows [Semantic Versioning](https://semver.org/):
- **Patch** `3.0.x` — bug fixes, doc corrections, small tweaks
- **Minor** `3.x.0` — new features, non-breaking additions
- **Major** `x.0.0` — breaking changes or full rewrites

---

## [3.0.0] — 2026-06-21

### Overview
Third-generation rewrite of Orbital Express. The framework has been significantly expanded with a production-hardened auth system, a comprehensive VitePress documentation site, and a complete agent/AI skill layer for developer tooling.

### Added
- **Dual-token auth system** — short-lived access JWT + opaque revocable refresh token, one strategy per user type (`User`, `Admin`, etc.), reuse detection, `tokenVersion`-based instant revocation
- **Graceful shutdown** — `middleware/exit.js` drains in-flight requests, closes queues/sockets/DB before process exit
- **Security layer** — Redis-backed rate limiting on all routes + stricter limits on credential endpoints, AES-256-GCM encryption at rest (`services/secure.js`), bcrypt with timing-safe login
- **Health & readiness probes** — `GET /health` (liveness) and `GET /ready` (checks Postgres + Redis)
- **VitePress documentation site** — full docs at https://hackbyrd.github.io/orbital-express/ with guides, reference, tutorials, and changelog
- **GitHub Actions CI** — automated docs deployment on every push to `docs/**`
- **Agent/AI skill layer** — `.claude/skills/` playbooks for every common task (create-feature, add-action, add-migration, write-tests, etc.)
- **`req.args` normalization** — `middleware/args.js` unifies POST body and GET query into one object; bracket-notation filter operators (`date[gte]=…`) auto-converted to Sequelize operators
- **`req.params` convention** — documented when to use URL path segments vs `req.args`
- **Audience × platform auth model** — `X-Client` header (`web`/`app`) sets the JWT audience; `X-Platform` header (`ios`/`android`/`macos`/…) stored as metadata on the session row
- **`helpers/session.js`** — session creation, rotation, and revocation helpers extracted from auth actions
- **`helpers/schemas.js`** — shared reusable Joi schemas with function-export pattern
- **`services/secure.js`** — AES-256-GCM reversible encryption for sensitive fields

### Changed
- **JS file structure** — import order now enforced: header → `'use strict'` → ENV → built-ins → third-party → services → helpers → models → queues → consts → `module.exports` → methods; imports ordered by increasing line length within each section
- **Naming conventions** — actions: `V{n}{Action}[By{Role}][On{Device}]`; tasks always append `Task`; no exceptions
- **Route URL convention** — all lowercase, no separators (e.g. `V1LogoutAll` → `/v1/users/logoutall`)
- **Controller pattern** — role check happens in controller before calling action; action returns plain object `{ status, success, ...payload }`; controller calls `res.status().json()`
- **Error handling** — HTTP actions return `errorResponse`; tasks and socket actions `throw`; never return 500 manually
- **Model conventions** — UUID v7 PKs always ORM-generated; `paranoid: true` default; named indexes on every FK; owner FK carried down to every descendant table with composite FK guard
- **Constants pattern** — dual export: `ADMIN_ROLE` (object) + `ADMIN_ROLES` (array); no magic strings anywhere
- **Test file location** — mirrors source location exactly; never drop tests in `test/` root

### Removed
- Legacy single-table role-column user pattern (replaced by one table per user type)

---

<!-- TEMPLATE — copy this block when cutting a new release

## [3.x.x] — YYYY-MM-DD

### Overview
One-sentence summary of what this release is about.

### Added
- …

### Changed
- …

### Fixed
- …

### Removed
- …

### ⚠ Breaking Changes
- …

-->
