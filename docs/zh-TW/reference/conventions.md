# 慣例快速參考

精簡參考資料 — 以表格和清單呈現，非散文說明。詳細說明請參閱 `README.md` 和 `docs/conventions.txt`。

---

## 命名

| 對象 | 慣例 | 範例 |
|---|---|---|
| 程式碼變數 | camelCase | `firstName`、`isActive` |
| Feature 資料夾（`app/`） | 單數 PascalCase | `Order`、`UserSession` |
| Controllers | 複數 | `users.js`、`orders.js` |
| Actions | 單數，遵循下方公式 | `V1Login`、`V1CreateByAdmin` |
| Tasks | 與 action 相同，加上 `Task` 後綴 | `V1ExportTaskByAdmin` |
| DB 資料表名稱 | 複數 PascalCase | `Users`、`UserOrders` |
| DB 欄位名稱 | camelCase | `firstName`、`createdAt` |
| DB ENUM 型別名稱 | 全大寫，無空格/底線/連字號 | `ACTIVE`、`PENDINGPAYMENT` |
| FK 欄位 | `<實體>Id` | `userId`、`userOrderId` |
| 同一資料表的多個 FK | 加上角色前綴 | `hostUserId`、`bookerUserId` |
| 第三方廠商 ID | 廠商前綴 | `stripeId`、`twilioId` |
| 索引名稱 | `{Table}_{col}_{idx\|unique}` | `Users_email_unique` |
| 布林欄位 | 連接動詞前綴 | `isActive`、`hasPassword`、`canInvite`、`doesRequireApproval` |
| 常數 | UPPER_CASE 加底線 | `ERROR_CODES`、`LOCALE` |
| 資料夾/檔案名稱 | 小寫，允許連字號 | `my-helper.js`、`auth-migration.md` |
| API route URL | 小寫，無分隔符號 | `/v1/users/logoutall`、`/v1/orders/updateemail` |
| 頁面 URL | 小寫加連字號 | `/sign-in`、`/user-profile` |
| 翻譯鍵值 | `NAMESPACE[snake_case_key]` | `GLOBAL[unauthorized]`、`USER[profile_not_found]` |
| Socket 房間 | ALL_CAPS_WITH_UNDERSCORES | `USER`、`CONVERSATION` |
| Socket 事件 | ALL_CAPS_WITH_UNDERSCORES，`FEATURE_ACTION` 格式 | `MESSAGE_CREATED` |

---

## Action 與 Task 命名公式

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| 區段 | 規則 |
|---|---|
| `V{version}` | 永遠在最前面。API 版本號。 |
| `{ActionName}` | PascalCase。描述其功能。 |
| `By{Role}` | 僅當行為因角色而有實質差異時使用。 |
| `On{Device}` | 僅當行為因平台而有實質差異時使用。 |

**裝置後綴：** `OniOS`、`OnAndroid`、`OnMobile`、`OnWeb` — 若所有平台行為相同則省略。

| 範例 | 含義 |
|---|---|
| `V1Login` | 所有角色，所有裝置 |
| `V1CreateByAdmin` | 僅限管理員，所有裝置 |
| `V1UpdateByUser` | 僅限使用者，所有裝置 |
| `V1ExportTaskByAdmin` | 背景工作，僅限管理員 |
| `V1UpdateByAdminOnMobile` | 僅限管理員，iOS + Android |
| `V1SyncTaskByUserOniOS` | 背景工作，僅限使用者，僅限 iOS |

**Actions** = 即時請求，立即返回回應。
**Tasks** = 背景工作（worker 程序）。永遠加上 `Task` 後綴。

---

## HTTP 規則

| 規則 | 詳情 |
|---|---|
| 方法 | 僅使用 POST 和 GET — 禁止 PUT、PATCH、DELETE |
| POST | 凡是傳送資料或改變狀態，預設使用 POST |
| GET | 僅當參數可以乾淨地放在 URL query string 時使用 |
| 請求參數 | 永遠使用 `req.args` — 禁止直接使用 `req.body` 或 `req.query` |
| URL 參數 | `req.params` 僅用於動態路徑區段（例如第三方 webhook） |

---

## 回應格式

永遠是扁平結構 — 不使用 `data` 巢狀包裝。

```js
return {
  status: 200,
  success: true,
  user: { ... },   // 以回傳內容命名
  token: '...'     // 其他欄位在同一層級
};
```

| 狀態碼 | 使用時機 |
|---|---|
| `200` | 預設（讀取、更新、查詢、登入） |
| `201` | Action 建立新資源/DB 記錄 |
| `202` | Action 將工作移交背景工作 |

---

## 錯誤規則

| 情境 | 錯誤處理方式 |
|---|---|
| HTTP actions | `return errorResponse(req, ERROR_CODES.X, status)` |
| Tasks 與 socket 呼叫的 actions | `throw new Error(ERROR_CODES.X)` |
| 500 錯誤 | 永遠不要手動返回 — 讓 `middleware/error.js` 處理 |

---

## 產生器規則

| 規則 | 指令 |
|---|---|
| 建立 feature 骨架 | `yarn gen Feature` |
| 建立 action 骨架 | `yarn gen Feature -a V1Action` |
| 建立 task 骨架 | `yarn gen Feature -t V1Task` |
| 建立 mailer 骨架 | `yarn gen Feature -m Mailer` |
| 移除骨架 | `yarn del Feature -a V1Example`（禁止使用 `rm`） |
| 移除 task 骨架 | `yarn del Feature -t V1ExampleTask` |

**禁止手動建立 feature 檔案。禁止對產生的檔案使用 `rm`。**
`yarn del` 會從 `actions/index.js` / `tasks/index.js` 中移除對應的匯出項目。`rm` 不會 — 它會留下一個損壞的匯出。
完成骨架產生後，立即使用 `yarn del` 刪除產生器的佔位符檔案。

---

## JS 檔案結構（每個 `.js` 檔案，由上至下）

```
1.  標頭注釋         — 描述此檔案的用途及其方法
2.  'use strict';
3.  ENV 變數         — 從 process.env 解構
4.  Node 內建模組    — fs、path、crypto 等
5.  第三方模組       — lodash、joi、moment-timezone 等
6.  Services         — 來自 services/（包含 services/queue.js）
7.  Helpers          — 來自 helpers/、constants、feature 的 helper.js
8.  Models           — const models = require('.../models')
9.  Queues           — queue.get('XQueue') 實例（緊接在 models 之後）
10. 模組層級常數     — 可選
11. module.exports   — 在方法定義之前
12. 方法定義
```

**每個區段內的匯入順序：** 按行長度遞增。先是純整模組 require，再是解構式 require，每個子群組也按行長度遞增排序。

```js
// 第三方 — 先純 require（按長度），再解構（按長度）
const _ = require('lodash');
const joi = require('joi');
const moment = require('moment-timezone');

// services
const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
```

---

## 模組匯出慣例

`module.exports` 放在方法定義**之前**（方法透過函式宣告提升）。

```js
// ... requires、模組層級常數 ...

module.exports = { myFunction, anotherFunction };

function myFunction() { ... } // END myFunction
function anotherFunction() { ... } // END anotherFunction
```

---

## 函式結束注釋

每個具名函式以 `// END functionName` 結尾。

```js
function V1Login(req, res) {
  ...
} // END V1Login
```

適用於所有函式：actions、tasks、helpers、services、middleware。

---

## 注釋標頭

**Action 標頭：**
```js
/**
 * <描述>
 *
 * POST <URL>
 *
 * Must be logged in | Must be logged out | Can be both
 * Roles: ['admin']
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): 使用者的電子郵件
 *   password - (STRING - REQUIRED): 未雜湊的密碼
 *   age      - (NUMBER - OPTIONAL): 使用者的年齡
 * }
 *
 * Success: Return logged in user.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   401: Please confirm your email to log in.
 */
```

**一般函式/方法標頭：**
```js
/**
 * <描述>
 *
 * @arg1 - (NUMBER - REQUIRED) [DEFAULT - 100]: <描述>
 * @arg2 - (NUMBER - OPTIONAL) [DEFAULT - 100]: <描述>
 *
 * return: true / false or <{ OBJECT }>
 */
```

---

## 禁止魔術字串

任何在多個地方使用的字串常量（狀態、型別、角色、語言、enum 值）統一放在 `helpers/constants.js` 中，並以名稱引用。

```js
// 錯誤
if (user.locale === 'en') { ... }

// 正確
if (user.locale === LOCALE.EN) { ... }
```

**例外：** migration 保持字面值（歷史快照，不重構）。改為加上 `// = SOME.CONSTANT` 注釋而非匯入。

引入新的 enum 值時使用 `add-constant` skill。

---

## 外鍵與所有權規則

將擁有者實體的 FK 帶到**每一個後代資料表**，不只是直接父層。

```
User -> UserOrder -> UserOrderItem

UserOrder.userId          -> Users.id
UserOrderItem.userOrderId -> UserOrders.id
UserOrderItem.userId      -> Users.id   ← 此處也需要（扁平查詢 + 安全範圍限制必要）
```

**漂移防護（必要）：**
1. 在父資料表上加 `UNIQUE (id, userId)`。
2. 在子資料表上加複合 FK `(userOrderId, userId)` 參照 `UserOrders(id, userId)`。

如此 Postgres 就會拒絕任何 `userId` 與父層不符的子記錄。

**每個資料表的欄位順序：**
1. 主鍵 `id`
2. 外鍵
3. 第三方廠商 ID
4. 功能特定欄位
5. Sequelize 自動產生：`deletedAt`、`createdAt`、`updatedAt`

---

## Auth 慣例

| 概念 | 詳情 |
|---|---|
| Token 模型 | 短效 access token（JWT，約 15 分鐘）+ 長效 refresh token（不透明，約 60 天） |
| Access token | 以 `ACCESS_TOKEN_SECRET` 簽署；包含 `sub`、`type`、`tokenVersion` |
| Access token 傳輸 | 回應主體；以 `Authorization: jwt-<type> <token>` 方式發送 |
| Refresh token | 256 位元隨機不透明字串 — **永遠不存原始值**，只存 SHA-256 雜湊 |
| Refresh token 傳輸 | `httpOnly + Secure + SameSite=strict` cookie（網頁）；同時也在主體（行動端） |
| 輪換 | 每次 `/refresh` 都撤銷目前 session，發行新的 session |
| 重用偵測 | 重放已輪換的 token → 撤銷所有使用者 sessions + 更新 `tokenVersion` |
| 即時撤銷 | 更新 `<Type>.tokenVersion` 使所有 access token 立即失效 |
| Audience | 依型別及用戶端種類：`user-web`、`user-app`、`admin-web`、`admin-app` |
| 用戶端種類 | `X-Client` 標頭（`web`\|`app`）；儲存於 session |
| 平台 | `X-Platform` 標頭（僅供後設資料）；儲存於 session；絕不放入 token audience |
| 新增使用者型別 | 在 `middleware/auth.js` 的 `AUTH_TYPES` 新增項目 + Passport strategy + `<Type>Sessions` 資料表 |

---

## Socket 慣例

| 規則 | 詳情 |
|---|---|
| 永遠使用 `getIO()` | 禁止直接匯入 `io` — 在 require 時它是 `null` |
| commit 後才 emit | 永遠在 `t.commit()` 之後才 emit，不在之前 |
| 房間命名 | ALL_CAPS_WITH_UNDERSCORES；實例房間使用 `socketWrapper(id)` |
| 事件命名 | ALL_CAPS_WITH_UNDERSCORES，格式為 `FEATURE_ACTION` |
| 循環依賴 | 被 `socket.js` 匯入的 actions 使用 context 物件模式，而非 `getIO()` |
| 測試 | 永遠不要用 `if (NODE_ENV !== 'test')` 保護 emit — 使用 `jest.spyOn` mock |

---

## 翻譯鍵值慣例

```
NAMESPACE[key_name]
```

| 部分 | 規則 |
|---|---|
| `NAMESPACE` | 全大寫。Feature 名稱，或共用字串使用 `GLOBAL` |
| `key_name` | 全小寫加底線 — 禁止 camelCase，禁止連字號 |

全域字串：`languages/en.js`。Feature 字串：`app/FeatureName/languages/en.js`。
由 `yarn lang` 編譯至 `locales/en.json` — **禁止直接編輯 `locales/*.json`**。

---

## helpers/schemas.js 規則

| 規則 | 詳情 |
|---|---|
| 命名 | 每個匯出以 `Schema` 結尾 |
| 放置原則 | 僅當用於 2 個以上 actions 時才新增；單次使用保持 inline |
| 不加 required/optional | Schemas 是函式；呼叫端在呼叫時串接 `.required()` 或 `.optional()` |
| 組合 | 透過 `.keys()` 或直接嵌入至 action 層級的 schemas |

---

## 測試檔案位置

| 原始檔案 | 測試檔案 |
|---|---|
| `app/<Feature>/actions/V1Action.js` | `app/<Feature>/tests/integration/V1Action.test.js` |
| `app/<Feature>/tasks/V1Task.js` | `app/<Feature>/tests/tasks/V1Task.test.js` |
| `app/<Feature>/helper.js` | `app/<Feature>/tests/helper.test.js` |
| `helpers/<name>.js` | `test/helpers/<name>.test.js` |
| `services/<name>.js` | `test/services/<name>.test.js` |

禁止直接把測試放在 `test/` 根目錄。

---

## 套件版本管理

永遠安裝**精確版本** — 不使用 `~` 或 `^` 範圍。

```sh
yarn add <module> --exact          # 一般依賴
yarn add <module> --exact --dev    # 開發依賴
```

Semver 參考：`MAJOR.MINOR.PATCH`（例如 `v2.3.2`）。

---

## 常用變數名稱

| 變數 | 含義 |
|---|---|
| `err` | 來自 `await` 搭配 `.catch()` 的錯誤（不在 try/catch 內） |
| `error` | 在 `try/catch` 區塊中捕獲的錯誤 |
| `req` | Express request |
| `res` | Express response |
| `result` | 一般結果變數 |
| `args` | 參數 |

---

## Model 規則（快速摘要）

| 規則 | 詳情 |
|---|---|
| 主鍵 | UUID v7 |
| 軟刪除 | `paranoid: true`；使用 `scope(null)` 略過 |
| FK 索引 | 永遠為外鍵欄位建立索引 |
| 具名索引 | `{Table}_{col}_{idx\|unique}`，model 和 migration 中都要有 |
| 一種使用者型別 = 一張資料表 | 禁止單一資料表搭配角色欄位 |
