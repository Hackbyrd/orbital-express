# 使用者類型

Orbital-Express 強制執行一條嚴格規則：**每個已認證的使用者類型對應一張資料表**。本頁說明此規則、內建類型，以及如何擴展系統。

---

## 每個類型一張資料表 — 絕不使用 role 欄位

常見的反模式是在單一 users 資料表中加入 `role` 欄位：

```sql
-- ❌ 錯誤
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  role TEXT CHECK (role IN ('admin', 'user'))  -- 絕對不要這樣做
);
```

Orbital-Express 要求每個類型使用獨立的資料表：

```sql
-- ✅ 正確
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT
  -- user 專用欄位
);

CREATE TABLE admins (
  id UUID PRIMARY KEY,
  email TEXT,
  permissions JSONB  -- admin 專用欄位
);
```

---

## 為何使用獨立資料表？

**不同的欄位。** Admin 可能帶有權限集、稽核旗標或內部角色。User 帶有訂閱方案、引導狀態、裝置 token。強行合併成一張資料表會產生稀疏、nullable 欄位充斥的 schema。

**不同的 auth audience。** Access token 發行時帶有 `audience` 宣告（`admin-web`、`user-web` 等）。為 admin 鑄造的 token 無法在 user 路由上被接受 — middleware 在 audience 檢查時就會拒絕。若使用 role 欄位，就必須在每條路由上驗證 role。

**獨立的擴展與查詢。** Admin 查詢（儀表板、報表）永遠不會碰到 users 資料表。User 查詢永遠不會掃描 admins。索引保持精簡。

**無意外的交叉暴露。** 在結構上，admin token 無法被提交到 user 端點並成功，因為驗證 admin token 的 Passport 策略只掛載在 admin 路由上。

---

## 內建類型

### User
一般應用程式使用者 — 產品的主要受眾。

- 資料表：`Users`
- Session 資料表：`UserSessions`
- Auth audience：`user-web`
- Token 在已認證路由中掛載至 `req.user`
- Login/refresh/logout action 位於 `app/User/`

### Admin
後台及內部操作人員。

- 資料表：`Admins`
- Session 資料表：`AdminSessions`
- Auth audience：`admin-web`
- Token 在已認證路由中掛載至 `req.admin`
- Login/refresh/logout action 位於 `app/Admin/`

---

## 新增使用者類型（例如 Partner）

使用 `add-auth-user-type` skill（`.claude/skills/add-auth-user-type/SKILL.md`）。概要步驟：

**1. 在 `middleware/auth.js` 中登錄 audience**

```js
// middleware/auth.js
const AUTH_TYPES = {
  USER:    'user-web',
  ADMIN:   'admin-web',
  PARTNER: 'partner-web',  // 新增此項
};
```

**2. 在 `services/passport.js` 中新增 Passport 策略**

```js
passport.use('partner-jwt', new JwtStrategy({
  ...baseJwtOptions,
  audience: AUTH_TYPES.PARTNER,
}, async (payload, done) => {
  const partner = await Partner.findByPk(payload.sub);
  return partner ? done(null, partner) : done(null, false);
}));
```

**3. 建立 `Partners` 和 `PartnerSessions` 資料表**

產生 migration：

```bash
sequelize migration:create --name create-partners-and-partner-sessions
```

遵循與 `Users` / `UserSessions` 相同的欄位慣例（請參閱下方 schema）。

**4. 建立 feature 骨架**

```bash
yarn gen Partner
```

這會建立 `app/Partner/`，包含 model、controller、routes 和 action 存根。然後新增你的認證 action（`V1Login`、`V1Refresh`、`V1Logout`），並移除產生器的預設 placeholder：

```bash
yarn del Partner -a V1Example
```

**5. 在你的 action 中使用 `req.partner`**

```js
// app/Partner/actions/V1GetMe.js
module.exports = async (req, res) => {
  const partner = req.partner;  // 由 passport('partner-jwt') middleware 設定
  return res.respond({ status: 200, partner: partner.toJSON() });
};
```

僅在 partner 路由上掛載策略：

```js
// app/Partner/routes.js
router.post('/v1/partners/me', passport.authenticate('partner-jwt', { session: false }), V1GetMe);
```

---

## UserSessions / AdminSessions 資料表

每個已認證的使用者類型都有專屬的 sessions 資料表。它儲存可撤銷的 refresh token 並支援 token 輪換。

### Schema

```sql
CREATE TABLE IF NOT EXISTS UserSessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  userId                UUID        NOT NULL REFERENCES Users(id),
  replacedBySessionId   UUID        DEFAULT NULL REFERENCES UserSessions(id), -- token 輪換時設定
  refreshTokenHash      TEXT        NOT NULL UNIQUE, -- 原始 refresh token 的 SHA-256（hex）雜湊
  expiresAt             TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  revokedAt             TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL, -- 登出 / 全部登出時設定
  lastUsedAt            TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  userAgent             TEXT        DEFAULT NULL,
  ipAddress             TEXT        DEFAULT NULL,
  client                TEXT        NOT NULL DEFAULT 'web',   -- 例如 'web', 'app'
  platform              TEXT        NOT NULL DEFAULT 'web',   -- 例如 'web', 'ios', 'android'

  -- 由 Sequelize 自動產生
  deletedAt             TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
  createdAt             TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updatedAt             TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
); -- END UserSessions TABLE
```

`tokenVersion` 位於**擁有者資料表**（`Users.tokenVersion INT NOT NULL DEFAULT 0`），而非 session 資料列上 — 在全部登出時遞增，讓伺服器無需每次請求查詢 DB 就能拒絕過期的 access token。

### 欄位說明

| 欄位 | 用途 |
|---|---|
| `refreshTokenHash` | Refresh token 永不以原始形式儲存。在寫入前進行 SHA-256 雜湊（hex）；原始 token 只回傳給客戶端一次。Refresh token 是高熵的隨機值，快速的 SHA-256 已足夠 — 此處不使用 bcrypt。 |
| `replacedBySessionId` | 當 refresh 輪換 token 時，舊 session 在此記錄新 session 的 id。可用於偵測重放攻擊 — 若已輪換的 token 被重放，其替換鏈可見，整個 session 家族可被撤銷。 |
| `revokedAt` | 在登出或全部登出時設定。伺服器拒絕任何 `revokedAt` 不為 null 的 session。也透過 paranoid 模式使用軟刪除（`deletedAt`）。 |
| `expiresAt` | Refresh token 的絕對到期時間。伺服器拒絕超過此時間戳的 session，不論 JWT `exp` 為何。 |
| `client` / `platform` | 在 refresh 時用來重新鑄造 access token audience（例如 `user-web` vs `user-app`）。在登入時儲存，因此 refresh 不需要客戶端重新聲明。 |

### Token 流程

```
Client                        Server
  |                              |
  |-- POST /v1/users/login ----> |  驗證憑證
  |                              |  建立 UserSession { tokenHash, expiresAt, audience }
  |<-- { accessToken, refreshToken } --
  |                              |
  |-- POST /v1/users/refresh --> |  對傳入的 token 進行雜湊，查找 session
  |                              |  確認未過期、未被替換
  |                              |  建立新 session，在舊 session 上設定 replacedBySessionId
  |<-- { accessToken, refreshToken (new) } --
  |                              |
  |-- POST /v1/users/logout ---> |  軟刪除 session（paranoid）
  |<-- { status: 200 } ---------
```

每個使用者類型都會建立相同的 sessions 資料表（`AdminSessions`、`PartnerSessions` 等），外鍵指向其對應的父資料表。
