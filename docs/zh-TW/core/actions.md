# Actions

## 什麼是 action？

Action 是一個單一的 JavaScript 檔案，包含一個 HTTP endpoint（或一組緊密相關的角色專屬 endpoints）的業務邏輯。一個檔案對應一個 endpoint — 或一個拆分為各角色變體的 endpoint。

請求生命週期為：

```
HTTP Request → routes.js → controller.js → action file → return plain object → controller sends response
```

Actions 是所有實際工作發生的層：驗證參數、查詢資料庫、強制業務規則、發送 socket 事件、將背景工作加入 queue，並回傳結果。Routes 和 controllers 是薄而機械性的。Actions 是你撰寫程式碼的地方。

---

## 命名慣例

每個 action 和 task 名稱都遵循嚴格的公式：

```
V{version}{ActionName}[By{Role}][On{Device}]
```

| 區段 | 必要 | 說明 |
|---|---|---|
| `V{version}` | 永遠 | API 版本號。永遠排在最前面。 |
| `{ActionName}` | 永遠 | PascalCase 描述 action 做什麼。 |
| `By{Role}` | 行為依角色而異時 | 呼叫此方法的 user 類型：`ByAdmin`、`ByUser`、`ByPartner`。 |
| `On{Device}` | 行為依裝置而異時 | 客戶端平台：`OniOS`、`OnAndroid`、`OnMobile`、`OnWeb`。 |

### 版本控制

版本前綴讓你可以發布重寫版本的 action，而不會破壞仍在呼叫舊版的客戶端。`V1Login` 和 `V2Login` 可以同時並存於同一個 routes 檔案中。

```javascript
// 兩者可以同時存在於 routes.js 中
router.all('/v1/users/login', controller.V1Login);
router.all('/v2/users/login', controller.V2Login);
```

絕對不要省略版本前綴。加上它的成本是零。事後補加的代價很高。

### 角色後綴

當一個 action 對不同的 user 類型有不同的行為時，請為每個角色建立獨立的方法，而不是在一個方法中使用分支。兩個獨立的方法可以獨立編輯、獨立測試，且獨立理解。

```
V1Create              → 無角色區分，所有角色做相同的事
V1CreateByAdmin       → admin 專屬行為
V1CreateByUser        → user 專屬行為
V1CreateByAdminManager → user 類型內的特定角色
```

### 裝置後綴

```
OniOS      → 僅限 iOS app
OnAndroid  → 僅限 Android app
OnMobile   → iOS 和 Android 行為相同，但與 web 不同
OnWeb      → 僅限 web 瀏覽器
（無）      → 所有平台行為相同
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

### Actions 與 tasks

Tasks 是背景工作。命名慣例相同，但 tasks 永遠在後面加上 `Task`：

```
V1Create           → action  （即時，回傳回應）
V1CreateTask       → task    （背景工作，在 worker 中執行）

V1ExportByAdmin    → action  （觸發匯出，立即回傳）
V1ExportTaskByAdmin → task   （在背景執行實際的匯出工作）
```

### 完整命名參考

```javascript
// Actions — 即時，回傳回應
V1Login                          // 所有角色，無裝置區分
V1CreateByAdmin                  // 僅限 admin，無裝置區分
V1CreateByUser                   // 僅限 user，無裝置區分
V1UpdateByAdminOniOS             // 僅限 admin，僅限 iOS
V1UpdateByAdminOnAndroid         // 僅限 admin，僅限 Android
V1UpdateByAdminOnMobile          // 僅限 admin，iOS 和 Android 行為相同
V1UpdateByAdminOnWeb             // 僅限 admin，僅限 web
V1UpdateByAdminManagerOnMobile   // 具有 Manager 角色的 admin，僅限 mobile

// Tasks — 背景工作，永遠加上 Task
V1CreateTask                     // V1Create 的背景版本
V1ExportTaskByAdmin              // 由 admin 觸發的背景匯出
V1SyncTaskByUserOnMobile         // 由 mobile 上的 user 觸發的背景同步
```

---

## 產生 action 檔案

絕對不要手動建立 action 檔案。使用腳手架產生器：

```bash
# 在現有 feature 中建立新的 action
yarn gen Order -a V1Create

# 這會建立：
#   app/Order/actions/V1Create.js          — 完整的 action 範本
#   app/Order/tests/integration/V1Create.test.js — 完整的測試範本
#   自動更新 app/Order/actions/index.js（按字母排序）
```

產生 action 後，你仍需手動：
1. 將 route 加入 `app/Order/routes.js`
2. 將 controller 方法加入 `app/Order/controller.js`

刪除 action：
```bash
yarn del Order -a V1Create
# 移除 action 檔案、其測試，以及 actions/index.js 中的條目
```

刪除後，也需手動從 `routes.js` 移除 route，並從 `controller.js` 移除 controller 方法。

---

## Action 檔案的結構

每個 action 檔案都遵循這個確切的結構，由上至下。不要偏離它。

```javascript
/**
 * ORDER V1Create ACTION
 */

'use strict';

// built-in node modules (if any)
// const fs = require('fs');

// third-party node modules
const joi = require('joi'); // argument validations

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = socket;
const queue = require('../../../services/queue');

// helpers
const { isValidTimezone } = require('../../../helpers/validate');
const { SOME_CONSTANT } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// queues (queue.get() calls, right after models)
// const OrderQueue = queue.get('OrderQueue');

// module.exports MUST come before the function definitions
module.exports = {
  V1Create
};

/**
 * Create and return a new order
 *
 * GET  /v1/orders/create
 * POST /v1/orders/create
 *
 * Use req.__('') for i18n translations
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @item    - (STRING - REQUIRED): The item name
 *   @amount  - (NUMBER - REQUIRED): The order amount in cents
 *   @notes   - (STRING - OPTIONAL): Optional order notes
 * }
 *
 * Success: Return a new order
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ITEM_NOT_FOUND
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Create(req, res) {
  // 1. Define and validate the argument schema
  const schema = joi.object({
    item: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(1).required(),
    notes: joi.string().trim().optional()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value; // type conversion applied: '5' → 5, 'true' → true

  // 2. Early business-rule checks (before opening a transaction)
  const item = await models.item.findOne({ where: { name: req.args.item } });
  if (!item)
    return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ITEM_NOT_FOUND);

  // 3. Open a transaction for any writes
  const t = await models.db.transaction();

  try {
    // create the record
    const newOrder = await models.order.create({
      userId: req.user.id,
      itemId: item.id,
      amount: req.args.amount,
      notes: req.args.notes || null
    }, { transaction: t });

    // fetch back without sensitive fields
    const findOrder = await models.order.findByPk(newOrder.id, {
      transaction: t
    });

    // emit a real-time socket event (optional — only if the feature uses sockets)
    const io = await socket.get();
    io.to(`${SOCKET_ROOMS.USER}${req.user.id}`).emit(SOCKET_EVENTS.ORDER_CREATED, { order: findOrder });

    // commit
    await t.commit();

    // 201 because we created a new resource
    return {
      status: 201,
      success: true,
      order: findOrder
    };
  } catch (error) {
    await t.rollback();
    throw error; // let middleware/error.js handle it — never return res.status(500) manually
  }
} // END V1Create
```

### 關鍵規則

- **`module.exports` 在函式定義之前。** 隨著檔案增長，頂部的匯出區塊就是目錄。任何閱讀檔案的人都能一眼看出哪些方法是公開的。絕對不要內聯匯出（`module.exports = { V1Create: async function() {} }`）或在定義的同一行匯出。
- **每個函式以 `// END FunctionName` 結尾。** 必要的慣例；讓掃描大型檔案變得容易。
- **參數僅來自 `req.args`。** 絕對不要直接讀取 `req.body` 或 `req.query`。Middleware 已經為你將它們合併到 `req.args` 中。
- **絕對不要直接呼叫 `res` 來送出最終回應。** 回傳一個純物件。Controller 呼叫 `res.status(result.status).json(result)`。
- **絕對不要 `return res.status(500)`** 處理未處理的錯誤。只需在 catch 區塊中 `throw error`，讓 `middleware/error.js` 處理它。
- **在回傳錯誤回應之前，永遠回滾 transaction。** 在 transaction 開啟後發生的每個 `return errorResponse(...)` 之前，都要呼叫 `await t.rollback()`。

---

## JSDoc 標頭

每個 action 函式的正上方都有一個 JSDoc 注釋標頭。這不是可選的 — 它是 endpoint 的合約和測試清單。

```javascript
/**
 * <此 action 做什麼的簡短描述>
 *
 * GET  /v1/feature/actionname
 * POST /v1/feature/actionname
 *
 * Use req.__('') or res.__('') for i18n language translations
 *
 * Must be logged in          ← 或 "Must be logged out" 或 "Can be logged in or logged out"
 * Roles: ['admin', 'user']   ← 公開 endpoints 使用空陣列 []
 *
 * req.params = {}
 * req.args = {
 *   @fieldName - (TYPE - REQUIRED|OPTIONAL) [DEFAULT - value]: Description
 * }
 *
 * Success: 成功回應的說明
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: FEATURE_BAD_REQUEST_SPECIFIC_ERROR
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
```

**Errors 區段中列出的每個 `ERROR_CODE` 都必須有對應的測試。** JSDoc 是你的測試清單。在每個列出的錯誤都有一個觸發它並斷言確切錯誤回應的測試之前，action 尚未完成。

---

## 使用 Joi 驗證

所有參數驗證都使用 Joi 函式庫。模式永遠是：

```javascript
const schema = joi.object({
  // 必填字串
  name: joi.string().trim().min(1).required(),

  // 有預設值的可選字串
  status: joi.string().valid('active', 'inactive').default('active').optional(),

  // 必填數字
  amount: joi.number().integer().min(0).required(),

  // 可選布林值
  active: joi.boolean().optional(),

  // 可選電子郵件
  email: joi.string().trim().lowercase().email().optional(),

  // 欄位的自訂錯誤訊息（適用於密碼複雜度）
  password: joi.string().min(8).regex(PASSWORD_REGEX).required()
    .error(new Error(req.__('ADMIN[invalid_password_format]'))),

  // UUID
  orderId: joi.string().guid({ version: 'uuidv7' }).required()
});

const { error, value } = schema.validate(req.args);
if (error)
  return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

// 永遠重新賦值 — Joi 執行型別轉換（'5' → 5，'true' → true）
// 並套用預設值。轉換後的值在 `value` 中，而不在 `req.args` 中。
req.args = value;
```

在 `req.args = value` 之後，在下方所有地方都使用 `req.args.fieldName`。絕對不要在這行之前讀取 `req.args`。

Joi 是唯一的驗證層。不要為 Joi 已驗證的事項添加手動型別檢查。

---

## Controller — 薄路由層

Controller 唯一的工作是檢查請求，根據角色和裝置決定呼叫哪個 action，呼叫它，並回傳結果。沒有業務邏輯在這裡。

### Actions 聚合器

每個 controller 透過 feature 的 `actions/index.js` import 所有 actions：

```javascript
const actions = require('./actions');
```

`actions/index.js` 由 `yarn gen` 和 `yarn del` 自動管理。絕對不要手動編輯它。

### Controller 方法命名

Controller 方法只使用版本和 action 名稱 — 不含角色或裝置後綴。那些屬於 action 方法：

```
Controller 方法：   V1Update
Action 方法：       V1UpdateByAdmin, V1UpdateByUser, V1UpdateByAdminOnMobile
```

### 方法主體

```javascript
/**
 * Update and return updated user
 *
 * /v1/users/update
 *
 * Must be logged in
 * Roles: ['admin', 'user']
 */
async function V1Update(req, res, next) {
  let method = null;

  // 根據角色決定呼叫哪個 action
  if (req.admin)
    method = 'V1UpdateByAdmin';
  else if (req.user)
    method = 'V1UpdateByUser';
  else
    return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));

  // 呼叫 action 並回傳結果
  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error); // 將未處理的錯誤傳遞給 middleware/error.js
  }
} // END V1Update
```

對於沒有認證檢查的公開 endpoints：

```javascript
async function V1Login(req, res, next) {
  let method = 'V1Login'; // 公開 — 不需要角色檢查

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error);
  }
} // END V1Login
```

三件要記住的事：

1. **認證拒絕發生在 controller 中，在 action 被呼叫之前。** 如果 user 類型沒有存取權限，立即回傳 `401`。
2. **Action 回傳一個純物件。** Controller 呼叫 `res.status(result.status).json(result)`。Action 在成功回應路徑上永遠不直接碰 `res`。
3. **`next(error)` 是未處理的錯誤到達錯誤 middleware 的方式。** 絕對不要 `return res.status(500)` — 讓它傳播。

---

## 成功回應格式

每個 action 都回傳一個純物件。格式永遠是扁平的：

```javascript
return {
  status: 200,       // HTTP 狀態碼 — 永遠必填
  success: true,     // 成功時永遠為 true — 永遠必填
  order: { ... },    // payload — 以你回傳的東西命名
  token: 'abc123'    // 如有需要，在同一層級加入額外欄位
};
```

**使用哪個狀態碼：**

| 代碼 | 時機 |
|---|---|
| `200` | 預設 — 讀取、更新、登入、任何不符合以下情況的操作。 |
| `201` | Action **建立了一個新資源**（插入新的資料庫記錄）。 |
| `202` | Action 將工作移交給**背景工作**，並只回傳確認。 |

```javascript
// 201 — 建立了新記錄
return { status: 201, success: true, order: newOrder };

// 202 — 已接受，背景任務將執行實際工作
return { status: 202, success: true, jobId: job.id };

// 200 — 其他所有情況
return { status: 200, success: true, user: foundUser };
```

**為什麼是扁平的，而不是嵌套在 `data` 下？**

每個 action 回傳語義上不同的鍵（`admin`、`user`、`token`、`order`）。客戶端已經需要知道每個 endpoint 期望哪個鍵。將其包裝在 `data` 信封中，在所有地方都多了一層解構，卻沒有解決那個不一致性。扁平更簡單。

---

## 常見模式

### 建立（201）

```javascript
async function V1Create(req, res) {
  const schema = joi.object({
    name: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(0).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  const t = await models.db.transaction();

  try {
    const newRecord = await models.order.create({
      userId: req.user.id,
      name: req.args.name,
      amount: req.args.amount
    }, { transaction: t });

    const findRecord = await models.order.findByPk(newRecord.id, { transaction: t });

    await t.commit();

    return {
      status: 201,
      success: true,
      order: findRecord
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
} // END V1Create
```

### 讀取（200）

```javascript
async function V1Read(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv7' }).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const order = await models.order.findOne({
      where: {
        id: req.args.orderId,
        userId: req.user.id // 永遠限定在已認證的 user
      }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      order
    };
  } catch (error) {
    throw error;
  }
} // END V1Read
```

### 更新（200）

```javascript
async function V1Update(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv7' }).required(),
    notes: joi.string().trim().optional(),
    status: joi.string().valid('pending', 'complete').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // 先找到記錄以驗證所有權
    const order = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // 只套用實際傳送的欄位
    await models.order.update({
      ...(req.args.notes !== undefined && { notes: req.args.notes }),
      ...(req.args.status !== undefined && { status: req.args.status })
    }, {
      where: { id: order.id }
    });

    // 取得更新後的記錄以回傳
    const updatedOrder = await models.order.findByPk(order.id);

    return {
      status: 200,
      success: true,
      order: updatedOrder
    };
  } catch (error) {
    throw error;
  }
} // END V1Update
```

### 軟刪除（200）

```javascript
async function V1Delete(req, res) {
  const schema = joi.object({
    orderId: joi.string().guid({ version: 'uuidv7' }).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const order = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!order)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // paranoid: true 的 models 使用 destroy() 進行軟刪除 — 設定 deletedAt 而不是發出 DELETE
    await order.destroy();

    return {
      status: 200,
      success: true
    };
  } catch (error) {
    throw error;
  }
} // END V1Delete
```

### 查詢 / 列表（200）

對於列表和搜尋 endpoints，請參閱 `add-query-action` skill — 它透過 `cruqd.js` 涵蓋分頁、過濾和排序。

---

## 基於角色的 actions：每角色方法

當一個 action 對不同的 user 類型有不同的行為時，請為每個角色建立獨立的方法。不要在單一方法中使用 if/else 分支。

```javascript
module.exports = {
  V1CreateByUser,
  V1CreateByAdmin
};

// PUBLIC: user 進入點
async function V1CreateByUser(req, res) {
  // user 專屬的驗證或預設值
  req.args.userId = req.user.id;
  req.args.status = 'pending'; // users 永遠以 pending 開始
  return V1Create(req, { isAdmin: false });
} // END V1CreateByUser

// PUBLIC: admin 進入點
async function V1CreateByAdmin(req, res) {
  // admin 可以直接設定 status 並針對任何 user
  return V1Create(req, { isAdmin: true });
} // END V1CreateByAdmin

// PRIVATE: 共用的主要邏輯 — 不在 module.exports 中，不被 controller 呼叫
async function V1Create(req, { isAdmin }) {
  const schema = joi.object({
    userId: joi.string().guid({ version: 'uuidv7' }).required(),
    item: joi.string().trim().min(1).required(),
    amount: joi.number().integer().min(0).required(),
    status: isAdmin
      ? joi.string().valid('pending', 'active', 'cancelled').default('pending').optional()
      : joi.string().valid('pending').default('pending').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  const t = await models.db.transaction();

  try {
    const newOrder = await models.order.create({
      userId: req.args.userId,
      item: req.args.item,
      amount: req.args.amount,
      status: req.args.status
    }, { transaction: t });

    const findOrder = await models.order.findByPk(newOrder.id, { transaction: t });

    await t.commit();

    return {
      status: 201,
      success: true,
      order: findOrder
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
} // END V1Create (private)
```

**何時使用私有共用函式 vs `helper.js`：**

- **Action 檔案中的私有函式** — 當共用的部分是 action 主體的*大部分*時。這使邏輯留在你會去找它的地方。
- **`helper.js`** — 給小型、純粹、可重複使用的片段：計算、格式化器、驗證工具。不進行 HTTP 呼叫或資料庫寫入，值得獨立單元測試的東西。

---

## 呼叫其他 actions

Actions 只是匯出的函式，所以一個 action 可以 `require` 並呼叫另一個 action 來重複使用邏輯，而不是複製它：

```javascript
// app/Order/actions/V1Fulfill.js
const { V1Create } = require('./V1Create');

async function V1Fulfill(req, res) {
  // ... 驗證並準備 req.args ...

  // 委派給 create action
  return V1Create(req, res);
} // END V1Fulfill
```

**注意：** 如果被呼叫的 action 深入使用 `req`/`res`（讀取 `req.user`、呼叫 `res.cookie` 等），請將共用業務邏輯提取到兩者都呼叫的 helper 中，而不是偽造假的 `req`。期望真實請求物件的 actions 應該與真實請求耦合。

---

## 將背景任務加入 queue（202 回應）

當一個 action 的實際工作既昂貴又耗時，action 會驗證請求，將工作加入 queue，並立即以 `202` 回傳。Task 檔案執行實際工作。

```javascript
// app/Order/actions/V1Export.js
'use strict';

const joi = require('joi');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const queue = require('../../../services/queue');

module.exports = {
  V1Export
};

/**
 * Enqueue a background export job
 *
 * POST /v1/orders/export
 *
 * Must be logged in
 * Roles: ['admin']
 *
 * req.args = {
 *   @status - (STRING - OPTIONAL): Filter by order status
 * }
 *
 * Success: Return a jobId
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Export(req, res) {
  const schema = joi.object({
    status: joi.string().valid('pending', 'active', 'complete').optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    const OrderQueue = queue.get('OrderQueue');

    // 加入工作 — task 名稱與 task 檔案對應：V1ExportTask
    const job = await OrderQueue.add('V1ExportTask', {
      adminId: req.admin.id,
      status: req.args.status || null
    });

    // 202：已接受，等待背景處理
    return {
      status: 202,
      success: true,
      jobId: job.id
    };
  } catch (error) {
    throw error;
  }
} // END V1Export
```

對應的 task（`V1ExportTask`）執行實際工作，並在完成時通知 user — 通常透過電子郵件或 socket 推送。

---

## Routes

Routes 將 URL 連接到 controller 方法。每個 route 使用 `router.all()` 並遵循此模式：

```javascript
router.all('/v1/orders/create', controller.V1Create);
```

URL 慣例：小寫，無分隔符，無破折號，無底線。URL 是 action 名稱的小寫版本，去掉版本前綴：

```
V1Create        → /v1/orders/create
V1UpdateByAdmin → /v1/orders/update      ← 角色後綴保留在 action 上，不在 URL 中
V1LogoutAll     → /v1/users/logoutall    ← 多個單字連在一起
```

路徑鏡射小寫的 action 名稱。不需要爭論連字號 vs 底線 — 慣例永遠是連在一起。

所有 feature routes 都在專案根目錄的全域 `routes.js` 中註冊。在 feature 的 `routes.js` 中加入 route 後，也要在全域檔案中加入 feature 的註冊。

---

## 測試 actions

每個 action 都必須在 `app/Feature/tests/integration/V1ActionName.test.js` 有對應的整合測試。

測試必須涵蓋：

- **JSDoc 中列出的每個 `ERROR_CODE`。** Errors 區段是你的測試清單。如果有列出，就要有測試。
- **每個沒有存取權限的角色。** 如果一個 action 需要認證，永遠有一個 `Role: Logged Out` 測試斷言 `401`。如果 `User` 不能呼叫 Admin action，那也要測試。
- **寫入後的資料庫狀態。** 在建立或更新後，直接查詢資料庫以確認變更確實落地。絕對不要只信任回應。
- **如果工作已加入 queue，測試 queue 狀態。** 斷言正確的工作已用正確的資料加入。

完整的測試模式、夾具設定、認證 helpers 和第三方 API mocking 請參閱 [測試模式](/zh-TW/testing/patterns) 和 [測試架構](/zh-TW/testing/overview) 頁面。
