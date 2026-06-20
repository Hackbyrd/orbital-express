# Build Your First Feature: Posts

This is a hands-on, build-along tutorial. By the end you will have a working
`Post` feature — create, list, and update blog posts — wired all the way from
the migration to a passing test suite. Every command is real; every line of code
is copy-pasteable.

**What you need before starting**

- The repo checked out and `yarn install` run
- PostgreSQL running locally (`yarn s` should connect)
- Redis running locally (required by Bull queues and tests)
- `yarn test` passing on a clean checkout (confirms your environment works)

---

## What We Are Building

A `Post` belongs to a `User`. Each post has a title, a body, a status
(`draft` or `published`), and an optional `publishedAt` timestamp. We will
expose three endpoints:

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/v1/posts/create` | Create a post |
| POST | `/v1/posts/query` | Paginated list with filters |
| POST | `/v1/posts/update` | Update title / body / status |

---

## Step 1 — Generate the Feature Scaffold

The generator is the only way to create feature files. Never hand-create them.

```bash
yarn gen Post
```

The generator creates the following structure under `app/Post/`:

```
app/Post/
  actions/
    index.js          ← barrel file, auto-maintained by gen/del
    V1Example.js      ← placeholder — delete immediately
  tests/
    integration/
      V1Example.test.js   ← placeholder — delete immediately
  controller.js
  error.js
  helper.js
  languages/
    en.js
  model.js
  routes.js
  worker.js
```

It also adds the Post routes to the global router.

**Remove the placeholder files immediately** (using `yarn del`, not `rm` — the
del command also removes the export from `actions/index.js`):

```bash
yarn del Post -a V1Example
```

Then delete the placeholder test directly (no del flag for tests):

```bash
rm app/Post/tests/integration/V1Example.test.js
```

> Why `yarn del` instead of `rm`? The generator maintains `actions/index.js`
> automatically. If you `rm` an action file without using `yarn del` you leave a
> broken `require()` in the barrel that will crash the server.

---

## Step 2 — Write the Migration

Create a migration file with the Sequelize CLI:

```bash
sequelize migration:create --name create-posts-table
```

Open the newly created file in `database/migrations/` and replace its contents:

```javascript
/**
 * Migration: create-posts-table
 *
 * Creates the Posts table. Paranoid soft-delete (deletedAt).
 * userId FK → Users.id with composite unique index carried on every row.
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

      // paranoid soft-delete column
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

    // Index the FK so joins and filtered queries are fast
    await queryInterface.addIndex('Posts', ['userId'], {
      name: 'Posts_userId_idx'
    });

    // Soft-delete filter is applied on every query by Sequelize
    await queryInterface.addIndex('Posts', ['deletedAt'], {
      name: 'Posts_deletedAt_idx'
    });

    // Status filter is used by the query action
    await queryInterface.addIndex('Posts', ['status'], {
      name: 'Posts_status_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Posts');
  }
};
```

Run the migration:

```bash
yarn migrate
# or: sequelize db:migrate
```

**Update `database/schema.sql`**

Add a `Posts` block to the schema documentation file so the table is
discoverable. Place it after the `Users` block, alphabetically:

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

**Update `database/sequence.js`**

Add `'post'` (singular, lowercase — Sequelize model name) to the sequence
array. Place it after `'userSession'` or wherever it logically fits:

```javascript
module.exports = [
  'user',
  'userSession',
  'post',          // ← add this line
  // ... rest of your sequence
];
```

The sequence controls the order in which fixtures and seed data are inserted.
A `post` depends on a `user`, so it must come after `'user'`.

---

## Step 3 — Write the Model

Open `app/Post/model.js` and replace the generated placeholder:

```javascript
/**
 * POST MODEL
 *
 * A Post is a piece of content authored by a User. Posts are soft-deleted
 * (paranoid: true) so historical records are never lost.
 *
 * Find Table Schema Here: "/database/schema.sql"
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

    // All foreign keys are added in associate() below

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
    paranoid:        true,   // soft-delete: sets deletedAt instead of removing the row
    freezeTableName: true,
    tableName:       'Posts',

    indexes: [
      { name: 'Posts_userId_idx',    fields: ['userId'] },
      { name: 'Posts_deletedAt_idx', fields: ['deletedAt'] },
      { name: 'Posts_status_idx',    fields: ['status'] }
    ],

    defaultScope: {
      // No sensitive columns on Post, but we exclude deletedAt from default
      // responses so clients do not see the soft-delete tombstone.
      attributes: {
        exclude: ['deletedAt']
      }
    }
  });

  Post.associate = models => {
    // Every post belongs to exactly one user (the author)
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

## Step 4 — Add the POST_STATUS Constant

Never hard-code status strings in business logic. Add the constant once and
reference it everywhere.

Open `helpers/constants.js` and add to the exports object:

```javascript
// Post statuses
POST_STATUS:  { DRAFT: 'draft', PUBLISHED: 'published' },
POST_STATUSES: ['draft', 'published'],
```

Place it near the other domain-status constants (after `USER_ROLE`, for
example). The dual-export pattern (`POST_STATUS` for keyed lookup,
`POST_STATUSES` for Joi `.valid(...spread)`) is the convention used throughout
this codebase.

---

## Step 5 — Write V1Create

Generate the action file:

```bash
yarn gen Post -a V1Create
```

Open the created `app/Post/actions/V1Create.js` and replace its contents:

```javascript
/**
 * POST V1Create ACTION
 *
 * Creates a new Post belonging to the authenticated user.
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
 * Creates a Post owned by the currently logged-in user.
 *
 * POST /v1/posts/create
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @title       - (STRING - REQUIRED) display title, max 500 chars
 *   @body        - (STRING - OPTIONAL) post body text, defaults to ''
 *   @status      - (STRING - OPTIONAL) 'draft' (default) or 'published'
 *   @publishedAt - (DATE   - OPTIONAL) ISO timestamp; required when status is 'published'
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

    // publishedAt is required when status is 'published'
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

## Step 6 — Write V1Query

Generate the action:

```bash
yarn gen Post -a V1Query
```

Open `app/Post/actions/V1Query.js`:

```javascript
/**
 * POST V1Query ACTION
 *
 * Returns a paginated list of posts. Supports filtering by status and userId.
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

// module-level constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

// methods
module.exports = {
  V1Query
};

/**
 * V1Query
 * Returns a paginated, filtered list of posts.
 *
 * POST /v1/posts/query
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @page     - (INTEGER - OPTIONAL) 1-based page number, default 1
 *   @limit    - (INTEGER - OPTIONAL) results per page, max 100, default 20
 *   @status   - (STRING  - OPTIONAL) filter by post status
 *   @userId   - (UUID    - OPTIONAL) filter by author
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

  // Build dynamic where clause
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

## Step 7 — Write V1Update

```bash
yarn gen Post -a V1Update
```

Open `app/Post/actions/V1Update.js`:

```javascript
/**
 * POST V1Update ACTION
 *
 * Updates a Post. Only the post's owner may update it.
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
 * Updates editable fields on a Post. Enforces ownership — only the author
 * (or an admin) may update a post.
 *
 * POST /v1/posts/update
 *
 * Must be logged in
 * Roles: [admin, manager, user]
 *
 * req.args = {
 *   @postId      - (UUID   - REQUIRED)
 *   @title       - (STRING - OPTIONAL) new title
 *   @body        - (STRING - OPTIONAL) new body text
 *   @status      - (STRING - OPTIONAL) new status
 *   @publishedAt - (DATE   - OPTIONAL) new publish timestamp
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

  // Scope(null) is not needed here — soft-deleted posts should not be editable
  const post = await models.post.findOne({ where: { id: req.args.postId } });
  if (!post)
    return errorResponse(req, ERROR_CODES.POST_NOT_FOUND);

  // Only the author or an admin may update the post
  const { USER_ROLE } = require('../../../helpers/constants');
  if (post.userId !== req.user.id && req.user.role !== USER_ROLE.ADMIN)
    return errorResponse(req, ERROR_CODES.POST_FORBIDDEN);

  // Build the update payload from only the fields the caller supplied
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

## Step 7b — Add Error Codes

The V1Update action references `POST_NOT_FOUND` and `POST_FORBIDDEN`. Open
`app/Post/error.js` and fill it in:

```javascript
/**
 * POST ERROR
 *
 * Feature-scoped 4xx error codes for the Post feature.
 * Gets merged into ERROR_CODES by /services/error.js at boot.
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

## Step 7c — Wire Up Routes and Controller

Open `app/Post/routes.js` and replace the generated file:

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

Open `app/Post/controller.js`:

```javascript
/**
 * POST CONTROLLER
 *
 * Maps routes to actions; enforces authentication.
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

## Step 8 — Write i18n Keys and Run yarn lang

Every string that could be shown to a user lives in the language files, not in
code. Open `app/Post/languages/en.js`:

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

Now compile and validate:

```bash
yarn lang
```

This command reads every `languages/en.js` file across all features, merges
them into `locales/en.json`, and validates that every key referenced in
`error.js` files actually exists in the language files. If a key is missing the
command will tell you exactly which one. Fix it before moving on — `yarn test`
runs `yarn lang` first and will fail if this step is broken.

---

## Step 9 — Add Test Fixtures

Create `test/fixtures/fix1/post.js`. Fixtures are baseline rows inserted before
each test. Give them deterministic UUIDs so tests can reference them by ID.

```javascript
/**
 * Post Fixture Data (fix1)
 *
 * Depends on user.js fixture being inserted first (userId references).
 * Users[0] (admin)  → id: '84f53e1d-32d0-411f-984a-8d45cbba8d47'
 * Users[1] (user)   → id: '3f726cb9-6c95-4fed-b0fb-60732901ccd8'
 */

'use strict';

module.exports = [
  {
    id:          'a1b2c3d4-0000-4000-8000-000000000001',
    userId:      '84f53e1d-32d0-411f-984a-8d45cbba8d47', // admin user
    title:       'First Post',
    body:        'Body of the first post.',
    status:      'draft',
    isPublished: false,
    publishedAt: null
  },
  {
    id:          'a1b2c3d4-0000-4000-8000-000000000002',
    userId:      '3f726cb9-6c95-4fed-b0fb-60732901ccd8', // regular user
    title:       'Published Post',
    body:        'This one is live.',
    status:      'published',
    isPublished: true,
    publishedAt: '2026-01-01T00:00:00.000Z'
  }
];
```

---

## Step 10 — Write the Test for V1Create

Create `app/Post/tests/integration/V1Create.test.js`:

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
  // Clone fixture on each describe so mutations in one test don't bleed into another
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

  // ─── Logged Out ──────────────────────────────────────────────────────────────

  describe('Role: Logged Out', () => {
    beforeEach(async () => { await populate('fix1'); });

    it('[logged-out] should return 401', async () => {
      const res = await request(app).post(routeUrl).send({ title: 'Hello' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Logged In (any role) ────────────────────────────────────────────────────

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
      // The post should be owned by the logged-in user
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

The test structure follows the convention strictly:

- `beforeAll` starts the server once for the suite
- `beforeEach` resets the DB and re-clones fixtures so each test starts clean
- `afterAll` closes all connections (queue, socket, DB, server)
- Separate `describe` blocks for each role
- Tests cover: happy path, who cannot do it (logged out), and each
  `@ERROR_CODES` branch

Write similar test files for `V1Query` and `V1Update` — at minimum covering
logged-out 401, ownership enforcement (403 on V1Update), and not-found 404.

---

## Step 11 — Run the Full Test Suite

```bash
yarn test
```

This runs in order:

1. `yarn lang` — compiles and validates all i18n keys
2. SQL fix scripts — ensures the DB schema is clean
3. `jest --runInBand` — runs all tests serially (required because tests share a
   real Postgres + Redis instance and must not run concurrently)

A passing run looks like:

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

If anything is red, read the error carefully — it will almost always be one of:

- A missing i18n key (fix in `languages/en.js`, re-run `yarn lang`)
- A fixture sequencing issue (check `database/sequence.js`)
- A broken `require()` in the barrel (run `yarn del` correctly next time)

---

## What You Now Have

```
app/Post/
  actions/
    index.js          ← barrel with V1Create, V1Query, V1Update
    V1Create.js
    V1Query.js
    V1Update.js
  tests/
    integration/
      V1Create.test.js
  controller.js       ← auth enforcement + action dispatch
  error.js            ← POST_NOT_FOUND, POST_FORBIDDEN
  helper.js           ← (empty, ready for shared helpers)
  languages/
    en.js             ← post_not_found, post_forbidden keys
  model.js            ← Post Sequelize model with associations
  routes.js           ← /v1/posts/{create,query,update}
  worker.js           ← (empty, ready for background tasks)

database/
  migrations/<timestamp>-create-posts-table.js
  schema.sql          ← Posts block added
  sequence.js         ← 'post' added

helpers/constants.js  ← POST_STATUS, POST_STATUSES added

test/fixtures/fix1/
  post.js
```

**The pattern you followed here applies to every feature in the codebase.** The
shape is always: scaffold → migration → model → constants → actions →
controller/routes → i18n → fixtures → tests. Internalise that order and new
features become fast and consistent.
