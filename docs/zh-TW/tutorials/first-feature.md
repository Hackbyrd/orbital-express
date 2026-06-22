# 建立你的第一個 Feature：Posts

這是一個實作教學，帶你一步步完成。結束時你將擁有一個可運作的 `Post` feature — 建立、列出和更新部落格文章 — 從 migration 到通過測試套件全部串接完畢。每個指令都是真實可用的；每行程式碼都可以直接複製貼上。

**開始前的準備**

- 已 checkout repo 並執行 `yarn install`
- PostgreSQL 在本機執行中（`yarn s` 應能連線）
- Redis 在本機執行中（Bull queues 和測試所需）
- 在乾淨的 checkout 上 `yarn test` 通過（確認你的環境正常運作）

---

## 我們要建立什麼

一個 `Post` 屬於一個 `User`。每篇文章有標題、內容、狀態（`draft` 或 `published`），以及可選的 `publishedAt` 時間戳記。我們將公開三個端點：

| 方法 | URL | 描述 |
|--------|-----|-------------|
| POST | `/v1/posts/create` | 建立文章 |
| POST | `/v1/posts/query` | 帶篩選器的分頁列表 |
| POST | `/v1/posts/update` | 更新標題/內容/狀態 |

---

## 步驟 1 — 產生 Feature 骨架

產生器是建立 feature 檔案的唯一方式。禁止手動建立。

```bash
yarn gen Post
```

產生器會在 `app/Post/` 下建立以下結構：

```
app/Post/
  actions/
    index.js          ← 桶裝檔案，由 gen/del 自動維護
    V1Example.js      ← 佔位符 — 立即刪除
  tests/
    integration/
      V1Example.test.js   ← 佔位符 — 立即刪除
  controller.js
  error.js
  helper.js
  languages/
    en.js
  model.js
  routes.js
  worker.js
```

它也會將 Post 路由加入全域路由器。

**立即移除佔位符檔案**（使用 `yarn del`，而非 `rm` — del 指令也會從 `actions/index.js` 中移除匯出）：

```bash
yarn del Post -a V1Example
```

然後直接刪除佔位符測試（測試沒有對應的 del 旗標）：

```bash
rm app/Post/tests/integration/V1Example.test.js
```

> 為什麼用 `yarn del` 而非 `rm`？產生器會自動維護 `actions/index.js`。如果你用 `rm` 刪除 action 檔案而不使用 `yarn del`，桶裝檔案中會留下一個損壞的 `require()`，導致 server 崩潰。

---

## 步驟 2 — 撰寫 Migration

使用 Sequelize CLI 建立 migration 檔案：

```bash
sequelize migration:create --name create-posts-table
```

開啟 `database/migrations/` 中新建立的檔案並替換其內容：

```javascript
/**
 * Migration: create-posts-table
 *
 * 建立 Posts 資料表。Paranoid 軟刪除（deletedAt）。
 * userId FK → Users.id，每一列都帶有複合唯一索引。
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Posts', {
      id: {
        type:         Sequelize.UUID,
        allowNull:    false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true
      },

      userId: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'Users', key: 'id' },
        onDelete:   'CASCADE',
        onUpdate:   'CASCADE'
      },

      title: {
        type:      Sequelize.STRING,
        allowNull: false
      },

      body: {
        type:      Sequelize.TEXT,
        allowNull: false,
        defaultValue: ''
      },

      status: {
        type:         Sequelize.STRING,
        allowNull:    false,
        defaultValue: 'draft'
      },

      isPublished: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: false
      },

      publishedAt: {
        type:      Sequelize.DATE,
        allowNull: true
      },

      // paranoid 軟刪除欄位
      deletedAt: {
        type:      Sequelize.DATE,
        allowNull: true
      },

      createdAt: {
        type:      Sequelize.DATE,
        allowNull: false
      },

      updatedAt: {
        type:      Sequelize.DATE,
        allowNull: false
      }
    });

    // 為 FK 建立索引，讓 join 和篩選查詢更快
    await queryInterface.addIndex('Posts', ['userId'], {
      name: 'Posts_userId_idx'
    });

    // Sequelize 在每次查詢時套用軟刪除篩選
    await queryInterface.addIndex('Posts', ['deletedAt'], {
      name: 'Posts_deletedAt_idx'
    });

    // query action 使用狀態篩選
    await queryInterface.addIndex('Posts', ['status'], {
      name: 'Posts_status_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Posts');
  }
};
```

執行 migration：

```bash
yarn migrate
# 或：sequelize db:migrate
```

**更新 `database/schema.sql`**

在 schema 文件檔案中新增一個 `Posts` 區塊，讓資料表可被發現。按字母順序放在 `Users` 區塊之後：

```sql
-- ─────────────────────────────────────────────
-- Posts
-- ─────────────────────────────────────────────
-- id            UUID PK
-- userId        UUID FK → Users.id (CASCADE delete/update)
-- title         STRING  NOT NULL
-- body          TEXT    NOT NULL  DEFAULT ''
-- status        STRING  NOT NULL  DEFAULT 'draft'  ('draft' | 'published')
-- isPublished   BOOLEAN NOT NULL  DEFAULT false
-- publishedAt   DATE    NULLABLE
-- deletedAt     DATE    NULLABLE  (paranoid soft-delete)
-- createdAt     DATE    NOT NULL
-- updatedAt     DATE    NOT NULL
```

**更新 `database/sequence.js`**

將 `'post'`（單數小寫 — Sequelize model 名稱）加入 sequence 陣列。放在 `'userSession'` 之後或任何邏輯合適的位置：

```javascript
module.exports = [
  'user',
  'userSession',
  'post',          // ← 新增此行
  // ... 其餘 sequence
];
```

sequence 控制 fixtures 和 seed 資料插入的順序。`post` 依賴 `user`，因此必須在 `'user'` 之後。

---

## 步驟 3 — 撰寫 Model

開啟 `app/Post/model.js` 並替換產生的佔位符：

```javascript
/**
 * POST MODEL
 *
 * Post 是由 User 撰寫的內容。Posts 採用軟刪除（paranoid: true），
 * 因此歷史記錄永遠不會遺失。
 *
 * 資料表 Schema 請見："/database/schema.sql"
 */

'use strict';

// helpers
const constants = require('../../helpers/constants');

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('post', {

    id: {
      type:         DataTypes.UUID,
      allowNull:    false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
      validate:     { isUUID: 4 }
    },

    // 所有外鍵在下方的 associate() 中新增

    title: {
      type:      DataTypes.STRING,
      allowNull: false
    },

    body: {
      type:         DataTypes.TEXT,
      allowNull:    false,
      defaultValue: ''
    },

    status: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: constants.POST_STATUS.DRAFT
    },

    isPublished: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false
    },

    publishedAt: {
      type:      DataTypes.DATE,
      allowNull: true
    }

  }, {
    timestamps:      true,
    paranoid:        true,   // 軟刪除：設定 deletedAt 而非刪除資料列
    freezeTableName: true,
    tableName:       'Posts',

    indexes: [
      { name: 'Posts_userId_idx',    fields: ['userId'] },
      { name: 'Posts_deletedAt_idx', fields: ['deletedAt'] },
      { name: 'Posts_status_idx',    fields: ['status'] }
    ],

    defaultScope: {
      // Post 沒有敏感欄位，但我們從預設回應中排除 deletedAt，
      // 避免客戶端看到軟刪除的墓碑標記。
      attributes: {
        exclude: ['deletedAt']
      }
    }
  });

  Post.associate = models => {
    // 每篇文章恰好屬於一個使用者（作者）
    Post.belongsTo(models.user, {
      as:          'user',
      foreignKey: {
        name:      'userId',
        allowNull: false
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }; // END associate

  return Post;
}; // END POST MODEL
```

---

## 步驟 4 — 新增 POST_STATUS 常數

永遠不要在業務邏輯中硬編碼狀態字串。新增一次常數並在各處引用。

開啟 `helpers/constants.js` 並加入匯出物件：

```javascript
// Post 狀態
POST_STATUS:  { DRAFT: 'draft', PUBLISHED: 'published' },
POST_STATUSES: ['draft', 'published'],
```

放在其他領域狀態常數附近（例如 `USER_ROLE` 之後）。雙重匯出模式（`POST_STATUS` 用於鍵值查找，`POST_STATUSES` 用於 Joi 的 `.valid(...spread)`）是此程式碼庫通用的慣例。

---

## 步驟 5 — 撰寫 V1Create

產生 action 檔案：

```bash
yarn gen Post -a V1Create
```

開啟建立的 `app/Post/actions/V1Create.js` 並替換其內容：

```javascript
/**
 * POST V1Create ACTION
 *
 * 建立屬於已驗證使用者的新 Post。
 */

'use strict';

// third-party
const joi = require('joi');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { POST_STATUS, POST_STATUSES } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Create
};

/**
 * V1Create
 * 建立屬於目前登入使用者的 Post。
 *
 * POST /v1/posts/create
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @title       - (STRING - REQUIRED) 顯示標題，最多 500 字元
 *   @body        - (STRING - OPTIONAL) 文章內容，預設為 ''
 *   @status      - (STRING - OPTIONAL) 'draft'（預設）或 'published'
 *   @publishedAt - (DATE   - OPTIONAL) ISO 時間戳記；status 為 'published' 時必填
 * }
 *
 * Success: { status: 201, success: true, post: {...} }
 * @ERROR_CODES
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 */
async function V1Create(req, res) {
  const schema = joi.object({
    title: joi.string().trim().min(1).max(500).required(),
    body:  joi.string().trim().allow('').default(''),

    status: joi.string()
      .valid(...POST_STATUSES)
      .default(POST_STATUS.DRAFT),

    // status 為 'published' 時，publishedAt 為必填
    publishedAt: joi.when('status', {
      is:   POST_STATUS.PUBLISHED,
      then: joi.date().iso().required(),
      otherwise: joi.date().iso().optional().allow(null)
    })
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  const t = await models.db.transaction();

  try {
    const post = await models.post.create({
      userId:      req.user.id,
      title:       req.args.title,
      body:        req.args.body,
      status:      req.args.status,
      isPublished: req.args.status === POST_STATUS.PUBLISHED,
      publishedAt: req.args.publishedAt || null
    }, { transaction: t });

    await t.commit();

    return {
      status:  201,
      success: true,
      post:    post.toJSON()
    };
  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
} // END V1Create
```

---

## 步驟 6 — 撰寫 V1Query

產生 action：

```bash
yarn gen Post -a V1Query
```

開啟 `app/Post/actions/V1Query.js`：

```javascript
/**
 * POST V1Query ACTION
 *
 * 返回 posts 的分頁列表。支援依狀態和 userId 篩選。
 */

'use strict';

// third-party
const joi = require('joi');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { POST_STATUSES } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// 模組層級常數
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

// methods
module.exports = {
  V1Query
};

/**
 * V1Query
 * 返回 posts 的分頁篩選列表。
 *
 * POST /v1/posts/query
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @page     - (INTEGER - OPTIONAL) 從 1 開始的頁碼，預設為 1
 *   @limit    - (INTEGER - OPTIONAL) 每頁筆數，最多 100，預設為 20
 *   @status   - (STRING  - OPTIONAL) 依文章狀態篩選
 *   @userId   - (UUID    - OPTIONAL) 依作者篩選
 * }
 *
 * Success: { status: 200, success: true, posts: [...], total: N, page: N, limit: N }
 * @ERROR_CODES
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 */
async function V1Query(req, res) {
  const schema = joi.object({
    page:   joi.number().integer().min(1).default(1),
    limit:  joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    status: joi.string().valid(...POST_STATUSES).optional(),
    userId: joi.string().uuid({ version: 'uuidv4' }).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  // 建立動態 where 子句
  const where = {};
  if (req.args.status) where.status = req.args.status;
  if (req.args.userId) where.userId = req.args.userId;

  const offset = (req.args.page - 1) * req.args.limit;

  const { count, rows } = await models.post.findAndCountAll({
    where,
    order:  [['createdAt', 'DESC']],
    limit:  req.args.limit,
    offset
  });

  return {
    status:  200,
    success: true,
    posts:   rows.map(p => p.toJSON()),
    total:   count,
    page:    req.args.page,
    limit:   req.args.limit
  };
} // END V1Query
```

---

## 步驟 7 — 撰寫 V1Update

```bash
yarn gen Post -a V1Update
```

開啟 `app/Post/actions/V1Update.js`：

```javascript
/**
 * POST V1Update ACTION
 *
 * 更新 Post。只有文章的擁有者可以更新它。
 */

'use strict';

// third-party
const joi = require('joi');

// services
const { ERROR_CODES, errorResponse, joiErrorsMessage } = require('../../../services/error');

// helpers
const { POST_STATUS, POST_STATUSES } = require('../../../helpers/constants');

// models
const models = require('../../../models');

// methods
module.exports = {
  V1Update
};

/**
 * V1Update
 * 更新 Post 的可編輯欄位。強制所有權 — 只有作者（或管理員）可以更新文章。
 *
 * POST /v1/posts/update
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @postId      - (UUID   - REQUIRED)
 *   @title       - (STRING - OPTIONAL) 新標題
 *   @body        - (STRING - OPTIONAL) 新內容
 *   @status      - (STRING - OPTIONAL) 新狀態
 *   @publishedAt - (DATE   - OPTIONAL) 新發布時間戳記
 * }
 *
 * Success: { status: 200, success: true, post: {...} }
 * @ERROR_CODES
 *   400: BAD_REQUEST_INVALID_ARGUMENTS
 *   403: POST_FORBIDDEN
 *   404: POST_NOT_FOUND
 */
async function V1Update(req, res) {
  const schema = joi.object({
    postId:      joi.string().uuid({ version: 'uuidv4' }).required(),
    title:       joi.string().trim().min(1).max(500).optional(),
    body:        joi.string().trim().allow('').optional(),
    status:      joi.string().valid(...POST_STATUSES).optional(),
    publishedAt: joi.date().iso().allow(null).optional()
  });

  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  // 此處不需要 scope(null) — 已軟刪除的文章不應可編輯
  const post = await models.post.findOne({ where: { id: req.args.postId } });
  if (!post)
    return errorResponse(req, ERROR_CODES.POST_NOT_FOUND);

  // 只有作者或管理員可以更新文章
  const { USER_ROLE } = require('../../../helpers/constants');
  if (post.userId !== req.user.id && req.user.role !== USER_ROLE.ADMIN)
    return errorResponse(req, ERROR_CODES.POST_FORBIDDEN);

  // 僅從呼叫端提供的欄位建立更新 payload
  const updates = {};
  if (req.args.title       !== undefined) updates.title       = req.args.title;
  if (req.args.body        !== undefined) updates.body        = req.args.body;
  if (req.args.publishedAt !== undefined) updates.publishedAt = req.args.publishedAt;

  if (req.args.status !== undefined) {
    updates.status      = req.args.status;
    updates.isPublished = req.args.status === POST_STATUS.PUBLISHED;
  }

  const t = await models.db.transaction();

  try {
    await post.update(updates, { transaction: t });
    await t.commit();

    return {
      status:  200,
      success: true,
      post:    post.toJSON()
    };
  } catch (err) {
    if (!t.finished) await t.rollback();
    throw err;
  }
} // END V1Update
```

---

## 步驟 7b — 新增錯誤碼

V1Update action 引用了 `POST_NOT_FOUND` 和 `POST_FORBIDDEN`。開啟 `app/Post/error.js` 並填入：

```javascript
/**
 * POST ERROR
 *
 * Post feature 的功能範圍 4xx 錯誤碼。
 * 在啟動時由 /services/error.js 合併至 ERROR_CODES。
 */

'use strict';

const LOCAL_ERROR_CODES = {
  POST_NOT_FOUND: {
    error:    'POST.NOT_FOUND',
    status:   404,
    messages: ['POST[post_not_found]']
  },

  POST_FORBIDDEN: {
    error:    'POST.FORBIDDEN',
    status:   403,
    messages: ['POST[post_forbidden]']
  }
};

module.exports = LOCAL_ERROR_CODES;
```

---

## 步驟 7c — 串接路由和 Controller

開啟 `app/Post/routes.js` 並替換產生的檔案：

```javascript
/**
 * POST ROUTES
 */

'use strict';

const controller = require('./controller');

module.exports = (passport, router) => {
  router.all('/v1/posts/create', controller.V1Create);
  router.all('/v1/posts/query',  controller.V1Query);
  router.all('/v1/posts/update', controller.V1Update);
  return router;
};
```

開啟 `app/Post/controller.js`：

```javascript
/**
 * POST CONTROLLER
 *
 * 將路由對應至 actions；強制執行驗證。
 */

'use strict';

// services
const { ERROR_CODES, errorResponse } = require('../../services/error');

// actions
const actions = require('./actions');

module.exports = {
  V1Create,
  V1Query,
  V1Update
};

async function V1Create(req, res, next) {
  if (!req.user) return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  try {
    const result = await actions.V1Create(req, res);
    return res.status(result.status).json(result);
  } catch (err) { return next(err); }
} // END V1Create

async function V1Query(req, res, next) {
  if (!req.user) return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  try {
    const result = await actions.V1Query(req, res);
    return res.status(result.status).json(result);
  } catch (err) { return next(err); }
} // END V1Query

async function V1Update(req, res, next) {
  if (!req.user) return res.status(401).json(errorResponse(req, ERROR_CODES.UNAUTHORIZED));
  try {
    const result = await actions.V1Update(req, res);
    return res.status(result.status).json(result);
  } catch (err) { return next(err); }
} // END V1Update
```

---

## 步驟 8 — 撰寫 i18n 鍵值並執行 yarn lang

每個可能向使用者顯示的字串都放在語言檔案中，而非程式碼中。開啟 `app/Post/languages/en.js`：

```javascript
/**
 * Post Language File: English
 */

'use strict';

module.exports = {
  'POST[post_not_found]': 'Post not found.',
  'POST[post_forbidden]': 'You do not have permission to modify this post.'
};
```

現在編譯並驗證：

```bash
yarn lang
```

此指令讀取所有 features 中的每個 `languages/en.js` 檔案，將它們合併至 `locales/en.json`，並驗證 `error.js` 檔案中引用的每個鍵值實際上存在於語言檔案中。若有鍵值缺失，指令會告訴你確切是哪一個。繼續之前先修復它 — `yarn test` 會先執行 `yarn lang`，若此步驟有問題會快速失敗。

---

## 步驟 9 — 新增測試 Fixtures

建立 `test/fixtures/fix1/post.js`。Fixtures 是在每個測試之前插入的基準資料列。給它們確定性的 UUID，讓測試可以透過 ID 引用它們。

```javascript
/**
 * Post Fixture Data (fix1)
 *
 * 依賴 user.js fixture 先行插入（userId 引用）。
 * Users[0]（admin）  → id: '84f53e1d-32d0-411f-984a-8d45cbba8d47'
 * Users[1]（user）   → id: '3f726cb9-6c95-4fed-b0fb-60732901ccd8'
 */

'use strict';

module.exports = [
  {
    id:          'a1b2c3d4-0000-4000-8000-000000000001',
    userId:      '84f53e1d-32d0-411f-984a-8d45cbba8d47', // admin 使用者
    title:       'First Post',
    body:        'Body of the first post.',
    status:      'draft',
    isPublished: false,
    publishedAt: null
  },
  {
    id:          'a1b2c3d4-0000-4000-8000-000000000002',
    userId:      '3f726cb9-6c95-4fed-b0fb-60732901ccd8', // 一般使用者
    title:       'Published Post',
    body:        'This one is live.',
    status:      'published',
    isPublished: true,
    publishedAt: '2026-01-01T00:00:00.000Z'
  }
];
```

---

## 步驟 10 — 撰寫 V1Create 的測試

建立 `app/Post/tests/integration/V1Create.test.js`：

```javascript
/**
 * TEST POST V1Create METHOD
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config/.env.test') });

const _ = require('lodash');
const models  = require('../../../../models');
const request = require('supertest');
const queue   = require('../../../../services/queue');
const socket  = require('../../../../services/socket');
const { userLogin, reset, populate } = require('../../../../helpers/tests');

let app = null;

describe('Post.V1Create', () => {
  // 每個 describe 都複製 fixture，避免一個測試的變更影響到另一個
  const userFixFn = () => _.cloneDeep(require('../../../../test/fixtures/fix1/user'));
  let userFix = null;

  const routeUrl = '/v1/posts/create';

  beforeAll(async () => { app = await require('../../../../server'); });
  beforeEach(async () => { userFix = userFixFn(); await reset(); });
  afterAll(async () => {
    await queue.closeAll();
    await socket.close();
    await models.db.close();
    app.close();
  });

  // ─── 未登入 ──────────────────────────────────────────────────────────────

  describe('Role: Logged Out', () => {
    beforeEach(async () => { await populate('fix1'); });

    it('[logged-out] should return 401', async () => {
      const res = await request(app).post(routeUrl).send({ title: 'Hello' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── 已登入（任何角色）────────────────────────────────────────────────────

  describe('Role: User', () => {
    beforeEach(async () => { await populate('fix1'); });

    it('[user] should create a draft post with minimal args', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[1]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ title: 'My First Post' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post.title).toBe('My First Post');
      expect(res.body.post.status).toBe('draft');
      expect(res.body.post.isPublished).toBe(false);
      // 文章應屬於已登入的使用者
      expect(res.body.post.userId).toBe(userFix[1].id);
    });

    it('[user] should create a published post when status and publishedAt are provided', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[1]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({
          title:       'Published Post',
          body:        'Full body text.',
          status:      'published',
          publishedAt: '2026-06-01T12:00:00.000Z'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.post.isPublished).toBe(true);
      expect(res.body.post.status).toBe('published');
    });

    it('[user] should return 400 when title is missing', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[1]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ body: 'No title supplied' });

      expect(res.statusCode).toBe(400);
    });

    it('[user] should return 400 when status is published but publishedAt is missing', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[1]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ title: 'Publishing without a date', status: 'published' });

      expect(res.statusCode).toBe(400);
    });

    it('[user] should return 400 when status is an invalid value', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[1]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ title: 'Bad status', status: 'archived' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Role: Admin', () => {
    beforeEach(async () => { await populate('fix1'); });

    it('[admin] should create a post owned by the admin user', async () => {
      const { token } = await userLogin(app, '/v1', request, userFix[0]);

      const res = await request(app)
        .post(routeUrl)
        .set('authorization', `jwt-user ${token}`)
        .send({ title: 'Admin Post', body: 'Written by admin.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.post.userId).toBe(userFix[0].id);
    });
  });
}); // END Post.V1Create
```

測試結構嚴格遵循慣例：

- `beforeAll` 為整個套件啟動 server 一次
- `beforeEach` 重置 DB 並重新複製 fixtures，確保每個測試都從乾淨狀態開始
- `afterAll` 關閉所有連線（queue、socket、DB、server）
- 每個角色有獨立的 `describe` 區塊
- 測試涵蓋：正常路徑、無法執行的情境（未登入），以及每個 `@ERROR_CODES` 分支

為 `V1Query` 和 `V1Update` 撰寫類似的測試檔案 — 至少涵蓋：未登入的 401、所有權強制執行（V1Update 的 403），以及找不到資源的 404。

---

## 步驟 11 — 執行完整測試套件

```bash
yarn test
```

依序執行：

1. `yarn lang` — 編譯並驗證所有 i18n 鍵值
2. SQL fix 腳本 — 確保 DB schema 是乾淨的
3. `jest --runInBand` — 序列執行所有測試（必要，因為測試共用一個真實的 Postgres + Redis 實例，不能並行執行）

通過的執行看起來像這樣：

```
PASS app/Post/tests/integration/V1Create.test.js
  Post.V1Create
    Role: Logged Out
      ✓ [logged-out] should return 401 (38 ms)
    Role: User
      ✓ [user] should create a draft post with minimal args (61 ms)
      ✓ [user] should create a published post when status and publishedAt are provided (55 ms)
      ✓ [user] should return 400 when title is missing (22 ms)
      ✓ [user] should return 400 when status is published but publishedAt is missing (21 ms)
      ✓ [user] should return 400 when status is an invalid value (20 ms)
    Role: Admin
      ✓ [admin] should create a post owned by the admin user (58 ms)
```

若有任何紅色，仔細閱讀錯誤 — 幾乎都是以下情況之一：

- 缺少 i18n 鍵值（在 `languages/en.js` 中修復，重新執行 `yarn lang`）
- Fixture 排序問題（檢查 `database/sequence.js`）
- 桶裝檔案中的損壞 `require()`（下次正確使用 `yarn del`）

---

## 你現在擁有了什麼

```
app/Post/
  actions/
    index.js          ← 桶裝檔案，包含 V1Create、V1Query、V1Update
    V1Create.js
    V1Query.js
    V1Update.js
  tests/
    integration/
      V1Create.test.js
  controller.js       ← 驗證強制執行 + action 分派
  error.js            ← POST_NOT_FOUND、POST_FORBIDDEN
  helper.js           ← （空的，準備好放共用 helpers）
  languages/
    en.js             ← post_not_found、post_forbidden 鍵值
  model.js            ← Post Sequelize model，含關聯
  routes.js           ← /v1/posts/{create,query,update}
  worker.js           ← （空的，準備好放背景 tasks）

database/
  migrations/<timestamp>-create-posts-table.js
  schema.sql          ← 新增了 Posts 區塊
  sequence.js         ← 新增了 'post'

helpers/constants.js  ← 新增了 POST_STATUS、POST_STATUSES

test/fixtures/fix1/
  post.js
```

**你在這裡遵循的模式適用於程式碼庫中的每個 feature。** 形式永遠是：骨架 → migration → model → constants → actions → controller/routes → i18n → fixtures → tests。將這個順序內化，新 feature 的建立就會又快又一致。
