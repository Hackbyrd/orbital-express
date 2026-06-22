# 錯誤與 i18n

Orbital-Express 如何處理客戶端錯誤、500 錯誤和國際化訊息的完整參考。在新增錯誤代碼或翻譯鍵之前請先閱讀此文件。

---

## 目錄

1. [錯誤代碼結構](#1-錯誤代碼結構)
2. [從 Actions 回傳錯誤](#2-從-actions-回傳錯誤)
3. [Tasks 和 Sockets 中的錯誤](#3-tasks-和-sockets-中的錯誤)
4. [錯誤 Middleware（middleware/error.js）](#4-錯誤-middlewaremiddlewareerrorjs)
5. [新增錯誤代碼](#5-新增錯誤代碼)
6. [i18n — 鍵值命名慣例](#6-i18n--鍵值命名慣例)
7. [Actions 中的 i18n](#7-actions-中的-i18n)
8. [Tasks 中的 i18n](#8-tasks-中的-i18n)
9. [yarn lang](#9-yarn-lang)
10. [測試錯誤](#10-測試錯誤)

---

## 1. 錯誤代碼結構

所有客戶端錯誤代碼存在於以下兩個地方之一：

| 檔案 | 目的 |
|---|---|
| `services/error.js` | 跨所有 features 共用的全域代碼（`BAD_REQUEST_INVALID_ARGUMENTS`、`UNAUTHORIZED` 等） |
| `app/<Feature>/error.js` | 限定於一個 feature 的 feature 專屬代碼（`ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS` 等） |

在啟動時，`services/error.js` 自動掃描 `app/` 下的每個 feature 資料夾，並將找到的每個 `error.js` 檔案合併到全域 `ERROR_CODES` 物件中。你永遠不需要直接 import feature error 檔案 — 只需在所有地方使用 `services/error.js` 的 `ERROR_CODES`。

### 錯誤代碼物件的格式

```javascript
ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
  error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',  // 機器可讀，前端用來分支
  status: 400,                                            // HTTP 狀態碼
  messages: ['ADMIN[invalid_login_credentials]']          // i18n 鍵值 — 索引 0 是預設值
}
```

- **`error`** — 點命名空間的機器可讀字串。前端（或 mobile 客戶端）根據此值切換以顯示正確的 UI 狀態。發布後永遠不要更改 — 它是你 API 合約的一部分。
- **`status`** — 此錯誤觸發時 endpoint 回傳的 HTTP 狀態碼。
- **`messages`** — i18n 翻譯鍵值的陣列。大多數錯誤代碼只有一個。第二個條目讓你可以為相同的語義錯誤回傳不同的措辭，而不需要定義新的代碼。

### 全域代碼（services/error.js）

```javascript
const ERROR_CODES = {
  BAD_REQUEST_INVALID_ARGUMENTS: {
    error: 'BAD_REQUEST_INVALID_ARGUMENTS',
    status: 400,
    messages: ['GLOBAL[invalid_arguments]']
  },
  UNAUTHORIZED: {
    error: 'UNAUTHORIZED',
    status: 401,
    messages: ['GLOBAL[unauthorized]']
  },
  FORBIDDEN: {
    error: 'FORBIDDEN',
    status: 403,
    messages: ['GLOBAL[forbidden]']
  },
  INTERNAL_SERVER_ERROR: {
    error: 'INTERNAL_SERVER_ERROR',
    status: 500,
    messages: ['GLOBAL[internal_server_error]']
  }
};
```

### Feature 代碼（app/Admin/error.js）

```javascript
'use strict';

const LOCAL_ERROR_CODES = {
  // V1Login
  ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
    error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
    status: 400,
    messages: ['ADMIN[invalid_login_credentials]']
  },

  ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_INACTIVE',
    status: 400,
    messages: ['ADMIN[admin_account_inactive]']
  },

  // V1Read
  ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST: {
    error: 'ADMIN.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
    status: 400,
    messages: ['ADMIN[admin_account_does_not_exist]']
  }
};

module.exports = LOCAL_ERROR_CODES;
```

**命名規則：** 每個 feature 錯誤代碼都以 `SCREAMING_SNAKE_CASE` 的 feature 名稱為前綴（`ADMIN_`、`USER_`、`ORDER_`）。`.error` 字串使用點命名空間（`ADMIN.BAD_REQUEST_...`）。這個範疇化防止了隨著程式碼庫成長而產生的衝突。

---

## 2. 從 Actions 回傳錯誤

HTTP actions 永遠使用 `errorResponse()` 回傳 4xx 錯誤。**絕對不要**手動呼叫 `res.status(400).json(...)` — 那樣會繞過標準化的錯誤格式。

### 函式簽名

```javascript
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// 基本用法 — 預設使用 messages[0]
return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

// 替代措辭 — 使用 messages[1]（第二個翻譯鍵值）
return errorResponse(req, ERROR_CODES.SOME_ERROR_WITH_TWO_MESSAGES, 1);

// 自訂字串訊息 — 完全繞過 messages 陣列（常見於 Joi）
return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

// 覆蓋 HTTP 狀態碼
return errorResponse(req, ERROR_CODES.SOME_ERROR, 0, 422);
```

### 回傳格式

`errorResponse()` 回傳一個純物件 — action 回傳它，controller 將其寫入回應：

```javascript
{
  success: false,
  status: 400,
  error: 'ADMIN.BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST',
  message: 'Admin account does not exist.'
}
```

### Action 內部的完整範例

```javascript
async function V1Read(req) {
  const schema = joi.object({
    id: joi.number().min(1).default(req.admin.id).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  req.args = value;

  try {
    const findAdmin = await models.admin.findByPk(req.args.id, {
      attributes: { exclude: models.admin.getSensitiveData() }
    });

    if (!findAdmin)
      return errorResponse(req, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_DOES_NOT_EXIST);

    return {
      status: 200,
      success: true,
      admin: findAdmin.dataValues
    };
  } catch (error) {
    throw error; // 傳播到 controller 中的 next(error) → middleware/error.js
  }
} // END V1Read
```

### Controller 透過 next(error) 連接 500

Actions 拋出；controller 捕獲並呼叫 `next(error)`：

```javascript
async function V1Read(req, res, next) {
  let method = 'V1Read';

  try {
    const result = await actions[method](req, res);
    return res.status(result.status).json(result);
  } catch (error) {
    return next(error); // 將拋出的錯誤傳遞給 middleware/error.js
  }
} // END V1Read
```

**絕對不要手動 `return res.status(500).json(...)`。** 如果你的 action 拋出（或 `try` 區塊內的 Promise 被拒絕），`catch` 呼叫 `next(error)`，將錯誤交給 `middleware/error.js` 進行標準化的 500 處理。信任 middleware。

### Transactions — 回傳錯誤前先回滾

當你開啟一個 Sequelize transaction 並在 commit 之前遇到錯誤，使用 `errorResponseRollback()` 乾淨地回滾並在一個呼叫中回傳標準錯誤格式：

```javascript
const { errorResponseRollback } = require('../../../services/error');

const t = await models.db.transaction();
try {
  await models.order.create({ ... }, { transaction: t });

  if (someConditionFails)
    return await errorResponseRollback(t, req, ERROR_CODES.ORDER_BAD_REQUEST_SOMETHING_WRONG);

  await t.commit();
  return { status: 201, success: true, order: newOrder };
} catch (error) {
  await t.rollback();
  throw error;
}
```

---

## 3. Tasks 和 Sockets 中的錯誤

Tasks 和 socket 處理器**不是**請求/回應函式 — 它們沒有 `res` 物件，也沒有附加 i18n 的 `req`。規則不同。

### Tasks — 拋出，絕不回傳

在 task 內部，驗證失敗和邏輯錯誤都要 `throw`。Bull 的工作執行器捕獲未處理的拋出並將工作標記為失敗。不要回傳錯誤物件。

```javascript
async function V1ExportTask(job) {
  const schema = joi.object({
    adminId: joi.number().min(1).required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error)); // 拋出驗證錯誤

  job.data = value;

  try {
    // ... 執行工作 ...
  } catch (error) {
    throw error; // 重新拋出使 Bull 將工作標記為失敗
  }
} // END V1ExportTask
```

### Sockets — 拋出，絕不回傳

Socket action 處理器遵循相同的模式 — 遇到錯誤時拋出；socket wrapper 處理它：

```javascript
async function V1Connect(params, socket) {
  try {
    // ... 邏輯 ...
  } catch (error) {
    throw error;
  }
} // END V1Connect
```

### Tasks 中的 i18n

需要翻譯字串的 tasks 無法使用 `req.__()`)（沒有請求物件）。相反地，從 `services/language.js` 手動取得一個本地 i18n 實例，並從 `job.data.locale` 手動設定 user 的語系（排入工作的 action 負責傳遞這個值）：

```javascript
// services
const lang = require('../../../services/language');

async function V1SomeTask(job) {
  // ...
  const i18n = lang.getLocalI18n();
  i18n.setLocale(job.data.locale || 'en'); // 由排入工作的 action 傳遞的語系

  const message = i18n.__('USER[some_key]');
  // ...
} // END V1SomeTask
```

排入工作時，永遠傳遞 `locale`：

```javascript
// 在 action 內部
await UserQueue.add('V1SomeTask', {
  userId: req.user.id,
  locale: req.getLocale() // 將目前的語系傳遞給 task
});
```

---

## 4. 錯誤 Middleware（middleware/error.js）

`middleware/error.js` 是在 Express app 中最後註冊的 middleware。它是處理所有未處理錯誤（任何傳遞給 `next(error)` 的東西）的唯一地方。

**它的功能：**

1. 向 stdout 輸出一行結構化 JSON 日誌——可被 Heroku Papertrail、Datadog Logs 和大多數日誌聚合器解析。
2. 將錯誤傳送至 Sentry（若已設定），並附上 `requestId` 和用戶上下文。
3. 回傳 `500` JSON 回應。在正式環境中省略 stack trace；在開發/測試中包含。

### 結構化日誌格式

每個 500 錯誤會向 `stderr` 寫入一行 JSON：

```json
{
  "level": "error",
  "requestId": "019eed95-083e-7065-83c8-7ac1bc009fae",
  "method": "POST",
  "url": "/v1/users/create",
  "userType": "loggedOut",
  "userId": null,
  "errorName": "SequelizeUniqueConstraintError",
  "errorMessage": "email must be unique"
}
```

`requestId` 將此日誌行與回應 header `X-Request-ID` 連結，因此可以用客戶端回報的 ID 搜尋日誌。

### HTTP 回應

```javascript
// 正式環境回應
{
  status: 500,
  success: false,
  error: 'Error',
  message: 'Something went wrong',
  requestId: 'abc-123'
}

// 開發 / 測試回應 — 包含 stack 和請求上下文以便除錯
{
  status: 500,
  success: false,
  error: 'Error',
  stack: 'Error: ...\n    at ...',
  message: 'Something went wrong',
  requestId: 'abc-123',
  reqRoute: '/v1/admins/read',
  reqUserType: 'admin',
  reqUserId: 'uuid-here',
  reqArgs: { id: 5 }
}
```

### Sentry 整合

`services/sentry.js` 預設為 stub（無操作）。啟用 Sentry 錯誤追蹤：

1. 在 `npx create-orbital-app` 設定時選擇 **Sentry**，**或**手動：
   - `yarn add @sentry/node --exact`
   - 以真實實作取代 `services/sentry.js`
2. 在環境中設定 `SENTRY_DSN`

設定 Sentry 後，每個未處理的錯誤都會傳送至你的 Sentry 專案，並附上可搜尋的 `requestId` tag 和已認證的用戶資訊。不需要其他程式碼變更。

**新增 user 類型：** 當你新增一個新的已認證 user 類型時，在 `middleware/error.js` 中加入一個 `else if (req.<type>)` 分支，使日誌行和 Sentry 事件能正確識別是誰發出請求。

---

## 5. 新增錯誤代碼

使用 **`add-error-code` skill**（`/add-error-code`）。它會自動完成以下所有步驟。以供參考，手動步驟為：

**步驟 1 — 將代碼加入 feature 的 error.js**

```javascript
// app/Order/error.js
ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK: {
  error: 'ORDER.BAD_REQUEST_ITEM_OUT_OF_STOCK',
  status: 400,
  messages: ['ORDER[item_out_of_stock]']
}
```

**步驟 2 — 將翻譯鍵值加入 feature 的語言檔案**

```javascript
// app/Order/languages/en.js
'ORDER[item_out_of_stock]': 'That item is currently out of stock.'
```

如果字串應該是全域的（跨多個 features 使用），請改為在 `languages/en.js` 下以 `GLOBAL[...]` 鍵值加入。

**步驟 3 — 執行 yarn lang**

```
yarn lang
```

這會將所有語言檔案編譯到 `locales/en.json`（以及你有的其他語系）並驗證每個 `messages` 陣列中參照的每個鍵值都存在。如果有鍵值缺失，這個指令會大聲報錯。

**步驟 4 — 從 action 回傳它並在 JSDoc 中記錄**

```javascript
/**
 * ...
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK   ← 在這裡加入
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Create(req) {
  // ...
  if (item.stock === 0)
    return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ITEM_OUT_OF_STOCK);
  // ...
} // END V1Create
```

**步驟 5 — 撰寫測試**

JSDoc 中的每個錯誤代碼都必須有對應的測試。請參閱下方的[測試錯誤](#10-測試錯誤)。

---

## 6. i18n — 鍵值命名慣例

**格式：** `NAMESPACE[key_name]`

| 部分 | 規則 | 範例 |
|---|---|---|
| `NAMESPACE` | 全大寫。Feature 名稱，或共用字串使用 `GLOBAL` | `ADMIN`、`USER`、`ORDER`、`GLOBAL` |
| `key_name` | 全小寫加底線。不用 camelCase，不用破折號 | `invalid_login_credentials`、`item_out_of_stock` |

```javascript
'GLOBAL[unauthorized]'              // 全域共用字串
'ADMIN[invalid_login_credentials]'  // Admin feature 字串
'USER[profile_not_found]'           // User feature 字串
'ORDER[item_out_of_stock]'          // Order feature 字串
```

### 鍵值存放位置

| 鍵值類型 | 檔案 |
|---|---|
| 全域鍵值（`GLOBAL[...]`） | `languages/en.js` |
| Feature 鍵值（`ADMIN[...]`、`USER[...]` 等） | `app/<Feature>/languages/en.js` |

**絕對不要直接編輯 `locales/en.json`。** 那個檔案是編譯輸出 — 每次執行 `yarn lang` 時都會重新產生。編輯來源檔案（`languages/en.js` 或 `app/<Feature>/languages/en.js`）並執行 `yarn lang` 重新建置。

### 全域語言檔案（languages/en.js）

```javascript
module.exports = {
  'GLOBAL[language]': 'English',
  'GLOBAL[invalid_arguments]': 'One or more request arguments are invalid.',
  'GLOBAL[unauthorized]': 'You do not have permission to make this request.',
  'GLOBAL[forbidden]': 'You do not have the required role to perform this action.',
  'GLOBAL[internal_server_error]': 'Oops... something went wrong.',
  // ...
};
```

### Feature 語言檔案（app/Admin/languages/en.js）

```javascript
module.exports = {
  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]': 'Admin account is inactive.',

  // V1Read
  'ADMIN[admin_account_does_not_exist]': 'Admin account does not exist.',

  // V1ResetPassword
  'ADMIN[reset_email_subject]': 'Your password has been changed. Please confirm.',
};
```

在每個鍵值群組上方加上注釋，將其連結到使用它的 action — 這使隨著 actions 變更，鍵值容易尋找和稽核。

### 為新語系新增鍵值

如果 app 支援多種語言，請將相同的鍵值加入每個 `app/<Feature>/languages/<locale>.js` 檔案（以及全域的 `languages/<locale>.js`）。`yarn lang` 驗證所有鍵值在所有語系中都存在，如果任何語系缺少鍵值就會報錯。

---

## 7. Actions 中的 i18n

Actions 從 Express 接收 `req`。i18n middleware 直接將 `.__()` 附加到 `req` 和 `res` — 所以在 action 內部你只需呼叫 `req.__('KEY')`。你不需要 `require('i18n')` 或在 actions 中呼叫 `getLocalI18n()`。

```javascript
// 在任何 action 內部 — req.__() 已經可用
const message = req.__('ADMIN[welcome]');

// res.__() 也可以用，但 req.__() 是慣例
```

`errorResponse(req, ...)` 在內部呼叫 `req.__(key)` — 所以當你將 `req` 作為第一個參數傳遞時，翻譯會自動處理。只有當你想在 `errorResponse` 之外建構自訂字串時，才需要直接呼叫 `req.__()`)。

### 如何選擇語系

i18n middleware 讀取 `i18n-locale` cookie（在登入時設定），或退而使用 `Accept-Language` header。你也可以透過 `?lang=es` 強制設定請求的語系。在 action 執行之前就已確定活躍的語系 — 你所需要做的就是呼叫 `req.__()`)。

---

## 8. Tasks 中的 i18n

背景任務在 worker 行程中執行，在任何 HTTP 請求之外。沒有 `req` 物件 — 你必須使用 `services/language.js` 的 `getLocalI18n()` 手動取得一個新鮮的 i18n 實例，並自行設定語系。

**模式：**

```javascript
'use strict';

// services
const lang = require('../../../services/language');
const { joiErrorsMessage } = require('../../../services/error');

module.exports = { V1WelcomeEmailTask };

/**
 * Send welcome email to new user
 *
 * @job = {
 *   @data = {
 *     @userId - (NUMBER - REQUIRED): The user id
 *     @locale - (STRING - REQUIRED): The user's locale (e.g. 'en')
 *   }
 * }
 */
async function V1WelcomeEmailTask(job) {
  const schema = joi.object({
    userId: joi.number().min(1).required(),
    locale: joi.string().required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));

  job.data = value;

  // 取得一個新鮮的 i18n 實例並設定 user 的語系
  const i18n = lang.getLocalI18n();
  i18n.setLocale(job.data.locale);

  try {
    const subject = i18n.__('USER[welcome_email_subject]');
    // ... 使用翻譯後的主旨發送電子郵件 ...
  } catch (error) {
    throw error;
  }
} // END V1WelcomeEmailTask
```

**排入工作的 action 負責傳遞 `locale`：**

```javascript
// 在 V1Create action 內部
await UserQueue.add('V1WelcomeEmailTask', {
  userId: newUser.id,
  locale: req.getLocale() // 永遠傳遞目前的請求語系
});
```

**為什麼要用 `getLocalI18n()`？** 每次呼叫都回傳一個新鮮的、隔離的 i18n 實例。這防止了一個工作的語系狀態在多個工作並發執行時洩漏到另一個工作中。絕對不要跨工作共用單一的 i18n 實例。

---

## 9. yarn lang

`yarn lang` 是 i18n 建置和驗證指令。**每次**編輯任何語言檔案時都要執行它。

```
yarn lang
```

它的功能：

1. 讀取每個 `languages/en.js`（全域 + 所有 features）。
2. 將它們合併到 `locales/en.json`（以及其他語系）。
3. 驗證程式碼庫中任何地方參照的每個翻譯鍵值都存在於每個語系檔案中。
4. 如果有鍵值缺失，報錯並以非零退出。

`yarn test` 首先執行 `yarn lang` — 所以缺少的翻譯鍵值會使 CI 失敗，即使你忘記手動執行它。

**絕對不要直接編輯 `locales/*.json`。** 你的變更會在下次執行 `yarn lang` 時被覆蓋。

---

## 10. 測試錯誤

### 每個 JSDoc 錯誤條目都必須有測試

每個 action JSDoc 注釋中的 `Errors:` 區塊是你的測試清單。在 action 完成之前，逐一檢查每個列出的錯誤，確認有一個測試：

1. 以觸發那個特定錯誤的方式發送請求。
2. 斷言正確的 HTTP 狀態碼。
3. 將完整的回應主體與 `errorResponse(i18n, ERROR_CODES.YOUR_ERROR_CODE)` 比較。

```javascript
it('[logged-out] should fail if credentials are incorrect', async () => {
  const res = await request(app)
    .post(routeUrl)
    .send({ email: 'wrong@example.com', password: 'wrongpassword' });

  expect(res.statusCode).toBe(400);
  // 比較完整的主體 — 不只是狀態碼
  expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
});
```

使用 `toEqual(errorResponse(...))` 而不是 `toBe(res.body.error)` 確保整個錯誤合約 — 狀態、錯誤字串和翻譯訊息 — 都經過測試。如果翻譯鍵值被重新命名或錯誤代碼格式發生變化，這個測試會捕獲到。

### 測試無法執行操作的人

對於每個**沒有**存取某個 action 的角色，都必須有一個測試斷言正確的拒絕。至少，如果一個 action 需要認證，永遠有一個 `Role: Logged Out` 測試斷言 `401`：

```javascript
describe('Role: Logged Out', () => {
  it('[logged-out] should fail to read admin', async () => {
    const res = await request(app).post(routeUrl).send({});
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.UNAUTHORIZED));
  });
});
```

### 在測試檔案中取得 i18n

測試檔案需要一個本地 i18n 實例，以便用 `errorResponse(i18n, ...)` 建構預期的錯誤回應。在 describe 區塊頂部使用 `getLocalI18n()`：

```javascript
const lang = require('../../../../services/language');
const { ERROR_CODES, errorResponse } = require('../../../../services/error');

describe('Admin.V1Login', () => {
  const i18n = lang.getLocalI18n();
  // ...

  it('[logged-out] should fail with bad credentials', async () => {
    const res = await request(app).post(routeUrl).send({ email: 'x@x.com', password: 'bad' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
  });
});
```

### 測試 Joi 驗證錯誤

`BAD_REQUEST_INVALID_ARGUMENTS` 在 Joi 失敗時回傳。因為訊息是來自 `joiErrorsMessage()` 的動態字串，不要用 `toEqual` 比較完整的主體 — 而是斷言狀態和錯誤代碼字串：

```javascript
it('[admin] should fail if id is not a number', async () => {
  const { token } = await adminLogin(app, routeVersion, request, adminFix[0]);

  const res = await request(app)
    .post(routeUrl)
    .set('authorization', `jwt-admin ${token}`)
    .send({ id: 'not-a-number' });

  expect(res.statusCode).toBe(400);
  expect(res.body.error).toBe(ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS.error);
  expect(res.body.success).toBe(false);
});
```
