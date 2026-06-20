# Tutorial: Add Authentication

Build-along tutorial covering the full auth setup for a new user type. By the end you will have working register, login, refresh, logout, logout-all, and "me" (read profile) endpoints with integration tests covering every path.

The examples below are taken directly from a working Nitra Brain implementation and show production-quality code, not skeleton stubs.

---

## What we're building

| Action | Route | Auth required |
|---|---|---|
| V1Register | `POST /v1/users/register` | No |
| V1Login | `POST /v1/users/login` | No |
| V1Refresh | `POST /v1/users/refresh` | No (access token typically expired) |
| V1Logout | `POST /v1/users/logout` | Yes |
| V1LogoutAll | `POST /v1/users/logoutall` | Yes |
| V1Read ("me") | `POST /v1/users/read` | Yes |

---

## Prerequisites

- The `User` feature folder already exists (`yarn gen User`).
- Postgres and Redis are running (`yarn s` will tell you if they are not).
- You understand the Orbital-Express action anatomy (see `README.md` → "Actions").

---

## Step 1: Create the UserSessions migration

UserSessions backs the stateless access-token system. Each row represents one active refresh-token session for a user. The raw token is **never stored** — only its SHA-256 hash.

Generate the migration file first:

```bash
sequelize migration:create --name create-UserSession-model
```

Then fill it in:

```js
// migrations/<timestamp>-create-UserSession-model.js
'use strict';

const DataTypes = require('sequelize').DataTypes;

// Column order: id → foreign keys → custom columns → Sequelize auto-generated (deletedAt, createdAt, updatedAt)
const attrs = {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    validate: { isUUID: 4 }
  },

  // owner FK — carries the User's id onto every session row
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },

  // self-referencing FK — the session that replaced this one on rotation.
  // Added via addConstraint below (Sequelize can't express self-references in createTable).
  replacedBySessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null
  },

  // SHA-256 hash of the opaque refresh token — NEVER store the raw token
  refreshTokenHash: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // when the refresh token expires
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },

  // when this session was revoked (logout / rotation / reuse detection); null = still active
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },

  // last time this session was used to issue a fresh access token
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },

  // user-agent string captured at login (JSONB so it can be parsed later)
  userAgent: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },

  // IP address captured at login
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },

  // client KIND ('web' | 'app') — security boundary; determines JWT audience
  client: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'web'
  },

  // platform/OS ('web' | 'ios' | 'android' | 'ipados' | 'macos' | 'windows') — analytics only
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'web'
  },

  // Sequelize paranoid soft-delete column
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },

  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
};

module.exports = {
  async up(queryInterface) {
    return await queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable('UserSessions', attrs, { transaction: t });

      // self-referencing FK for the rotation chain
      await queryInterface.addConstraint('UserSessions', {
        fields: ['replacedBySessionId'],
        type: 'foreign key',
        name: 'UserSessions_replacedBySessionId_fkey',
        references: { table: 'UserSessions', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // named index on the owner FK (rule: always index FKs)
      await queryInterface.addIndex('UserSessions', ['userId'], {
        name: 'UserSessions_userId_idx',
        transaction: t
      });

      // unique index on the token hash — fast lookup on refresh + prevents collisions
      await queryInterface.addIndex('UserSessions', ['refreshTokenHash'], {
        name: 'UserSessions_refreshTokenHash_unique',
        unique: true,
        transaction: t
      });
    });
  },

  async down(queryInterface) {
    return await queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex('UserSessions', 'UserSessions_refreshTokenHash_unique', { transaction: t });
      await queryInterface.removeIndex('UserSessions', 'UserSessions_userId_idx', { transaction: t });
      await queryInterface.removeConstraint('UserSessions', 'UserSessions_replacedBySessionId_fkey', { transaction: t });
      await queryInterface.dropTable('UserSessions', { transaction: t });
    });
  }
};
```

Run the migration:

```bash
sequelize db:migrate
```

> **Why `addConstraint` separately?** Sequelize's `createTable` does not support self-referential FK definitions. The table must exist before the FK can reference it, so we add it in a second step inside the same transaction.

---

## Step 2: Write V1Register

Registration validates input, hashes the password via a model `beforeCreate` hook, creates the user inside a transaction, then immediately logs the user in by issuing a session.

```bash
yarn gen User -a V1Register   # scaffold the file
yarn del User -a V1Example    # remove the default placeholder
```

```js
// app/User/actions/V1Register.js
/**
 * USER V1Register ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// third-party node modules
const joi = require('joi');
const moment = require('moment-timezone');

// services
const lang = require('../../../services/language');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { createAccessToken, parseDurationMs, resolveClient, resolvePlatform, getTokenAudience } = require('../../../helpers/logic');
const { issueSession } = require('../../../helpers/session');
const { isValidTimezone } = require('../../../helpers/validate');
const { LOCALE, LOCALES, PASSWORD_REGEX } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Register
};

/**
 * Register a new user with email + password — then log them in (access token + refresh session).
 *
 * GET  /v1/users/register
 * POST /v1/users/register
 *
 * Must be logged out
 * Roles: []
 *
 * req.args = {
 *   @email    - (STRING - REQUIRED): Unique email address (case-insensitive)
 *   @password - (STRING - REQUIRED): Min 12 chars, mixed case, digit, special char
 *   @firstName - (STRING - OPTIONAL): Max 64 chars
 *   @lastName  - (STRING - OPTIONAL): Max 64 chars
 *   @timezone  - (STRING - OPTIONAL): IANA timezone, defaults to 'UTC'
 *   @locale    - (STRING - OPTIONAL): Locale code, defaults to 'en'
 * }
 *
 * Success: 201 — new user object + access token + refresh token
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_USER_ALREADY_EXISTS
 *   400: USER_BAD_REQUEST_INVALID_TIMEZONE
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Register(req, res) {
  const i18n = lang.getLocalI18n();

  const schema = joi.object({
    email: joi.string().trim().email().lowercase().required(),
    password: joi.string().regex(PASSWORD_REGEX).required(),
    firstName: joi.string().trim().max(64).allow('').default(''),
    lastName: joi.string().trim().max(64).allow('').default(''),
    timezone: joi.string().trim().default('UTC'),
    locale: joi.string().valid(...LOCALES).default(LOCALE.EN)
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  if (!isValidTimezone(req.args.timezone))
    return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_TIMEZONE);

  const t = await models.db.transaction();

  try {
    // Check for an existing user (include soft-deleted rows to avoid unique-constraint surprises)
    const existingUser = await models.user.findOne({
      where: { email: req.args.email },
      paranoid: false,
      transaction: t
    });

    if (existingUser) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_USER_ALREADY_EXISTS);
    }

    // The model's beforeCreate hook generates the salt and hashes the password
    const newUser = await models.user.create({
      email: req.args.email,
      password: req.args.password,
      firstName: req.args.firstName,
      lastName: req.args.lastName,
      timezone: req.args.timezone,
      locale: req.args.locale,
      isActive: true
    }, { transaction: t });

    await t.commit();

    // Re-fetch without sensitive data (default scope excludes salt/password/tokens)
    const safeUser = await models.user.findByPk(newUser.id);

    // Mint an access token + create a refresh-token session
    const client = resolveClient(req);
    const platform = resolvePlatform(req);
    const token = createAccessToken(safeUser, getTokenAudience('user', client), 'user');

    const { rawRefreshToken } = await issueSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: safeUser.id,
      client,
      platform,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null
    });

    // Set the refresh token as an httpOnly cookie (web). Mobile reads it from the response body.
    // NOTE: clear options in V1Logout MUST match these (Safari requires consistent cookie options).
    res.cookie('jwt-user-refresh', rawRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
    });

    // 201 — a new user resource was created
    return {
      status: 201,
      success: true,
      token,                    // short-lived access token — send as: Authorization: jwt-user <token>
      refreshToken: rawRefreshToken, // for mobile clients that cannot use cookies
      user: safeUser.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Register
```

> **Key points**
> - `paranoid: false` in the duplicate-check means a soft-deleted account with the same email blocks re-registration.
> - The `beforeCreate` hook (on the User model) does the bcrypt hashing — the action never calls bcrypt directly.
> - `issueSession` from `helpers/session` creates the DB row and returns only the raw token; the hash is stored.
> - Cookie options (`httpOnly`, `sameSite: 'strict'`, `path: '/'`) must be **identical** across V1Register, V1Login, V1Refresh, and V1Logout — Safari treats a mismatch as a different cookie.

---

## Step 3: Write V1Login

Login delegates credential verification to Passport's `JWTUserLogin` strategy (which reads the user and compares the bcrypt hash), then follows the same session-issuance pattern as V1Register.

```js
// app/User/actions/V1Login.js
/**
 * USER V1Login ACTION
 */

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

// methods
module.exports = {
  V1Login
};

/**
 * Login a user — returns a short-lived access token and sets a long-lived, httpOnly refresh cookie.
 *
 * GET  /v1/users/login
 * POST /v1/users/login
 *
 * Must be logged out
 * Roles: []
 *
 * req.args = {
 *   @email    - (STRING - REQUIRED): The user's email address
 *   @password - (STRING - REQUIRED): The plain-text password
 * }
 *
 * Success: 201 — user object + access token + refresh token
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS
 *   400: USER_BAD_REQUEST_ACCOUNT_INACTIVE
 *   400: USER_BAD_REQUEST_ACCOUNT_DELETED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Login(req, res) {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  // Wrap in a Promise because passport.authenticate uses a callback, not async/await
  return new Promise((resolve, reject) => {
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      if (err)
        return reject(err);

      // Passport returns false for user when credentials don't match
      if (!user)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));

      if (!user.isActive)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));

      if (user.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));

      try {
        // Update login metrics
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLoginAt: moment.tz('UTC')
        }, { where: { id: user.id } });

        // Re-fetch without sensitive data (password, salt, tokens)
        const updatedUser = await models.user.findByPk(user.id, {
          attributes: { exclude: models.user.getSensitiveData() }
        });

        const client = resolveClient(req);
        const platform = resolvePlatform(req);

        // Mint a short-lived access token
        const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');

        // Create a refresh-token session (only the hash is stored)
        const { rawRefreshToken } = await issueSession({
          sessionModel: models.userSession,
          ownerKey: 'userId',
          ownerId: updatedUser.id,
          client,
          platform,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });

        // Set the refresh cookie for web clients
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
          refreshToken: rawRefreshToken,
          user: updatedUser.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  }); // END Promise
} // END V1Login
```

> **Why the `passport.authenticate` wrapper?** The `JWTUserLogin` Passport strategy handles finding the user by email and comparing the bcrypt hash. We wrap it in a Promise so the action stays `async`-friendly and integrates cleanly with the Orbital-Express error middleware. The `{ session: false }` option tells Passport not to create its own session — we use our own refresh-token sessions.

---

## Step 4: Write V1Refresh

Refresh exchanges a valid refresh token for a new access token and a **rotated** refresh token. The old token is revoked. If a token that was already rotated is presented again, that is a theft signal — all sessions are wiped and `tokenVersion` is bumped, killing every outstanding access token for that user.

```js
// app/User/actions/V1Refresh.js
/**
 * USER V1Refresh ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV, REFRESH_TOKEN_EXPIRES_IN } = process.env;

// services
const lang = require('../../../services/language');
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

// methods
module.exports = {
  V1Refresh
};

/**
 * Exchange a valid refresh token for a new access token (and a rotated refresh token).
 *
 * GET  /v1/users/refresh
 * POST /v1/users/refresh
 *
 * Reads the refresh token from the httpOnly 'jwt-user-refresh' cookie (web) or req.args.refreshToken (mobile).
 * Can be called while logged out — the access token is typically expired by the time you refresh.
 *
 * Rotation + reuse detection:
 *   - On success the presented refresh token is revoked and a brand-new one is issued.
 *   - If a token that was ALREADY rotated (revoked + has a replacement) is presented again,
 *     that is a theft signal. ALL of the user's sessions are revoked and tokenVersion is bumped,
 *     instantly invalidating every outstanding access token.
 *
 * Must be logged out | Can be both
 * Roles: []
 *
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): the refresh token (mobile only; web uses the httpOnly cookie)
 * }
 *
 * Success: 200 — new access token + new refresh token + user object
 * Errors:
 *   401: USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Refresh(req, res) {
  const i18n = lang.getLocalI18n();

  // Read the refresh token from the cookie (web) or the request body (mobile)
  const rawRefreshToken =
    (req.cookies && req.cookies['jwt-user-refresh']) ||
    (req.args && req.args.refreshToken) ||
    null;

  if (!rawRefreshToken)
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);

  const t = await models.db.transaction();

  try {
    // Look up the session by the token's SHA-256 hash
    const sessionRow = await findSessionByRawToken({
      sessionModel: models.userSession,
      rawRefreshToken,
      transaction: t
    });

    // Unknown token — treat as invalid
    if (!sessionRow) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // REUSE DETECTION: if the token was already rotated (revoked AND has a replacement session),
    // someone is replaying a stolen token. Nuke everything.
    if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
      await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
      await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // Revoked (logged out) or expired → invalid, nothing more to do
    if (!isSessionActive(sessionRow)) {
      await revokeSession({ session: sessionRow, transaction: t }); // idempotent
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // Load the owner (need tokenVersion for the new access token + active/deleted checks)
    const user = await models.user.findByPk(sessionRow.userId, {
      attributes: { exclude: models.user.getSensitiveData() },
      transaction: t
    });

    if (!user || !user.isActive || user.deletedAt) {
      await revokeSession({ session: sessionRow, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // Rotate: revoke the presented session, issue a fresh one linked to it
    const { rawRefreshToken: newRawRefreshToken } = await rotateSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      currentSession: sessionRow,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      transaction: t
    });

    // Mint a new access token (audience matches the original session's client kind)
    const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

    await t.commit();

    // Set the rotated refresh cookie (options MUST match V1Login)
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

> **Reuse detection explained**
>
> When a refresh token is rotated, the old session row is kept in the DB with `revokedAt` set and `replacedBySessionId` pointing at the new session. If the same old token is presented again, both conditions are true — the framework recognises it as a replay attack, revokes all sessions for the user, and increments `tokenVersion` so every outstanding access token fails the `tokenVersion` claim check on the next request.

---

## Step 5: Write V1Logout

Logout revokes the current device's refresh-token session and clears the cookie. Other devices are not affected.

```js
// app/User/actions/V1Logout.js
/**
 * USER V1Logout ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// services
const lang = require('../../../services/language');

// helpers
const { findSessionByRawToken, revokeSession } = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Logout
};

/**
 * Log a user out of the CURRENT session/device.
 *
 * GET  /v1/users/logout
 * POST /v1/users/logout
 *
 * Revokes the refresh-token session for the presented refresh token and clears the refresh cookie.
 * Other devices/sessions are unaffected (use V1LogoutAll for those).
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): the refresh token (mobile only; web uses the httpOnly cookie)
 * }
 *
 * Success: 200 — { success: true }
 * Errors:
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Logout(req, res) {
  const i18n = lang.getLocalI18n();

  // Read the refresh token from the cookie (web) or the request body (mobile)
  const rawRefreshToken =
    (req.cookies && req.cookies['jwt-user-refresh']) ||
    (req.args && req.args.refreshToken) ||
    null;

  const t = await models.db.transaction();

  try {
    // Revoke the session for the presented refresh token — only if it belongs to THIS user.
    // We check userId to prevent one user from revoking another user's session.
    if (rawRefreshToken) {
      const sessionRow = await findSessionByRawToken({
        sessionModel: models.userSession,
        rawRefreshToken,
        transaction: t
      });

      if (sessionRow && sessionRow.userId === req.user.id)
        await revokeSession({ session: sessionRow, transaction: t });
    }

    await t.commit();

    // Clear the refresh cookie — options must match V1Login exactly (Safari is strict)
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return {
      status: 200,
      success: true
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Logout
```

> **Why check `sessionRow.userId === req.user.id`?** The raw token lookup is by hash, not by user. Without this guard, a user who somehow obtained another user's refresh token could revoke it through this endpoint. The ownership check is a cheap, important safety net.

---

## Step 6: Write V1LogoutAll

LogoutAll revokes every session for the user and bumps `tokenVersion`, which instantly invalidates every outstanding access token (not just the one on this device).

```js
// app/User/actions/V1LogoutAll.js
/**
 * USER V1LogoutAll ACTION
 */

'use strict';

// ENV variables
const { NODE_ENV } = process.env;

// services
const lang = require('../../../services/language');

// helpers
const { revokeAllSessionsForOwner } = require('../../../helpers/session');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1LogoutAll
};

/**
 * Log a user out of ALL devices/sessions.
 *
 * GET  /v1/users/logoutall
 * POST /v1/users/logoutall
 *
 * Revokes every active session for the user and bumps tokenVersion, which instantly invalidates
 * every outstanding access token. Also clears this device's refresh cookie.
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {}
 *
 * Success: 200 — { success: true }
 * Errors:
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1LogoutAll(req, res) {
  const i18n = lang.getLocalI18n();

  const t = await models.db.transaction();

  try {
    // Revoke all sessions for this user
    await revokeAllSessionsForOwner({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: req.user.id,
      transaction: t
    });

    // Bump tokenVersion — every outstanding access token for this user is now rejected
    // on the next authenticated request (the auth middleware checks this claim)
    await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

    await t.commit();

    // Clear this device's refresh cookie
    res.clearCookie('jwt-user-refresh', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return {
      status: 200,
      success: true
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1LogoutAll
```

> **How `tokenVersion` kills access tokens** Access tokens embed a `tokenVersion` claim at mint time. The auth middleware (`middleware/auth.js`) reads `tokenVersion` from the database on every request and rejects the token if the claim does not match. Incrementing it server-side is therefore a synchronous, zero-latency revocation mechanism for short-lived tokens.

---

## Step 7: Write V1Read ("me")

V1Read is the protected profile endpoint. It requires an access token (`Authorization: jwt-user <token>`). In this codebase users can only read themselves.

```js
// app/User/actions/V1Read.js
/**
 * USER V1Read ACTION
 */

'use strict';

// third-party node modules
const joi = require('joi');

// services
const lang = require('../../../services/language');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Read
};

/**
 * Read and return a user's profile.
 *
 * GET  /v1/users/read
 * POST /v1/users/read
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {
 *   @id - (STRING - OPTIONAL) [DEFAULT - req.user.id]: The id of the user to read
 * }
 *
 * Success: 200 — user object (sensitive data excluded)
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Read(req, res) {
  const i18n = lang.getLocalI18n();

  const schema = joi.object({
    id: joi.string().uuid().default(req.user.id).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // Users can only read their own profile
    if (req.args.id !== req.user.id)
      return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    const findUser = await models.user.findByPk(req.args.id, {
      attributes: { exclude: models.user.getSensitiveData() }
    });

    if (!findUser)
      return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      user: findUser.get({ plain: true })
    };
  } catch (error) {
    throw error;
  }
} // END V1Read
```

> **`findUser.get({ plain: true })`** Converts the Sequelize model instance to a plain JS object. Required when you use `.include` (joins) — without it, the included associations may not serialize correctly in the JSON response.

---

## Step 8: Wire up routes

Open `app/User/routes.js` and register all six endpoints. Route URLs are **lowercase, no separators**:

```js
// app/User/routes.js
'use strict';

const controller = require('./controller');

module.exports = (passport, router) => {
  router.all('/v1/users/register',   controller.V1Register);
  router.all('/v1/users/login',      controller.V1Login);
  router.all('/v1/users/refresh',    controller.V1Refresh);
  router.all('/v1/users/logout',     controller.V1Logout);
  router.all('/v1/users/logoutall',  controller.V1LogoutAll);
  router.all('/v1/users/read',       controller.V1Read);

  return router;
};
```

The controller (`app/User/controller.js`) re-exports actions and wires them to the middleware chain that applies auth, args parsing, and error wrapping. The generated controller handles this automatically — just make sure all six action names appear in `app/User/actions/index.js`.

---

## Step 9: Test the full auth flow

Tests live at `app/User/tests/integration/`. Each action gets its own file. Below are complete tests for all six endpoints.

### Test structure boilerplate (shared across all files)

Every test file follows the same setup pattern. Extract this into a mental template:

```js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1XYZ', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/xyz';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  // tests go here
});
```

### V1Register tests

```js
// app/User/tests/integration/V1Register.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1Register', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/register';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should register a new user and auto-login with tokens', async () => {
      const res = await request(app).post(routeUrl).send({
        email: 'new-user@example.com',
        password: 'Password1#$FA9',
        firstName: 'New',
        lastName: 'User',
        timezone: 'America/New_York'
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.user.email).toBe('new-user@example.com');

      // sensitive data must never leak
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.salt).toBeUndefined();

      // password is hashed in the DB
      const created = await models.user.scope(null).findOne({ where: { email: 'new-user@example.com' } });
      expect(created).not.toBeNull();
      expect(created.password).not.toBe('Password1#$FA9');

      // a session was created
      const session = await models.userSession.findOne({ where: { userId: created.id } });
      expect(session).not.toBeNull();
    });

    it('[logged-out] should fail when the email is already registered', async () => {
      const res = await request(app).post(routeUrl).send({
        email: userFix[0].email,
        password: 'Password1#$FA9'
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_USER_ALREADY_EXISTS));
    });

    it('[logged-out] should fail with a weak password', async () => {
      const res = await request(app).post(routeUrl).send({ email: 'x@example.com', password: 'weak' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS.error);
    });

    it('[logged-out] should fail with an invalid email', async () => {
      const res = await request(app).post(routeUrl).send({ email: 'not-an-email', password: 'Password1#$FA9' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS.error);
    });

    it('[logged-out] should fail with an invalid timezone', async () => {
      const res = await request(app).post(routeUrl).send({
        email: 'x@example.com',
        password: 'Password1#$FA9',
        timezone: 'Not/A_Real_Timezone'
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_INVALID_TIMEZONE));
    });
  });

  describe('Role: Logged In', () => {
    it('[logged-in] should reject a logged-in user attempting to register', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[0]);
      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ email: 'another@example.com', password: 'Password1#$FA9' });

      expect(res.statusCode).toBe(401);
    });
  });
});
```

### V1Login tests

```js
// app/User/tests/integration/V1Login.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const moment = require('moment-timezone');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1Login', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/login';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should login successfully and return tokens', async () => {
      const user1 = userFix[0];
      const res = await request(app).post(routeUrl).send({ email: user1.email, password: user1.password });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.user).not.toBeNull();

      // loginCount is incremented
      const check = await models.user.findByPk(user1.id);
      expect(check.loginCount).toBe(1);
      expect(check.lastLoginAt).not.toBeNull();
    });

    it('[logged-out] should store client and platform on the session', async () => {
      const user1 = userFix[0];
      const res = await request(app)
        .post(routeUrl)
        .set('x-client', 'app')
        .set('x-platform', 'ios')
        .send({ email: user1.email, password: user1.password });

      expect(res.statusCode).toBe(201);
      const session = await models.userSession.findOne({ where: { userId: user1.id } });
      expect(session.client).toBe('app');
      expect(session.platform).toBe('ios');
    });

    it('[logged-out] should fail with wrong credentials', async () => {
      const res = await request(app).post(routeUrl).send({ email: 'wrong@example.com', password: 'wrongpass' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
    });

    it('[logged-out] should fail for an inactive account', async () => {
      await models.user.update({ isActive: false }, { where: { id: userFix[0].id } });
      const res = await request(app).post(routeUrl).send({ email: userFix[0].email, password: userFix[0].password });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));
    });

    it('[logged-out] should fail for a deleted account', async () => {
      await models.user.update({ deletedAt: moment.tz('UTC') }, { where: { id: userFix[0].id } });
      const res = await request(app).post(routeUrl).send({ email: userFix[0].email, password: userFix[0].password });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));
    });
  });
});
```

### V1Refresh tests

```js
// app/User/tests/integration/V1Refresh.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const { Op } = require('sequelize');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, refresh, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1Refresh', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/refresh';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should exchange a valid refresh token for a new access token and rotate', async () => {
      const user1 = userFix[0];
      const { response: loginRes } = await userLogin(app, '/v1', request, user1);
      const oldRefreshToken = loginRes.body.refreshToken;

      expect(typeof oldRefreshToken).toBe('string');

      const { token, refreshToken: newRefreshToken, response } = await refresh(app, '/v1', request, 'users', oldRefreshToken);

      expect(response.statusCode).toBe(200);
      expect(typeof token).toBe('string');
      expect(newRefreshToken).not.toBe(oldRefreshToken); // token was rotated

      // exactly one active session — old is revoked, new is active
      const activeSessions = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeSessions).toBe(1);

      const revokedSessions = await models.userSession.count({
        where: { userId: user1.id, revokedAt: { [Op.ne]: null } }
      });
      expect(revokedSessions).toBe(1);
    });

    it('[logged-out] should trigger reuse detection when a rotated token is replayed', async () => {
      const user1 = userFix[0];
      const { response: loginRes } = await userLogin(app, '/v1', request, user1);
      const originalToken = loginRes.body.refreshToken;

      // First refresh — rotates the token
      await refresh(app, '/v1', request, 'users', originalToken);

      // Replay the already-rotated token — this is the theft signal
      const res = await request(app).post(routeUrl).send({ refreshToken: originalToken });
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN));

      // All sessions are revoked
      const activeSessions = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeSessions).toBe(0);

      // tokenVersion was bumped — outstanding access tokens are now invalid
      const updatedUser = await models.user.findByPk(user1.id);
      expect(updatedUser.tokenVersion).toBeGreaterThan(0);
    });

    it('[logged-out] should fail with a missing refresh token', async () => {
      const res = await request(app).post(routeUrl).send({});
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN));
    });

    it('[logged-out] should fail with a bogus refresh token', async () => {
      const res = await request(app).post(routeUrl).send({ refreshToken: 'not-a-real-token' });
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN));
    });
  });
});
```

### V1Logout tests

```js
// app/User/tests/integration/V1Logout.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1Logout', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/logout';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should reject unauthenticated requests', async () => {
      const res = await request(app).post(routeUrl).send({});
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
    });
  });

  describe('Role: Logged In', () => {
    it('[logged-in] should revoke the current session', async () => {
      const user1 = userFix[0];
      const { token, response: loginRes } = await userLogin(app, '/v1', request, user1);
      const refreshToken = loginRes.body.refreshToken;

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // The session is now revoked
      const activeSessions = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeSessions).toBe(0);
    });

    it('[logged-in] should succeed even without a refresh token (session not found, still logs out)', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[0]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
```

### V1LogoutAll tests

```js
// app/User/tests/integration/V1LogoutAll.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1LogoutAll', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/logoutall';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should reject unauthenticated requests', async () => {
      const res = await request(app).post(routeUrl).send({});
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
    });
  });

  describe('Role: Logged In', () => {
    it('[logged-in] should revoke all sessions and bump tokenVersion', async () => {
      const user1 = userFix[0];

      // Create two sessions by logging in twice
      await userLogin(app, '/v1', request, user1);
      const { token } = await userLogin(app, '/v1', request, user1);

      const activeBefore = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeBefore).toBe(2);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // All sessions revoked
      const activeAfter = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeAfter).toBe(0);

      // tokenVersion was incremented
      const updatedUser = await models.user.findByPk(user1.id);
      expect(updatedUser.tokenVersion).toBeGreaterThan(0);
    });
  });
});
```

### V1Read tests

```js
// app/User/tests/integration/V1Read.test.js
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models = require('../../../../models');
const request = require('supertest');
const queue = require('../../../../services/queue');
const i18n = require('../../../../services/language').getLocalI18n();
const socket = require('../../../../services/socket');
const { errorResponse, ERROR_CODES } = require('../../../../services/error');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('User.V1Read', () => {
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/users/read';

  beforeAll(async () => { app = await require('../../../../server'); });

  beforeEach(async () => {
    userFix = userFixFn();
    await socket.get();
    await reset();
    await populate('fix1');
  });

  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  describe('Role: Logged Out', () => {
    it('[logged-out] should reject unauthenticated requests', async () => {
      const res = await request(app).post(routeUrl).send({});
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
    });
  });

  describe('Role: Logged In', () => {
    it('[logged-in] should return the authenticated user profile without sensitive data', async () => {
      const user1 = userFix[0];
      const { token } = await userLogin(app, '/v1', request, user1);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(user1.id);
      expect(res.body.user.email).toBe(user1.email);

      // sensitive data must never be returned
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.salt).toBeUndefined();
    });

    it('[logged-in] should return own profile when no id is provided (defaults to req.user.id)', async () => {
      const user1 = userFix[0];
      const { token } = await userLogin(app, '/v1', request, user1);

      // no id in args — defaults to the authenticated user's id
      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(user1.id);
    });

    it('[logged-in] should not allow reading another user\'s profile', async () => {
      const user1 = userFix[0];
      const user2 = userFix[1];
      const { token } = await userLogin(app, '/v1', request, user1);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ id: user2.id });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST));
    });
  });
});
```

---

## Running the tests

```bash
yarn test                        # full suite (lang compile + DB fix + jest --runInBand)
yarn test --testPathPattern V1Register  # single file
```

Both Postgres and Redis must be running. The `--runInBand` flag (already set in `package.json`) runs tests serially — required because tests share a single DB and reset it in `beforeEach`.

---

## Key conventions recap

| Rule | Applies here |
|---|---|
| POST + GET only | All six routes use `router.all(...)` |
| `req.args` not `req.body` | Joi validates `req.args` which is set by `middleware/args.js` |
| Flat response — no `data` nesting | `{ status, success, token, user }` not `{ data: { token, user } }` |
| 201 on create, 200 otherwise | Register and Login are 201; Refresh, Logout, Read are 200 |
| Never store the raw refresh token | Only the SHA-256 hash hits the DB |
| Cookie options must match across all auth actions | `httpOnly`, `sameSite: 'strict'`, `path: '/'` — mismatches break Safari |
| Sensitive data excluded by default scope | Always call `getSensitiveData()` or rely on `defaultScope` |
| Named indexes match between model and migration | `UserSessions_userId_idx`, `UserSessions_refreshTokenHash_unique` |
| Test who cannot do something | Every action has at least one logged-out rejection test |
