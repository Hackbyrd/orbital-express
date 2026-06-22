# JavaScript 檔案結構

此程式碼庫中的每個 `.js` 檔案，無一例外，都遵循相同的由上至下排版。這個順序是一份契約 — 任何工程師打開任何檔案，都能確切知道在哪裡找到匯入、匯出和邏輯。

---

## 順序（1–12）

| # | 區段 | 備註 |
|---|---|---|
| 1 | **標頭注釋** | 說明此檔案的用途及其方法 |
| 2 | `'use strict'` | 永遠存在，永遠是第二行 |
| 3 | **ENV 變數** | 從 `process.env` 解構 |
| 4 | **Node 內建模組** | `fs`、`path`、`crypto` 等 |
| 5 | **第三方模組** | `lodash`、`joi`、`moment-timezone` 等 |
| 6 | **Services** | 來自 `services/` — 包含 queue *service*（`services/queue.js`） |
| 7 | **Helpers** | 來自 `helpers/`、constants，以及 feature 自身的 `helper.js` |
| 8 | **Models** | `const models = require('.../models')` |
| 9 | **Queues** | 透過 `queue.get('XQueue')` 取得的 Queue *實例* — 緊接在 models 之後；service 本身在步驟 6 匯入 |
| 10 | **模組層級常數** | 可選；由上方匯入計算而來 |
| 11 | **`module.exports`** | 在方法定義**之前**宣告（函式會被提升） |
| 12 | **方法定義** | 實際的實作 |

---

## 每個群組內的匯入順序

在每個匯入區段內，按**行長度遞增**排序。先放純整模組 require，再放解構式 require，每個子群組也按行長度遞增排序。

```javascript
// ✅ 正確
const _ = require('lodash');
const joi = require('joi');
const moment = require('moment-timezone');

const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// ❌ 錯誤 — 解構在純 require 之前，且未按長度排序
const { ERROR_CODES, errorResponse } = require('../../../services/error');
const queue = require('../../../services/queue');
const _ = require('lodash');
```

---

## `module.exports` 模式

`module.exports` 在函式定義**之前**宣告。這樣可行，因為函式宣告會被提升。結果是在實作之前就有一個可讀的摘要，說明此檔案匯出了什麼。

```javascript
module.exports = {
  V1Login,
  V1Logout
};

async function V1Login(req, res) { ... } // END V1Login
async function V1Logout(req, res) { ... } // END V1Logout
```

對於只匯出單一函式的檔案：

```javascript
module.exports = {
  requestId
};

function requestId(req, res, next) { ... } // END requestId
```

---

## 函式結束注釋

每個具名函式以 `// END functionName` 結尾。這讓尋找長函式的結尾、快速掃描檔案變得輕鬆。

```javascript
async function V1Login(req, res) {
  // ...
} // END V1Login
```

適用於所有函式：actions、tasks、helpers、services、middleware。

---

## JSDoc：Action 標頭

每個 action 檔案以一個 JSDoc 區塊開頭，描述 action 的功能、路由、驗證需求、接受的參數、成功回應，以及所有可能的錯誤碼。此處列出的每個 `@error` 都必須有對應的測試。

```javascript
/**
 * 登入使用者並返回 access token。
 *
 * POST /v1/users/login
 *
 * Must be logged out
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): 使用者的電子郵件地址
 *   password - (STRING - REQUIRED): 使用者的未雜湊密碼
 * }
 *
 * Success: Return logged-in user and access token.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   400: Your account is inactive, cannot log in.
 *   401: Please confirm your email to log in.
 */
```

`req.args` 中的欄位：
- 型別全大寫：`STRING`、`NUMBER`、`BOOLEAN`、`OBJECT`、`ARRAY`
- 每個欄位標記 `REQUIRED` 或 `OPTIONAL`
- 有預設值時加上 `[DEFAULT - <value>]`

`req.params` 中的欄位（URL 區段）：
```javascript
 * req.params = {
 *   id - (STRING - REQUIRED): 使用者的 UUID
 * }
```

---

## JSDoc：一般 Helper/方法標頭

```javascript
/**
 * 使用 SHA-256 雜湊一個純文字 token。
 *
 * @token  - (STRING - REQUIRED): 要雜湊的原始 token
 *
 * return: string
 */
```

---

## 完整注釋 Action 檔案範例

以下範例示範了所有規則：區段順序、群組內的匯入順序、方法之前的 `module.exports`、函式結束注釋，以及 action JSDoc 標頭。

```javascript
/**
 * V1Login
 * 以 email + password 登入使用者。返回使用者和已簽署的 access token。
 */

'use strict';

// env
const { TOKEN_SECRET, NODE_ENV } = process.env;

// third-party
const joi = require('joi');
const moment = require('moment-timezone');

// services
const lang = require('../../../services/language');
const queue = require('../../../services/queue');
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { ROLES } = require('../../../helpers/constants');
const { hashToken } = require('../../../helpers/logic');

// models
const models = require('../../../models');

// queues（實例 — queue service 已在上方匯入）
const AuthQueue = queue.get('AuthQueue');

// 模組層級常數
const MAX_LOGIN_ATTEMPTS = 5;

module.exports = {
  V1Login
};

/**
 * 登入使用者並返回 access token。
 *
 * POST /v1/users/login
 *
 * Must be logged out
 *
 * req.args = {
 *   email    - (STRING - REQUIRED): 使用者的電子郵件地址
 *   password - (STRING - REQUIRED): 使用者的未雜湊密碼
 * }
 *
 * Success: Return logged-in user and access token.
 * Errors:
 *   400: Login failed. Incorrect email and/or password.
 *   400: Your account is inactive, cannot log in.
 *   401: Please confirm your email to log in.
 */
async function V1Login(req, res) {
  const schema = joi.object({
    email:    joi.string().email().required(),
    password: joi.string().min(8).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error) return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  const { email, password } = value;

  // 查找使用者
  const user = await models.user.scope(null).findOne({ where: { email } });
  if (!user) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS);

  // 驗證密碼
  const valid = await models.user.validatePassword(password, user.password);
  if (!valid) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS);

  // 檢查帳號狀態
  if (!user.isActive) return errorResponse(req, ERROR_CODES.USER_BAD_REQUEST_ACCOUNT_INACTIVE);
  if (!user.isEmailConfirmed) return errorResponse(req, ERROR_CODES.USER_UNAUTHORIZED_EMAIL_NOT_CONFIRMED);

  // 發行 token（為簡潔起見省略實作細節）
  const token = 'signed-jwt-here';

  return {
    status: 200,
    success: true,
    token,
    user: user.toJSON()
  };
} // END V1Login
```

---

## 快速參考

```
1.  header comment
2.  'use strict'
3.  env vars
4.  built-ins
5.  third-party        ← 先純 require（按長度）；再解構（按長度）
6.  services           ← queue SERVICE 在此（services/queue.js）
7.  helpers
8.  models
9.  queues             ← queue 實例在此（queue.get('XQueue')）
10. module-level consts
11. module.exports      ← 在函式之前
12. function defs       ← 每個以 // END name 結尾
```
