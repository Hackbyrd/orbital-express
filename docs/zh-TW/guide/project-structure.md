# 專案結構

Orbital Express 使用**功能資料夾架構**，靈感來自 Django 以 app 為基礎的佈局和 Rails 的 MVC 慣例。你幾乎建構的所有東西都在 `app/` 中——每張資料庫表一個資料夾。repo 根目錄的其他所有東西是**全域層**：共享基礎設施、跨功能工具和三個 process 入口點。

## 完整目錄樹

```
repo root
├── app/                        # 所有功能 — 每張表一個單數 PascalCase 資料夾
│   ├── User/
│   │   ├── actions/            # 每個 action 一個檔案（V1Login.js、V1Register.js、…）
│   │   │   └── index.js        # 此功能所有 actions 的 barrel export
│   │   ├── tests/
│   │   │   ├── integration/    # action 整合測試
│   │   │   └── tasks/          # task 單元測試
│   │   ├── languages/          # 功能範圍的 i18n 來源字串
│   │   ├── mailers/            # 功能範圍的 email 範本（選用）
│   │   ├── controller.js       # 把守 auth/type，派發到 actions
│   │   ├── error.js            # 功能範圍的 ERROR_CODES
│   │   ├── helper.js           # 功能範圍的工具（共享時提升為全域）
│   │   ├── model.js            # Sequelize model 定義
│   │   ├── routes.js           # 此功能的 Express router
│   │   └── worker.js           # 此功能的任務定義（背景任務）
│   ├── Admin/                  # 與 User 相同的結構
│   └── feature.js              # generator 範本（不要編輯）
│
├── index.js                    # web 入口點 — 透過 throng（叢集化）啟動 server.js
├── server.js                   # Express app：middleware stack、routes、socket、error handler
├── worker.js                   # worker 入口點 — 註冊所有 queue 任務處理器
├── cronjobs.js                 # cron 入口點 — 在 clock process 上排程任務
├── routes.js                   # 全域 route 聚合器 — 掛載每個功能的 routes.js
├── models.js                   # 全域 model 聚合器 — 將 app/*/model.js 掃描成一個物件
│
├── middleware/
│   ├── id.js                   # 為每個 request 加上唯一的 requestId
│   ├── args.js                 # 正規化 req.body/req.query → req.args；解析 filter 運算子
│   ├── auth.js                 # 執行 Passport JWT 策略；填充 req.user / req.admin
│   ├── error.js                # 捕捉拋出的錯誤；格式化並回傳錯誤回應
│   └── exit.js                 # 優雅關機 middleware + gracefulExit() drain 函式
│
├── services/
│   ├── queue.js                # Bull queue 管理器（queue.get / queue.closeAll）
│   ├── redis.js                # Redis client 單例
│   ├── socket.js               # Socket.IO server + JWT 驗證
│   ├── email.js                # 交易性 email 發送（nodemailer / SendGrid）
│   ├── language.js             # i18n 查詢 helper
│   ├── passport.js             # Passport JWT 策略（每種 auth 使用者類型一個）
│   ├── postgres.js             # 原始 Postgres client（用於 Sequelize 以外的查詢）
│   ├── secure.js               # AES-256-GCM 加密/解密，用於敏感欄位
│   ├── error.js                # errorResponse()、ERROR_CODES、joiErrorsMessage
│   └── phone.js                # 電話/SMS 整合包裝器
│
├── helpers/
│   ├── constants.js            # 全域 enums 和狀態集（UPPER_CASE，雙重 export）
│   ├── cruqd.js                # Create/Read/Update/Query/Delete Sequelize helpers + filter 解析
│   ├── logic.js                # auth token helpers（createAccessToken、createRefreshToken、hashToken）
│   ├── schemas.js              # 可重用的 Joi schema 片段
│   ├── session.js              # refresh token session 機制（issueSession、revokeSession）
│   ├── tests.js                # 共享測試工具
│   └── validate.js             # Joi 驗證包裝器
│
├── database/
│   ├── schema.sql              # 人類可讀的主要 schema（僅文件用途 — 永遠不執行）
│   ├── sequence.js             # 所有表名的有序陣列（由 generator 維護 — 不要手動編輯）
│   ├── index.js                # 執行中 app 使用的 Sequelize 連接
│   ├── seed/                   # 開發用種子資料，由 `yarn seed` 載入
│   │   └── set1/               # 每個 seed set 一個資料夾；每個子資料夾是一張表
│   └── backups/                # 由 `yarn backup` 建立的 DB 備份；用 `yarn restore` 還原
│
├── migrations/                 # 有序的 Sequelize migration 檔案（由 `yarn migrate` 套用）
├── models/                     # 刻意接近空的 — models 存放在 app/*/model.js
│
├── languages/                  # 全域 i18n 來源字串（en.js、…）
├── locales/                    # 由 `yarn lang` 編譯的 i18n 輸出 — 不要手動編輯
├── mailers/                    # 全域 email 範本（功能 mailers 存放在 app/<F>/mailers/）
│
├── config/
│   ├── .env.template           # 已 commit 的參考 — 為每個環境複製並填入
│   ├── .env.development        # gitignored
│   ├── .env.test               # gitignored
│   ├── .env.staging            # gitignored（選用，用於在本機連接 staging）
│   ├── .env.production         # gitignored（選用，用於在本機連接 prod）
│   ├── config.js               # Sequelize CLI DB 設定（透過 NODE_ENV 讀取 .env.*）
│   └── heroku-sync.js          # 將本機 .env 檔案同步到 Heroku app
│
├── knowledge/                  # 產品知識庫 — .txt 檔案 + knowledge.js upsert 腳本
├── docs/                       # 所有深度文件（conventions.txt、workflow.md、…）
├── scripts/                    # 獨立的一次性腳本（手動執行，不在 request 流程中）
├── redis/                      # 專案本地 Redis 建構（gitignored — 僅限本機開發）
│
├── test/                       # 全域測試框架
│   ├── app/                    # 將每個功能的測試檔案縫合在一起
│   ├── fixtures/               # 測試 DB 基準資料（fix1/…） — database/seed 的測試對應
│   ├── helpers/                # 全域 helpers 的單元測試（test/helpers/<name>.test.js）
│   └── services/               # 全域 services 的單元測試（test/services/<name>.test.js）
│
├── public/                     # 靜態資源
├── views/                      # 伺服器渲染的 views（例如 email 預覽頁面）
├── AGENTS.md                   # 權威 agent 指南（工具無關）
└── CLAUDE.md                   # Claude Code 專屬內容（匯入 AGENTS.md）
```

---

## 三個入口點

Orbital Express 以**三個獨立 process** 執行。每個都有自己的入口點，各自獨立啟動。開發時你需要全部三個都在執行。

### `index.js` — Web Server

```bash
yarn s        # 簡短形式
yarn server   # 完整形式
```

Web 入口點。它使用 [throng](https://github.com/hunterloftis/throng) 為每個 CPU core 建立一個 worker，然後在每個 worker 中啟動 `server.js`。每個 worker 中都會註冊 signal handler，用於優雅關機（`SIGTERM` / `SIGINT`）。

**`server.js`** 是實際的 Express app 組裝位置：

1. 第三方 middleware（helmet、cors、body-parser、rate limiter、…）
2. 依序執行的自訂全域 middleware：`id` → `args` → `auth`
3. 全域 route 聚合器（`routes.js`）
4. Error handler（`middleware/error.js`）— 必須在最後

每個傳入的 HTTP request 都流經這條鏈。鏈中的最終 handler 是功能資料夾內的 action 函式。

### `worker.js` — 背景任務 Worker

```bash
yarn w        # 簡短形式
yarn worker   # 完整形式
```

Bull worker process。它匯入每個功能的 `worker.js` 檔案（這些檔案針對具名 queues 註冊任務處理器函式）。當 action 將背景任務加入佇列時，這個 process 會取得它、執行它，並處理重試和失敗。

當工作對同步 API 回應來說太慢或太危險時，使用背景任務：報告產生、發送大量 emails、呼叫緩慢的第三方 APIs、後處理上傳。Action 將任務加入佇列並立即回傳 `202 Accepted`；worker 做實際的工作。

### `cronjobs.js` — Cron Clock

```bash
yarn cron
```

Clock process。它使用 cron 表達式定義哪些任務在哪個排程下加入佇列。這個 process 在正式環境中應該執行**恰好一個實例**——它不會叢集化。

常見模式：cron 任務將背景任務（在 `worker.js` 中）加入佇列，而非自己做工作。這將排程與執行分離，讓 clock process 保持輕量，並讓工作能獨立重試。

```
每天中午 12:00
       │
  cronjobs.js  ──加入佇列──▶  Worker queue  ──執行──▶  背景任務
  (clock proc)                                          (做真正的工作)
```

---

## `routes.js` 和 `models.js` — 全域聚合器

### `routes.js`（根目錄）

每個功能的 `routes.js` 定義自己的 Express `Router`。根目錄的 `routes.js` 將它們全部掛載到 Express app 上。當你建立新功能時，在這裡註冊它的 router 一次。

```javascript
// routes.js — 註冊每個功能的 router
const userRoutes = require('./app/User/routes');
const orderRoutes = require('./app/Order/routes');

module.exports = (app) => {
  app.use('/', userRoutes);
  app.use('/', orderRoutes);
};
```

### `models.js`（根目錄）

Models 存放在 `app/<Feature>/model.js`，不在 `models/` 中。根目錄的 `models.js` 掃描所有功能的 model 檔案，將它們組裝成一個 `models` 物件。`models/` 目錄刻意幾乎是空的——它不是 models 定義的地方。

```javascript
// 程式碼庫中的任何地方
const models = require('./models');

models.user.findOne({ where: { id } });
models.order.findAll({ where: { userId } });
```

聚合器也會設定 Sequelize associations（在所有 models 載入後），讓跨功能的 associations 可以引用任何 model，而不會有循環 require 的問題。

---

## `app/` — 程式碼庫的核心

`app/` 下的每張資料庫表對應到一個**功能資料夾**。資料夾名稱是**單數 PascalCase**（`User`、`Order`、`InvoiceItem`）。這是幾乎所有日常開發發生的地方。

### 什麼是功能？

功能是圍繞一張資料庫表所建構的所有東西。當你新增 `Bookings` 表時，你在建構 `Booking` 功能：model、routes、controller、actions（create、read、update、delete、query）、tests、i18n 字串和背景任務。

**功能資料夾結構：**

```
app/User/
├── actions/
│   ├── V1Login.js
│   ├── V1Logout.js
│   ├── V1LogoutAll.js
│   ├── V1Refresh.js
│   ├── V1Register.js
│   ├── V1Update.js
│   └── index.js          # barrel export — 由 generator 維護
├── tests/
│   ├── integration/      # 每個 action 一個測試檔案
│   └── tasks/            # 每個背景任務一個測試檔案
├── languages/            # 功能範圍的 i18n 來源字串
├── mailers/              # 功能範圍的 email 範本
├── controller.js         # auth 把守 + action 派發
├── error.js              # 功能範圍的 ERROR_CODES
├── helper.js             # 此功能私有的工具
├── model.js              # Sequelize model + associations
├── routes.js             # Express Router（只用 POST/GET）
└── worker.js             # Bull 任務處理器定義
```

**功能內的 request 流程：**

```
routes.js  →  controller.js  →  actions/V1Action.js  →  （回應或將任務加入佇列）
                                         │
                                    model / helpers / services
```

`routes.js` 將 URL 路徑映射到 controller 方法。Controller 檢查 authentication 並派發到正確的 action。Action 用 Joi 驗證 `req.args`，執行業務邏輯，呼叫 model，並回傳回應。

**永遠使用 generator scaffold——永遠不要手動建立功能檔案：**

```bash
yarn gen User              # scaffold 完整的功能資料夾
yarn gen User -a V1Search  # 為現有功能新增一個 action
yarn gen User -t V1SendEmailTask  # 新增背景任務
yarn gen User -m Welcome   # 新增 mailer
yarn del User -a V1Example # 移除已產生的 action（同時從 index.js 中移除）
```

---

## `middleware/` — 全域 Request Pipeline

每個 HTTP request 按此順序通過全域 middleware stack：

| 檔案 | 功能 |
|---|---|
| `id.js` | 為 `req.id` 加上唯一的 UUID。在錯誤回應中作為 `requestId` 回傳，用於日誌關聯。 |
| `args.js` | 將 `req.body`（POST）或 `req.query`（GET）正規化到 `req.args`。同時執行 `parseUrlQueryFilter`，將方括號記法運算子（`date[gte]=…`）轉換為 Sequelize 運算子。你在 actions 中永遠不直接碰 `req.body` 或 `req.query`。 |
| `auth.js` | 執行與 `Authorization` header scheme（`jwt-user`、`jwt-admin`）相符的 Passport JWT 策略。成功時，填充 `req.user` 或 `req.admin` 並設定 locale。在公開路由上，不帶錯誤地呼叫 `next()`——controller 強制執行 auth。 |
| `error.js` | 最終的 Express error handler。捕捉從 action 拋出或傳給 `next(err)` 的任何東西，用 `errorResponse` 格式化，並回傳適當的 HTTP status。永遠不要手動回傳 500——讓它傳播到這裡。 |
| `exit.js` | 雙重用途：`exit.middleware` 一旦收到關機信號，就以 `503` 短路新的 requests；`gracefulExit(server)` 在 process 退出前 drain queues、sockets 和 DB 連接池。 |

---

## `services/` — 第三方包裝器與共享基礎設施

Services 是**有狀態或實質性的**共享基礎設施。如果某個東西包裝了外部系統、管理連接，或太複雜而無法成為普通函式，它就存放在這裡。

| 檔案 | 提供什麼 |
|---|---|
| `queue.js` | Bull queue 管理器。`queue.get('UserQueue')` 回傳一個具名 queue 實例。`queue.closeAll()` 在優雅關機時呼叫。 |
| `redis.js` | 共享 Redis client。被 `queue.js` 和 `socket.js` 內部使用；也直接用於 caching 或 pub/sub。 |
| `socket.js` | Socket.IO server。在連接時驗證 access tokens（包括 `tokenVersion`），方式與 HTTP auth 相同。完整架構請參閱 [即時通訊 / Socket.IO](/zh-TW/realtime/sockets)。 |
| `email.js` | 交易性 email 派發。接受渲染後的範本並透過已配置的提供者發送。 |
| `language.js` | i18n 查詢——從編譯後的 `locales/` 檔案讀取。由 actions 和 mailers 透過 `lang.t(key, locale)` 使用。 |
| `passport.js` | 每種 auth 使用者類型一個 Passport JWT 策略。每個策略驗證 signature、`exp`、`iss`、`aud` 和 `tokenVersion`。`middleware/auth.js` 中的 `AUTH_TYPES` registry 驅動哪個策略與哪個 `Authorization` scheme 相符。 |
| `postgres.js` | 原始 `pg` client，用於需要繞過 Sequelize 的查詢（migration helpers、一次性 admin 查詢）。 |
| `secure.js` | AES-256-GCM 已驗證加密，用於可逆儲存的敏感欄位。使用與 auth tokens 不同的密鑰。 |
| `error.js` | `errorResponse()`、全域 `ERROR_CODES` map，以及用於 Joi 驗證錯誤的 `joiErrorsMessage()`。 |
| `phone.js` | SMS / 電話號碼包裝器（Twilio 或相等服務）。 |

**經驗法則：** 如果模組是小型、純粹、無狀態的函式，它屬於 `helpers/`。如果它包裝外部系統、持有連接，或有有意義的設定狀態，它屬於 `services/`。

---

## `helpers/` — 小型純粹工具

Helpers 是跨功能共享的**小型、純粹、無狀態函式**。沒有連接，沒有副作用。

| 檔案 | 提供什麼 |
|---|---|
| `constants.js` | 所有全域 enums 和狀態集（例如 `LOCALE`、`TOKEN_AUDIENCE`、`PLATFORMS`）。使用雙重 export 模式，讓 constants 可以作為具名 exports 和單一物件存取。**不使用魔法字串**——任何在超過一個地方使用的字面值都在這裡。 |
| `cruqd.js` | Sequelize CRUD + Query helpers。`parseUrlQueryFilter` 將方括號記法 URL filters 轉換為 Sequelize `Op` 運算子。 |
| `logic.js` | Auth token 工具：`createAccessToken`、`createRefreshToken`、`hashToken`、`parseDurationMs`、`resolveClient`。 |
| `schemas.js` | 可重用的 Joi schema 片段（例如分頁參數、UUID 驗證器），跨功能 actions 共享。 |
| `session.js` | Refresh token session 機制：`issueSession`（建立 session 列）、`revokeSession`、輪換邏輯。 |
| `tests.js` | 共享測試工具（request 建構器、auth header helpers、assertion 捷徑）。 |
| `validate.js` | Actions 在業務邏輯執行前使用的 Joi 驗證包裝器。 |

**提升規則：** 如果一個 helper 從功能的 `helper.js` 開始，而你需要在第二個功能中使用它，將它移到 `helpers/` 並更新兩個 imports。永遠不要在功能資料夾之間複製共享邏輯。

**全域 helpers 需要測試。** 任何時候你新增或修改全域 helper，在 `test/helpers/<name>.test.js` 中撰寫或更新其單元測試。這些是純粹的單元測試——沒有 server，沒有 DB。

---

## `database/` — Schema、Seed 和備份

| 路徑 | 用途 |
|---|---|
| `database/index.js` | 執行中 app 使用的 Sequelize 連接。與 `config/config.js` 分離，後者僅供 Sequelize CLI 使用。 |
| `database/schema.sql` | **僅文件用途** — 每張表和每個欄位的人類可讀記錄。永遠不執行。每次你修改 DB 時保持更新；這是新工程師了解完整資料模型最快的方式。 |
| `database/sequence.js` | 所有表名的有序陣列。控制種子資料和 fixtures 的載入順序（遵守 FK 相依性）。**由 generator 自動維護**（`yarn gen` / `yarn del`）——除非你必須手動覆寫某些東西，否則不要手動編輯。 |
| `database/seed/` | 開發用種子資料，分組為 sets（`set1/`、`set2/`、…）。用 `yarn seed` 載入。保持 sets 數量少——每個新欄位都意味著更新每個 set。 |
| `database/backups/` | 由 `yarn backup` 建立的 DB 備份。用 `yarn restore` 還原（刪除並替換目前的 DB）。 |

---

## `migrations/` — Schema 變更

真實的、有序的 Sequelize migration 檔案。這些是在開發和正式環境中實際修改資料庫的東西。用以下方式建立：

```bash
sequelize migration:create --name descriptive-name
```

完整的命名和內容慣例請遵循 `add-migration` 技能。Migrations 是固定的快照——永遠不要編輯已套用的 migration；寫一個新的代替。

---

## `languages/` 和 `locales/` — 國際化

```
languages/       # 真實來源 — 編輯這些
  en.js
  es.js
locales/         # 編譯輸出 — 不要手動編輯
  en.json
  es.json
```

全域 i18n 來源字串存放在 `languages/` 中。功能特定的字串存放在 `app/<Feature>/languages/` 中。編輯任何來源檔案後，執行：

```bash
yarn lang   # 將 languages/ 編譯到 locales/ 並驗證所有 keys
```

`yarn test` 首先執行 `yarn lang`——如果 keys 遺失或無效，套件在任何測試執行前就會失敗。

完整的 i18n 參考——key 命名、locale 偵測順序、tasks 與 actions、新增 locale、key 安全機制——請參閱 **[docs/i18n/localization.md](../i18n/localization.md)**。

---

## `config/` — 環境配置

```
config/
├── .env.template     # 已 commit — 所有變數的參考
├── .env.development  # gitignored
├── .env.test         # gitignored
├── .env.staging      # gitignored
├── .env.production   # gitignored
├── config.js         # Sequelize CLI 設定（透過 NODE_ENV 讀取 .env.*）
└── heroku-sync.js    # 將 .env 檔案同步到 Heroku app
```

複製 `.env.template` 以建立每個環境檔案。最低需要的變數：

| 變數 | 用途 |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` — 選擇載入哪個 `.env.*`。 |
| `DATABASE_URL` | Postgres 連接字串。對 `.env.test` 使用**獨立的 DB**。 |
| `REDIS_URL` | Redis 連接（Bull queues + Socket.IO adapter）。 |
| `ACCESS_TOKEN_SECRET` | JWT 簽署密鑰——必須與 refresh 密鑰**不同**。 |
| `REFRESH_TOKEN_SECRET` | Refresh token 簽署密鑰——必須與 access 密鑰不同。 |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token 有效期，例如 `15m`。 |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token 有效期，例如 `60d`。 |

所有四個 auth 變數必須出現在**每個**環境檔案中，包括 `.env.test`。測試環境中遺失 auth 變數會導致 auth 測試以令人困惑的方式失敗。

`config/config.js` 僅由 Sequelize CLI 讀取（透過 `.sequelizerc`）。執行中的 app 透過 `database/index.js` 連接。兩者最終都讀取相同的 `DATABASE_URL`——通往同一個資料庫的兩個門。

---

## `test/` — 全域測試框架

```
test/
├── app/          # 將每個功能的測試檔案縫合在一起
├── fixtures/     # 測試 DB 基準資料（fix1/、fix2/、…）
├── helpers/      # 全域 helpers 的單元測試
└── services/     # 全域 services 的單元測試
```

功能測試檔案存放**在功能資料夾內**（`app/<Feature>/tests/`），不在 `test/` 的根目錄。`test/app/` 目錄將它們縫合在一起，讓 Jest 能將它們作為單一套件發現。

`test/fixtures/` 是 `database/seed/` 的測試對應——在套件執行前載入到測試 DB 的基準資料。Fixtures 是起始狀態；測試就地修改，而非從頭建立所有東西。

執行完整套件：

```bash
yarn test   # 執行：yarn lang → sql fix1 → jest --runInBand
```

PostgreSQL **和** Redis 必須在執行中。`--runInBand` 是必要的，因為測試共用單一測試資料庫，且不能並行執行。

---

## `scripts/` — 一次性工具

你手動執行的獨立腳本——不是 request、worker 或 cron 流程的一部分。範例：編譯語言工具、密碼 helpers、資料遷移腳本、一次性 admin 工具。它們從適當的 `.env.*` 檔案讀取，並可以直接連接到任何環境的資料庫。

---

## 為什麼選擇功能資料夾架構？

以功能為基礎的組織讓所有與一個關注點相關的程式碼都在同一個地方。比較：

**以功能為基礎（Orbital Express）：**
```
app/
  Order/
    model.js        ← 全部在同一個地方
    routes.js
    controller.js
    actions/
    tests/
  Invoice/
    model.js
    routes.js
    …
```

**以類型為基礎（Rails 風格）：**
```
models/
  order.js
  invoice.js
routes/
  order.js
  invoice.js
controllers/
  order.js
  invoice.js
```

隨著程式碼庫增長到數十或數百個功能，Rails 風格的結構迫使在目錄樹中不斷來回切換。以功能為基礎的結構意味著處理 `Order` 的開發者幾乎完全待在 `app/Order/` 中。更少的 merge conflicts，更快的瀏覽，以及對每個資料夾擁有什麼的更清晰的心智模型。
