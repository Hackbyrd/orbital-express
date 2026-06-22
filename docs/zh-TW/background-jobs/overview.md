# 背景工作（Bull Queue）

## 為何使用背景工作？

有些工作太耗時，無法在一個請求/回應週期內完成 — 產生報表、批量發送電子郵件、呼叫緩慢的第三方 API、處理上傳的檔案。與其阻塞 HTTP 回應等待這些工作完成，action 會將工作移交給背景工作並立即回傳。客戶端收到快速的 `202 Accepted` 回應，帶有可用來輪詢進度或結果的 `jobId`。

**202 模式：**

1. Action 接收請求，驗證參數。
2. Action 將工作加入佇列並取得 `jobId`。
3. Action 回傳 `{ status: 202, success: true, jobId: job.id }`。
4. Worker 進程從 Redis 的 Bull queue 取出工作並非同步執行任務。

---

## 架構

```
HTTP Request
    │
    ▼
Controller → Action
                │  validates args
                │  enqueues job → Redis (Bull queue)
                │
                └─→ return 202 + jobId
                               │
                               ▼
                        Worker Process
                               │
                        feature/worker.js
                               │
                        Queue.process('V1TaskName', task)
                               │
                        task runs business logic
                               │
                        writes DB, sends email, emits socket, etc.
```

Bull 使用 Redis 作為後端儲存。Web 進程（`yarn s`）和 worker 進程（`yarn w`）共用相同的 Redis 連線 — web 進程寫入工作，worker 進程消費它們。

---

## 建立任務

使用產生器。絕不手動建立任務檔案。

```bash
yarn gen Order -t V1ProcessTask
```

這會建立 `app/Order/tasks/V1ProcessTask.js` 並將其加入 `app/Order/tasks/index.js`。建立骨架後，若有產生預設的 placeholder 範例任務，請刪除它：

```bash
yarn del Order -t V1ExampleTask
```

---

## 從 action 加入佇列

在 action 檔案頂部引入 queue service（在 services 之後、helpers 之前 — 遵循 JS 檔案結構順序）。依名稱取得 queue，加入工作，並回傳 `202`。

```javascript
'use strict';

// services
const queue = require('../../../services/queue');

// helpers
const { errorResponse, ERROR_CODES } = require('../../../helpers/errors');

// models
const models = require('../../../models');

// queues
const OrderQueue = queue.get('OrderQueue');

module.exports = {
  V1ProcessByUser,
};

/**
 * 在背景啟動訂單處理
 *
 * POST /v1/orders/process
 *
 * 必須登入
 * Roles: ['user']
 *
 * req.args = {
 *   @orderId - (NUMBER - REQUIRED): 要處理的訂單 id
 * }
 *
 * Success: Return jobId.
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   400: ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST
 *   401: UNAUTHORIZED
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1ProcessByUser(req) {
  const schema = joi.object({
    orderId: joi.number().min(1).required()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));

  req.args = value;

  try {
    // 確認訂單屬於此使用者
    const findOrder = await models.order.findOne({
      where: { id: req.args.orderId, userId: req.user.id }
    });

    if (!findOrder)
      return errorResponse(req, ERROR_CODES.ORDER_BAD_REQUEST_ORDER_DOES_NOT_EXIST);

    // 加入佇列
    const job = await OrderQueue.add('V1ProcessTask', {
      orderId: findOrder.id,
      userId:  req.user.id,
      locale:  req.getLocale() // 永遠傳遞 locale，讓任務可設定 i18n
    }, {
      delay: 0 // 立即開始；增加（ms）可延遲執行
    });

    return {
      status: 202,
      success: true,
      jobId: job.id
    };
  } catch (error) {
    throw error;
  }
} // END V1ProcessByUser
```

**可作為第三個參數傳給 `.add()` 的 queue 選項：**

| 選項 | 類型 | 預設值（來自 queue service） | 用途 |
|---|---|---|---|
| `delay` | number（ms） | `0` | 延遲執行這麼多毫秒。 |
| `attempts` | number | `5` | Bull 失敗時重試的次數。 |
| `backoff` | object | `{ type: 'exponential', delay: 5000 }` | 重試退避策略。`5 → 10 → 20 → 40s`。 |
| `removeOnComplete` | number | `1000` | 在 Redis 中只保留最後 N 個已完成的工作。 |
| `removeOnFail` | number | `5000` | 保留最後 N 個失敗的工作以供檢查。 |

預設值在 `services/queue.js` 中設定，適用於每個 queue 上的每個工作。只有在有特定原因時才覆寫單一工作（例如只應嘗試一次的報表工作，或應在 10 分鐘後觸發的通知）。

---

## 任務檔案結構

任務檔案匯出一個或多個 async 函數。它遵循與 action 檔案相同的 JS 檔案結構（header 注釋 → `'use strict'` → imports → `module.exports` → 方法定義），有兩點不同：任務接收 `job` 物件（而非 `req`/`res`），且在發生錯誤時拋出例外，而非回傳錯誤回應。

```javascript
/**
 * ORDER V1ProcessTask
 */

'use strict';

// services
const language = require('../../../services/language');

// helpers
const { queueError } = require('../../../services/error');

// models
const models = require('../../../models');

module.exports = {
  V1ProcessTask,
};

/**
 * 非同步處理訂單
 *
 * Queue: OrderQueue
 *
 * job.data = {
 *   @orderId - (NUMBER - REQUIRED): 要處理的訂單 id
 *   @userId  - (NUMBER - REQUIRED): 擁有該訂單的使用者 id
 *   @locale  - (STRING - REQUIRED): 用於 i18n 的語系（例如 'en'）
 * }
 *
 * Success: 將訂單狀態更新為 'processed'。
 * Errors:
 *   任何未預期錯誤時拋出 — Bull 依 queue 退避設定重試。
 */
async function V1ProcessTask(job) {
  const { orderId, userId, locale } = job.data;

  // 永遠從 job data 設定 locale — 任務沒有 req/res context
  const i18n = language.getLocalI18n();
  i18n.setLocale(locale);

  try {
    const findOrder = await models.order.findOne({
      where: { id: orderId, userId }
    });

    if (!findOrder)
      throw new Error(`Order ${orderId} not found for user ${userId}.`);

    // 執行業務邏輯
    await findOrder.update({ status: 'processed', processedAt: new Date() });

    // 任務也可以呼叫其他 action、發送 socket 事件、發送電子郵件等

  } catch (error) {
    throw error; // 重新拋出 — Bull 捕獲此錯誤，記錄失敗，並重試
  }
} // END V1ProcessTask
```

---

## 在 worker.js 中登錄

每個有任務的 feature 都需要在其資料夾中有一個 `worker.js`。這個檔案匯出一個函數，在 worker 進程啟動時被呼叫一次。它取得 queue、登錄任務處理器，並附加錯誤監聽器。

**`app/Order/worker.js`：**

```javascript
/**
 * ORDER BACKGROUND WORKER
 */

'use strict';

// services
const queue = require('../../services/queue');
const { queueError } = require('../../services/error');

// tasks
const tasks = require('./tasks');

module.exports = () => {

  const OrderQueue = queue.get('OrderQueue');

  // 登錄任務處理器
  OrderQueue.process('V1ProcessTask', tasks.V1ProcessTask);

  // 附加錯誤監聽器 — 永遠包含這三個
  OrderQueue.on('failed',  async (job, error) => queueError(error, OrderQueue, job));
  OrderQueue.on('stalled', async job          => queueError(new Error('Queue Stalled.'), OrderQueue, job));
  OrderQueue.on('error',   async error        => queueError(error, OrderQueue));

}; // END worker.js
```

專案根目錄的全域 **`worker.js`** 在啟動時自動發現並載入每個 feature 的 `worker.js` — 不需要手動登錄：

```javascript
// worker.js（專案根目錄）— 簡化摘要
const directories = getDirectories(path.join(__dirname, APP_DIR));
directories.forEach(dir => workerRoutes.push(require(`${dir}/worker.js`)));

async function startWorker(processId) {
  // ...
  workerRoutes.forEach(worker => worker()); // 呼叫每個 feature 匯出的函數
}
```

當你用 `yarn gen` 產生新 feature 時，其 `worker.js` 會自動建立，並在下次 worker 重啟時被載入。

---

## 任務中的 i18n

任務在 HTTP 請求週期之外執行 — 沒有 `req` 物件，因此也沒有 `req.__()` 的 i18n helper。你必須使用 language service 手動設定語系。

**加入佇列時永遠在 job data 中傳遞 `locale`：**

```javascript
// 在 action 中
const job = await OrderQueue.add('V1ProcessTask', {
  orderId: findOrder.id,
  userId:  req.user.id,
  locale:  req.getLocale() // 從請求中擷取使用者偏好的語系
});
```

**永遠在任務頂部設定 locale：**

```javascript
async function V1ProcessTask(job) {
  const { orderId, userId, locale } = job.data;

  const i18n = language.getLocalI18n();
  i18n.setLocale(locale); // 在需要任何翻譯字串之前設定

  // 現在可在電子郵件、日誌等中使用 i18n.__('KEY') 取得翻譯字串
}
```

---

## 任務中的錯誤處理

任務在發生錯誤時**拋出** — 它們不回傳錯誤回應。Bull 攔截拋出的錯誤，將工作標記為失敗，並依 queue 的退避設定安排重試。

```javascript
async function V1ProcessTask(job) {
  try {
    // ... work ...
  } catch (error) {
    throw error; // Bull 依 `attempts` 次數以指數退避重試
  }
} // END V1ProcessTask
```

`queueError()` helper（附加在 `worker.js` 的 `'failed'` 監聽器上）處理失敗的結構化日誌記錄。你不需要在任務內部呼叫它 — 當 Bull 將工作標記為失敗時它會自動觸發。

```javascript
// 在 worker.js 中 — 每次失敗時自動執行
OrderQueue.on('failed', async (job, error) => queueError(error, OrderQueue, job));
```

若一個工作耗盡所有重試次數仍未成功，它會落入 Bull 的失敗工作集合。失敗的工作保留 `removeOnFail` 數量（預設：5000），可透過 Bull 儀表板或直接使用 Redis 手動檢查和重放。

---

## Queue 命名慣例

Queue 名稱遵循 `<Feature>Queue` 的模式，其中 `<Feature>` 是單數 PascalCase 的 feature 名稱 — 與 feature 資料夾相同。

```
OrderQueue
UserQueue
DocumentQueue
ProductQueue
```

`queue.get('OrderQueue')` 的呼叫是冪等的 — 第一次呼叫時建立 queue，後續呼叫回傳相同的實例。這意味著在 action 檔案（用於加入佇列）和 feature 的 `worker.js`（用於處理）中都可以安全地呼叫 `queue.get('OrderQueue')` — 它們引用的是由相同 Redis 連線支援的同一個 Bull queue。

在 JS 檔案結構中永遠在 models 之後宣告 queue 實例：

```javascript
// models
const models = require('../../../models');

// queues
const OrderQueue = queue.get('OrderQueue');
```
