# 教學：新增即時通知

實作教學：當新文章發布時，透過 Socket.IO 即時通知所有連線的使用者。

---

## 我們要建立什麼

一個 `POST_PUBLISHED` socket 事件，在 `V1Publish`（一個 Post action）提交其 transaction 的瞬間觸發。訂閱了 `FEED` 房間的每個客戶端都能即時收到事件 — 不需要輪詢。

完成後你將擁有：

- `services/socket.js` 中的兩個新常數（`SOCKET_EVENTS.POST_PUBLISHED`、`SOCKET_ROOMS.FEED`）
- 一個在成功的 DB commit 後 emit 事件的 `V1Publish` action
- 一個展示如何訂閱的客戶端程式碼片段
- 一個斷言 emit 已發生的 Jest 測試
- 一個用於非同步發布流程的背景 task 變體

---

## 前置條件

- Postgres 和 Redis 在本機執行中（`yarn s` 啟動 web server，`yarn w` 啟動 worker）
- 已建立帶有 `status` 欄位（`draft` / `published`）和 `userId` FK 的 `Post` feature 骨架

---

## 步驟 1：新增 socket 常數

開啟 `services/socket.js`，在兩個現有的常數物件中新增：

```js
// socket 的房間
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL',
  USER: 'USER',
  TEST: 'TEST',

  FEED: 'FEED', // <-- 新增此項：所有對 feed 更新感興趣的連線使用者
}

// socket 可以 emit 或監聽的事件
const SOCKET_EVENTS = {
  TEST_SOCKET_EVENT_ONE: 'TEST_SOCKET_EVENT_ONE',
  TEST_SOCKET_EVENT_TWO: 'TEST_SOCKET_EVENT_TWO',

  POST_PUBLISHED: 'POST_PUBLISHED', // <-- 新增此項
}
```

`services/socket.js` 不需要其他更改 — 常數已透過 `module.exports` 重新匯出。

> **為什麼要用常數？** 散落在 actions 和客戶端程式碼中的字串常量會逐漸失去同步。在 `socket.js` 中保留單一來源意味著拼寫錯誤會在啟動時報錯，而不是靜默失效。

---

## 步驟 2：更新 V1Publish action

若 action 尚不存在，先產生它：

```bash
yarn gen Post -a V1Publish
```

然後填入 `app/Post/actions/V1Publish.js`：

```js
/**
 * POST V1Publish ACTION
 */

'use strict';

// third-party
const joi = require('joi'); // 參數驗證：https://github.com/hapijs/joi/blob/master/API.md

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS, getIO } = require('../../../services/socket');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Publish
}

/**
 * 發布草稿 Post 並即時通知所有 feed 訂閱者。
 *
 * GET  /v1/posts/publish
 * POST /v1/posts/publish
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @postId - (UUID - REQUIRED): 要發布的文章
 * }
 *
 * Success: Return the published post
 * Errors:
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   403: UNAUTHORIZED
 *   404: POST_NOT_FOUND
 *   500: INTERNAL_SERVER_ERROR
 */
async function V1Publish(req, res) {
  const schema = joi.object({
    postId: joi.string().uuid({ version: 'uuidv7' }).required()
  });

  // 驗證
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // 查找文章
    const post = await models.Post.findOne({
      where: {
        id: req.args.postId,
        userId: req.user.id // 所有權檢查 — 使用者只能發布自己的文章
      }
    });

    if (!post)
      return errorResponse(req, ERROR_CODES.POST_NOT_FOUND);

    let publishedPost;

    // 開始 transaction — DB 寫入必須是原子操作
    await models.sequelize.transaction(async t => {
      publishedPost = await post.update({
        status: 'published',
        publishedAt: new Date()
      }, { transaction: t });
    });

    // 在 transaction commit 之後才 emit — 永遠不要在 transaction 區塊內 emit
    // （rollback 會讓客戶端持有過時的狀態）
    const io = getIO();
    if (io) {
      io.to(SOCKET_ROOMS.FEED).emit(SOCKET_EVENTS.POST_PUBLISHED, {
        postId: publishedPost.id,
        title: publishedPost.title,
        publishedAt: publishedPost.publishedAt
      });
    }

    // 返回
    return {
      status: 200,
      success: true,
      post: publishedPost
    };
  } catch (error) {
    throw error;
  }
} // END V1Publish
```

重點說明：

- **`getIO()` 而非 `socket.get()`** — `getIO()` 是同步的，在 server 初始化之前返回 `null`。`if (io)` 防護意味著從不啟動 socket server 的測試仍然可以通過。
- **在 commit 後才 emit** — 在 `transaction()` callback 內 emit 有在資料列對其他連線可見之前通知客戶端的風險。永遠在 `await models.sequelize.transaction(...)` 呼叫解析後才 emit。
- **扁平回應** — payload 欄位在回應物件的頂層，不巢狀於 `data` 下。

---

## 步驟 3：客戶端（僅供參考）

瀏覽器（或 React Native 應用程式）在啟動時連線一次並訂閱 `FEED` 房間，然後監聽 `POST_PUBLISHED`：

```js
import { io } from 'socket.io-client';

// 以使用者的 access token 連線
const socket = io(process.env.API_URL, {
  auth: { token: accessToken }
});

// 加入 feed 房間
socket.emit('join', 'FEED'); // server 在 join 時將已驗證的 sockets 放入房間

// 監聽新文章
socket.on('POST_PUBLISHED', ({ postId, title, publishedAt }) => {
  console.log(`新文章："${title}" 發布於 ${publishedAt}`);
  // 在此更新你的 UI 狀態 — 例如在 feed 列表前面插入
});
```

> `services/socket.js` 中的伺服器端 `connect()` 處理器負責驗證 JWT 並將 socket 放入適當的房間。完整的房間加入模式請參見 `add-socket-event` skill。

---

## 步驟 4：測試 socket emit

位置：`app/Post/tests/integration/V1Publish.test.js`

```js
'use strict';

const app = require('../../../../app');
const models = require('../../../../models');
const socket = require('../../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../../services/socket');

// fixtures
const { user1, post1 } = require('../../tests/fixtures');

describe('POST /v1/posts/publish', () => {
  let emit;
  let toSpy;
  let ioMock;

  beforeEach(async () => {
    // 每個測試前將文章重置為草稿
    await models.Post.update({ status: 'draft', publishedAt: null }, { where: { id: post1.id } });

    // 建立可鏈接的 io mock：io.to(...).emit(...)
    emit = jest.fn();
    toSpy = jest.fn().mockReturnValue({ emit });
    ioMock = { to: toSpy };

    jest.spyOn(socket, 'getIO').mockReturnValue(ioMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('200 - publishes the post and emits POST_PUBLISHED to the FEED room', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/posts/publish',
      headers: { authorization: `Bearer ${user1.accessToken}` },
      payload: { postId: post1.id }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    // 斷言 socket 呼叫鏈
    expect(toSpy).toHaveBeenCalledWith(SOCKET_ROOMS.FEED);
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.POST_PUBLISHED,
      expect.objectContaining({
        postId: post1.id,
        title: post1.title,
        publishedAt: expect.any(String)
      })
    );
  });

  it('404 - returns POST_NOT_FOUND when the post belongs to another user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/posts/publish',
      headers: { authorization: `Bearer ${user1.accessToken}` },
      payload: { postId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } // 不屬於 user1
    });

    expect(res.statusCode).toBe(404);
    // socket 不應該被呼叫
    expect(toSpy).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
```

執行套件：

```bash
yarn test --testPathPattern=V1Publish
```

---

## 步驟 5：從背景 task 中 emit

有時發布是耗時的操作 — 產生預覽圖片、執行內容審核檢查 — 因此你將它交給背景 task 處理。模式完全相同：在非同步工作完成**之後**才 emit，永遠不要在中途 emit。

```js
/**
 * POST V1PublishTask TASK
 */

'use strict';

const joi = require('joi');

// services
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS, getIO } = require('../../../services/socket');
const { joiErrorsMessage } = require('../../../services/error');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1PublishTask
}

/**
 * 執行內容審核、產生預覽圖片，然後發布 Post。
 * 需要非同步處理時由 V1Publish 呼叫。
 *
 * @job = {
 *   @id - (INTEGER - REQUIRED): 背景工作的 ID
 *   @data = {
 *     @postId - (STRING UUID - REQUIRED): 要發布的文章
 *   }
 * }
 *
 * Success: Return true
 */
async function V1PublishTask(job) {
  const schema = joi.object({
    postId: joi.string().uuid({ version: 'uuidv7' }).required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));
  job.data = value;

  try {
    const post = await models.Post.findByPk(job.data.postId);
    if (!post)
      throw new Error(`Post ${job.data.postId} not found`);

    // --- 執行非同步工作 ---
    await runModerationCheck(post);
    await generatePreviewImage(post);
    // ---------------------

    // 提交狀態變更
    await models.sequelize.transaction(async t => {
      await post.update({
        status: 'published',
        publishedAt: new Date()
      }, { transaction: t });
    });

    // 所有工作提交後才 emit
    const io = getIO();
    if (io) {
      io.to(SOCKET_ROOMS.FEED).emit(SOCKET_EVENTS.POST_PUBLISHED, {
        postId: post.id,
        title: post.title,
        publishedAt: post.publishedAt
      });
    }

    return true;
  } catch (error) {
    throw error;
  }
} // END V1PublishTask
```

將工作放入 queue 的 action 返回 `202`（背景工作移交）而非 `200`：

```js
// 在 V1Publish 內（非同步變體）：
const PostQueue = queue.get('PostQueue');
const job = await PostQueue.add('V1PublishTask', { postId: req.args.postId });

return {
  status: 202,
  success: true,
  jobId: job.id
};
// 此處不 emit — task 在工作完成時才 emit
```

> **關鍵規則：** `202` 向客戶端表示工作正在處理中。客戶端應監聽 `POST_PUBLISHED` 以得知工作實際完成的時機。

---

## 摘要

| 步驟 | 變更內容 |
|---|---|
| `services/socket.js` | 新增 `SOCKET_ROOMS.FEED` 和 `SOCKET_EVENTS.POST_PUBLISHED` |
| `app/Post/actions/V1Publish.js` | 驗證參數 → 查找並驗證所有權 → transaction → commit → emit |
| 客戶端 JS | 訂閱 `FEED` 房間，處理 `POST_PUBLISHED` |
| `app/Post/tests/integration/V1Publish.test.js` | Mock `getIO`，斷言 `.to(FEED).emit(POST_PUBLISHED, ...)` |
| `app/Post/tasks/V1PublishTask.js` | 相同的 emit 模式，在非同步處理完成後執行 |

**防止所有 socket 錯誤的唯一規則：** 在 transaction 之外且之後才 emit，永遠不要在其內部。
