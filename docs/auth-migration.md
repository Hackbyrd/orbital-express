# Authentication Migration Plan

**Status:** Planning → Execution
**Goal:** Move from the current "JWT with no expiry, no revocation" setup to a modern, best-practice **access token + refresh token** architecture with rotation, reuse detection, and server-side revocation — without breaking the existing multi-user-type design (`Admin`, `User`, …).

This document is the source of truth. Work proceeds in phases; check off each item as it lands.

---

## 1. Background — how auth works today

**Login** (`app/<Type>/actions/V1Login.js`): Joi-validates email/password → `passport.authenticate('JWT<Type>Login')` (local strategy) → checks `isActive`/`deletedAt` → updates `loginCount`/`lastLogin` → `createJwtToken()` (jwt-simple, **no `exp`**) → sets a plain cookie + returns the token.

**Per request** (`server.js` order): `attachJWTAuth` → `JWTAuth` → `verifyJWTAuth` (`middleware/auth.js`).
- `attachJWTAuth` puts the two passport authenticators on `req.JWTAuth`.
- `JWTAuth` reads the `Authorization` header, picks `JWTAuthUser`/`JWTAuthAdmin` by scheme (`jwt-user`/`jwt-admin`), or `next()` if absent (public routes).
- The JWT strategy verifies the signature and loads the record → passport sets `req.user`.
- `verifyJWTAuth` sets the locale and, if the scheme was `jwt-admin`, moves `req.user` → `req.admin`.

**Problems being fixed:** tokens never expire; no revocation/logout server-side; `iss`/`aud` are set but never validated; loose substring scheme matching; the 4-place if/else chain; plain (non-httpOnly/Secure) cookie.

---

## 2. Target architecture

### Two-token model

| Token | Lifetime | Form | Stored | Sent on |
|---|---|---|---|---|
| **Access token** | ~15 min | Stateless JWT (signed, `exp`/`iss`/`aud` enforced) | No | Every request, `Authorization: jwt-<type> <token>` |
| **Refresh token** | ~60 days | Opaque random string (256-bit) | **Yes — SHA-256 hash** in the session table | Only to the refresh endpoint |

**Why:** short access token = small blast radius and self-expiring; the refresh token is opaque and stored server-side so it can be **revoked** (real logout). JWTs can't be revoked — that's why the refresh token is not a JWT.

**Hashing:** refresh tokens are high-entropy random values, so hash with **SHA-256** (fast), not bcrypt (bcrypt is for low-entropy passwords). Store only the hash; the raw token is shown to the client once.

### Rotation + reuse detection

- Every successful refresh **issues a new refresh token and invalidates the old one** (`replacedBySessionId` links the chain).
- If a refresh token that was already rotated out is presented again → **theft signal** → revoke the entire session family for that user (and bump `tokenVersion`).

### Instant access-token revocation — `tokenVersion`

- Add `tokenVersion` (INT, default 0) to `Users` and `Admins`.
- Embed it in the access token; the JWT strategy compares the token's `tokenVersion` to the user's current value and rejects on mismatch.
- Bump `tokenVersion` to kill all of a user's access tokens immediately (password change, "log out everywhere", compromise).

### Secrets & transport

- **Separate secrets:** `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`.
- **Web:** refresh token in an **httpOnly + Secure + SameSite=strict** cookie; access token held in memory by the client.
- **Mobile:** refresh + access tokens returned in the response body, stored in Keychain/Keystore.
- Enforce `exp`, `issuer`, `audience` in the JWT strategy (currently `iss`/`aud` are decorative).
- Migrate `jwt-simple` → **`jsonwebtoken`** (handles `exp`/`nbf`/`iss`/`aud` verification natively). Install exact: `yarn add jsonwebtoken --exact`.

### Session tables — one per user type (matches our conventions)

`UserSession` (FK `userId` → Users) and `AdminSession` (FK `adminId` → Admins). Real foreign keys, one-table-per-type, flattened owner key — consistent with the rest of the framework. A new user type → `yarn gen <Type>Session`.

**Columns** (per the database conventions — column order, `is*` booleans, `<entity>Id` FKs, Sequelize timestamps last):

```
id                   UUID PK
userId / adminId     UUID FK → owner table (indexed)   // flattened owner key
refreshTokenHash     STRING  (SHA-256 hash, indexed, unique)
replacedBySessionId  UUID FK → same session table, nullable  // rotation chain
expiresAt            TIMESTAMP   // refresh token expiry
revokedAt            TIMESTAMP nullable
lastUsedAt           TIMESTAMP nullable
userAgent            JSONB nullable
ipAddress            STRING nullable
deletedAt / createdAt / updatedAt
```

> Decision (confirmed): **separate per-type session tables** + **`tokenVersion`** on each user table.

### Background tasks

Unchanged. Tasks run as the system, not as an authenticated user; when a task acts on behalf of a user it already receives `userId` in `job.data`. No tokens involved.

---

## 3. The flows

**Login** (`V1Login`, per type):
1. Validate, authenticate via local strategy, check active/deleted (as today).
2. `createAccessToken(user, audience, type)` — 15 min, includes `sub`, `type`, `tokenVersion`, `iss`, `aud`, `exp`.
3. `createRefreshToken()` → raw token; store `hashToken(raw)` in a new session row with `expiresAt`, `userAgent`, `ipAddress`.
4. Web: set refresh cookie (httpOnly/Secure/SameSite=strict). Mobile: return both tokens in body.
5. Return access token (+ refresh token for mobile). Status `201`.

**Every request:** passport-jwt extracts the access token → verifies signature + `exp` + `iss` + `aud` → loads user → checks `tokenVersion` → sets `req.user`/`req.admin` (existing middleware, refactored).

**Refresh** (`V1Refresh`, per type): read refresh token (cookie or body) → `hashToken` → find session → reject if missing/expired/revoked → if already rotated (has `replacedBySessionId`) → **reuse detected**: revoke family + bump `tokenVersion` → else rotate (revoke old, create new linked session) → issue new access + refresh. Status `200`.

**Logout** (`V1Logout`): revoke the current session (`revokedAt`/soft-delete), clear cookie. **`V1LogoutAll`**: revoke all of the user's sessions + bump `tokenVersion`. Status `200`.

---

## 4. Migration phases (file-by-file checklist)

### Phase 1 — Token primitives & config ✅ COMPLETE
- [x] `yarn add jsonwebtoken --exact` → jsonwebtoken@9.0.3 installed, exact-pinned. (`jwt-simple` still used by socket auth until Phase 3 — remove then.)
- [x] env vars added to config files: `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` (distinct), `ACCESS_TOKEN_EXPIRES_IN=15m`, `REFRESH_TOKEN_EXPIRES_IN=60d`. (NOTE: `createAccessToken` throws if `ACCESS_TOKEN_EXPIRES_IN` is missing — ensure it's in every env file.)
- [x] `helpers/logic.js`:
  - `createAccessToken(user, audience, type)` → jsonwebtoken-signed with `sub`, `type`, `tokenVersion`; `exp`/`issuer`/`audience` enforced via options. ✅
  - `createRefreshToken()` → `crypto.randomBytes(32).toString('hex')`. ✅
  - `hashToken(raw)` → SHA-256. ✅
  - `createJwtToken` kept but marked DEPRECATED (removed in Phase 4 once login actions migrate). ✅
  - New functions have `// END` comments. ✅

### Phase 2 — Schema (session tables + tokenVersion) ✅ COMPLETE
- [x] `yarn gen UserSession`, `yarn gen AdminSession`; models filled in (`app/UserSession/model.js`, `app/AdminSession/model.js`) with flattened owner FK, self-ref `replacedBySessionId`, named indexes. (Both folders keep the default `V1Example` scaffold like `UserDevice` does — replace/remove when/if session endpoints are built.)
- [x] Migrations (all wrapped in transactions): `…-create-UserSession-model.js`, `…-create-AdminSession-model.js` — createTable + self-ref FK via `addConstraint` + `{Table}_userId/adminId_idx` + `{Table}_refreshTokenHash_unique`. `AdminSessions.adminId` is BIGINT (matches `Admins.id`).
- [x] `tokenVersion` INT NOT NULL DEFAULT 0 added to `User` + `Admin` models and via `…-add-cols-tokenVersion-to-Users-tbl.js` / `…-to-Admins-tbl.js`.
- [x] `database/schema.sql` updated (refreshed UserSessions, added AdminSessions, added tokenVersion to both). `database/sequence.js` updated by the generator.
- [x] Verified: `models.db.sync({force:true})` builds the schema cleanly — all columns + named indexes present; associations (`user`/`admin` + `replacedBySession`) resolve; `refreshTokenHash` excluded by default scope.
- [ ] Fixtures: none added (login creates sessions; not needed for current tests).
- NOTE (real DB only): the migrations weren't runtime-executed (tests use `sync`); run `yarn migrate` (or equivalent) on a real DB to validate the self-ref `addConstraint` + BIGINT FK before deploy.

### Phase 3 — passport & middleware ✅ COMPLETE (1 user step pending)
- [x] `services/passport.js`: JWT strategies now use `ACCESS_TOKEN_SECRET`, enforce `issuer` (HOSTNAME) + expiry, and check `tokenVersion` (instant revocation). Local strategies: dummy bcrypt compare on not-found (timing fix), consistent `done(null, false)`, removed `process.nextTick`. **Audience NOT enforced yet** — login currently mints inconsistent audiences (user=HOSTNAME, admin=ADMIN_WEB_HOSTNAME); enable audience enforcement once login is standardized.
- [x] `middleware/auth.js`: refactored to a single `AUTH_TYPES` registry `[{ scheme, strategy, reqKey }]` driving all three functions; exact `startsWith('jwt-<type> ')` matching. (NOTE: `AUTH_TYPES` is an internal `const`, NOT exported — exporting it broke the "exports at top" pattern via temporal-dead-zone, since `const` isn't hoisted like function declarations.)
- [x] `services/socket.js`: socket auth verifies the access token via `jsonwebtoken.verify(..., { issuer })` + `tokenVersion` check; removed `jwt-simple`.
- [x] Login mint swapped (the part of Phase 4 that MUST move with the strategy change): `createJwtToken` → `createAccessToken(record, audience, type)` in `Admin/V1Login`, `User/V1Login`, `User/V1SMSVerifyCode`. Removed `createJwtToken` + `jwt-simple` from `helpers/logic.js` (now fully unused).
- [ ] **(user)** add the 4 token env vars to `config/.env.test` (currently MISSING there — present elsewhere). Without them the test suite throws `secretOrPrivateKey must have a value` at login. Also can `yarn remove jwt-simple` (now unused).
- DEFERRED to next turn (rest of Phase 4): full login rewrite to also create a session row + refresh token + secure refresh cookie, and the `V1Refresh` / `V1Logout` / `V1LogoutAll` endpoints. Interim state: login returns a 15-min access token with no refresh — fine for tests; no renewal yet.

### Phase 4 — actions, controllers, routes (per type: User, Admin) ✅ COMPLETE (impl)
- [x] Shared core: `helpers/session.js` (issue/find/isActive/rotate/revoke/revokeAll — DRY, parameterized by session model + owner key) + `helpers/logic.js` `parseDurationMs`/`getRefreshTokenExpiresAt`. Verified vs Postgres.
- [x] `V1Login` rewritten (User + Admin): access token + refresh session, httpOnly+Secure+SameSite=strict `jwt-<type>-refresh` cookie, `201` with `token` + `refreshToken`. `User/V1SMSVerifyCode` also issues a session. **Access token is now body-only (no cookie) — frontend reads it from the response body and sends via Authorization header.**
- [x] `V1Refresh` / `V1Logout` / `V1LogoutAll` for both types (scaffolded with `yarn gen <Type> -a <Action>`, filled in). Refresh = rotation + reuse detection; LogoutAll bumps tokenVersion.
- [x] Error codes `USER_/ADMIN_UNAUTHORIZED_INVALID_REFRESH_TOKEN` (401) + language keys.
- [x] Controller methods + routes for all three in both features. `V1Refresh` public; `V1Logout`/`V1LogoutAll` require login.
- [x] Fixed latent bug: `Admin/V1Login` used `joiErrorsMessage` without importing it.
- [x] Full flow verified vs live Postgres for BOTH User and Admin (refresh, reuse detection, logout, logout-all).
- [ ] **Audience enforcement still off** in the JWT strategies (login mints inconsistent `aud`); standardize + enable `audience` in `services/passport.js` — small follow-up.
- [ ] `yarn gen` created boilerplate `*.test.js` for each new action — placeholders that will fail until written in Phase 5.

### Phase 5 — tests & docs ✅ COMPLETE
- [x] `helpers/tests.js`: added `refresh` and `logout` helpers (body-based, mobile-style).
- [x] Real integration tests (all pass through the real HTTP stack, `--runInBand`): **26/26 across 8 suites** — User + Admin × {Login, Refresh, Logout, LogoutAll}. Covers: login issues access + refresh + creates a session row; refresh rotates; reuse of a rotated token → 401 + family revoke + tokenVersion bump; missing/invalid refresh token → 401; single logout revokes only the current session; logout-all revokes all + bumps tokenVersion; **stale access token rejected after logout-all** (proves tokenVersion enforcement end-to-end).
- [x] README `## Authentication` section added.
- [x] `docs/conventions.txt` auth conventions block added.
- [x] Fixed a blocking bug found while running tests: `validateKeys` in `services/language.js` called with `LOCALE.EN` (undefined — constant key is lowercase `en`) → crashed `yarn lang` (which gates `yarn test`). Now uses `LOCALES[0]`.
- [x] **Audience enforcement DONE — per type AND client KIND (web vs app).** `TOKEN_AUDIENCE`: `USER:{WEB:'user-web',APP:'user-app'}`, `ADMIN:{WEB:'admin-web',APP:'admin-app'}`. Client kind = security boundary: `web` (browser/cookie) vs `app` (native/token, incl. native desktop). Signalled by `X-Client` (`resolveClient`, default `web`), stored on the session `client` column, re-used on refresh. Mint via `getTokenAudience(type, client)`; strategies + socket enforce `audience` as `Object.values(TOKEN_AUDIENCE.<TYPE>)`.
- [x] **Platform metadata (decoupled from audience):** `X-Platform` header (`resolvePlatform`, default `web`) → `web`/`ios`/`android`/`ipados`/`macos`/`windows`, stored on the session `platform` column. For analytics / per-platform management; NOT in the token audience. Added `platform` column to UserSession/AdminSession (models + migrations + schema.sql). 27 auth tests pass (incl. an app-client + ios-platform end-to-end test). Decision rationale: audience is coarse (security isolation = type + web/app); OS detail is rich metadata (lives on the session / UserDevices).
- NOTE: session feature folders (`UserSession`/`AdminSession`) still carry their `V1Example` scaffold + a failing placeholder test — same pre-existing pattern as `UserDevice` etc. (these are internal tables with no API). Clean up separately if desired.

## Status: migration COMPLETE (Phases 1–5 + audience enforcement). Remaining = optional ops follow-ups in §5 (session-cleanup cron, rate-limiting).

---

## 5. Open questions / future
- Access-token expiry in tests: 15 min is longer than any test run, so normal tests are unaffected; expiry is tested explicitly with fake timers.
- Consider a periodic cleanup task (cron → aggregate task) to purge expired/revoked sessions.
- Rate-limit login and refresh endpoints (ties into the commented-out rate limiter in `server.js`).
