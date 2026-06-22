# Feature 資料夾

## 什麼是 feature？

一張資料表。一個 feature。`app/` 下的一個資料夾。

系統中的每個資源 — 使用者、訂單、發票、通知 — 都有自己獨立的資料夾。該資料夾擁有與該資源相關的所有檔案：資料庫 model、routes、controller、actions、背景任務、電子郵件、翻譯與測試。沒有東西外洩；預設沒有任何共用。

規則非常嚴格：**你不應該在沒有對應資料庫資料表的情況下建立 feature 資料夾。** 沒有 model 的 feature 資料夾是不良實踐，違背了這個結構的初衷。

---

## Feature 資料夾的結構

一個完整的 feature 看起來像這樣：

```
app/Order/
├── model.js              # Sequelize model — 資料表結構、關聯、靜態方法
├── controller.js         # 薄路由層 — 依角色/裝置決定呼叫哪個 action
├── routes.js             # Express routes — 將 URL 對應至 controller 方法
├── worker.js             # Bull worker — 註冊任務處理器，處理錯誤/卡住事件
├── helper.js             # Feature 專屬的純輔助函式（計算、格式化）
├── error.js              # Feature 專屬的錯誤代碼（4xx）
├── actions/
│   ├── index.js          # 自動管理的聚合器 — 請勿手動編輯
│   ├── V1Create.js
│   ├── V1Query.js
│   └── V1UpdateByAdmin.js
├── tasks/
│   ├── index.js          # 自動管理的聚合器 — 請勿手動編輯
│   └── V1ProcessTask.js
├── mailers/
│   └── OrderConfirmation/
│       ├── index.ejs
│       └── preview.html
├── languages/
│   └── en.js             # 此 feature 的 i18n 字串
└── tests/
    ├── integration/
    │   ├── V1Create.test.js
    │   ├── V1Query.test.js
    │   └── V1UpdateByAdmin.test.js
    ├── tasks/
    │   └── V1ProcessTask.test.js
    └── helper.test.js
```

### 每個檔案的職責

| 檔案 | 職責 |
|---|---|
| `model.js` | 定義 Sequelize model：欄位、索引、關聯、軟刪除行為、敏感/私有欄位清單、靜態方法。 |
| `controller.js` | 接收請求，根據 `req.admin` / `req.user` / 裝置決定呼叫哪個 action，並回傳結果。不含業務邏輯。 |
| `routes.js` | 將 URL 路徑對應至 controller 方法。所有 routes 在啟動時會聚合進全域 `routes.js`。 |
| `worker.js` | 將 feature 的 Bull queue 連接至其任務處理器。處理錯誤與卡住事件。 |
| `helper.js` | 此 feature 專用的小型純工具函式 — 計算、格式化、值得獨立單元測試的東西。 |
| `error.js` | Feature 範疇的錯誤代碼定義（4xx 回應）。啟動時全域聚合。 |
| `actions/index.js` | 重新匯出資料夾內的所有 action。由 `yarn gen` / `yarn del` 自動管理。請勿手動編輯。 |
| `actions/V1*.js` | 個別 action 檔案 — 每個 HTTP endpoint / 角色變體各一個。 |
| `tasks/index.js` | 重新匯出資料夾內的所有 task。由 `yarn gen` / `yarn del` 自動管理。請勿手動編輯。 |
| `tasks/V1*Task.js` | 個別背景任務檔案 — 每種工作類型各一個。 |
| `mailers/*/index.ejs` | EJS 電子郵件範本。每種郵件類型一個子資料夾。 |
| `languages/en.js` | 此 feature 的 i18n 鍵值。由 `yarn lang` 編譯。 |
| `tests/integration/` | 整合測試 — 每個 action 一個檔案，與 actions 資料夾結構對應。 |
| `tests/tasks/` | Task 測試 — 每個 task 一個檔案。 |
| `tests/helper.test.js` | `helper.js` 的單元測試。 |

---

## 為什麼要用 feature 資料夾？

### 不再需要在多個類型目錄之間來回切換

在以類型為基礎的佈局（`models/`、`controllers/`、`routes/` 等）中，修改一個 feature 就需要開啟五個不同的目錄。修改 Order 邏輯需要編輯 `models/order.js`、`controllers/order.js`、`routes/orders.js`、`services/order.js` 等等 — 不斷在專案中跳來跳去。

在 feature 資料夾中，Order 的所有東西都在 `app/Order/`。開啟一個目錄，完成所有工作，關閉它。

### 平行開發不產生合併衝突

兩位工程師開發兩個不同的 feature，永遠不會碰到同一個檔案。沒有大家都要修改的共用 `models/index.js` 或 `controllers/index.js` — 聚合在啟動時自動完成。任何規模的團隊都可以平行開發 feature，而不需要協調檔案所有權。

### 刪除一個 feature 只需刪除一個資料夾

從以類型為基礎的佈局中移除一個 feature，需要在整個程式碼庫中搜尋。在這個結構中：`yarn del Order` — 完成。

### 可擴展至數百個 feature

無論有多少個 feature，資料夾結構都保持扁平且易於搜尋。有 5 個 feature 的 `app/` 看起來和有 500 個 feature 的 `app/` 完全一樣。不會有「當時只有 10 個 model 時還說得通」的技術債需要日後清理。

---

## Feature 內的兩種工作流程

所有後端工作都屬於以下兩種流程之一：

**1. HTTP action（即時）**

客戶端發出請求 → middleware 執行 → `routes.js` 匹配 URL → `controller.js` 選擇 action → action 讀取/寫入資料庫 → 回傳 `{ status, success, ...data }` → controller 送出回應。客戶端等待結果。

適用於快速完成的任何操作：建立記錄、取得列表、更新欄位。

**2. 背景任務（非同步）**

客戶端發出請求 → action 驗證參數、將工作加入 queue，並立即以 `202` 和 `jobId` 回應。`worker.js` 取得工作 → 呼叫對應的 task → task 執行繁重的工作。客戶端稍後收到通知（電子郵件、socket 推送、輪詢）。

適用於任何緩慢的操作：匯出百萬筆資料、執行複雜計算、發送大量通知。絕對不要讓客戶端等待超過一秒鐘的事情。

兩種流程都從 feature 資料夾觸發。action 是兩者的進入點。

---

## 產生器

建立一個 feature 需要很多檔案。為了避免手動撰寫樣板程式碼，框架在 `app/feature.js` 提供了腳手架產生器，可透過 `yarn gen` 和 `yarn del` 存取。

**永遠使用產生器。絕對不要手動建立 feature 資料夾或 action/task 檔案。**

每個產生的檔案都預先填入了正確的結構、imports、命名慣例與注釋，讓你可以立即開始撰寫邏輯，而不需要記住如何連接 worker 或 action 範本長什麼樣子。

---

### 產生完整的新 feature 資料夾

```bash
yarn gen Order
```

用一個指令建立整個 `app/Order/` 資料夾：

- `controller.js` — 已連接 `V1Example` 方法
- `model.js` — 包含每種 Sequelize 資料型別的範例欄位定義
- `routes.js` — 包含範例 route
- `worker.js` — 包含 queue 設定和錯誤/卡住處理器
- `helper.js` — 空的，準備好放入 feature 專屬的輔助函式
- `error.js` — 包含已注釋掉的範例錯誤代碼
- `actions/index.js` — 自動管理的聚合器
- `actions/V1Example.js` — 完整的 action 範本，包含 Joi 驗證、錯誤處理、socket 與 queue 範例
- `tasks/index.js` — 自動管理的聚合器
- `tasks/V1ExampleTask.js` — 完整的 task 範本
- `mailers/OrderExampleMail/index.ejs` — 電子郵件範本
- `languages/en.js`（以及所有其他已設定的語系）
- `tests/integration/V1Example.test.js` — 完整的整合測試範本
- `tests/tasks/V1ExampleTask.test.js` — 完整的 task 測試範本
- `tests/helper.test.js` — 空的 helper 測試檔案

它還會自動將新的 model 名稱加入 `database/sequence.js`，使測試夾具和種子資料以正確的順序載入。

**產生完整 feature 後，立即使用 `yarn del` 移除佔位腳手架檔案 — 絕對不要用 `rm`。**

`yarn del` 會自動從 `actions/index.js` 和 `tasks/index.js` 移除對應條目。`rm` 不會 — 它會留下指向已刪除檔案的損壞匯出：

```bash
yarn del Order -a V1Example       # 移除佔位 action 及其測試
yarn del Order -t V1ExampleTask   # 移除佔位 task 及其測試
# 也透過適當的旗標移除 tests/helper.test.js
```

**產生後，你仍需手動：**
1. 將 feature 的 routes 加入全域 `routes.js`
2. 為新資料表建立 migration 檔案（`yarn model`）
3. 將夾具資料加入 `test/fixtures/fix1/`
4. 如有需要，將種子資料加入 `database/seed/set1/`

---

### 在現有 feature 中產生新的 action

```bash
yarn gen Order -a V1Create
```

建立：
- `app/Order/actions/V1Create.js` — 完整的 action 範本
- `app/Order/tests/integration/V1Create.test.js` — 完整的整合測試範本
- 自動更新 `app/Order/actions/index.js`（按字母排序）

**產生 action 後，你仍需手動：**
1. 將 route 加入 `app/Order/routes.js`
2. 將 controller 方法加入 `app/Order/controller.js`

---

### 在現有 feature 中產生新的背景任務

```bash
yarn gen Order -t V1ProcessOrder
```

建立：
- `app/Order/tasks/V1ProcessOrder.js` — 完整的 task 範本
- `app/Order/tests/tasks/V1ProcessOrder.test.js` — 完整的 task 測試範本
- 自動更新 `app/Order/tasks/index.js`（按字母排序）

**產生 task 後，你仍需手動：**
1. 在 `app/Order/worker.js` 中註冊 task 處理器

---

### 在現有 feature 中產生新的 mailer

```bash
yarn gen Order -m OrderConfirmation
```

建立 `app/Order/mailers/OrderOrderConfirmation/index.ejs`。如果 mailer 名稱中尚未包含 feature 名稱，會自動在前面加上。

---

### 刪除 feature、action、task 或 mailer

```bash
yarn del Order                      # 刪除整個 feature 資料夾 + 從 sequence.js 中移除
yarn del Order -a V1Create          # 刪除 action + 測試 + 從 actions/index.js 中移除
yarn del Order -t V1ProcessOrder    # 刪除 task + 測試 + 從 tasks/index.js 中移除
yarn del Order -m OrderConfirmation # 刪除 mailer 資料夾
```

`yarn del` 是 `yarn gen` 的反向操作。對於 actions 和 tasks，它也會自動清理測試檔案並從對應的 `index.js` 中移除條目。

**刪除 action 後，你仍需手動：**
1. 從 `routes.js` 中移除 route
2. 從 `controller.js` 中移除 controller 方法

**刪除 task 後，你仍需手動：**
1. 從 `worker.js` 中移除處理器註冊

---

## 命名規則

### Feature 名稱：單數 PascalCase

```
Order     ✅
order     ❌   （小寫）
Orders    ❌   （複數）
orders    ❌   （小寫複數）
```

資料夾名稱是單數，即使它所擁有的資料庫資料表是複數（`Orders`）。整個框架都使用單數 PascalCase — model 類別、資料夾名稱、產生器參數 — 產生器會自動處理資料表名稱的複數化。

### 每個 feature 對應一張資料表

feature 資料夾與資料庫資料表之間有嚴格的一對一關係。如果你需要使用另一個 feature 資料表的資料，請透過 ID 參照它 — 你不會直接 import 另一個 feature 的 model。透過 model import 進行跨 feature 耦合會產生隱藏依賴，使重構變得困難。

### Feature 彼此獨立

Feature 資料夾不會互相 import。如果 `Order` 需要知道 `User` 的某些資訊，它會接收 `userId`（透過請求或資料庫），並透過全域 `models` 物件查詢 `models.user`。不存在跨越 feature 邊界的 `require('../User/helper')` import。

---

## Action 與 task 命名

每個 action 和 task 名稱都遵循嚴格的公式：

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| 區段 | 必要 | 說明 |
|---|---|---|
| `V{version}` | 永遠 | API 版本號。永遠排在最前面。 |
| `{ActionName}` | 永遠 | PascalCase 描述 action 做什麼。 |
| `By{Role}` | 行為依角色而異時 | `ByAdmin`、`ByUser`、`ByPartner` 等。 |
| `On{Device}` | 行為依裝置而異時 | `OniOS`、`OnAndroid`、`OnMobile`、`OnWeb`。 |

Tasks 使用相同的公式，但永遠在 action 名稱後面加上 `Task`：

```
V1Create              → action  （即時 API 請求）
V1CreateTask          → task    （背景工作）

V1ExportByAdmin       → action  （接收請求，將工作加入 queue）
V1ExportTaskByAdmin   → task    （執行實際的匯出工作）
```

### 版本控制

版本前綴讓你可以發布重寫版本的 action，而不會破壞仍在使用舊版的客戶端。`V1Login` 和 `V2Login` 可以同時並存於同一個 routes 檔案中：

```javascript
router.all('/v1/users/login', controller.V1Login);
router.all('/v2/users/login', controller.V2Login);
```

絕對不要省略版本前綴。成本是零；事後補加的代價很高。

### 角色後綴

當一個 action 依角色而有不同行為時，請為每個角色建立獨立的方法，而不是在一個方法中使用分支。controller 會路由到正確的方法：

```javascript
async function V1Update(req, res, next) {
  let method = null;

  if (req.admin)       method = 'V1UpdateByAdmin';
  else if (req.user)   method = 'V1UpdateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Update
```

兩個獨立的 action 檔案可以獨立編輯、獨立測試。隨著程式碼庫的成長，admin 行為和 user 行為會發散。共用一個方法會以產生細微 bug 的方式將它們耦合在一起。

**當兩個角色方法共用 90% 的邏輯時**，不要將共用主體推入 `helper.js`。相反地，在同一個 action 檔案中撰寫一個私有函式，讓兩個角色方法都呼叫它。這個函式不會被匯出，也不會被 controller 呼叫：

```javascript
// 只有兩個角色方法被匯出 — controller 呼叫這些
module.exports = {
  V1CreateByUser,
  V1CreateByAdmin
};

// PUBLIC: user 進入點
async function V1CreateByUser(req, res) {
  // 僅限 user 的驗證 / 預設值
  return V1Create(req, { isAdmin: false });
} // END V1CreateByUser

// PUBLIC: admin 進入點
async function V1CreateByAdmin(req, res) {
  // 僅限 admin 的驗證 / 額外欄位
  return V1Create(req, { isAdmin: true });
} // END V1CreateByAdmin

// PRIVATE: 共用邏輯 — 不匯出，不被 controller 呼叫
async function V1Create(req, { isAdmin }) {
  // 驗證、寫入 DB、加入任務 queue、發送 socket — action 的主要部分
  return { status: 201, success: true, order: newOrder };
} // END V1Create
```

`helper.js` 是給**小型**、純粹、可重複使用的片段用的 — 計算、格式化器 — 值得獨立單元測試的東西。當共用的部分是 action 的主體時，將它保留為 action 檔案中的私有函式，使邏輯留在你會去找它的地方。

### 裝置後綴

只有在行為確實不同時才依裝置分割。選項：

```
OniOS       → 僅限 iOS app
OnAndroid   → 僅限 Android app
OnMobile    → iOS 和 Android 行為相同，但與 web 不同
OnWeb       → 僅限 web 瀏覽器
（無）       → 所有平台行為相同
```

結合所有區段的完整範例：

```
V1UpdateByAdminOnMobile
│  │      │        │
│  │      │        └─ 裝置：iOS 和 Android 行為相同
│  │      └─────────── 角色：僅限 admin
│  └────────────────── action：更新記錄
└───────────────────── 版本：v1
```

### 完整命名參考

```
// Actions — 即時，回傳回應
V1Login                          所有角色，無裝置區分
V1CreateByAdmin                  僅限 admin，無裝置區分
V1CreateByUser                   僅限 user，無裝置區分
V1UpdateByAdminOniOS             僅限 admin，僅限 iOS
V1UpdateByAdminOnAndroid         僅限 admin，僅限 Android
V1UpdateByAdminOnMobile          僅限 admin，iOS 和 Android 行為相同
V1UpdateByAdminOnWeb             僅限 admin，僅限 web
V1UpdateByAdminManagerOnMobile   具有 Manager 角色的 admin，僅限 mobile

// Tasks — 背景工作，永遠加上 Task
V1CreateTask                     V1Create 的背景版本
V1ExportTaskByAdmin              由 admin 觸發的背景匯出
V1SyncTaskByUserOnMobile         由 mobile 上的 user 觸發的背景同步
```

---

## Routes

Routes 遵循嚴格的 URL 慣例：小寫，無分隔符，即使是多個單字的路徑。

```javascript
router.all('/v1/orders/create',      controller.V1Create);
router.all('/v1/orders/updatebyid',  controller.V1UpdateById);
router.all('/v1/orders/logoutall',   controller.V1LogoutAll);  // 連在一起，無破折號
```

URL 是 action 名稱的小寫版本，版本在路徑區段中。這使得每個 URL 都可以直接從 action 名稱預測，不需要做任何關於連字號與底線的決定。

所有 feature routes 在啟動時聚合進全域 `routes.js` — 產生新 feature 後，在那裡加入 feature 的 routes 檔案。

---

## Controller

Controller 是一個薄路由層。它唯一的工作：

1. 查看請求（`req.admin`、`req.user`、裝置 header）。
2. 決定呼叫哪個 action。
3. 呼叫它並回傳結果。
4. 將未處理的錯誤傳遞給 `next(error)`。

沒有業務邏輯存在於 controller 中。Controller 方法命名慣例僅包含版本 + action 名稱 — 不含角色或裝置後綴（那些屬於 action 方法）：

```
Controller 方法：   V1Update             ← 僅版本 + action
Action 方法：       V1UpdateByAdmin, V1UpdateByUser, V1UpdateByAdminOnMobile
```

每個 controller 方法都遵循這個確切的模式：

```javascript
/**
 * Create a new order
 *
 * /v1/orders/create
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Create(req, res, next) {
  let method = null;

  if (req.admin)
    method = 'V1CreateByAdmin';
  else if (req.user)
    method = 'V1CreateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Create
```

Action 回傳一個純物件 `{ status, success, ...data }`。Controller 呼叫 `res.status(result.status).json(result)`。Action 永遠不會直接碰 `res` 來送出最終回應。

---

## Model

Model 定義了 feature 資料表的 Sequelize schema。每個 `model.js` 都遵循相同的佈局，由上至下：

1. **敏感與私有資料陣列** — 在 model 之前定義，從預設 scope 中排除。
2. **`id` 欄位** — 永遠是 UUID v4，永遠在 ORM 層產生。
3. **外鍵佔位注釋** — FK 由關聯加入，而不是在欄位區塊中。
4. **一般欄位** — 所有 feature 專屬欄位。
5. **Model 選項** — `timestamps`、`paranoid`、`freezeTableName`、`tableName`、`defaultScope`、`hooks`、`indexes`。
6. **索引** — 永遠為 FK 建立索引；永遠使用 `{TableName}_{columnName}_{unique|idx}` 設定明確名稱。
7. **關聯** — `hasMany`、`belongsTo` 等，包含明確的 `onDelete`/`onUpdate`。
8. **靜態方法** — `getSensitiveData()`、`getPrivateData()` 以及任何 feature 專屬工具。

關鍵規則：

- 主鍵使用 UUID，而不是自動遞增整數。
- `paranoid: true` 啟用軟刪除 — `destroy()` 設定 `deletedAt` 而不是發出 DELETE。要查看軟刪除的記錄，使用 `scope(null)` 繞過。
- 永遠為外鍵欄位建立索引。Postgres FK 約束提供參照完整性，但不建立索引。在沒有索引的資料表上執行 `WHERE userId = x` 在大規模下是全表掃描。
- 永遠將頂層所有者 FK（`userId`）傳遞到每個後代資料表，而不只是直接父級。這使最常見的查詢 — "屬於此 user 的所有東西" — 成為一個扁平、有索引、無需 JOIN 的 `WHERE userId = x`。在資料庫層面用複合外鍵強制一致性，使冗餘欄位永遠不會偏離。

---

## `stringify` 工具

```bash
yarn str /absolute/path/to/file.js
```

這個工具供需要更新 `app/feature.js` 內部產生器範本的開發者使用。由於範本以 JavaScript 字串儲存，直接編輯非常痛苦。工作流程：編輯範本檔案 → 執行 `yarn str` → 將輸出複製到 `feature.js` 中對應的範本函式。除非你正在修改產生器的輸出，否則很少需要用到這個工具。
