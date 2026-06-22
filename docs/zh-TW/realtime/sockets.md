# 使用 Socket.IO 實現即時功能

Socket.IO 是 Orbital-Express 的即時層。伺服器在資料庫寫入提交後向已連線的客戶端廣播事件。客戶端訂閱 room 並對事件做出回應。

實作位於 `services/socket.js`。所有 room 和事件常數、JWT 認證 middleware、Redis adapter 設定和連線處理器都在此。每個事件的業務邏輯位於 feature 的 **actions** 中 — 永遠不要放在 `socket.js` 本身內。

---

## 架構

僅限伺服器端廣播。模式始終是：

1. 一個 HTTP action（或背景任務）完成工作並提交 transaction。
2. 提交後，action 發送帶有相關 payload 的 Socket.IO 事件。
3. Socket.IO 伺服器（由 Redis adapter 支援）將事件扇出到目標 room 中的每個進程和每個已連線的客戶端。

客戶端在主要流程中不透過 socket 推送資料 — socket 是伺服器發起通知的傳遞通道。支援輸入型 socket 訊息（客戶端 → 伺服器）用於打字指示器或在線狀態等功能，但所有狀態都儲存在資料庫中，並首先透過正常的 HTTP action 寫入。

---

## 取得 `io` 實例

永遠使用 `socket.getIO()`。絕不直接 import `io` 變數。

```javascript
const socket = require('../../../services/socket');

// 正確
const io = socket.getIO();

// 錯誤 — io 在 require 時為 null；這會擷取 null 快照，而非即時實例
const { io } = require('../../../services/socket');
```

`getIO()` 回傳 `get()` 初始化 Socket.IO 伺服器時設定的即時 `io` 實例。由於 Node.js 快取 `require()` 結果，任何直接 import `io` 的模組都會取得模組首次載入時（`get()` 執行之前）存在的 `null` 值。`getIO()` 永遠讀取模組層級變數的當前值，因此始終正確。

在 HTTP action 中，直接使用 `socket.getIO()`。在 socket 觸發的 action（從 `socket.js` 內的 `connect()` 呼叫）中，`io` 實例透過 context 參數傳入 — 請參閱下方的循環依賴章節。

---

## Room

Room 定義在 `services/socket.js` 內的 `SOCKET_ROOMS` 中：

```javascript
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL',   // 每個已認證的連線都加入此 room
  USER: 'USER',       // 每使用者 room — USER<userId>
  TEST: 'TEST',       // 僅限測試頁面
  ROOM: 'ROOM',       // placeholder — 替換為你的領域 room
}
```

有兩種類型：

**廣播 room** — 所有特定類型的連線都加入的固定字串。`GLOBAL` 是其中一個；`ADMIN` 也可以是。room 中的每個客戶端都會收到事件。

**實例 room** — 固定前綴加上包裝的 ID。使用 `socketWrapper(id)` 包裝 ID：

```javascript
function socketWrapper(id) {
  return `<${id}>`;
}

// 結果例如 'USER<8f1fbd57-7e71-4a9b-9ad4-3c6db06a76b2>'
const room = `${SOCKET_ROOMS.USER}${socketWrapper(userId)}`;
```

這個慣例（`ROOM_PREFIX<uuid>`）讓 room 名稱在日誌中清晰易讀且無歧義。

**命名慣例：** room 名稱使用 `ALL_CAPS_WITH_UNDERSCORES`。

新增 room 時，將常數加入 `SOCKET_ROOMS`。不要在 action 中內嵌建構原始 room 字串 — 永遠由 `SOCKET_ROOMS` 和 `socketWrapper` 組合。

---

## 事件

事件定義在 `services/socket.js` 內的 `SOCKET_EVENTS` 中：

```javascript
const SOCKET_EVENTS = {
  TEST_SOCKET_EVENT_ONE: 'TEST_SOCKET_EVENT_ONE',
  TEST_SOCKET_EVENT_TWO: 'TEST_SOCKET_EVENT_TWO',
  // MESSAGE_CREATED: 'MESSAGE_CREATED',
  // DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
}
```

**命名慣例：** 事件名稱使用 `ALL_CAPS_WITH_UNDERSCORES`，通常為 `FEATURE_ACTION` — 例如 `MESSAGE_CREATED`、`ORDER_UPDATED`、`DOCUMENT_DELETED`。

新增事件時，在此加入常數。絕不在 emit 呼叫中使用原始字串字面值 — 永遠引用 `SOCKET_EVENTS.YOUR_EVENT`。

---

## 從 action 發送事件

關鍵規則：**永遠在 `t.commit()` 之後發送**，絕不在之前。

若在提交前發送，客戶端收到的通知指向一筆資料庫中尚不存在的記錄（因為 transaction 尚未落地）。若之後提交失敗，客戶端持有過期的資料且無法獲得修正。

```javascript
// services
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');

// 在 action 內部，驗證並完成工作之後：
const t = await models.db.transaction();
try {
  const message = await models.message.create({ conversationId, text, userId }, { transaction: t });
  await t.commit(); // 先提交 — 永遠在 emit 之前

  // 現在可以安全地發送事件
  const io = socket.getIO();
  io
    .to(`${SOCKET_ROOMS.CONVERSATION}${socketWrapper(conversationId)}`)
    .emit(SOCKET_EVENTS.MESSAGE_CREATED, {
      messageId: message.id,
      text: message.text,
      createdAt: message.createdAt,
    });

  return { status: 201, success: true, message: message.dataValues };
} catch (error) {
  await t.rollback();
  throw error;
}
```

傳給 `emit` 的 payload 應該是只包含客戶端所需資料的純物件。不要發送完整的 Sequelize model 實例 — 展開 `.dataValues` 或明確建構 payload。

**指定目標 room：**

```javascript
// 廣播給所有人
io.to(SOCKET_ROOMS.GLOBAL).emit(SOCKET_EVENTS.SOME_EVENT, data);

// 指定特定使用者
io.to(`${SOCKET_ROOMS.USER}${socketWrapper(userId)}`).emit(SOCKET_EVENTS.SOME_EVENT, data);

// 指定特定對話（領域 room 範例）
io.to(`${SOCKET_ROOMS.CONVERSATION}${socketWrapper(conversationId)}`).emit(SOCKET_EVENTS.MESSAGE_CREATED, data);
```

Redis adapter 確保 emit 能到達每個 Node 進程上的客戶端 — 不僅限於處理 HTTP 請求的進程。

---

## 循環依賴問題

Action 發送 socket 事件。但輸入型 socket 事件（客戶端 → 伺服器）需要呼叫 action。若 `socket.js` import 了 action，而該 action import `socket.js` 來發送事件，就會產生循環依賴：Node 透過給其中一方一個空物件來解析，導致執行時錯誤。

**解決方案：** `socket.js` 永遠不直接 import action 檔案。當 socket 事件觸發 action 時，`socket.js` 呼叫 action 並以**context 物件**作為第二個參數傳入：

```javascript
// 在 services/socket.js 的 connect(socket) 內部
const { V1Connect } = require('../app/UserSocket/actions/V1Connect');

socket.on(SOCKET_EVENTS.SOME_EVENT, async (data, callback) => {
  try {
    const context = { io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper };
    const result = await V1Connect({ ...data, userId: socket.user.id }, context);
    return callback(null, result);
  } catch (error) {
    return callback(error);
  }
});
```

Action 接收 `(req, context)` 並使用 `context.io` 而非呼叫 `socket.getIO()`：

```javascript
async function V1Connect(req, context) {
  const { io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper } = context;
  // ... 驗證、執行工作，然後使用 context.io 發送事件
  io.to(`${SOCKET_ROOMS.USER}${socketWrapper(req.userId)}`).emit(SOCKET_EVENTS.SOME_EVENT, data);
}
```

這打破了循環：`socket.js` import action，但 action 不 import `socket.js`。socket service 實例是傳入的，而非 required 的。

**HTTP action** 沒有這個限制 — 它們不被 `socket.js` import。它們直接呼叫 `socket.getIO()`。

**Socket 觸發的 action 在失敗時拋出**（如背景任務），而非回傳 `errorResponse`。上方 `socket.on` 處理器中的 `catch` 捕獲拋出的錯誤並傳給 `callback`。

---

## 測試 socket emit

使用 `jest.spyOn` mock `getIO` 函數並對鏈式呼叫做斷言。

```javascript
const socket = require('../../../../services/socket');

describe('Message.V1Create', () => {
  let mockEmit;
  let mockTo;
  let getIOStub;

  beforeEach(async () => {
    // 建立 mock 鏈：io.to(room).emit(event, data)
    mockEmit = jest.fn();
    mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
    getIOStub = jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo });

    await populate('fix1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('[user] 建立訊息後應發送 MESSAGE_CREATED 事件', async () => {
    const { token } = await userLogin(app, routeVersion, request, userFix[0]);

    const res = await request(app)
      .post(routeUrl)
      .set('authorization', `jwt-user ${token}`)
      .send({ conversationId: fix1.conversationId, text: 'Hello' });

    expect(res.statusCode).toBe(201);

    // 斷言正確的 room 和事件
    expect(mockTo).toHaveBeenCalledWith(
      `${socket.SOCKET_ROOMS.CONVERSATION}${socket.socketWrapper(fix1.conversationId)}`
    );
    expect(mockEmit).toHaveBeenCalledWith(
      socket.SOCKET_EVENTS.MESSAGE_CREATED,
      expect.objectContaining({ text: 'Hello' })
    );
  });
});
```

對於 socket 觸發的 action（直接從 `connect()` 呼叫而非透過 HTTP），直接呼叫 action 函數並傳入 mock context 物件：

```javascript
const { V1Connect } = require('../../../../app/UserSocket/actions/V1Connect');

describe('UserSocket.V1Connect', () => {
  describe('Action Only', () => {
    it('連線時應加入使用者 room', async () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockIo = { to: mockTo };

      await V1Connect(
        { userId: userFix[0].id },
        { io: mockIo, SOCKET_ROOMS: socket.SOCKET_ROOMS, SOCKET_EVENTS: socket.SOCKET_EVENTS, socketWrapper: socket.socketWrapper }
      );

      expect(mockTo).toHaveBeenCalledWith(
        `${socket.SOCKET_ROOMS.USER}${socket.socketWrapper(userFix[0].id)}`
      );
    });
  });
});
```

---

## 新增 socket 事件

遵循 `add-socket-event` skill（`.claude/skills/add-socket-event/SKILL.md`）。概要步驟：

1. 在 `services/socket.js` 中將事件名稱加入 `SOCKET_EVENTS`（若需要也加入 room 到 `SOCKET_ROOMS`）。
2. **輸入型（客戶端 → 伺服器）：** 在 `connect(socket)` 中加入 `socket.on(...)` 處理器，以 context 物件呼叫 action。
3. **輸出型（伺服器 → 客戶端）：** 在 action 內部，在 `t.commit()` 之後使用 `socket.getIO()`（HTTP action）或注入的 `context.io`（socket 觸發的 action）發送事件。
4. 若測試頁面需要，在 `public/js/socket.js` 中加入客戶端監聽器。
5. 撰寫測試：使用 `jest.spyOn` mock `getIO` 並斷言 room、事件名稱和 payload。

關於完整的操作範例 — 常數、action、客戶端片段、測試和背景任務變體 — 請參閱建構操作教學：[`docs/tutorials/real-time.md`](../tutorials/real-time.md)。
