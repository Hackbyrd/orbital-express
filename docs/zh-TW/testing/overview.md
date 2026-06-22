# 測試架構總覽

## 原則

四條規則驅動這套測試套件的每一個決策：

1. **每個 action 都要有測試。** 沒有例外——沒有測試的 action 就是未完成的 action。
2. **每個 `ERROR_CODE` 都要有測試。** 每個 action 的 JSDoc 標頭就是你的測試清單。逐一確認每個列出的錯誤碼都有對應的測試，並驗證回應是否正確。
3. **測試誰「不能」做某件事。** 對於每個沒有權限存取某個 action 的角色，必須有一個測試來確認正確的拒絕回應。至少，如果一個 action 需要驗證，就必須有一個 `Role: Logged Out` 的測試來確認回傳 `401`。授權漏洞是安全性 bug 的根源。
4. **Fixture 是基準線，不是情境。** 一組 fixture 代表一個乾淨、最小化的起始狀態。在測試內部對它進行變更來建立你需要的情境——不要為每個情境建立一個 fixture 檔案。

---

## 目錄結構

測試存放在兩個地方：每個功能資料夾內，以及全域的 `test/` 目錄。

```
app/<Feature>/tests/
├── integration/        # 透過 supertest 進行完整 HTTP 測試，每個 action 一個檔案
│   ├── V1Action1.test.js
│   └── V1Action2.test.js
├── tasks/              # 背景任務測試，每個 task 一個檔案
│   └── V1Task1.test.js
└── helper.test.js      # 此功能 helper.js 的單元測試

test/
├── fixtures/
│   ├── fix1/           # 基準 fixture 集合（JS 原始碼）
│   │   ├── admin.js
│   │   └── user.js
│   ├── fix1.sql        # 編譯後的 SQL（由 yarn sql fix1 產生——請勿手動編輯）
│   └── assets/         # 測試用的圖片、檔案或其他二進位資源
├── helpers/            # 全域 helper 單元測試（helpers/*.js）
└── services/           # 全域 service 單元測試（services/*.js）
```

**規則：** 測試檔案的位置必須對應原始碼的位置。永遠不要將測試放在 `test/` 根目錄——功能 action 測試放在 `app/<Feature>/tests/integration/`，task 測試放在 `app/<Feature>/tests/tasks/`。

---

## Fixture

### 什麼是 Fixture

Fixture 檔案是純 JavaScript 模組，匯出一個代表測試資料庫中某張資料表的記錄陣列。同一個 fixture 集合中的所有檔案（例如 `test/fixtures/fix1/`）共同定義了每次測試前資料庫的完整基準狀態。

```javascript
// test/fixtures/fix1/admin.js
module.exports = [
  {
    id: 'uuid-1',
    email: 'admin1@example.com',
    // admin1 是主要的測試管理員——狀態啟用，用於大多數 happy path 測試
  },
  {
    id: 'uuid-2',
    email: 'admin2@example.com',
    // admin2 是次要管理員——用於測試多使用者情境
  },
];
```

fixture 檔案中的每一筆記錄都必須有註解，說明它在基準線中的角色以及任何有意設計的關聯。新進工程師閱讀 fixture 時，應該能立即理解每筆記錄存在的原因。

### 為什麼用 SQL 而非 JavaScript

`populate()` 在 `beforeEach` 中執行——每個測試套件可能執行數百次。每次都透過 Sequelize 載入 JS fixture 會非常緩慢：model hook、驗證以及每筆記錄的來回請求累積起來相當可觀。因此：

1. `yarn sql fix1` 在 Jest 啟動前**執行一次**（`yarn test` 指令會自動執行）。它讀取 JS fixture 檔案並將其編譯成一個包含原始 `INSERT` 陳述句的單一平坦 SQL 檔案（`test/fixtures/fix1.sql`）。
2. 在每個 `beforeEach` 中，`populate('fix1')` 直接對測試資料庫執行預先建立好的 SQL——不經過 ORM、不做解析、不做驗證。一次批量插入。

**永遠不要直接編輯 `fix1.sql`。** 它是產生的輸出。請編輯 `fix1/*.js` 原始檔案，然後執行 `yarn sql fix1` 重新產生。執行 `yarn test` 可以重新產生並執行所有測試。

### 在測試中引用 Fixture

將每個 fixture 的 `require` 包在函式中，並在 `beforeEach` 中重新賦值。永遠不要在測試之間直接共享 fixture 物件——一個測試對它的變更會悄悄破壞下一個測試。

```javascript
const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));
let adminFix = null;

beforeEach(async () => {
  adminFix = adminFixFn(); // 每次測試前的全新深層複製
  await reset();           // 清除測試資料庫
});
```

### 何時建立新的 Fixture 集合

只有當基準結構確實不同時——起始資料有根本上不同的結構或關聯圖——才有理由建立新的 fixture 集合（`fix2`、`fix3`）。`isActive: false` 的使用者、具有特定角色的帳號、處於特定狀態的訂單——這些都是情境。在測試中對它們進行變更：

```javascript
// 錯誤——為非啟用管理員情境建立 fixture 檔案
// test/fixtures/fix1_admin_inactive/admin.js

// 正確——載入基準線，在測試中變更為所需情境
it('[logged-out] should fail to login if account is inactive', async () => {
  const admin1 = adminFix[0];
  await models.admin.update({ isActive: false }, { where: { id: admin1.id } });

  const res = await request(app).post(routeUrl).send({ email: admin1.email, password: admin1.password });

  expect(res.statusCode).toBe(400);
  expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_ACCOUNT_INACTIVE));
});
```

`beforeEach` 中的 `reset()` + `populate('fix1')` 會在每次測試前恢復基準線，因此一個測試的變更永遠不會影響下一個測試。

---

## 執行測試

```bash
yarn test
```

依序執行三個步驟：

1. `yarn lang`——編譯並驗證 i18n key。如果翻譯 key 缺失，立即失敗。
2. `yarn sql fix1`——將 fixture JS 編譯成 SQL。從當前 fixture 原始碼重新產生 `fix1.sql`。
3. `jest --runInBand`——序列執行完整測試套件。

**Postgres 和 Redis 必須正在運行。** 應用程式和測試套件都需要它們。

**`--runInBand` 是必要的。** 所有測試套件共享同一個測試資料庫。並行執行套件會在 `reset()` 和 `populate()` 呼叫上造成競態條件。`yarn test` 指令已經帶有這個旗標——不要移除它。

---

## 測試結構剖析

`Admin.V1Login` 的完整 integration 測試檔案：

```javascript
/**
 * TEST ADMIN V1Login METHOD
 */

'use strict';

// 1. 先 require path，再載入測試環境，然後才讀取 process.env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

// 2. 標準引入（與原始碼檔案相同的 JS 檔案結構順序）
const _ = require('lodash');
const request = require('supertest');
const i18n = require('i18n');

// helpers
const { adminLogin } = require('../../../../helpers/tests');
const { ERROR_CODES, errorResponse } = require('../../../../services/error');

// models
const models = require('../../../../models');

// queues + services
const queue = require('../../../../services/queue');
const socket = require('../../../../services/socket');

// test utilities
const { reset, populate } = require('../../../../test/fixtures');

// 3. server 在 beforeAll 中初始化，因為它是非同步的
let app = null;
let AdminQueue = null;

describe('Admin.V1Login', () => {
  // 將 fixture 包在函式中，每次測試前取得全新的深層複製
  const adminFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/admin'));
  let adminFix = null;

  // 定義被測試的路由
  const routeVersion = '/v1';
  const routePrefix = '/admins';
  const routeMethod = '/login';
  const routeUrl = `${routeVersion}${routePrefix}${routeMethod}`;

  // 在此檔案所有測試前啟動一次 server
  beforeAll(async () => {
    app = await require('../../../../server');
  });

  // 每次測試前：全新 fixture、清空佇列、重置 DB
  beforeEach(async () => {
    adminFix = adminFixFn();
    AdminQueue = queue.get('AdminQueue');
    await AdminQueue.obliterate({ force: true }); // 永遠從空佇列開始
    await socket.get();
    await reset(); // 清除測試資料庫
  });

  // 所有測試結束後：關閉所有連線（必要——否則會造成掛起）
  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  // ─── Role: Logged Out ───────────────────────────────────────────────────────

  describe('Role: Logged Out', () => {
    beforeEach(async () => {
      await populate('fix1'); // 為此角色的測試載入 fixture 資料
    });

    // happy path
    it('[logged-out] should login successfully', async () => {
      const admin1 = adminFix[0];

      const res = await request(app)
        .post(routeUrl)
        .send({ email: admin1.email, password: admin1.password });

      // 驗證回應
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
    });

    // 驗證錯誤
    it('[logged-out] should fail if email is missing', async () => {
      const res = await request(app)
        .post(routeUrl)
        .send({ password: 'somepassword' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS));
    });

    // 業務規則拒絕
    it('[logged-out] should fail if credentials are incorrect', async () => {
      const res = await request(app)
        .post(routeUrl)
        .send({ email: 'wrong@example.com', password: 'wrongpassword' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS));
    });
  }); // END Role: Logged Out

  // ─── Role: Admin（登入狀態下必須登出才能再次登入）──────────────────────────────

  describe('Role: Admin', () => {
    beforeEach(async () => {
      await populate('fix1');
    });

    it('[admin] should fail if already logged in', async () => {
      const admin1 = adminFix[0];
      const { token } = await adminLogin(app, routeVersion, request, admin1);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-admin ${token}`)
        .send({ email: admin1.email, password: admin1.password });

      expect(res.statusCode).toBe(401);
    });
  }); // END Role: Admin
}); // END Admin.V1Login
```

### 此檔案的關鍵規則

**在讀取 `process.env` 之前先載入環境變數。** 這是測試檔案的特殊之處。先 `require('path')`，再 `require('dotenv').config(...)`，然後才讀取 `process.env`。如果在 dotenv 執行前讀取 `process.env`，所有變數都會是空值。

**`beforeAll`** 啟動一次 server。server 是非同步的——每個測試都初始化一次會太慢。

**`beforeEach`（外層）** 重置資料庫並清空佇列。無論角色群組為何，這在此檔案的每次測試前都會執行。

**`beforeEach`（內層，每個角色群組）** 在最窄的需要資料的範圍內呼叫 `populate('fix1')`。不同的角色群組可能需要不同的變更或不同的 fixture 子集。

**`afterAll`** 關閉每個連線。缺少關閉會導致測試套件在完成後掛起。務必關閉：佇列、socket、資料庫以及 app server。

**使用 `describe` 按角色分組測試。** `Role: Logged Out`、`Role: Admin`、`Role: User`——讓人一眼就清楚正在測試什麼存取層級，並使覆蓋率缺口顯而易見。

---

## Supertest 設定

`supertest` 包裝 Express app 並對其發出真實的 HTTP 請求，無需綁定到埠口。其模式為：

```javascript
const request = require('supertest');

// GET 請求
const res = await request(app).get(routeUrl);

// 帶有 body 的 POST 請求
const res = await request(app).post(routeUrl).send({ key: 'value' });

// 已驗證的請求
const { token } = await adminLogin(app, routeVersion, request, admin1);
const res = await request(app)
  .post(routeUrl)
  .set('authorization', `jwt-admin ${token}`)
  .send({ key: 'value' });
```

`authorization` 標頭前綴必須與使用者類型匹配：管理員用 `jwt-admin`，使用者用 `jwt-user`。使用錯誤的前綴即使 token 有效也會得到 `401`。

`adminLogin` 和 `userLogin` 是 `helpers/tests.js` 中的輕量 helper，它們呼叫真實的登入端點並回傳 JWT。它們發出真實的 HTTP 請求——token 是真實的，不是偽造的。

---

## 要斷言什麼

每個測試斷言兩件事：

**1. 回應**——永遠檢查 HTTP 狀態碼、`success` 旗標以及回傳資料的結構。對於錯誤情況，將完整的回應 body 與 `errorResponse(i18n, ERROR_CODES.YOUR_ERROR_CODE)` 進行比較：

```javascript
// 成功情況
expect(res.statusCode).toBe(200);
expect(res.body.success).toBe(true);
expect(res.body.admin).toHaveProperty('id', admin1.id);

// 錯誤情況——將完整 body 與 error service 輸出進行比較
expect(res.statusCode).toBe(400);
expect(res.body).toEqual(errorResponse(i18n, ERROR_CODES.ADMIN_BAD_REQUEST_INVALID_TIMEZONE));
```

**2. 資料庫狀態**——在任何寫入操作（建立、更新、刪除）之後，直接透過 model 查詢資料庫以確認變更已生效。永遠不要只依賴回應：

```javascript
// 寫入後斷言資料庫
const updated = await models.admin.findByPk(admin1.id);
expect(updated.timezone).toBe('America/New_York');
```

如果 action 將背景任務加入佇列，則新增第三個斷言——檢查 Redis 中的任務。這屬於觸發任務的 integration 測試，而非 task 測試：

```javascript
const jobs = await AdminQueue.getJobs();
expect(jobs).toHaveLength(1);
expect(jobs[0].name).toBe('V1ExportTask');
```

**測試名稱描述行為，而非程式碼。** 格式：`[角色] should <結果> when <條件>`。

```javascript
// 好
it('[admin] should fail to update timezone if value is not a valid IANA timezone', ...)
it('[logged-out] should fail with 401 when no token is provided', ...)

// 不好
it('test update timezone', ...)
it('adminUpdateTest', ...)
```
