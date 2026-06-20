# Session Management

Orbital-Express uses a **stateless access token + stateful refresh token** model. Access tokens are short-lived JWTs; refresh tokens are long-lived opaque tokens whose SHA-256 hash is stored server-side in a `*Session` table (e.g. `UserSession`, `AdminSession`). This gives you the performance of stateless auth with the revocability of sessions.

---

## helpers/session.js

All session logic lives in one place — `helpers/session.js` — and is parameterised by the Sequelize session model and its owner FK column, so every user type (User, Admin, Partner, …) shares the same implementation.

```js
const {
  issueSession,
  findSessionByRawToken,
  isSessionActive,
  rotateSession,
  revokeSession,
  revokeAllSessionsForOwner
} = require('../../../helpers/session');
```

---

### issueSession({ sessionModel, ownerKey, ownerId, client, platform, userAgent, ipAddress, transaction })

Mints a new cryptographically random refresh token, stores its SHA-256 hash in the database, and returns the **raw** token to send to the client. The raw token is never stored.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sessionModel` | Sequelize model | yes | e.g. `models.userSession` |
| `ownerKey` | string | yes | FK column name, e.g. `'userId'` |
| `ownerId` | uuid | yes | The owner's primary key |
| `client` | string | no | `'web'` or `'app'` (defaults to `'web'`) |
| `platform` | string | no | `'ios'`, `'android'`, `'web'`, etc. (defaults to `'web'`) |
| `userAgent` | string | no | From `req.headers['user-agent']` |
| `ipAddress` | string | no | From `req.ip` |
| `transaction` | Sequelize transaction | no | Recommended — wrap login in a transaction |

**Returns:** `{ rawRefreshToken, session }`

```js
async function issueSession({ sessionModel, ownerKey, ownerId, client, platform, userAgent, ipAddress, transaction }) {
  const rawRefreshToken = createRefreshToken();

  const session = await sessionModel.create({
    [ownerKey]: ownerId,
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    client: client || 'web',
    platform: platform || 'web',
    userAgent: userAgent || null,
    ipAddress: ipAddress || null
  }, { transaction });

  return { rawRefreshToken, session };
} // END issueSession
```

Key points:
- `createRefreshToken()` generates a cryptographically random opaque string.
- `hashToken()` is a deterministic SHA-256 hash — used both at creation and at lookup.
- `expiresAt` is computed from the `REFRESH_TOKEN_EXPIRES_IN` env var (e.g. `'90d'`).
- `refreshTokenHash` is excluded from the model's default scope so it never leaks in a casual `findByPk`.

---

### rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction })

Revokes the presented session and issues a fresh one, linking them via `replacedBySessionId`. This chain is what makes **reuse detection** possible: if a token that has already been rotated out is presented again, you can trace the chain and know it was replayed.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sessionModel` | Sequelize model | yes | e.g. `models.userSession` |
| `ownerKey` | string | yes | FK column name, e.g. `'userId'` |
| `currentSession` | session instance | yes | The session row fetched by `findSessionByRawToken` |
| `userAgent` | string | no | From `req.headers['user-agent']` |
| `ipAddress` | string | no | From `req.ip` |
| `transaction` | Sequelize transaction | yes | Rotation must be atomic |

**Returns:** `{ rawRefreshToken, session }` for the **new** session.

```js
async function rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction }) {
  const rawRefreshToken = createRefreshToken();

  const newSession = await sessionModel.create({
    [ownerKey]: currentSession[ownerKey],
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    client: currentSession.client,   // carries over — rotated session keeps the same client/platform
    platform: currentSession.platform,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null
  }, { transaction });

  await currentSession.update({
    revokedAt: new Date(),
    replacedBySessionId: newSession.id,   // ← the chain link
    lastUsedAt: new Date()
  }, { transaction });

  return { rawRefreshToken, session: newSession };
} // END rotateSession
```

---

### revokeSession({ session, transaction })

Marks a single session as revoked by setting `revokedAt = now`. Idempotent — safe to call on an already-revoked session.

```js
async function revokeSession({ session, transaction }) {
  if (session && !session.revokedAt)
    await session.update({ revokedAt: new Date() }, { transaction });
} // END revokeSession
```

Use this for single-device logout (V1Logout).

---

### revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction })

Bulk-revokes every non-revoked session for an owner in a single `UPDATE`. Used for "logout everywhere" and as the theft-response in reuse detection.

> **Important:** `revokeAllSessionsForOwner` only kills refresh tokens. To also invalidate every **access token** currently in circulation, follow it with a `tokenVersion` increment on the owner — the JWT middleware rejects tokens whose embedded `tokenVersion` is older than the one in the database.

```js
async function revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction }) {
  await sessionModel.update({ revokedAt: new Date() }, {
    where: { [ownerKey]: ownerId, revokedAt: null },
    transaction
  });
} // END revokeAllSessionsForOwner
```

---

## Login flow (full example)

`POST /v1/users/login` — authenticates credentials, issues an access token and a refresh session.

```js
// app/User/actions/V1Login.js

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// third-party
const joi = require('joi');
const moment = require('moment-timezone');
const passport = require('passport');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, resolveClient, resolvePlatform, getTokenAudience } = require('../../../helpers/logic');
const { issueSession } = require('../../../helpers/session');

// models
const models = require('../../../models');

module.exports = { V1Login };

async function V1Login(req, res) {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  return new Promise((resolve, reject) => {
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      if (err)
        return reject(err);

      if (!user)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
      if (!user.isActive)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));
      if (user.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));

      try {
        // record login and fetch a clean copy (sensitive fields excluded)
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLogin: moment.tz('UTC'),
          lastLoginAt: moment.tz('UTC')
        }, { where: { id: user.id } });

        const updatedUser = await models.user.findByPk(user.id, {
          attributes: { exclude: models.user.getSensitiveData() }
        });

        // resolve client kind (web|app) and platform (ios/android/web/…)
        const client = resolveClient(req);
        const platform = resolvePlatform(req);

        // mint a short-lived access token
        const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');

        // create a server-side refresh session (only the hash is stored)
        const { rawRefreshToken } = await issueSession({
          sessionModel: models.userSession,
          ownerKey: 'userId',
          ownerId: updatedUser.id,
          client,
          platform,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });

        // web: set as httpOnly cookie; mobile: also returned in the body
        res.cookie('jwt-user-refresh', rawRefreshToken, {
          httpOnly: true,
          secure: NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
        });

        // 201 — a new session resource was created
        return resolve({
          status: 201,
          success: true,
          token,
          refreshToken: rawRefreshToken,  // mobile reads from here; web uses the cookie
          user: updatedUser.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  });
} // END V1Login
```

**Cookie vs body:** Web clients use the `httpOnly` cookie automatically. Mobile clients (which cannot access `httpOnly` cookies) read `refreshToken` from the response body and store it securely (e.g. Keychain / Keystore). Both paths are supported transparently throughout all auth actions.

---

## Refresh flow (full example)

`POST /v1/users/refresh` — exchanges a valid refresh token for a new access token and a rotated refresh token, with reuse detection.

```js
// app/User/actions/V1Refresh.js

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// services
const { ERROR_CODES, errorResponse } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, getTokenAudience } = require('../../../helpers/logic');
const {
  findSessionByRawToken,
  isSessionActive,
  rotateSession,
  revokeSession,
  revokeAllSessionsForOwner
} = require('../../../helpers/session');

// models
const models = require('../../../models');

module.exports = { V1Refresh };

async function V1Refresh(req, res) {
  // web: cookie; mobile: request body
  const rawRefreshToken = (req.cookies && req.cookies['jwt-user-refresh'])
    || (req.args && req.args.refreshToken)
    || null;

  if (!rawRefreshToken)
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);

  const t = await models.db.transaction();

  try {
    // look up session by hash
    const sessionRow = await findSessionByRawToken({
      sessionModel: models.userSession,
      rawRefreshToken,
      transaction: t
    });

    if (!sessionRow) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // REUSE DETECTION: already-rotated token replayed → theft signal.
    // Revoke every session and bump tokenVersion to kill all outstanding access tokens instantly.
    if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
      await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
      await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // revoked (logged out elsewhere) or expired
    if (!isSessionActive(sessionRow)) {
      await revokeSession({ session: sessionRow, transaction: t }); // idempotent
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // load user (need tokenVersion for the new access token, plus active/deleted checks)
    const user = await models.user.findByPk(sessionRow.userId, {
      attributes: { exclude: models.user.getSensitiveData() },
      transaction: t
    });

    if (!user || !user.isActive || user.deletedAt) {
      await revokeSession({ session: sessionRow, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // rotate: revoke presented session, issue fresh one linked via replacedBySessionId
    const { rawRefreshToken: newRawRefreshToken } = await rotateSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      currentSession: sessionRow,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      transaction: t
    });

    // mint a new access token (audience from the session's original client)
    const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

    await t.commit();

    // set rotated refresh cookie (options must match V1Login / V1Logout exactly)
    res.cookie('jwt-user-refresh', newRawRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
    });

    return {
      status: 200,
      success: true,
      token,
      refreshToken: newRawRefreshToken,
      user: user.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();
    throw error;
  }
} // END V1Refresh
```

### Reuse detection explained

Every rotation writes `replacedBySessionId` onto the old session row. If a token is presented and its session is already revoked **and** has a `replacedBySessionId`, that means the token was already rotated once — someone is replaying an old token. The response:

1. `revokeAllSessionsForOwner` — kills every refresh session.
2. `models.user.increment('tokenVersion')` — bumps the version embedded in access tokens; the JWT middleware rejects any token with an older version immediately.

The user is effectively signed out of every device with no grace period.

---

## Logout flow

### V1Logout — single device

`POST /v1/users/logout` — revokes the session for the presented refresh token only. Other devices are unaffected.

```js
// app/User/actions/V1Logout.js

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// helpers
const { findSessionByRawToken, revokeSession } = require('../../../helpers/session');

// models
const models = require('../../../models');

module.exports = { V1Logout };

async function V1Logout(req, res) {
  const rawRefreshToken = (req.cookies && req.cookies['jwt-user-refresh'])
    || (req.args && req.args.refreshToken)
    || null;

  const t = await models.db.transaction();

  try {
    if (rawRefreshToken) {
      const sessionRow = await findSessionByRawToken({
        sessionModel: models.userSession,
        rawRefreshToken,
        transaction: t
      });

      // only revoke if the session belongs to the authenticated user (prevents cross-user revocation)
      if (sessionRow && sessionRow.userId === req.user.id)
        await revokeSession({ session: sessionRow, transaction: t });
    }

    await t.commit();

    // clear the refresh cookie (options must match V1Login exactly — Safari requires consistency)
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return { status: 200, success: true };
  } catch (error) {
    if (!t.finished)
      await t.rollback();
    throw error;
  }
} // END V1Logout
```

> The ownership check (`sessionRow.userId === req.user.id`) is critical — without it any authenticated user could revoke any session by guessing or obtaining another user's refresh token.

---

### V1LogoutAll — all devices

`POST /v1/users/logoutall` — revokes every refresh session for the user **and** bumps `tokenVersion`, which instantly invalidates every outstanding access token on every device.

```js
// app/User/actions/V1LogoutAll.js

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// helpers
const { revokeAllSessionsForOwner } = require('../../../helpers/session');

// models
const models = require('../../../models');

module.exports = { V1LogoutAll };

async function V1LogoutAll(req, res) {
  const t = await models.db.transaction();

  try {
    // revoke all refresh sessions
    await revokeAllSessionsForOwner({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: req.user.id,
      transaction: t
    });

    // bump tokenVersion → every outstanding access token for this user is rejected immediately
    await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

    await t.commit();

    // clear this device's refresh cookie
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return { status: 200, success: true };
  } catch (error) {
    if (!t.finished)
      await t.rollback();
    throw error;
  }
} // END V1LogoutAll
```

**Why `tokenVersion`?** Access tokens are stateless JWTs — there is no server-side record to revoke. The `tokenVersion` column on the user row is embedded in the JWT payload at mint time. The JWT middleware rejects any token whose `tokenVersion` is less than the current value in the database. Incrementing it is the only way to invalidate access tokens already in flight without waiting for their natural expiry.

---

## Cookie rules

All three auth actions (`V1Login`, `V1Refresh`, `V1Logout`, `V1LogoutAll`) use **identical cookie options**. Safari requires that `clearCookie` options exactly match the `cookie` options that set it — any mismatch silently fails to clear the cookie.

| Option | Value |
|---|---|
| `httpOnly` | `true` |
| `secure` | `true` in production, `false` in dev |
| `sameSite` | `'strict'` |
| `path` | `'/'` |
| `maxAge` | `parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)` (set only; not used in `clearCookie`) |

The cookie name is `jwt-user-refresh` for users and follows the pattern `jwt-<type>-refresh` for other user types (e.g. `jwt-admin-refresh`).
