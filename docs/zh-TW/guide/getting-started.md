# 快速開始

Orbital Express 是一個固執己見的 Express.js + Sequelize（PostgreSQL）framework，用於快速建構高品質的 backend API。它結合了 Django 的**以功能為基礎的資料夾結構**與 Rails 的 Model-View-Controller 概念，並在 web server 旁整合了背景任務系統（Bull/Redis）和即時 Socket.IO。

本指南帶你從零到本機環境完整運行。如果你還沒讀過 [什麼是 Orbital Express？](../index.md)，請先去讀那份文件——它在你接觸任何程式碼之前先解釋了心智模型。

---

## 你需要先了解的事

Orbital Express 不是初學者 framework。在使用它之前，你應該對以下所有內容感到自在。如果其中有任何部分感覺陌生，請先研讀連結的資源——這份投資會立即得到回報。

### JavaScript 基礎

如果你是 JavaScript 新手，從這裡開始：
- [W3Schools JavaScript Tutorial](https://www.w3schools.com/js/) — 涵蓋基礎
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — 更完整的參考資料

### 進階 JavaScript *（必備）*

你需要深入理解 JavaScript 的實際運作方式——不只是語法，還有 runtime、scope、closures、prototypes 和 event loop。以下兩門課程是現有最好的：

- **[JavaScript: Understanding the Weird Parts](https://www.youtube.com/watch?v=Bv_5Zv5c-Ts)**，作者 Anthony Alicea — YouTube 上有免費介紹；完整課程在 Udemy。先看這個。
- **ES6 和現代 JavaScript** — Stephen Grider 的 *ES6 JavaScript: The Complete Developer's Guide*（Udemy）。涵蓋 arrow functions、destructuring、classes、modules、async/await，以及 ES5 之後新增的所有內容。

### Node.js *（必備）*

- **Learn and Understand NodeJS**，作者 Anthony Alicea（Udemy）— 涵蓋 Node runtime、event loop、streams、modules，以及 Express 如何融入其中。讀到**第 9 節**就停——要有效使用這個 framework，你不需要超過那個範圍。

### 資料庫 — PostgreSQL

- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) — 從零開始的實用 SQL
- [Official PostgreSQL Docs](https://www.postgresql.org/docs/) — 參考資料

### 此 Framework 使用的 JavaScript 函式庫

你不需要在開始之前精通這些，但你會全部遇到。**Level** 欄位告訴你應該先專注在哪裡：

| 函式庫 | 用途 | Level | 文件 |
|---|---|---|---|
| **Sequelize** | PostgreSQL ORM — models、migrations、queries | 🟢 必須掌握 | [sequelize.org](https://sequelize.org/docs/v6/) |
| **Joi** | 每個傳入 request 的 schema 驗證 | 🟢 必須掌握 | [joi.dev](https://joi.dev/api/) |
| **Jest** | 測試執行器 — 整合測試、assertions | 🟢 必須掌握 | [jestjs.io](https://jestjs.io/docs/getting-started) · [Cheatsheet](https://devhints.io/jest) |
| **Moment.js** | 日期/時間處理與時區支援 | 🟢 必須掌握 | [momentjs.com](https://momentjs.com/docs/) |
| **Passport.js** | Auth middleware — 在底層用於 JWT 策略 | 🟢 必須掌握 | [passportjs.org](https://www.passportjs.org/docs/) |
| **Redis** | 記憶體內儲存 — 驅動 queues、sessions、caching | 🟡 建議了解 | [redis.io/docs](https://redis.io/docs/latest/) |
| **Socket.IO** | 透過 WebSockets 的即時雙向事件 | 🟡 建議了解 | [socket.io/docs](https://socket.io/docs/v4/) |
| **Bull** | 背景任務 queues — 建構在 Redis 之上 | 🟡 建議了解 | [github.com/OptimalBits/bull](https://github.com/OptimalBits/bull#readme) |
| **accounting.js** | 顯示用的金額格式化 | 🔵 選用 | [accounting.js](http://openexchangerates.github.io/accounting.js/) |
| **currency.js** | 金額計算 | 🔵 選用 | [currency.js.org](https://currency.js.org/) |

**說明：**
- 🟢 **必須掌握** — 你建構的每個功能都會用到
- 🟡 **建議了解** — 你會遇到；理解它能避免困惑
- 🔵 **選用** — 只與特定類型的專案相關（例如金融應用）

::: tip 從哪裡開始
先把 Sequelize、Joi 和 Jest 掌握好。Redis 和 Socket.IO 在你開始建構使用 queues 和即時事件的功能後，自然就會理解。
:::

---

## 系統需求

在安裝任何東西之前，請確認你的機器具備：

| 需求 | 版本 | 備注 |
|---|---|---|
| **Node.js** | v22.x.x | 使用 [nvm](../nvm.txt) 為每個專案鎖定版本 |
| **PostgreSQL** | 14+ | 執行 `yarn migrate` 或 `yarn test` 前必須在執行中 |
| **Redis** | 7+ | 參見下方 [Redis 設定](#redis-project-local) — **不要**系統層級安裝 |
| **Yarn** | 1.x（classic） | `npm install -g yarn` |

::: tip 預設知識
Orbital Express 不是「hello world」入門包。本指南假設你理解 JavaScript（ES6+）、Node.js，以及 Express app 的基本 request/response 生命週期。如果這些感覺不熟，請先研讀後再繼續。
:::

---

## 安裝

有兩種方式開始新專案。**建議使用方式 A。**

### 方式 A — `create-orbital-app`（建議）

最快的開始方式。CLI 在幾秒內 scaffold 出一個完整、已配置好的專案——選擇你的資料庫名稱、auth 提供者、email 提供者和選用整合，然後全部自動連接好。

```bash
npx create-orbital-app my-api
```

就這樣。回答提示問題，然後：

```bash
cd my-api
cp config/.env.template config/.env.development
# 填入你的環境變數
createdb my_api_dev
createdb my_api_test
yarn migrate
yarn s
```

::: tip 原始碼
`create-orbital-app` 是一個獨立的開源套件 — 在 [github.com/Hackbyrd/create-orbital-app](https://github.com/Hackbyrd/create-orbital-app) 查看原始碼。
:::

---

### 方式 B — 手動 clone repo

如果你想從原始 framework repo 開始並自行配置一切：

```bash
git clone https://github.com/Hackbyrd/orbital-express.git my-api
cd my-api
yarn install
```

所有相依套件都鎖定到**精確版本**——`package.json` 中任何地方都沒有 `^` 或 `~` 範圍。保持這個狀態。

::: warning 永遠鎖定精確版本
當你新增任何新相依套件時，永遠加上 `--exact`：

```bash
yarn add <module> --exact          # 一般相依套件
yarn add <module> --exact --dev    # 開發用相依套件
```

範圍版本（`^1.2.3`、`~1.2.3`）允許套件管理器在全新 checkout 或 CI 執行時靜默安裝不同版本。精確鎖定確保每位開發者、每次 CI 執行和每次部署都安裝完全相同的相依套件樹。
:::

---

## Redis — 專案本地設定 {#redis-project-local}

Orbital Express **不**使用系統層級的 Redis（`brew install redis` 不是我們要的）。每個專案在 repo 內建構並執行自己的 Redis 副本，鎖定到專案預期的版本。

`redis/` 資料夾已加入 gitignore（它是大型 binary），所以每位開發者需要安裝一次：

1. 從 <http://download.redis.io/releases/> 下載一個版本。
2. 建構它：
   ```bash
   cd redis-x.x.x
   make && make test
   ```
3. 將資料夾重新命名為 repo 根目錄的 `redis/`。
4. 在 `redis/` 內建立一個 `vX.X.X.txt` 檔案，記錄版本——讓團隊知道這個專案預期哪個版本。
5. 用以下指令啟動 Redis：
   ```bash
   yarn redis
   ```
   用 `yarn redis:stop` 停止。

完整細節在 [docs/redis.txt](../redis.txt)。Redis 必須在執行中，worker process、Socket.IO 和測試套件才能運作。

::: tip 僅限本機開發
專案本地 Redis 純粹用於在你的機器上執行應用程式。在正式環境中，透過 `REDIS_URL` 設定變數連接到**託管 Redis**（Heroku Redis、Redis Cloud 等）。你永遠不會在部署環境中從 repo 建構 Redis。
:::

---

## 配置

所有環境變數存放在 `config/` 下的各環境檔案中。已 commit 的範本是 `config/.env.template`——它是應用程式接受的每個變數的權威參考。

### 建立你的本機環境檔案

```bash
cp config/.env.template config/.env.development
cp config/.env.template config/.env.test
```

填入每個檔案的值。`.env.development` 和 `.env.test` 檔案已加入 gitignore——它們永遠不會出現在 repository 中。

::: warning 測試使用獨立資料庫
`.env.test` 中的 `DATABASE_URL` 必須指向與開發環境**不同**的 Postgres 資料庫。測試套件每次執行都會刪除並重建表。
:::

### 必要變數

真正的參考資料永遠是 `config/.env.template`，但這些是啟動所需的最低限度：

| 變數 | 說明 |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` — 選擇載入哪個 `.env.*` |
| `DATABASE_URL` | Postgres 連接字串 |
| `REDIS_URL` | Redis 連接（Bull queues + Socket.IO adapter） |
| `ACCESS_TOKEN_SECRET` | 短效 access JWT 的簽署密鑰 |
| `REFRESH_TOKEN_SECRET` | refresh token 的簽署密鑰 — 必須與 access 密鑰不同 |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token 有效期，例如 `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token 有效期，例如 `60d` |

::: warning 每個環境檔案都需要所有 auth 變數
`ACCESS_TOKEN_SECRET`、`REFRESH_TOKEN_SECRET`、`ACCESS_TOKEN_EXPIRES_IN` 和 `REFRESH_TOKEN_EXPIRES_IN` 必須存在於**每個**環境檔案中，包括 `.env.test`。如果它們在 `.env.test` 中遺失，auth 測試會以令人困惑的方式失敗。保持兩個密鑰不同，且永遠不要 commit 真實密鑰——只有 `.env.template` 會被 commit。
:::

每次你在應用程式中新增一個新的設定變數時，更新 `.env.template`，讓下一位拉取你變更的開發者知道它的存在。

### 配置的載入方式

`config/config.js` 是 Sequelize CLI 讀取以執行 migrations 的檔案——它由 repo 根目錄的 `.sequelizerc` 指向。它透過 `NODE_ENV` 載入對應的 `.env.<env>`，並為每個環境匯出一個區塊。

`database/index.js` 是執行中的 app server 使用的 Sequelize 連接——它讀取相同的 `DATABASE_URL`。兩個獨立的入口點，同一個資料庫。

---

## 在本機執行

Orbital Express 有**三個 process**。開發期間你需要全部三個都在執行：

```bash
yarn s      # web server（index.js → server.js，透過 throng 叢集化）
yarn w      # 背景 worker（worker.js — 處理 Bull queue 任務）
yarn cron   # cron daemon（cronjobs.js — 將排程工作加入佇列）
```

### 為什麼需要三個 process？

| Process | 功能 |
|---|---|
| **Web server**（`yarn s`） | 處理所有傳入的 HTTP 和 WebSocket requests。 |
| **Worker**（`yarn w`） | 執行背景任務——對 request/response 週期來說太慢或太重的任務（報告產生、第三方 API 呼叫、批次操作）。 |
| **Cron**（`yarn cron`） | 一個 clock process——觸發排程工作（例如「每天中午發送每日 email」）。通常是將 worker 任務加入佇列，而非自己做工作。 |

Cron process 在正式環境中應該執行**恰好一個實例**。Web server 和 worker 可以水平擴展。

::: tip 開發捷徑
在本機開發中，你可以開三個終端機分頁，每個 process 一個。在正式環境中，這些是獨立的 dynos/containers。
:::

完整的指令參考、資料庫備份/還原、Heroku 部署步驟、健康探針和 ngrok webhook 測試，請參閱[操作與部署參考](../reference/operations)。

---

## 你的第一個 Migration

一旦 Postgres 在執行中且你的 `config/.env.development` 已配置好：

```bash
yarn migrate
```

這會按順序將 `migrations/` 中所有待處理的 migrations 套用到你的開發資料庫。Sequelize CLI 讀取 `config/config.js`，後者從 `.env.development` 取得 `DATABASE_URL`。

```bash
yarn migrate:prod    # 針對正式環境的 DATABASE_URL 執行
yarn rollback        # 回滾最後一個 migration（開發環境）
```

::: warning 永遠不要編輯 schema.sql 來修改資料庫
`database/schema.sql` 是文件——它永遠不會被執行。真正的 schema 變更存放在 `migrations/` 中。永遠透過以下方式建立 migration 檔案：

```bash
sequelize migration:create --name descriptive-name
```

然後在 `database/schema.sql` 中記錄相同的變更，讓每位開發者都能在一個地方讀到完整的 schema。
:::

---

## 執行測試

```bash
yarn test
```

測試指令按順序執行三件事：`yarn lang`（編譯並驗證 i18n）、套用測試 fixtures，然後用 `--runInBand` 執行完整的 Jest 套件。

::: warning Postgres 和 Redis 必須在執行中
整合測試會連接真實的 Postgres 資料庫（由 `.env.test` 中的 `DATABASE_URL` 指向）和真實的 Redis。執行 `yarn test` 之前先啟動兩者。
:::

測試檔案完全鏡像來源檔案的位置：

- 功能 action 測試 → `app/<Feature>/tests/integration/`
- 功能任務測試 → `app/<Feature>/tests/tasks/`
- 全域 helper 測試 → `test/helpers/<name>.test.js`
- 全域 service 測試 → `test/services/<name>.test.js`

---

## 專案結構一覽

你每天建構的幾乎所有東西都在 `app/` 中——每個功能一個資料夾（每張資料庫表一個）。repo 根目錄的其他所有東西是共享基礎設施。

```
repo root
├── app/                  # 所有功能 — 每個功能一個資料夾（一張表）
├── index.js              # web 入口點（透過 throng 叢集化）
├── server.js             # Express app：middleware、routes、socket、error handler
├── worker.js             # 背景 worker — 註冊所有 queue 任務處理器
├── cronjobs.js           # cron clock — 排程任務
├── routes.js             # 全域 route 聚合器（掛載每個功能的 routes.js）
├── models.js             # 全域 model 聚合器（掃描 app/*/model.js）
├── middleware/           # 全域 Express middleware（id、args、auth、error、exit）
├── services/             # 第三方包裝器 + 共享基礎設施（queue、redis、socket、email…）
├── helpers/              # 跨功能共享的小型純粹工具函式
├── database/             # schema.sql、sequence.js、seed/、backups/、index.js
├── migrations/           # 由 yarn migrate 套用的按順序排列的 schema 變更
├── languages/            # 全域 i18n 來源字串（由 yarn lang 編譯）
├── locales/              # 編譯後的 i18n 輸出 — 不要手動編輯
├── config/               # 各環境 .env 檔案及配置黏合層
├── docs/                 # 所有深度文件
└── test/                 # 全域測試入口：fixtures、helper/service 單元測試
```

`app/` 資料夾是你花費最多時間的地方。每個功能資料夾包含與該功能相關的所有內容：

```
app/
└── Order/
    ├── model.js
    ├── routes.js
    ├── controller.js
    ├── actions/
    │   ├── index.js
    │   ├── V1Create.js
    │   └── V1Get.js
    ├── tasks/
    ├── tests/
    ├── languages/
    └── mailers/
```

---

## Scaffold 你的第一個功能

Generator 是建立新功能檔案的**唯一**方式。永遠不要手動建立它們。

```bash
yarn gen Order                    # scaffold Order 功能資料夾
yarn gen Order -a V1Create        # 為現有功能新增 action
yarn gen Order -t V1ProcessTask   # 新增背景任務
yarn gen Order -m OrderMailer     # 新增 mailer
```

Scaffold 完成後，立即移除 generator 的預設佔位檔案：

```bash
yarn del Order -a V1Example       # 移除佔位 action 及其 export 項目
```

::: warning 使用 yarn del，不要用 rm
`yarn del` 移除檔案**並且**清理它在 `actions/index.js`（或 `tasks/index.js`）中的項目。直接使用 `rm` 會留下一個指向已刪除檔案的損壞 export。
:::

Generate 完成後，執行 `yarn lang` 編譯 i18n，然後執行 `yarn test` 確認 scaffold 通過測試套件。

---

## 後續步驟

- [專案結構](./project-structure.md) — 每個資料夾的深入說明。
- [以功能為基礎的開發](/zh-TW/core/feature-folder) — 如何端對端建構一個功能。
- [Authentication](/zh-TW/auth/overview) — 雙 token 模型、session 管理，以及新增新的使用者類型。
- [背景任務與 Cron](/zh-TW/background-jobs/overview) — 任務、queues 和排程工作。
- [測試](/zh-TW/testing/overview) — fixtures、整合測試及應該驗證什麼。
- [`docs/conventions.txt`](../conventions.txt) — 權威規則手冊。任何有歧義的地方，以此為準。
