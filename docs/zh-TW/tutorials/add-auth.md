# 教學：新增身份驗證

完整的身份驗證設定實作教學，涵蓋新使用者類型的完整流程。結束時你將擁有可運作的註冊、登入、refresh、登出、全部登出，以及「me」（讀取個人資料）端點，並附有涵蓋每條路徑的整合測試。

以下範例直接取自一個可運作的 Nitra Brain 實作，展示的是正式品質的程式碼，而非骨架樁。

---

## 我們要建立什麼

| Action | Route | 需要驗證 |
|---|---|---|
| V1Register | `POST /v1/users/register` | 否 |
| V1Login | `POST /v1/users/login` | 否 |
| V1Refresh | `POST /v1/users/refresh` | 否（access token 通常已過期） |
| V1Logout | `POST /v1/users/logout` | 是 |
| V1LogoutAll | `POST /v1/users/logoutall` | 是 |
| V1Read（"me"） | `POST /v1/users/read` | 是 |

---

## 前置條件

- `User` feature 資料夾已存在（`yarn gen User`）。
- Postgres 和 Redis 正在執行中（`yarn s` 會告訴你是否未執行）。
- 你已了解 Orbital-Express action 的解剖結構（參見 `README.md` → "Actions"）。

---

## 步驟 1：建立 UserSessions migration

UserSessions 支撐無狀態的 access token 系統。每一列代表一個使用者的一個活躍 refresh token session。原始 token **永遠不儲存** — 只儲存其 SHA-256 雜湊值。

先產生 migration 檔案：

```bash
sequelize migration:create --name create-UserSession-model
```

然後填入內容：

```js
// migrations/<timestamp>-create-UserSession-model.js
'use strict';

const DataTypes = require('sequelize').DataTypes;

// 欄位順序：id → 外鍵 → 自訂欄位 → Sequelize 自動產生（deletedAt、createdAt、updatedAt）
const attrs = {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: () => uuidv7(),
    primaryKey: true,
    validate: { isUUID: 7 }
  },

  // 擁有者 FK — 將 User 的 id 帶到每個 session 資料列
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },

  // 自我參照 FK — 輪換時取代此 session 的 session。
  // 透過下方的 addConstraint 新增（Sequelize 的 createTable 無法表達自我參照）。
  replacedBySessionId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null
  },

  // 不透明 refresh token 的 SHA-256 雜湊 — 永遠不儲存原始 token
  refreshTokenHash: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // refresh token 的過期時間
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },

  // 此 session 被撤銷的時間（登出/輪換/重用偵測）；null 表示仍活躍
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },

  // 此 session 最後一次用於發行新 access token 的時間
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },

  // 登入時捕獲的 user-agent 字串（JSONB，方便後續解析）
  userAgent: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },

  // 登入時捕獲的 IP 位址
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },

  // 用戶端種類（'web' | 'app'）— 安全邊界；決定 JWT audience
  client: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'web'
  },

  // 平台/OS（'web' | 'ios' | 'android' | 'ipados' | 'macos' | 'windows'）— 僅供分析
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'web'
  },

  // Sequelize paranoid 軟刪除欄位
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

      // 輪換鏈的自我參照 FK
      await queryInterface.addConstraint('UserSessions', {
        fields: ['replacedBySessionId'],
        type: 'foreign key',
        name: 'UserSessions_replacedBySessionId_fkey',
        references: { table: 'UserSessions', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction: t
      });

      // 擁有者 FK 的具名索引（規則：永遠為 FK 建立索引）
      await queryInterface.addIndex('UserSessions', ['userId'], {
        name: 'UserSessions_userId_idx',
        transaction: t
      });

      // token 雜湊的唯一索引 — refresh 時快速查找 + 防止碰撞
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

執行 migration：

```bash
sequelize db:migrate
```

> **為什麼要單獨 `addConstraint`？** Sequelize 的 `createTable` 不支援自我參照 FK 定義。資料表必須存在後，FK 才能參照它，因此我們在同一個 transaction 中的第二步驟加入。

---

## 步驟 2：撰寫 V1Register

註冊驗證輸入、透過 model 的 `beforeCreate` hook 雜湊密碼、在 transaction 中建立使用者，然後透過發行 session 立即讓使用者登入。

```bash
yarn gen User -a V1Register   # 建立骨架
yarn del User -a V1Example    # 移除預設佔位符
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
 * 以 email + password 註冊新使用者 — 然後登入（access token + refresh session）。
 *
 * GET  /v1/users/register
 * POST /v1/users/register
 *
 * Must be logged out
 * Roles: []
 *
 * req.args = {
 *   @email    - (STRING - REQUIRED): 唯一電子郵件地址（不區分大小寫）
 *   @password - (STRING - REQUIRED): 最少 12 字元，大小寫混合，數字，特殊字元
 *   @firstName - (STRING - OPTIONAL): 最多 64 字元
 *   @lastName  - (STRING - OPTIONAL): 最多 64 字元
 *   @timezone  - (STRING - OPTIONAL): IANA 時區，預設為 'UTC'
 *   @locale    - (STRING - OPTIONAL): 語言代碼，預設為 'en'
 * }
 *
 * Success: 201 — 新使用者物件 + access token + refresh token
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
    // 檢查現有使用者（包含軟刪除的資料列，避免唯一約束衝突）
    const existingUser = await models.user.findOne({
      where: { email: req.args.email },
      paranoid: false,
      transaction: t
    });

    if (existingUser) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_USER_ALREADY_EXISTS);
    }

    // model 的 beforeCreate hook 產生 salt 並雜湊密碼
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

    // 重新取得，排除敏感資料（預設 scope 排除 salt/password/tokens）
    const safeUser = await models.user.findByPk(newUser.id);

    // 鑄造 access token + 建立 refresh token session
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

    // 將 refresh token 設定為 httpOnly cookie（網頁端）。行動端從回應主體讀取。
    // 注意：V1Logout 的清除選項必須與此一致（Safari 需要一致的 cookie 選項）。
    res.cookie('jwt-user-refresh', rawRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseDurationMs(REFRESH_TOKEN_EXPIRES_IN)
    });

    // 201 — 建立了新的使用者資源
    return {
      status: 201,
      success: true,
      token,                    // 短效 access token — 發送方式：Authorization: jwt-user <token>
      refreshToken: rawRefreshToken, // 給無法使用 cookies 的行動端用戶端
      user: safeUser.dataValues
    };
  } catch (error) {
    if (!t.finished)
      await t.rollback();

    throw error;
  }
} // END V1Register
```

> **重點說明**
> - 重複檢查中的 `paranoid: false` 表示具有相同 email 的軟刪除帳號會阻止重新註冊。
> - `beforeCreate` hook（在 User model 上）負責 bcrypt 雜湊 — action 永遠不直接呼叫 bcrypt。
> - `helpers/session` 的 `issueSession` 建立 DB 資料列並只返回原始 token；雜湊值被儲存。
> - Cookie 選項（`httpOnly`、`sameSite: 'strict'`、`path: '/'`）在 V1Register、V1Login、V1Refresh 和 V1Logout 之間必須**完全相同** — Safari 會將不一致視為不同的 cookie。

---

## 步驟 3：撰寫 V1Login

登入將憑證驗證委派給 Passport 的 `JWTUserLogin` strategy（它讀取使用者並比對 bcrypt 雜湊），然後遵循與 V1Register 相同的 session 發行模式。

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
 * 登入使用者 — 返回短效 access token 並設定長效 httpOnly refresh cookie。
 *
 * GET  /v1/users/login
 * POST /v1/users/login
 *
 * Must be logged out
 * Roles: []
 *
 * req.args = {
 *   @email    - (STRING - REQUIRED): 使用者的電子郵件地址
 *   @password - (STRING - REQUIRED): 明文密碼
 * }
 *
 * Success: 201 — 使用者物件 + access token + refresh token
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

  // 以 Promise 包裝，因為 passport.authenticate 使用 callback，而非 async/await
  return new Promise((resolve, reject) => {
    passport.authenticate('JWTUserLogin', { session: false }, async (err, user, info) => {
      if (err)
        return reject(err);

      // 憑證不符時 Passport 返回 false
      if (!user)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));

      if (!user.isActive)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE));

      if (user.deletedAt)
        return resolve(errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_DELETED));

      try {
        // 更新登入指標
        await models.user.update({
          loginCount: user.loginCount + 1,
          lastLoginAt: moment.tz('UTC')
        }, { where: { id: user.id } });

        // 重新取得，排除敏感資料（password、salt、tokens）
        const updatedUser = await models.user.findByPk(user.id, {
          attributes: { exclude: models.user.getSensitiveData() }
        });

        const client = resolveClient(req);
        const platform = resolvePlatform(req);

        // 鑄造短效 access token
        const token = createAccessToken(updatedUser, getTokenAudience('user', client), 'user');

        // 建立 refresh token session（只儲存雜湊值）
        const { rawRefreshToken } = await issueSession({
          sessionModel: models.userSession,
          ownerKey: 'userId',
          ownerId: updatedUser.id,
          client,
          platform,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });

        // 為網頁用戶端設定 refresh cookie
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

> **為什麼要用 `passport.authenticate` 包裝？** `JWTUserLogin` Passport strategy 負責按 email 查找使用者並比對 bcrypt 雜湊。我們用 Promise 包裝它，讓 action 保持 `async` 友好，並與 Orbital-Express 的錯誤 middleware 乾淨整合。`{ session: false }` 選項告訴 Passport 不要建立自己的 session — 我們使用自己的 refresh token sessions。

---

## 步驟 4：撰寫 V1Refresh

Refresh 將有效的 refresh token 換成新的 access token 和一個**已輪換**的 refresh token。舊 token 被撤銷。若已輪換的 token 再次被呈現，這是竊取信號 — 所有 sessions 被清除，`tokenVersion` 被更新，使該使用者的每個未到期的 access token 立即失效。

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
 * 將有效的 refresh token 換成新的 access token（和已輪換的 refresh token）。
 *
 * GET  /v1/users/refresh
 * POST /v1/users/refresh
 *
 * 從 httpOnly 'jwt-user-refresh' cookie（網頁）或 req.args.refreshToken（行動端）讀取 refresh token。
 * 可在未登入狀態呼叫 — 呼叫 refresh 時 access token 通常已過期。
 *
 * 輪換 + 重用偵測：
 *   - 成功時，呈現的 refresh token 被撤銷，發行全新的 token。
 *   - 若一個已輪換（撤銷 + 有替代品）的 token 再次被呈現，
 *     這是竊取信號。所有使用者的 sessions 被撤銷，tokenVersion 被更新，
 *     立即使每個未到期的 access token 失效。
 *
 * Must be logged out | Can be both
 * Roles: []
 *
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): refresh token（僅行動端；網頁使用 httpOnly cookie）
 * }
 *
 * Success: 200 — 新 access token + 新 refresh token + 使用者物件
 * Errors:
 *   401: USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Refresh(req, res) {
  const i18n = lang.getLocalI18n();

  // 從 cookie（網頁）或請求主體（行動端）讀取 refresh token
  const rawRefreshToken =
    (req.cookies && req.cookies['jwt-user-refresh']) ||
    (req.args && req.args.refreshToken) ||
    null;

  if (!rawRefreshToken)
    return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);

  const t = await models.db.transaction();

  try {
    // 透過 token 的 SHA-256 雜湊查找 session
    const sessionRow = await findSessionByRawToken({
      sessionModel: models.userSession,
      rawRefreshToken,
      transaction: t
    });

    // 未知 token — 視為無效
    if (!sessionRow) {
      await t.rollback();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 重用偵測：若 token 已被輪換（撤銷且有替代 session），
    // 有人在重放被竊取的 token。清除所有 sessions。
    if (sessionRow.revokedAt && sessionRow.replacedBySessionId) {
      await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: sessionRow.userId, transaction: t });
      await models.user.increment('tokenVersion', { by: 1, where: { id: sessionRow.userId }, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 已撤銷（登出）或已過期 → 無效
    if (!isSessionActive(sessionRow)) {
      await revokeSession({ session: sessionRow, transaction: t }); // 冪等
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 載入擁有者（新 access token 需要 tokenVersion + 活躍/刪除檢查）
    const user = await models.user.findByPk(sessionRow.userId, {
      attributes: { exclude: models.user.getSensitiveData() },
      transaction: t
    });

    if (!user || !user.isActive || user.deletedAt) {
      await revokeSession({ session: sessionRow, transaction: t });
      await t.commit();
      return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN);
    }

    // 輪換：撤銷呈現的 session，發行與其連結的新 session
    const { rawRefreshToken: newRawRefreshToken } = await rotateSession({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      currentSession: sessionRow,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      transaction: t
    });

    // 鑄造新的 access token（audience 符合原始 session 的用戶端種類）
    const token = createAccessToken(user, getTokenAudience('user', sessionRow.client), 'user');

    await t.commit();

    // 設定已輪換的 refresh cookie（選項必須與 V1Login 相同）
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

> **重用偵測說明**
>
> 當 refresh token 被輪換時，舊的 session 資料列保留在 DB 中，`revokedAt` 被設定，`replacedBySessionId` 指向新 session。若同一個舊 token 再次被呈現，兩個條件都成立 — 框架將其識別為重放攻擊，撤銷該使用者的所有 sessions，並遞增 `tokenVersion`，使每個未到期的 access token 在下一個請求的 `tokenVersion` claim 檢查中失敗。

---

## 步驟 5：撰寫 V1Logout

登出撤銷目前裝置的 refresh token session 並清除 cookie。其他裝置不受影響。

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
 * 將使用者從目前的 session/裝置登出。
 *
 * GET  /v1/users/logout
 * POST /v1/users/logout
 *
 * 撤銷呈現的 refresh token 的 session 並清除 refresh cookie。
 * 其他裝置/sessions 不受影響（使用 V1LogoutAll 來登出所有裝置）。
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {
 *   @refreshToken - (STRING - OPTIONAL): refresh token（僅行動端；網頁使用 httpOnly cookie）
 * }
 *
 * Success: 200 — { success: true }
 * Errors:
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Logout(req, res) {
  const i18n = lang.getLocalI18n();

  // 從 cookie（網頁）或請求主體（行動端）讀取 refresh token
  const rawRefreshToken =
    (req.cookies && req.cookies['jwt-user-refresh']) ||
    (req.args && req.args.refreshToken) ||
    null;

  const t = await models.db.transaction();

  try {
    // 撤銷呈現的 refresh token 的 session — 僅當它屬於此使用者時。
    // 我們檢查 userId 以防止一個使用者撤銷另一個使用者的 session。
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

    // 清除 refresh cookie — 選項必須與 V1Login 完全相同（Safari 很嚴格）
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

> **為什麼要檢查 `sessionRow.userId === req.user.id`？** 原始 token 的查找是透過雜湊，而非使用者。若沒有此防護，不知何故取得了另一個使用者 refresh token 的使用者，可以透過此端點撤銷它。所有權檢查是一個廉價且重要的安全防護。

---

## 步驟 6：撰寫 V1LogoutAll

LogoutAll 撤銷使用者的每個 session 並更新 `tokenVersion`，立即使每個未到期的 access token 失效（不只是此裝置上的）。

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
 * 將使用者從所有裝置/sessions 登出。
 *
 * GET  /v1/users/logoutall
 * POST /v1/users/logoutall
 *
 * 撤銷使用者的每個活躍 session 並更新 tokenVersion，立即使
 * 每個未到期的 access token 失效。同時清除此裝置的 refresh cookie。
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
    // 撤銷此使用者的所有 sessions
    await revokeAllSessionsForOwner({
      sessionModel: models.userSession,
      ownerKey: 'userId',
      ownerId: req.user.id,
      transaction: t
    });

    // 更新 tokenVersion — 此使用者的每個未到期 access token
    // 在下一個已驗證請求時都會被拒絕（auth middleware 檢查此 claim）
    await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

    await t.commit();

    // 清除此裝置的 refresh cookie
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

> **`tokenVersion` 如何使 access token 失效** Access token 在鑄造時嵌入 `tokenVersion` claim。auth middleware（`middleware/auth.js`）在每個請求中從資料庫讀取 `tokenVersion`，若 claim 不符則拒絕 token。因此，在伺服器端遞增它是短效 token 的同步、零延遲撤銷機制。

---

## 步驟 7：撰寫 V1Read（"me"）

V1Read 是受保護的個人資料端點。它需要 access token（`Authorization: jwt-user <token>`）。在此程式碼庫中，使用者只能讀取自己的資料。

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
 * 讀取並返回使用者的個人資料。
 *
 * GET  /v1/users/read
 * POST /v1/users/read
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.args = {
 *   @id - (STRING - OPTIONAL) [DEFAULT - req.user.id]: 要讀取的使用者 id
 * }
 *
 * Success: 200 — 使用者物件（排除敏感資料）
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
    // 使用者只能讀取自己的個人資料
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

> **`findUser.get({ plain: true })`** 將 Sequelize model 實例轉換為純 JS 物件。使用 `.include`（join）時必須這樣做 — 若沒有它，包含的關聯在 JSON 回應中可能無法正確序列化。

---

## 步驟 8：串接路由

開啟 `app/User/routes.js` 並登記所有六個端點。Route URL **小寫，無分隔符號**：

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

controller（`app/User/controller.js`）重新匯出 actions 並將它們連接至套用驗證、參數解析和錯誤包裝的 middleware 鏈。產生的 controller 會自動處理這些 — 只需確保所有六個 action 名稱都出現在 `app/User/actions/index.js` 中。

---

## 步驟 9：測試完整的 auth 流程

測試位於 `app/User/tests/integration/`。每個 action 有自己的檔案。以下是所有六個端點的完整測試。

### 測試結構樣板（所有檔案共用）

每個測試檔案遵循相同的設定模式。將其作為心智模板：

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

  // 測試放在此處
});
```

### V1Register 測試

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

      // 敏感資料永遠不能外洩
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.salt).toBeUndefined();

      // 密碼在 DB 中已雜湊
      const created = await models.user.scope(null).findOne({ where: { email: 'new-user@example.com' } });
      expect(created).not.toBeNull();
      expect(created.password).not.toBe('Password1#$FA9');

      // session 已建立
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

### V1Login 測試

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

      // loginCount 已遞增
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

### V1Refresh 測試

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
      expect(newRefreshToken).not.toBe(oldRefreshToken); // token 已輪換

      // 恰好一個活躍 session — 舊的已撤銷，新的活躍中
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

      // 第一次 refresh — 輪換 token
      await refresh(app, '/v1', request, 'users', originalToken);

      // 重放已輪換的 token — 這是竊取信號
      const res = await request(app).post(routeUrl).send({ refreshToken: originalToken });
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.USER_UNAUTHORIZED_INVALID_REFRESH_TOKEN));

      // 所有 sessions 已撤銷
      const activeSessions = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeSessions).toBe(0);

      // tokenVersion 已遞增 — 未到期的 access token 現在無效
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

### V1Logout 測試

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

      // session 現在已撤銷
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

### V1LogoutAll 測試

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

      // 登入兩次建立兩個 sessions
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

      // 所有 sessions 已撤銷
      const activeAfter = await models.userSession.count({ where: { userId: user1.id, revokedAt: null } });
      expect(activeAfter).toBe(0);

      // tokenVersion 已遞增
      const updatedUser = await models.user.findByPk(user1.id);
      expect(updatedUser.tokenVersion).toBeGreaterThan(0);
    });
  });
});
```

### V1Read 測試

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

      // 敏感資料永遠不能返回
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.salt).toBeUndefined();
    });

    it('[logged-in] should return own profile when no id is provided (defaults to req.user.id)', async () => {
      const user1 = userFix[0];
      const { token } = await userLogin(app, '/v1', request, user1);

      // args 中沒有 id — 預設為已驗證使用者的 id
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

## 執行測試

```bash
yarn test                        # 完整套件（lang 編譯 + DB fix + jest --runInBand）
yarn test --testPathPattern V1Register  # 單一檔案
```

Postgres 和 Redis 都必須執行中。`--runInBand` 旗標（已在 `package.json` 中設定）序列執行測試 — 必要，因為測試共用一個 DB 並在 `beforeEach` 中重置它。

---

## 關鍵慣例回顧

| 規則 | 在此處的應用 |
|---|---|
| 僅 POST + GET | 所有六個路由使用 `router.all(...)` |
| `req.args` 而非 `req.body` | Joi 驗證 `req.args`，由 `middleware/args.js` 設定 |
| 扁平回應 — 不使用 `data` 巢狀 | `{ status, success, token, user }` 而非 `{ data: { token, user } }` |
| 建立時 201，否則 200 | Register 和 Login 是 201；Refresh、Logout、Read 是 200 |
| 永遠不儲存原始 refresh token | 只有 SHA-256 雜湊寫入 DB |
| Cookie 選項必須在所有 auth actions 之間一致 | `httpOnly`、`sameSite: 'strict'`、`path: '/'` — 不一致會破壞 Safari |
| 預設 scope 排除敏感資料 | 永遠呼叫 `getSensitiveData()` 或依賴 `defaultScope` |
| model 和 migration 中的具名索引一致 | `UserSessions_userId_idx`、`UserSessions_refreshTokenHash_unique` |
| 測試無法執行的情境 | 每個 action 至少有一個未登入拒絕測試 |
