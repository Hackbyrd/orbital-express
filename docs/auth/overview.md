# Authentication Overview

Orbital-Express uses a **two-token, stateless-plus-revocable** authentication model. Short-lived JWTs handle request authorization with no database round-trip. Long-lived opaque refresh tokens — stored server-side as SHA-256 hashes — enable revocation, rotation, and theft detection.

---

## The Two-Token Model

| | Access Token | Refresh Token |
|---|---|---|
| **Form** | JWT (HS256, signed) | Opaque random string (32 bytes / 64 hex chars) |
| **Lifetime** | ~15 minutes (`ACCESS_TOKEN_EXPIRES_IN` env) | ~60 days (`REFRESH_TOKEN_EXPIRES_IN` env) |
| **Storage — web** | Client memory / Authorization header | `httpOnly; Secure; SameSite=strict` cookie |
| **Storage — mobile** | In-memory / secure storage | Returned in response body; stored in secure storage |
| **Stored server-side** | Nothing | SHA-256 hash only (raw token never persisted) |
| **Authorization header** | `Authorization: jwt-user <token>` | Not used in headers |
| **Revocable** | Not directly — via `tokenVersion` bump | Yes — `revokedAt` flag in DB |

**Why two tokens?** Access tokens are stateless (no DB hit per request) but can't be revoked individually once issued. Refresh tokens are stateful (DB row) so they can be revoked at any time, but they travel less frequently — only during token exchange. This combination gives you performance *and* security.

---

## Audience — Security Boundary per Client

Every access token carries an `audience` claim that binds it to exactly one client type. The passport strategy rejects tokens whose audience doesn't match.

| Audience value | Who it's for |
|---|---|
| `user-web` | End users on the web app |
| `user-app` | End users on iOS / Android |
| `admin-web` | Admins on the web dashboard |
| `admin-app` | Admins on a mobile admin tool |

The audience is resolved at login from the `X-Client` request header (`web` or `app`, defaulting to `web`). The `getTokenAudience(type, client)` helper maps user type + client to the correct audience string.

**Why audience matters:** a `user-app` token cannot be replayed against an endpoint that requires `user-web`. Cross-client token reuse is rejected before the route handler runs — even if the JWT signature is valid.

---

## The Auth Flow

```
┌─────────┐          ┌──────────────────────────────────────────────────────┐
│  Client │          │  Server                                              │
└────┬────┘          └──────────────────────────────────────────────────────┘
     │                                                                       
     │─── POST /v1/users/login ────────────────────────────────────────────▶│
     │     { email, password }                                               │
     │                                            passport JWTUserLogin      │
     │                                            verify credentials         │
     │                                            issueSession()             │
     │◀─── 201 { token, refreshToken, user } ─────────────────────────────  │
     │     + Set-Cookie: jwt-user-refresh (web)                              │
     │                                                                       │
     │  [~15 min later — access token expires]                               │
     │                                                                       │
     │─── POST /v1/users/refresh ──────────────────────────────────────────▶│
     │     cookie: jwt-user-refresh (web)                                    │
     │     or body: { refreshToken } (mobile)                                │
     │                                            findSessionByRawToken()    │
     │                                            rotateSession()            │
     │                                            createAccessToken()        │
     │◀─── 200 { token, refreshToken, user } ─────────────────────────────  │
     │     + Set-Cookie: jwt-user-refresh (web, new token)                   │
     │                                                                       │
     │─── POST /v1/users/logout ───────────────────────────────────────────▶│
     │     cookie: jwt-user-refresh (web)                                    │
     │                                            revokeSession()            │
     │◀─── 200 { success: true } ──────────────────────────────────────────  │
     │     + Set-Cookie: jwt-user-refresh="" (cleared)                       │
     │                                                                       │
     │─── POST /v1/users/logoutall ────────────────────────────────────────▶│
     │                                            revokeAllSessionsForOwner()│
     │                                            increment tokenVersion     │
     │◀─── 200 { success: true } ──────────────────────────────────────────  │
     │     + all cookies cleared                                             │
```

---

## How `req.user` / `req.admin` Get Populated

Every request passes through two middleware functions in `middleware/auth.js` before hitting the controller.

**1. `JWTAuth(req, res, next)`** — inspects the `Authorization` header and dispatches to the matching passport strategy:

```
Authorization: jwt-user  <token>  →  JWTAuthUser  strategy  →  attached as req.user
Authorization: jwt-admin <token>  →  JWTAuthAdmin strategy  →  attached as req.admin
(no header)                       →  next() — public route, controller enforces access
```

The strategy lookup is driven by `AUTH_TYPES` in `middleware/auth.js` — a registry array with one entry per authenticated user type. Adding a new type means adding one entry there and a corresponding passport strategy; no other middleware changes needed.

**2. `verifyJWTAuth(req, res, next)`** — after the strategy runs, moves the authenticated record from Passport's default `req.user` slot to the correct key (`req.admin`, etc.) and sets the request locale.

The **passport strategy** (`services/passport.js`) does three things:
1. Verifies the JWT signature and claims (`exp`, `iss`, `audience`).
2. Looks up the owner from the database by `sub` (the user/admin id in the token payload).
3. Checks `tokenVersion` — if the token's `tokenVersion` no longer matches the database record, the token is rejected instantly (no wait for expiry).

---

## Token Creation

All token helpers live in `helpers/logic.js`.

### `createAccessToken(user, audience, type)`

Signs a JWT with HS256 using `ACCESS_TOKEN_SECRET`. The payload carries three custom claims:

```javascript
{
  sub: user.id,          // the owner's UUID
  type: 'user',          // 'user' | 'admin' | ...
  tokenVersion: user.tokenVersion  // checked in passport for instant revocation
}
```

Standard claims (`iat`, `exp`, `iss`, `aud`) are set by jsonwebtoken automatically.

### `createRefreshToken()`

Returns 32 cryptographically random bytes as a 64-character hex string. This is the raw token — it is handed to the client exactly once and never stored.

### `hashToken(raw)`

SHA-256 (hex-encoded) of the raw token. This is what gets stored in the database. Because refresh tokens are already high-entropy random values, the fast SHA-256 is sufficient — bcrypt's slow hashing is unnecessary here.

---

## Session Mechanics

All session helpers live in `helpers/session.js`. They are generic — they take the session model and owner FK column as parameters so the same code serves `UserSession`, `AdminSession`, and any future type.

### `issueSession({ sessionModel, ownerKey, ownerId, client, platform, userAgent, ipAddress, transaction })`

Creates a new session row. Generates a raw refresh token, stores only its hash. Returns `{ rawRefreshToken, session }` — the caller sends `rawRefreshToken` to the client and never sees it again.

```javascript
const { rawRefreshToken } = await issueSession({
  sessionModel: models.userSession,
  ownerKey: 'userId',
  ownerId: updatedUser.id,
  client,      // 'web' | 'app'
  platform,    // 'web' | 'ios' | 'android' | ...
  userAgent: req.headers['user-agent'] || null,
  ipAddress: req.ip || null
});
```

### `rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction })`

Issues a new session and revokes the old one, linking them via `currentSession.replacedBySessionId = newSession.id`. This chain is what makes reuse detection possible — a rotated (already-revoked) token whose `replacedBySessionId` is set is a theft signal.

### `revokeSession({ session, transaction })`

Sets `revokedAt` on a single session. Idempotent — a no-op if already revoked.

### `revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction })`

Bulk-sets `revokedAt` on every active session for the owner. Used by LogoutAll and by the reuse-detection path.

### `findSessionByRawToken({ sessionModel, rawRefreshToken, transaction })`

Hashes the raw token and looks up the matching session row using `scope(null)` (bypasses the default scope that excludes `refreshTokenHash`).

### `isSessionActive(session)`

Returns `true` only if `revokedAt` is null AND `expiresAt` is in the future.

---

## Reuse Detection

Token rotation means every successful `/refresh` call issues a new refresh token and immediately revokes the old one. The old session row is kept with `revokedAt` set and `replacedBySessionId` pointing to the new session.

**The attack:** a stolen refresh token is used after the legitimate client has already rotated it. The stolen token is the old (revoked) session.

**Detection:** if a token lookup returns a session that is **both revoked AND has a `replacedBySessionId`**, it is a replayed rotated token — treated as a confirmed theft signal.

**Response:**
1. Revoke **all** sessions for that user (`revokeAllSessionsForOwner`).
2. Increment `tokenVersion` on the user record — every currently-valid access token for that user is now rejected at the passport strategy layer (no need to wait for expiry).

```javascript
// V1Refresh — reuse detection block
if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
  await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
  await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
  await t.commit();
  return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
}
```

---

## Security Properties

| Property | Mechanism |
|---|---|
| **Access token instant revocation** | `tokenVersion` in DB — bumped by LogoutAll and reuse detection; checked in passport strategy on every request |
| **Refresh token revocation** | `revokedAt` flag in the session row; checked before issuing a new token |
| **Refresh token theft detection** | Rotated-token replay triggers full session revoke + `tokenVersion` bump |
| **Web cookie hardening** | `httpOnly` (no JS access), `Secure` (HTTPS only in production), `SameSite=strict` (no cross-site sends) |
| **Mobile token delivery** | Refresh token returned in response body — stored in device secure storage, never in a browser cookie |
| **No raw token in DB** | Only SHA-256 hash stored — a DB leak exposes no usable tokens |
| **Audience enforcement** | Access tokens bound to `user-web`, `user-app`, `admin-web`, or `admin-app` — cross-client replay rejected |
| **Cookie options consistency** | `V1Login`, `V1Refresh`, and `V1Logout` all use identical cookie options — required for Safari to correctly clear the cookie |

---

## Complete Action Code Reference

### Login (`app/User/actions/V1Login.js`)

```javascript
async function V1Login(req, res) {
  // 1. Validate email + password via Joi
  // 2. passport.authenticate('JWTUserLogin') — verifies credentials against DB
  // 3. Reject if user inactive or soft-deleted
  // 4. Update loginCount + lastLoginAt
  // 5. Determine client (X-Client header) and platform (X-Platform header)
  // 6. createAccessToken(user, getTokenAudience('user', client), 'user')
  // 7. issueSession({ sessionModel, ownerKey: 'userId', ownerId, client, platform, ... })
  // 8. Set httpOnly refresh cookie (web) + return rawRefreshToken in body (mobile)
  // → 201 { token, refreshToken, user }

  return new Promise((resolve, reject) => {
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      // ...credential checks...

      const client = resolveClient(req);
      const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');
      const { rawRefreshToken } = await issueSession({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: updatedUser.id, client, platform, userAgent: req.headers['user-agent'], ipAddress: req.ip });

      res.cookie('jwt-user-refresh', rawRefreshToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
      });

      return resolve({ status: 201, success: true, token, refreshToken: rawRefreshToken, user: updatedUser.dataValues });
    })(req, res, null);
  });
} // END V1Login
```

### Refresh (`app/User/actions/V1Refresh.js`)

```javascript
async function V1Refresh(req, res) {
  // 1. Read refresh token from cookie (web) or req.args.refreshToken (mobile)
  // 2. findSessionByRawToken() — hash and look up
  // 3. REUSE DETECTION: revokedAt + replacedBySessionId → revoke all + bump tokenVersion → 401
  // 4. isSessionActive() check — expired or revoked → 401
  // 5. Load user, check isActive + deletedAt
  // 6. rotateSession() — revoke current, issue new (linked via replacedBySessionId)
  // 7. createAccessToken() with new token
  // 8. Set new refresh cookie + return in body
  // → 200 { token, refreshToken, user }

  const rawRefreshToken = req.cookies['jwt-user-refresh'] || req.args.refreshToken || null;

  const sessionRow = await findSessionByRawToken({ sessionModel: models.userSession, rawRefreshToken, transaction: t });

  if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
    await revokeAllSessionsForOwner({ ... });
    await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
  }

  const { rawRefreshToken: newRawRefreshToken } = await rotateSession({ sessionModel: models.userSession, ownerKey: 'userId', currentSession: sessionRow, ... });
  const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

  return { status: 200, success: true, token, refreshToken: newRawRefreshToken, user: user.dataValues };
} // END V1Refresh
```

### Logout (`app/User/actions/V1Logout.js`)

```javascript
async function V1Logout(req, res) {
  // 1. Read refresh token from cookie or body
  // 2. findSessionByRawToken() — verify it belongs to req.user before revoking
  // 3. revokeSession() — current device only
  // 4. clearCookie() — options MUST match V1Login (Safari requirement)
  // → 200 { success: true }

  const rawRefreshToken = req.cookies['jwt-user-refresh'] || req.args.refreshToken || null;

  if (rawRefreshToken) {
    const sessionRow = await findSessionByRawToken({ sessionModel: models.userSession, rawRefreshToken, transaction: t });
    if (sessionRow && sessionRow.userId === req.user.id)
      await revokeSession({ session: sessionRow, transaction: t });
  }

  res.clearCookie('jwt-user-refresh', { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict', path: '/' });

  return { status: 200, success: true };
} // END V1Logout
```

### LogoutAll (`app/User/actions/V1LogoutAll.js`)

```javascript
async function V1LogoutAll(req, res) {
  // 1. revokeAllSessionsForOwner() — kills every session for this user
  // 2. increment tokenVersion — every outstanding access token is now rejected in passport
  // 3. clearCookie() on this device
  // → 200 { success: true }

  await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: req.user.id, transaction: t });
  await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

  res.clearCookie('jwt-user-refresh', { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict', path: '/' });

  return { status: 200, success: true };
} // END V1LogoutAll
```

---

## Adding a New Auth User Type

See `.claude/skills/add-auth-user-type/SKILL.md` for the step-by-step playbook. At a high level:

1. Add a new table + model (e.g. `Partner`).
2. Add a session table + model (e.g. `PartnerSession`).
3. Add a passport strategy in `services/passport.js` (copy the user pattern; change the model and audience).
4. Add an entry to `AUTH_TYPES` in `middleware/auth.js`.
5. Add `TOKEN_AUDIENCE.PARTNER` to `helpers/constants.js`.
6. Scaffold Login / Refresh / Logout / LogoutAll actions using `yarn gen Partner -a V1Login` etc., then fill them in following the user actions as the template.

---

## See Also

- **[Tutorial: Add Authentication](../tutorials/add-auth)** — build-along walkthrough that implements all six auth actions (Register, Login, Refresh, Logout, LogoutAll, Read) for the `User` type from scratch, including the UserSessions migration and full integration tests. Use it as the reference implementation when adding a new user type.
