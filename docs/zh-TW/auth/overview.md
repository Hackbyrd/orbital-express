# 認證概覽

Orbital-Express 採用**雙 token、無狀態加可撤銷**的認證模型。短效 JWT 處理請求授權，無需查詢資料庫。長效不透明 refresh token — 以 SHA-256 雜湊形式儲存於伺服器端 — 支援撤銷、輪換及竊盜偵測。

---

## 雙 Token 模型

| | Access Token | Refresh Token |
|---|---|---|
| **形式** | JWT（HS256，已簽章） | 不透明隨機字串（32 bytes / 64 個十六進位字元） |
| **有效期** | 約 15 分鐘（`ACCESS_TOKEN_EXPIRES_IN` 環境變數） | 約 60 天（`REFRESH_TOKEN_EXPIRES_IN` 環境變數） |
| **儲存 — web** | 客戶端記憶體 / Authorization header | `httpOnly; Secure; SameSite=strict` cookie |
| **儲存 — mobile** | 記憶體中 / 安全儲存 | 在回應 body 中回傳；儲存於安全儲存 |
| **伺服器端儲存** | 無 | 僅 SHA-256 雜湊（原始 token 永不持久化） |
| **Authorization header** | `Authorization: jwt-user <token>` | 不使用於 header |
| **可撤銷** | 不直接 — 透過 `tokenVersion` 遞增 | 是 — DB 中 `revokedAt` 旗標 |

**為何使用雙 token？** Access token 是無狀態的（每次請求不需查詢 DB），但一旦發出就無法個別撤銷。Refresh token 是有狀態的（DB 資料列），可隨時撤銷，但傳輸頻率較低 — 僅在 token 交換時傳輸。這種組合同時兼顧效能與安全性。

---

## Audience — 每個客戶端的安全邊界

每個 access token 都帶有 `audience` 宣告，將其綁定到特定的客戶端類型。passport 策略會拒絕 audience 不符的 token。

| Audience 值 | 適用對象 |
|---|---|
| `user-web` | web app 的一般使用者 |
| `user-app` | iOS / Android 的一般使用者 |
| `admin-web` | web 後台的管理員 |
| `admin-app` | 行動管理工具的管理員 |

Audience 在登入時透過 `X-Client` 請求 header（`web` 或 `app`，預設為 `web`）解析。`getTokenAudience(type, client)` helper 將使用者類型加客戶端對應到正確的 audience 字串。

**Audience 的重要性：** `user-app` token 無法在需要 `user-web` 的端點重放。跨客戶端的 token 重複使用在路由 handler 執行前就會被拒絕 — 即使 JWT 簽章有效。

---

## 認證流程

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
     │  [~15 分鐘後 — access token 過期]                                     │
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

## `req.user` / `req.admin` 如何被填入

每個請求在進入 controller 之前，都會先通過 `middleware/auth.js` 中的兩個 middleware 函數。

**1. `JWTAuth(req, res, next)`** — 檢查 `Authorization` header 並分派至對應的 passport 策略：

```
Authorization: jwt-user  <token>  →  JWTAuthUser  strategy  →  掛載為 req.user
Authorization: jwt-admin <token>  →  JWTAuthAdmin strategy  →  掛載為 req.admin
（無 header）                      →  next() — 公開路由，由 controller 強制存取控制
```

策略查找由 `middleware/auth.js` 中的 `AUTH_TYPES` 驅動 — 這是一個登錄陣列，每個已認證的使用者類型對應一個項目。新增類型只需在此加入一個項目及對應的 passport 策略；無需修改其他 middleware。

**2. `verifyJWTAuth(req, res, next)`** — 策略執行後，將已認證的記錄從 Passport 預設的 `req.user` 插槽移至正確的鍵（`req.admin` 等），並設定請求的語系。

**passport 策略**（`services/passport.js`）執行三件事：
1. 驗證 JWT 簽章與宣告（`exp`、`iss`、`audience`）。
2. 透過 `sub`（token payload 中的 user/admin id）從資料庫查找擁有者。
3. 檢查 `tokenVersion` — 若 token 的 `tokenVersion` 不再與資料庫記錄相符，token 立即被拒絕（無需等待過期）。

---

## Token 建立

所有 token helper 都在 `helpers/logic.js` 中。

### `createAccessToken(user, audience, type)`

使用 `ACCESS_TOKEN_SECRET` 以 HS256 簽署 JWT。payload 帶有三個自訂宣告：

```javascript
{
  sub: user.id,          // 擁有者的 UUID
  type: 'user',          // 'user' | 'admin' | ...
  tokenVersion: user.tokenVersion  // 在 passport 中檢查以立即撤銷
}
```

標準宣告（`iat`、`exp`、`iss`、`aud`）由 jsonwebtoken 自動設定。

### `createRefreshToken()`

回傳 32 個密碼學安全的隨機 bytes，以 64 個十六進位字元的字串表示。這是原始 token — 只傳給客戶端一次，永不儲存。

### `hashToken(raw)`

原始 token 的 SHA-256（十六進位編碼）雜湊。這才是儲存在資料庫中的內容。由於 refresh token 本身已是高熵的隨機值，快速的 SHA-256 已足夠 — 無需 bcrypt 的慢速雜湊。

---

## Session 機制

所有 session helper 都在 `helpers/session.js` 中。它們是通用的 — 以 session model 和擁有者 FK 欄位作為參數，因此同一段程式碼可服務 `UserSession`、`AdminSession` 及未來任何類型。

### `issueSession({ sessionModel, ownerKey, ownerId, client, platform, userAgent, ipAddress, transaction })`

建立新的 session 資料列。產生原始 refresh token，只儲存其雜湊。回傳 `{ rawRefreshToken, session }` — 呼叫者將 `rawRefreshToken` 傳送給客戶端後就不再看到它。

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

發出新 session 並撤銷舊的，透過 `currentSession.replacedBySessionId = newSession.id` 連結它們。這條鏈就是讓重複使用偵測得以實現的關鍵 — 一個已輪換（已撤銷）且帶有 `replacedBySessionId` 的 token 重新出現是竊盜信號。

### `revokeSession({ session, transaction })`

在單一 session 上設定 `revokedAt`。冪等 — 若已撤銷則為無操作。

### `revokeAllSessionsForOwner({ sessionModel, ownerKey, ownerId, transaction })`

批量設定擁有者所有活躍 session 的 `revokedAt`。用於 LogoutAll 及重複使用偵測路徑。

### `findSessionByRawToken({ sessionModel, rawRefreshToken, transaction })`

對原始 token 進行雜湊，使用 `scope(null)` 查找對應的 session 資料列（繞過預設排除 `refreshTokenHash` 的 scope）。

### `isSessionActive(session)`

僅在 `revokedAt` 為 null 且 `expiresAt` 在未來時回傳 `true`。

---

## 重複使用偵測

Token 輪換意味著每次成功的 `/refresh` 呼叫都會發出新的 refresh token 並立即撤銷舊的。舊的 session 資料列保留，帶有 `revokedAt` 設定及 `replacedBySessionId` 指向新 session。

**攻擊手法：** 竊取的 refresh token 在合法客戶端已輪換後被使用。被竊取的 token 就是舊的（已撤銷的）session。

**偵測：** 若 token 查找返回一個**已撤銷且帶有 `replacedBySessionId`** 的 session，代表這是已輪換 token 的重放 — 視為確認的竊盜信號。

**回應：**
1. 撤銷該使用者的**所有** session（`revokeAllSessionsForOwner`）。
2. 在使用者記錄上遞增 `tokenVersion` — 該使用者目前所有有效的 access token 在 passport 策略層即被拒絕（無需等待過期）。

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

## 安全屬性

| 屬性 | 機制 |
|---|---|
| **Access token 立即撤銷** | DB 中的 `tokenVersion` — 由 LogoutAll 及重複使用偵測遞增；在每次請求的 passport 策略中檢查 |
| **Refresh token 撤銷** | session 資料列中的 `revokedAt` 旗標；在發出新 token 前檢查 |
| **Refresh token 竊盜偵測** | 已輪換 token 的重放觸發完整 session 撤銷 + `tokenVersion` 遞增 |
| **Web cookie 強化** | `httpOnly`（無 JS 存取）、`Secure`（生產環境僅 HTTPS）、`SameSite=strict`（無跨站傳送） |
| **Mobile token 傳遞** | Refresh token 在回應 body 中回傳 — 儲存於裝置安全儲存，永不存放在瀏覽器 cookie 中 |
| **DB 中無原始 token** | 只儲存 SHA-256 雜湊 — DB 洩漏不會暴露任何可用的 token |
| **Audience 強制執行** | Access token 綁定至 `user-web`、`user-app`、`admin-web` 或 `admin-app` — 跨客戶端重放被拒絕 |
| **Cookie 選項一致性** | `V1Login`、`V1Refresh` 和 `V1Logout` 都使用相同的 cookie 選項 — Safari 正確清除 cookie 的必要條件 |

---

## 完整 Action 程式碼參考

### Login（`app/User/actions/V1Login.js`）

```javascript
async function V1Login(req, res) {
  // 1. 透過 Joi 驗證 email + password
  // 2. passport.authenticate('JWTUserLogin') — 對 DB 驗證憑證
  // 3. 若使用者停用或軟刪除則拒絕
  // 4. 更新 loginCount + lastLoginAt
  // 5. 判斷 client（X-Client header）和 platform（X-Platform header）
  // 6. createAccessToken(user, getTokenAudience('user', client), 'user')
  // 7. issueSession({ sessionModel, ownerKey: 'userId', ownerId, client, platform, ... })
  // 8. 設定 httpOnly refresh cookie（web）+ 在 body 中回傳 rawRefreshToken（mobile）
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

### Refresh（`app/User/actions/V1Refresh.js`）

```javascript
async function V1Refresh(req, res) {
  // 1. 從 cookie（web）或 req.args.refreshToken（mobile）讀取 refresh token
  // 2. findSessionByRawToken() — 雜湊並查找
  // 3. 重複使用偵測：revokedAt + replacedBySessionId → 撤銷所有 + 遞增 tokenVersion → 401
  // 4. isSessionActive() 檢查 — 已過期或已撤銷 → 401
  // 5. 載入使用者，檢查 isActive + deletedAt
  // 6. rotateSession() — 撤銷目前 session，發出新的（透過 replacedBySessionId 連結）
  // 7. createAccessToken() 使用新 token
  // 8. 設定新的 refresh cookie + 在 body 中回傳
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

### Logout（`app/User/actions/V1Logout.js`）

```javascript
async function V1Logout(req, res) {
  // 1. 從 cookie 或 body 讀取 refresh token
  // 2. findSessionByRawToken() — 確認屬於 req.user 後才撤銷
  // 3. revokeSession() — 僅限目前裝置
  // 4. clearCookie() — 選項必須與 V1Login 相符（Safari 需求）
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

### LogoutAll（`app/User/actions/V1LogoutAll.js`）

```javascript
async function V1LogoutAll(req, res) {
  // 1. revokeAllSessionsForOwner() — 終止此使用者所有 session
  // 2. 遞增 tokenVersion — 所有未過期的 access token 在 passport 中立即被拒絕
  // 3. 在此裝置上執行 clearCookie()
  // → 200 { success: true }

  await revokeAllSessionsForOwner({ sessionModel: models.userSession, ownerKey: 'userId', ownerId: req.user.id, transaction: t });
  await models.user.increment('tokenVersion', { by: 1, where: { id: req.user.id }, transaction: t });

  res.clearCookie('jwt-user-refresh', { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict', path: '/' });

  return { status: 200, success: true };
} // END V1LogoutAll
```

---

## 新增認證使用者類型

請參閱 `.claude/skills/add-auth-user-type/SKILL.md` 取得逐步操作手冊。概要步驟：

1. 新增資料表 + model（例如 `Partner`）。
2. 新增 session 資料表 + model（例如 `PartnerSession`）。
3. 在 `services/passport.js` 中新增 passport 策略（複製 user 的模式；更改 model 和 audience）。
4. 在 `middleware/auth.js` 的 `AUTH_TYPES` 中新增項目。
5. 在 `helpers/constants.js` 中新增 `TOKEN_AUDIENCE.PARTNER`。
6. 使用 `yarn gen Partner -a V1Login` 等指令建立 Login / Refresh / Logout / LogoutAll action，然後以 user actions 為範本填寫內容。

---

## 延伸閱讀

- **[教學：新增認證](/zh-TW/tutorials/add-auth)** — 從零開始實作 `User` 類型所有六個認證 action（Register、Login、Refresh、Logout、LogoutAll、Read）的逐步操作，包含 UserSessions migration 和完整整合測試。新增使用者類型時可作為參考實作。
