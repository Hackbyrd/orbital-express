# Session 管理

Orbital-Express 採用**無狀態 access token + 有狀態 refresh token** 的模型。Access token 是短效 JWT；refresh token 是長效不透明 token，其 SHA-256 雜湊儲存於伺服器端的 `*Session` 資料表中（例如 `UserSession`、`AdminSession`）。這讓你同時享有無狀態認證的效能與 session 的可撤銷性。

---

## helpers/session.js

所有 session 邏輯集中在一處 — `helpers/session.js` — 並以 Sequelize session model 及其擁有者 FK 欄位作為參數，因此每個使用者類型（User、Admin、Partner 等）共用相同的實作。

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

鑄造一個新的密碼學安全 refresh token，將其 SHA-256 雜湊儲存於資料庫，並回傳**原始** token 傳送給客戶端。原始 token 永不儲存。

| 參數 | 類型 | 必填 | 說明 |
|---|---|---|---|
| `sessionModel` | Sequelize model | 是 | 例如 `models.userSession` |
| `ownerKey` | string | 是 | FK 欄位名稱，例如 `'userId'` |
| `ownerId` | uuid | 是 | 擁有者的主鍵 |
| `client` | string | 否 | `'web'` 或 `'app'`（預設為 `'web'`） |
| `platform` | string | 否 | `'ios'`、`'android'`、`'web'` 等（預設為 `'web'`） |
| `userAgent` | string | 否 | 來自 `req.headers['user-agent']` |
| `ipAddress` | string | 否 | 來自 `req.ip` |
| `transaction` | Sequelize transaction | 否 | 建議使用 — 將登入包在 transaction 中 |

**回傳：** `{ rawRefreshToken, session }`

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

重點：
- `createRefreshToken()` 產生密碼學安全的不透明字串。
- `hashToken()` 是確定性的 SHA-256 雜湊 — 在建立和查找時都使用。
- `expiresAt` 從 `REFRESH_TOKEN_EXPIRES_IN` 環境變數計算（例如 `'90d'`）。
- `refreshTokenHash` 從 model 的預設 scope 中排除，因此不會在普通的 `findByPk` 中洩漏。

---

### rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction })

撤銷目前的 session 並發出新的，透過 `replacedBySessionId` 連結它們。這條鏈就是讓**重複使用偵測**得以實現的關鍵：若一個已輪換的 token 再次出現，你可以追蹤鏈條並確認它被重放了。

| 參數 | 類型 | 必填 | 說明 |
|---|---|---|---|
| `sessionModel` | Sequelize model | 是 | 例如 `models.userSession` |
| `ownerKey` | string | 是 | FK 欄位名稱，例如 `'userId'` |
| `currentSession` | session 實例 | 是 | 由 `findSessionByRawToken` 取得的 session 資料列 |
| `userAgent` | string | 否 | 來自 `req.headers['user-agent']` |
| `ipAddress` | string | 否 | 來自 `req.ip` |
| `transaction` | Sequelize transaction | 是 | 輪換必須是原子操作 |

**回傳：** **新** session 的 `{ rawRefreshToken, session }`。

```js
async function rotateSession({ sessionModel, ownerKey, currentSession, userAgent, ipAddress, transaction }) {
  const rawRefreshToken = createRefreshToken();

  const newSession = await sessionModel.create({
    [ownerKey]: currentSession[ownerKey],
    refreshTokenHash: hashToken(rawRefreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    client: currentSession.client,   // 保留 — 輪換的 session 維持相同的 client/platform
    platform: currentSession.platform,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null
  }, { transaction });

  await currentSession.update({
    revokedAt: new Date(),
    replacedBySessionId: newSession.id,   // ← 鏈結連結
    lastUsedAt: new Date()
  }, { transaction });

  return { rawRefreshToken, session: newSession };
} // END rotateSession
```

---

### revokeSession({ session, transaction })

透過設定 `revokedAt = now` 將單一 session 標記為已撤銷。冪等 — 對已撤銷的 session 呼叫是安全的。

```js
async function revokeSession({ session, transaction }) {
  if (session && !session.revokedAt)
    await session.update({ revokedAt: new Date() }, { transaction });
} // END revokeSession
```

用於單一裝置登出（V1Logout）。

---

### revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction })

以單一 `UPDATE` 批量撤銷擁有者所有未撤銷的 session。用於「全部登出」及重複使用偵測中的竊盜回應。

> **重要：** `revokeAllSessionsForOwner` 只終止 refresh token。若還要使目前流通的每個 **access token** 失效，需在其後對擁有者執行 `tokenVersion` 遞增 — JWT middleware 會拒絕嵌入的 `tokenVersion` 比資料庫中舊的 token。

```js
async function revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction }) {
  await sessionModel.update({ revokedAt: new Date() }, {
    where: { [ownerKey]: ownerId, revokedAt: null },
    transaction
  });
} // END revokeAllSessionsForOwner
```

---

## 登入流程（完整範例）

`POST /v1/users/login` — 驗證憑證，發出 access token 和 refresh session。

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
        // 記錄登入並取得乾淨的副本（排除敏感欄位）
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLogin: moment.tz('UTC'),
          lastLoginAt: moment.tz('UTC')
        }, { where: { id: user.id } });

        const updatedUser = await models.user.findByPk(user.id, {
          attributes: { exclude: models.user.getSensitiveData() }
        });

        // 解析 client 類型（web|app）和 platform（ios/android/web/…）
        const client = resolveClient(req);
        const platform = resolvePlatform(req);

        // 鑄造短效 access token
        const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');

        // 建立伺服器端 refresh session（只儲存雜湊）
        const { rawRefreshToken } = await issueSession({
          sessionModel: models.userSession,
          ownerKey: 'userId',
          ownerId: updatedUser.id,
          client,
          platform,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });

        // web：設定為 httpOnly cookie；mobile：也在 body 中回傳
        res.cookie('jwt-user-refresh', rawRefreshToken, {
          httpOnly: true,
          secure: NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
        });

        // 201 — 建立了新的 session 資源
        return resolve({
          status: 201,
          success: true,
          token,
          refreshToken: rawRefreshToken,  // mobile 從此讀取；web 使用 cookie
          user: updatedUser.dataValues
        });
      } catch (error) {
        return reject(error);
      }
    })(req, res, null);
  });
} // END V1Login
```

**Cookie 與 body：** Web 客戶端自動使用 `httpOnly` cookie。Mobile 客戶端（無法存取 `httpOnly` cookie）從回應 body 讀取 `refreshToken` 並安全地儲存（例如 Keychain / Keystore）。兩種路徑在所有認證 action 中都透明支援。

---

## Refresh 流程（完整範例）

`POST /v1/users/refresh` — 以有效的 refresh token 交換新的 access token 和已輪換的 refresh token，並帶有重複使用偵測。

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
  // web：cookie；mobile：request body
  const rawRefreshToken = (req.cookies && req.cookies['jwt-user-refresh'])
    || (req.args && req.args.refreshToken)
    || null;

  if (!rawRefreshToken)
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);

  const t = await models.db.transaction();

  try {
    // 透過雜湊查找 session
    const sessionRow = await findSessionByRawToken({
      sessionModel: models.userSession,
      rawRefreshToken,
      transaction: t
    });

    if (!sessionRow) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 重複使用偵測：已輪換的 token 再次出現 → 竊盜信號。
    // 撤銷所有 session 並遞增 tokenVersion 以立即終止所有未過期的 access token。
    if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
      await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
      await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 已撤銷（在其他地方登出）或已過期
    if (!isSessionActive(sessionRow)) {
      await revokeSession({ session: sessionRow, transaction: t }); // 冪等
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 載入使用者（需要 tokenVersion 來鑄造新 access token，以及 active/deleted 檢查）
    const user = await models.user.findByPk(sessionRow.userId, {
      attributes: { exclude: models.user.getSensitiveData() },
      transaction: t
    });

    if (!user || !user.isActive || user.deletedAt) {
      await revokeSession({ session: sessionRow, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 輪換：撤銷目前 session，發出新的並透過 replacedBySessionId 連結
    const { rawRefreshToken: newRawRefreshToken } = await rotateSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      currentSession: sessionRow,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      transaction: t
    });

    // 鑄造新的 access token（audience 來自 session 的原始 client）
    const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

    await t.commit();

    // 設定輪換的 refresh cookie（選項必須與 V1Login / V1Logout 完全一致）
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

### 重複使用偵測說明

每次輪換都會在舊 session 資料列上寫入 `replacedBySessionId`。若一個 token 出現時其 session 已撤銷**且**有 `replacedBySessionId`，代表這個 token 已輪換過一次 — 有人在重放舊 token。回應：

1. `revokeAllSessionsForOwner` — 終止所有 refresh session。
2. `models.user.increment('tokenVersion')` — 遞增嵌入在 access token 中的版本號；JWT middleware 立即拒絕任何版本號較舊的 token。

使用者實際上被從每台裝置登出，沒有任何寬限期。

---

## 登出流程

### V1Logout — 單一裝置

`POST /v1/users/logout` — 僅撤銷所提交 refresh token 的 session。其他裝置不受影響。

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

      // 只有在 session 屬於已認證使用者時才撤銷（防止跨使用者撤銷）
      if (sessionRow && sessionRow.userId === req.user.id)
        await revokeSession({ session: sessionRow, transaction: t });
    }

    await t.commit();

    // 清除 refresh cookie（選項必須與 V1Login 完全一致 — Safari 需要一致性）
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

> 擁有者檢查（`sessionRow.userId === req.user.id`）至關重要 — 若無此檢查，任何已認證的使用者只要猜測或取得另一位使用者的 refresh token，就能撤銷其 session。

---

### V1LogoutAll — 所有裝置

`POST /v1/users/logoutall` — 撤銷使用者的每個 refresh session **並**遞增 `tokenVersion`，立即使每台裝置上所有未過期的 access token 失效。

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
    // 撤銷所有 refresh session
    await revokeAllSessionsForOwner({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: req.user.id,
      transaction: t
    });

    // 遞增 tokenVersion → 此使用者所有未過期的 access token 立即被拒絕
    await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

    await t.commit();

    // 清除此裝置的 refresh cookie
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

**為何需要 `tokenVersion`？** Access token 是無狀態的 JWT — 沒有伺服器端記錄可撤銷。使用者資料列上的 `tokenVersion` 欄位在鑄造時嵌入 JWT payload。JWT middleware 拒絕任何 `tokenVersion` 低於資料庫目前值的 token。在不等待自然過期的情況下，遞增它是使飛行中的 access token 失效的唯一方法。

---

## Cookie 規則

所有三個認證 action（`V1Login`、`V1Refresh`、`V1Logout`、`V1LogoutAll`）使用**相同的 cookie 選項**。Safari 要求 `clearCookie` 選項與設定 cookie 時的選項完全一致 — 任何不符都會靜默地無法清除 cookie。

| 選項 | 值 |
|---|---|
| `httpOnly` | `true` |
| `secure` | 生產環境為 `true`，開發環境為 `false` |
| `sameSite` | `'strict'` |
| `path` | `'/'` |
| `maxAge` | `parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)`（僅在設定時使用；`clearCookie` 不使用） |

Cookie 名稱對使用者為 `jwt-user-refresh`，其他使用者類型遵循 `jwt-<type>-refresh` 的模式（例如 `jwt-admin-refresh`）。
