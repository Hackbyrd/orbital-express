# 測試模式

## 測試中的驗證

在 integration 測試中進行驗證時，直接呼叫登入端點並從回應中取出 access token。儲存它並在後續請求的 `Authorization` 標頭中傳入。

```javascript
let accessToken;

beforeAll(async () => {
  await populate('fix1');

  const admin1 = adminFix[0];
  const res = await request(app)
    .post('/v1/admins/login')
    .send({ email: admin1.email, password: admin1.password });

  accessToken = res.body.accessToken;
});

// 在測試中：
const res = await request(app)
  .post('/v1/admins/someaction')
  .set('Authorization', `jwt-admin ${accessToken}`)
  .send({ ... });
```

**標頭前綴必須與使用者類型匹配：**
- `jwt-user`——用於 User token
- `jwt-admin`——用於 Admin token

錯誤的前綴即使 token 本身有效也會回傳 `401`。

---

## 要斷言什麼

每個 action 測試都應該斷言以下所有適用的項目：

### 1. 狀態碼
```javascript
expect(res.statusCode).toBe(200);
```

### 2. 回應結構
```javascript
expect(res.body).toEqual({
  status: 200,
  success: true,
  user: expect.objectContaining({ id: expect.any(String), email: user.email }),
});
```

回應是**平坦的**——永遠不要 `res.body.data.user`。如果你看到 `data` 包裝層，那是違反慣例的。

### 3. 資料庫狀態
斷言 action 確實改變了 DB。不要只依賴回應 body——一個 action 可能回傳 `success: true` 卻悄悄地寫入失敗。

```javascript
const updatedUser = await models.user.findByPk(user1.id);
expect(updatedUser.isActive).toBe(false);
expect(updatedUser.firstName).toBe('NewName');
```

### 4. Socket 事件（如適用）
請參閱下方的[測試 Socket.IO](#testing-socketio)。

### 5. 已排入佇列的任務（如適用）
請參閱下方的[測試背景任務](#testing-background-tasks)。

---

## 測試存取控制

永遠要為「不能」做某件事的人撰寫測試。這是不可妥協的——如果你只測試 happy path，存取控制的迴歸問題就會隱而不見。

```javascript
it('[logged-out] should return 401 when no token provided', async () => {
  const res = await request(app).post(routeUrl).send({ ... });
  expect(res.statusCode).toBe(401);
});

it('[user] should return 401 when using wrong token type on admin endpoint', async () => {
  const res = await request(app)
    .post(routeUrl)
    .set('Authorization', `jwt-user ${userAccessToken}`)
    .send({ ... });
  expect(res.statusCode).toBe(401);
});

it('[admin:manager] should return 403 when role is insufficient', async () => {
  // 將基準管理員變更為受限角色
  await models.admin.update({ role: ADMIN_ROLE.MANAGER }, { where: { id: admin1.id } });

  const res = await request(app)
    .post(routeUrl)
    .set('Authorization', `jwt-admin ${accessToken}`)
    .send({ ... });
  expect(res.statusCode).toBe(403);
});
```

**每個測試名稱都要以方括號中的操作者為前綴：** `[logged-out]`、`[user]`、`[admin]`、`[admin:manager]`。瀏覽測試輸出時，這能讓人立即清楚主體是誰。

---

## Mock 第三方 API

**在 service 邊界進行 mock，永遠不要深入到實作內部。**

框架將所有第三方 API 包裝在 `services/` 中（例如 `services/email.js`、`services/stripe.js`）。mock 包裝函式——而不是三層以下的底層函式庫方法。這讓測試在函式庫內部實作改變時保持穩健，並讓意圖清晰明確。

### `jest.spyOn()`——偏好用於 service 包裝

當你想 mock 一個已被 require 的模組上的單一方法，並在測試後乾淨地還原時使用。這是 service 包裝的標準選擇。

```javascript
const email = require('../../../../services/email');

beforeEach(async () => {
  await populate('fix1');
  jest.spyOn(email, 'send').mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.restoreAllMocks(); // 使用 spyOn 時務必在之後還原
});

it('[admin] should send a welcome email on create', async () => {
  await request(app).post(routeUrl).set('Authorization', ...).send({ ... });
  expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@example.com' }));
});
```

### `jest.mock()`——用於你永遠不想執行的模組

當模組在 require 時有副作用，或者你想在整個檔案中 mock 整個模組而不需要每次測試後還原時使用。

```javascript
jest.mock('../../../../services/stripe', () => ({
  chargeCard: jest.fn().mockResolvedValue({ id: 'ch_test123' }),
}));
```

`jest.mock()` 被 Jest 提升到檔案頂部。當你需要每個測試回傳不同值時，使用 `jest.spyOn()`——在 `beforeEach` 中重新設定更容易。

**規則：**
1. 永遠不要讓真實的網路呼叫在測試中發生。在它觸及網路之前就進行 mock。
2. 斷言 mock 是以正確的參數被呼叫——不只是確認它沒有拋出錯誤。
3. 使用 `spyOn` 時，務必在 `afterEach` 中呼叫 `jest.restoreAllMocks()`。

---

## 測試背景任務 {#testing-background-tasks}

Task 測試是**單元測試**——沒有 HTTP 層、沒有 supertest、不需啟動 server。直接呼叫 task 函式，傳入一個仿照 Bull `job` 形狀的 mock `job` 物件。

```javascript
const { V1ExportTask } = require('../../../tasks');

it('[admin] should export data and return true', async () => {
  const admin1 = adminFix[0];

  const job = { data: { adminId: admin1.id } };
  const result = await V1ExportTask(job);

  expect(result).toBe(true);

  // 像 action 測試一樣斷言 DB 副作用
  const exportRecord = await models.export.findOne({ where: { adminId: admin1.id } });
  expect(exportRecord).not.toBeNull();
});
```

**測試 task 是否將進一步的任務排入佇列：**

```javascript
const queue = require('../../../../services/queue');

it('[task] should enqueue one singular task per user', async () => {
  const UserQueue = queue.get('UserQueue');
  const addSpy = jest.spyOn(UserQueue, 'add').mockResolvedValue({});

  const job = { data: {} };
  const count = await V1CheckAllUsersTask(job);

  expect(addSpy).toHaveBeenCalledTimes(count);
  expect(addSpy).toHaveBeenCalledWith('V1CheckUserTask', expect.objectContaining({ userId: expect.any(String) }));

  jest.restoreAllMocks();
});
```

**測試 action 是否將背景任務排入佇列：**

```javascript
it('[admin] should enqueue export task and return 202', async () => {
  const AdminQueue = queue.get('AdminQueue');
  const addSpy = jest.spyOn(AdminQueue, 'add').mockResolvedValue({ id: 'job-1' });

  const res = await request(app)
    .post(routeUrl)
    .set('Authorization', `jwt-admin ${accessToken}`)
    .send({ ... });

  expect(res.statusCode).toBe(202);
  expect(addSpy).toHaveBeenCalledWith('V1ExportTask', expect.objectContaining({ adminId: admin1.id }));

  jest.restoreAllMocks();
});
```

---

## 測試 Socket.IO {#testing-socketio}

### 直接測試 socket 觸發的 action

Socket 觸發的 action 接收 `(args, context)`——而非 `(req, res)`。直接呼叫它們，並明確傳入 socket context。

```javascript
const { V1Connect } = require('../../../actions');
const socket = require('../../../../services/socket');

it('[action-only] should connect user socket successfully', async () => {
  const user1 = userFix[0];

  const result = await V1Connect(
    { userId: user1.id, socketId: 'test-socket-id' },
    {
      io: socket.getIO(),
      SOCKET_ROOMS: socket.SOCKET_ROOMS,
      SOCKET_EVENTS: socket.SOCKET_EVENTS,
      socketWrapper: socket.socketWrapper,
    }
  );

  expect(result).toHaveProperty('success', true);
  expect(result.data.userSocket).toHaveProperty('userId', user1.id);

  // 斷言 DB 副作用
  const userInDb = await models.user.findByPk(user1.id);
  expect(userInDb.isOnline).toBe(true);
});
```

其他所有部分——`beforeAll`、`beforeEach`、`afterAll`、fixture 模式、佇列清空——與標準 integration 測試完全相同。

### 測試是否發出正確的事件

永遠不要用 `if (NODE_ENV !== 'test')` 來保護 socket 事件的發出。這種模式讓你無法驗證正確的事件是否以正確的資料被觸發。

使用 `jest.spyOn()` 來 mock `getIO()` 並在 emit 鏈上進行斷言。由於 `io` 是在呼叫時透過 `getIO()` 存取的（而非在 require 時快取），`spyOn` 可以乾淨地攔截它。

```javascript
const socket = require('../../../../services/socket');

describe('Message.V1Create', () => {
  let mockEmit;
  let mockTo;

  beforeEach(async () => {
    await populate('fix1');

    mockEmit = jest.fn();
    mockTo   = jest.fn(() => ({ emit: mockEmit }));
    jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('[user] should emit MESSAGE_CREATED to the conversation room', async () => {
    const res = await request(app)
      .post(routeUrl)
      .set('Authorization', `jwt-user ${accessToken}`)
      .send({ conversationId, body: 'Hello' });

    expect(res.statusCode).toBe(201);

    // 斷言正確的房間被鎖定
    expect(mockTo).toHaveBeenCalledWith(
      `CONVERSATION${socket.socketWrapper(conversationId)}`
    );

    // 斷言發出了正確的事件和資料結構
    expect(mockEmit).toHaveBeenCalledWith(
      socket.SOCKET_EVENTS.MESSAGE_CREATED,
      expect.objectContaining({ message: expect.any(Object) })
    );
  });
});
```

**規則：**
1. 對 `getIO` 進行 spy 時，務必在 `afterEach` 中呼叫 `jest.restoreAllMocks()`。
2. 同時斷言 `mockTo`（正確的房間）和 `mockEmit`（正確的事件 + 資料結構）。
3. 如果 action 向多個房間發出事件，使用 `toHaveBeenNthCalledWith` 或檢查 `toHaveBeenCalledTimes` 來個別斷言每個 `mockTo` 呼叫。

---

## 測試 DB Scope（`scope(null)`）

Sequelize model 預設有 `paranoid: true`，這意味著軟刪除的記錄在所有查詢中都是隱藏的。在測試中，你通常需要斷言一筆記錄已被軟刪除——也就是說它在 DB 中存在，`deletedAt` 不為 null，但普通的 `findByPk` 回傳 `null`。

使用 `Model.scope(null)` 來繞過預設 scope 並看到所有記錄，包括軟刪除的記錄：

```javascript
it('[admin] should soft-delete the user', async () => {
  await request(app)
    .post('/v1/admins/deleteuser')
    .set('Authorization', `jwt-admin ${accessToken}`)
    .send({ userId: user1.id });

  // 普通查詢——回傳 null（軟刪除，被預設 scope 隱藏）
  const hiddenUser = await models.user.findByPk(user1.id);
  expect(hiddenUser).toBeNull();

  // scope(null) 繞過 paranoid——看到帶有 deletedAt 的記錄
  const deletedUser = await models.user.scope(null).findByPk(user1.id);
  expect(deletedUser).not.toBeNull();
  expect(deletedUser.deletedAt).not.toBeNull();
});
```

**只有在斷言軟刪除時**才使用 `scope(null)`。永遠不要因為測試意外找到 `null` 就用它來變通——那通常意味著測試資料設定有誤，或者 action 在不應該軟刪除的情況下進行了軟刪除。

---

## 測試中的資料庫交易

測試套件使用**清除並重新填充**策略，而非交易回滾。

`beforeEach` 呼叫 `populate('fix1')`，它會：
1. 截斷所有資料表
2. 批量插入 fixture SQL

這意味著無論前一個測試寫入了什麼，每個測試都從乾淨、已知的基準線開始。你不需要在測試中手動管理交易——一個測試的變更在下一個測試前就會被清除。

```javascript
beforeEach(async () => {
  await populate('fix1'); // 每次測試前截斷 + 重新填充
});
```

**這對測試隔離的意義：**
- 測試完全隔離——一個測試中的寫入失敗不會影響其他測試。
- 不要依賴前一個測試建立的資料。永遠從 fixture 基準線在測試內部進行變更。
- 不要使用 `beforeAll` 插入你期望跨測試持久存在的資料——它會被第一個 `beforeEach` 清除。

**`beforeAll` 適用的情況：**
只用 `beforeAll` 進行一次性的非 DB 狀態設定——啟動 server、取得 access token（這涉及 `beforeEach` 無論如何都會重置的 DB 讀寫，所以如果需要的話，在每次 populate 後重新登入）、或建立 socket 連線。

```javascript
beforeAll(async () => {
  // 一次性：啟動 server 並登入一次
  // 注意：如果 beforeEach 中的 populate() 重置了使用者的密碼 hash，則改在 beforeEach 內重新登入
  await app.listen(...);
});

beforeEach(async () => {
  await populate('fix1'); // 每次測試前重置 DB 狀態
});

afterAll(async () => {
  // 關閉所有開啟的 handle：佇列、socket、DB 連線、server
  await queue.closeAll();
  await socket.close();
  await models.sequelize.close();
  await server.close();
});
```

**在 `afterAll` 中關閉 handle** 是必要的——遺漏任何一個都會導致所有測試通過後測試套件掛起。
