# 什麼是 Orbital Express？

Orbital Express 是一個固執己見的 Express.js + Sequelize framework，用於在 Node.js 中建構正式環境等級的 backend API。它汲取 Django 和 Ruby on Rails 最好的架構理念，並將其應用於 JavaScript 生態系——讓你擁有一致、可擴展的專案架構，而無需從零開始設計。

這個 framework 圍繞著一個核心理念：**與某個功能相關的所有程式碼都存放在同一個資料夾中**。不再需要每次想理解或修改一件事時，就在 `controllers/`、`models/`、`routes/` 和 `tests/` 目錄之間跳來跳去。在 Orbital Express 中，`app/Order/` 資料夾包含 model、routes、controller、actions、tasks、tests、翻譯和 mailers——全部在同一個地方。

::: info Orbital Express 不是什麼
Orbital Express 不是單純的程式碼產生器或 scaffold 工具。它是一套完整的架構模式——包含慣例、檔案結構、generator 工具、背景任務系統、socket 層、auth 模型和測試方法——所有部分協同運作。你遵循這些慣例，framework 處理其餘的事。
:::

---

## 設計理念

### 功能資料夾架構

Orbital Express 的基本組織原則借鑑自 Django：**以功能分組程式碼，而非以類型分組**。

Orbital Express 中的「功能」直接對應到一張資料庫表。當你新增一張 `Orders` 表時，你就建立一個 `app/Order/` 資料夾。你圍繞這張表所建構的所有東西——API actions、model、背景任務、tests——都存放在這個資料夾中。

將這與大多數 Node.js 開發者預設採用的 Rails 風格做比較：

::: code-group

```
// Orbital Express — 以功能為基礎
app/
  Order/
    controller.js
    model.js
    routes.js
    actions/
      V1Create.js
      V1Cancel.js
    tests/
      integration/
        V1Create.test.js
        V1Cancel.test.js
```

```
// Rails 風格 — 以類型為基礎
controllers/
  order.js
models/
  order.js
routes/
  order.js
tests/
  order.js
```

:::

隨著程式碼庫的增長，以功能為基礎的方式會帶來回報。當你有 100 個功能時，Rails 風格的結構意味著需要不斷在四個或更多的頂層目錄之間切換，才能處理一件事。有了功能資料夾，你打開一個目錄，所需的一切都在那裡。

### 能夠規模化的固執慣例

Orbital Express 刻意為你做決定。命名慣例、檔案結構、HTTP 方法論、auth 模型和資料庫模式都已明確規定。這不是限制，這正是重點所在。

當慣例被建立並持續遵循時，團隊中的任何工程師都可以打開程式碼庫中的任何檔案，清楚知道自己在看什麼，以及去哪裡找需要的東西。新人上手更快，code review 更容易，bug 更容易定位。

慣例涵蓋：

- 每個 `.js` 檔案的結構（區塊順序、import 順序）
- actions 的命名方式（`V1CreateByAdmin`、`V1CancelOnMobile`）
- HTTP 回應的格式（扁平，無 `data` 巢狀結構）
- 資料庫表的設計（UUID 主鍵、soft delete、FK 所有權鏈）
- 測試的撰寫方式及其驗證內容

### Generator 優先的開發方式

在 Orbital Express 中，你永遠不要手動建立功能檔案。Generator 會 scaffold 出正確的結構：

```bash
yarn gen Order              # scaffold Order 功能資料夾
yarn gen Order -a V1Cancel  # 為現有功能新增 action
yarn gen Order -t V1ReportTask  # 新增背景任務
yarn gen Order -m OrderMailer   # 新增 mailer
```

Scaffold 完成後，使用 `yarn del` 移除 generator 的預設佔位檔案（不要用 `rm`——`del` 指令還會移除 index 檔案中的損壞 export）：

```bash
yarn del Order -a V1Example
```

這種 generator 優先的工作流程確保每個新檔案從一開始就在正確的位置，並具備正確的結構。這不是可選的——手動建立檔案會導致缺少 export、位置錯誤，並偏離慣例。

### AI 原生

Orbital Express 附帶一個技能系統（`.claude/skills/`）——每個常見任務的逐步操作手冊。AI 程式碼助理讀取這些手冊來正確執行任務：建立功能、新增 actions、撰寫測試、新增 migrations、配置 auth 等等。

這些技能不是行銷文案，而是 AI 遵循的實際指令，用來產出正確的 Orbital Express 程式碼。這意味著在 Orbital Express 程式碼庫上使用 AI 輔助，能產出一致、符合慣例的結果，而非隨意的創作。

---

## 適合誰使用？

**使用 Node.js 建構 REST API 的 backend 工程師**，希望擁有比純 Express 更有結構的基礎，但又不想承受 NestJS 這類 framework 的複雜性負擔。

**追求規模化一致性的團隊。** 當你的程式碼庫有 50 個以上的功能和 10 個以上的工程師時，一致性就成了關鍵支柱。Orbital Express 從結構上強制執行這一點。

**學習正式環境模式的初級工程師。** 慣例明確且有完整文件。遵循這個 framework 的初級工程師能學到正式環境中使用的模式——真實的 auth、真實的背景任務、真實的測試結構——而非玩具範例。

::: tip 誰不應該使用它
如果你在建構外部開發者會使用的公開 REST API，且需要 HATEOAS、OpenAPI 優先設計或嚴格的 REST 語義，Orbital Express 固執的純 POST/GET 方式可能不符合你的需求。它針對你同時擁有 frontend 和 backend 的內部 API 進行了優化。
:::

---

## 關鍵設計決策

### 只用 POST 和 GET

Orbital Express 只使用 POST 和 GET，沒有 PUT、PATCH 或 DELETE。

REST HTTP 方法慣例是為以文件為中心的系統設計的。當你有真實的業務邏輯時，它就會崩潰。`V1ArchiveAndNotifyUser` 該用什麼方法？DELETE 因為是封存？PATCH 因為在更新狀態？POST 因為有副作用？

```javascript
// REST 方式 — 方法選擇不明確
DELETE /v1/users/123          // 這是 soft delete？hard delete？還是封存？
PATCH  /v1/users/123/archive  // 把 PATCH 和動詞路徑混用？

// Orbital Express — action 名稱承載所有語義
POST /v1/users/archive        // V1Archive — 毫無歧義
POST /v1/users/closeaccount   // V1CloseAccount — 即使有多個副作用也清晰明確
```

規則：幾乎所有事情都用 POST。只有在沒有 request body 且參數能完整放進 URL query string 時才用 GET（列表/搜尋 endpoints）。

### 到處使用 `req.args`

`args.js` middleware 將 request 參數正規化到 `req.args`。對於 POST request，這是 `req.body`；對於 GET request，這是 `req.query`。你在 action 中永遠不直接碰 `req.body` 或 `req.query`。

```javascript
// 永遠不要這樣做
async function V1Update(req, res) {
  const { firstName } = req.body;   // 錯誤
  const { page } = req.query;       // 錯誤
}

// 永遠這樣做
async function V1Update(req, res) {
  const { firstName, page } = req.args;  // 正確 — 對 POST 和 GET 都適用
}
```

這意味著當你在撰寫 action 邏輯時，永遠不需要思考 endpoint 是 POST 還是 GET。`req.args` 永遠是正確的地方。

### UUID 主鍵與 Soft Delete

每張表使用 UUID v7 主鍵（不使用自動遞增整數）。每張表使用 Sequelize 的 `paranoid: true` 進行 soft delete——記錄永遠不會被物理刪除，除非明確使用 `scope(null)` 繞過。

```javascript
// model.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv7(),
      primaryKey: true
    },
    // ...欄位
  }, {
    paranoid: true  // 新增 deletedAt；被刪除的記錄會被過濾，不會被移除
  });
};
```

### 扁平回應格式

每個 action 的回應都是扁平的，沒有 `data` 包裝物件。

```javascript
// 錯誤 — 巢狀 data 包裝
res.status(200).json({ status: 200, success: true, data: { user } });

// 正確 — 扁平
res.status(200).json({ status: 200, success: true, user });
```

Status code：預設 `200`，建立時 `201`，背景任務入列時 `202`。

### 精確版本鎖定

每個相依套件都鎖定到確切版本，沒有 `~` 或 `^` 範圍。

```bash
yarn add lodash --exact       # 安裝 4.17.21，而非 ^4.x
yarn add jest --exact --dev
```

這確保每位開發者、每次 CI 執行和每次部署都安裝完全相同的相依套件樹。範圍版本允許套件管理器在全新 checkout 時靜默安裝不同版本——這就是「在我電腦上能跑」這類 bug 的根源。

### 不使用魔法字串

任何在超過一個地方使用的字串字面值都存放在 `helpers/constants.js` 中，並以名稱引用。

```javascript
// 錯誤
if (order.status === 'pending') { ... }
if (user.role === 'admin') { ... }

// 正確
const { ORDER_STATUS, USER_ROLE } = require('../../../helpers/constants');
if (order.status === ORDER_STATUS.PENDING) { ... }
if (user.role === USER_ROLE.ADMIN) { ... }
```

Migrations 是唯一的例外——它們是固定的快照，保留字面值。

---

## 技術堆疊

| 層級 | 技術 |
|---|---|
| HTTP server | Express.js v4.x |
| ORM | Sequelize (PostgreSQL) |
| 背景任務 | Bull + Redis |
| 即時通訊 | Socket.IO |
| Auth | Passport.js (JWT — access + refresh token 模型) |
| 測試 | Jest + Supertest |
| Email | Nodemailer |
| 國際化 | 自訂 i18n（透過 `yarn lang` 編譯） |
| Runtime | Node.js v22.x |

### 三個 Process

完整的 Orbital Express 部署執行三個 process：

```bash
yarn s      # web server — 處理 API requests（index.js → server.js，透過 throng）
yarn w      # worker — 從 Bull queues 處理背景任務（worker.js）
yarn cron   # clock — 按 cron 排程將任務加入佇列（cronjobs.js）
```

在開發環境中，你在本機執行全部三個。在正式環境中，它們是獨立的 dynos（或相等單位）。

Web server 使用 `throng` 為每個 CPU core 建立一個 worker。Cron process 以單一實例執行。

### Redis — 開發環境使用專案本地版本

Orbital Express 不使用系統層級的 Redis 安裝。每個專案都從 repo 根目錄（`redis/` 目錄，已加入 gitignore）建構並執行自己的 Redis binary。這讓每個專案鎖定自己的 Redis 版本。

```bash
# 啟動專案本地 Redis
yarn redis

# 停止
yarn redis:stop
```

在正式環境中，使用託管的 Redis 服務（Heroku Redis、Redis Cloud 等）。Repo 本地 Redis 僅供本機開發使用。

::: warning Redis 不只是用於背景任務
Redis 支撐著 Bull（背景任務）、Socket.IO（跨 dyno 的 pub/sub）以及正式環境的速率限制。測試套件也需要 Redis 在執行中。執行 `yarn test` 之前先啟動它。
:::

---

## 與其他 Framework 的比較

| | Orbital Express | NestJS | AdonisJS | 純 Express |
|---|---|---|---|---|
| **架構** | 功能資料夾（Django 風格） | 模組化（Angular 風格） | MVC（Rails 風格） | 無固執意見 |
| **語言** | JavaScript (CommonJS) | TypeScript（必須） | TypeScript 或 JS | 任一 |
| **HTTP 方法** | 只用 POST + GET | 全部方法（REST） | 全部方法（REST） | 全部方法 |
| **ORM** | Sequelize | TypeORM / Prisma / MikroORM | Lucid（自訂） | 自選 |
| **背景任務** | Bull（內建） | Plugin（透過模組的 Bull） | Adonis Jobs | 自選 |
| **Auth** | 內建（access + refresh JWT） | Guards + Passport（自行配置） | 內建（多種驅動） | 自選 |
| **Generator 工具** | `yarn gen` / `yarn del` | `nest generate` | `node ace make:*` | 無 |
| **AI 技能系統** | 有（.claude/skills/） | 無 | 無 | 無 |
| **固執程度** | 高 | 中高 | 高 | 無 |
| **學習曲線** | 低（JS，明確慣例） | 高（TS decorator、DI） | 中 | 無（無任何護欄） |

**NestJS** 是正確的選擇，如果你需要 TypeScript、Angular 風格的依賴注入，以及大型官方模組生態系。它更重、更複雜。Orbital Express 更簡單、更明確。

**AdonisJS** 是 Node.js 世界中最接近 Rails 的框架——它甚至有強大的 CLI 和專為其設計的 ORM。Orbital Express 的主要差異在於功能資料夾結構（相對於 AdonisJS 以類型為基礎的資料夾結構），以及純 POST/GET 的 HTTP 理念。

**純 Express** 什麼都不給你——沒有結構、沒有慣例、沒有 auth 模型、沒有任務系統。每個從純 Express 開始的團隊最終都會建立自己的慣例。Orbital Express 就是那些慣例，已經制定好並有完整文件。

---

## 一覽檔案結構

```
repo root
├── app/                  # 所有功能 — 每張表一個資料夾
│   └── Order/
│       ├── controller.js
│       ├── model.js
│       ├── routes.js
│       ├── actions/
│       ├── tasks/
│       ├── tests/
│       ├── languages/
│       └── mailers/
│
├── index.js              # web 入口點（throng cluster）
├── server.js             # Express app：middleware、routes、socket、error handler
├── worker.js             # 背景任務 worker 入口點
├── cronjobs.js           # cron clock 入口點
├── routes.js             # 全域 route 聚合器
├── models.js             # 全域 model 聚合器
│
├── middleware/           # id、args、auth、error、exit
├── services/             # queue、redis、socket、email、passport、...
├── helpers/              # constants、cruqd、logic、validate、...
│
├── database/
│   ├── schema.sql        # 每張表的人類可讀文件
│   ├── sequence.js       # 建表順序（由 generator 自動維護）
│   ├── seed/             # 開發用種子資料
│   └── backups/          # 資料庫備份
├── migrations/           # 按順序排列的 schema 變更
│
├── languages/            # 全域 i18n 來源字串
├── locales/              # 編譯後的 i18n 輸出（不要手動編輯）
├── mailers/              # 全域 email 範本
│
├── config/               # 各環境 .env 檔案及配置黏合層
├── docs/                 # 所有深度文件
├── test/                 # 全域測試入口：fixtures、helper/service 測試
└── .claude/skills/       # 每個常見任務的 AI 操作手冊
```

::: tip 從這裡開始
[快速開始](/zh-TW/guide/getting-started) 指南帶你完成在本機執行 server 所需的一切，包括 Postgres、Redis 和環境變數。先完成那些步驟，再回到這份指南。
:::

---

## 後續步驟

- [專案結構](/zh-TW/guide/project-structure) — 每個資料夾的深入說明
- [你的第一個功能](/zh-TW/tutorials/first-feature) — scaffold、實作並測試一個端對端功能
- [Actions](/zh-TW/core/actions) — 如何正確撰寫 API actions
- [背景任務](/zh-TW/background-jobs/overview) — Bull queues、workers 和任務模式
- [Authentication](/zh-TW/auth/overview) — 雙 token 模型及 auth middleware 的運作方式
- [測試](/zh-TW/testing/overview) — 整合測試、fixtures 及應該驗證什麼
