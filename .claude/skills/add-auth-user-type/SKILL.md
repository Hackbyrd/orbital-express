---
name: add-auth-user-type
description: Add a new authenticated user type (e.g. Partner, Driver) with its own login/refresh/logout and access+refresh tokens, alongside the existing User and Admin. Use when the user wants a new kind of authenticated account with its own portal/auth, NOT a role on an existing table.
---

# Add an authenticated user type

Each user type is its **own table** with its own Passport strategies, session table, and auth scheme — never a `role` column on an existing table. The whole design is in `docs/auth-migration.md` and README "Authentication". Mirror the existing `User`/`Admin` implementation exactly.

> **Tutorial:** `docs/tutorials/add-auth.md` walks through the full auth setup for the `User` type end-to-end (migration → register → login → refresh → logout → tests). Use it as the reference implementation when adding a new type.

## Steps (for a new type `<Type>`, e.g. Partner)

1. **The user table:** create the `<Type>` feature (`create-feature` skill) with auth fields — `email`/`phone` (unique), `salt`, `password` (sensitive), `isActive`, plus **`tokenVersion` INT NOT NULL DEFAULT 0** (instant-revocation). Add `validatePassword`, `getSensitiveData`/`getPrivateData` statics.

2. **Session table:** `yarn gen <Type>Session`. Model + migration columns: `id` UUID, owner FK `<type>Id` (indexed), self-ref `replacedBySessionId`, `refreshTokenHash` (sensitive, unique index), `expiresAt`, `revokedAt`, `lastUsedAt`, `userAgent`, `ipAddress`, `client` (default `'web'`), `platform` (default `'web'`). Mirror `UserSession`.

3. **Audience:** add to `helpers/constants.js` `TOKEN_AUDIENCE`: `<TYPE>: { WEB: '<type>-web', APP: '<type>-app' }`.

4. **Passport strategies** (`services/passport.js`): add `JWT<Type>Login` (local, with the dummy-bcrypt timing fix) and `JWTAuth<Type>` (JWT: `secretOrKey: ACCESS_TOKEN_SECRET`, `issuer: HOSTNAME`, `audience: Object.values(TOKEN_AUDIENCE.<TYPE>)`, plus the `tokenVersion` check).

5. **Middleware registry** (`middleware/auth.js`): add one entry to `AUTH_TYPES`: `{ scheme: 'jwt-<type>', strategy: 'JWTAuth<Type>', reqKey: '<type>' }`. Everything else (attach/route/verify) is registry-driven — no other middleware changes. Now `req.<type>` is available in actions.

6. **Auth actions** (scaffold each with `yarn gen <Type> -a V1<Name>`, then mirror the User versions):
   - `V1Login` — verify creds, `createAccessToken(record, getTokenAudience('<type>', resolveClient(req)), '<type>')`, `issueSession({ sessionModel: models.<type>Session, ownerKey: '<type>Id', ownerId, client, platform, ... })`, set `jwt-<type>-refresh` httpOnly+Secure+SameSite=strict cookie, return `201 { token, refreshToken, <type> }`.
   - `V1Refresh` — read refresh token (cookie/body), rotate + reuse-detection (replayed rotated token → revoke family + bump `tokenVersion`), re-mint using the session's stored `client`.
   - `V1Logout` — revoke current session, clear cookie.
   - `V1LogoutAll` — revoke all sessions + bump `tokenVersion`.

7. **Controller + routes:** add `V1Login`/`V1Logout`/`V1LogoutAll`/`V1Refresh` (and `/v1/<plural>/...` routes). `V1Refresh` is public; logout/logoutall require `req.<type>`.

8. **Errors + i18n:** add `<TYPE>_UNAUTHORIZED_INVALID_REFRESH_TOKEN` (401) + the `<TYPE>[invalid_refresh_token]` string; `yarn lang`.

9. **Test helpers:** add a `<type>Login` to `helpers/tests.js` (mirrors `userLogin`).

10. **Tests:** mirror the User auth suites — login, refresh (rotate + reuse), logout, logout-all (+ stale-token-after-logout-all). Run `npx jest app/<Type>/tests --runInBand`.

## Reference implementation
`User` is the canonical example (full email + phone login). `Admin` is the simpler email-only example. Copy whichever fits and swap `user`→`<type>`, `userId`→`<type>Id`, `userSession`→`<type>Session`.
