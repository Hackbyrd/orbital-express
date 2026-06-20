# Tutorial: Add Real-Time Notifications

Build-along tutorial: when a new Post is published, notify all connected users in real time via Socket.IO.

---

## What we're building

A `POST_PUBLISHED` socket event that fires the moment `V1Publish` (a Post action) commits its transaction. Every client subscribed to the `FEED` room receives the event instantly — no polling required.

By the end you will have:

- Two new constants in `services/socket.js` (`SOCKET_EVENTS.POST_PUBLISHED`, `SOCKET_ROOMS.FEED`)
- A `V1Publish` action that emits the event after a successful DB commit
- A client-side snippet showing how to subscribe
- A Jest test asserting the emit happened
- A bonus background-task variant for async publishing flows

---

## Prerequisites

- Postgres and Redis running locally (`yarn s` starts the web server, `yarn w` starts the worker)
- A `Post` feature already scaffolded with a `status` column (`draft` / `published`) and a `userId` FK

---

## Step 1: Add the socket constants

Open `services/socket.js` and add to the two existing constant objects:

```js
// the rooms for sockets
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL',
  USER: 'USER',
  TEST: 'TEST',

  FEED: 'FEED', // <-- add this: all connected users interested in feed updates
}

// the events the socket can emit or listen to
const SOCKET_EVENTS = {
  TEST_SOCKET_EVENT_ONE: 'TEST_SOCKET_EVENT_ONE',
  TEST_SOCKET_EVENT_TWO: 'TEST_SOCKET_EVENT_TWO',

  POST_PUBLISHED: 'POST_PUBLISHED', // <-- add this
}
```

No other changes to `services/socket.js` are needed — the constants are already re-exported via `module.exports`.

> **Why constants?** String literals scattered across actions and client code drift out of sync. A single source in `socket.js` means a typo is a startup error, not a silent miss.

---

## Step 2: Update the V1Publish action

Generate the action if it does not exist yet:

```bash
yarn gen Post -a V1Publish
```

Then fill in `app/Post/actions/V1Publish.js`:

```js
/**
 * POST V1Publish ACTION
 */

'use strict';

// third-party
const joi = require('joi'); // argument validations: https://github.com/hapijs/joi/blob/master/API.md

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
 * Publish a draft Post and notify all feed subscribers in real time.
 *
 * GET  /v1/posts/publish
 * POST /v1/posts/publish
 *
 * Must be logged in
 * Roles: ['user']
 *
 * req.params = {}
 * req.args = {
 *   @postId - (UUID - REQUIRED): The post to publish
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
    postId: joi.string().uuid({ version: 'uuidv4' }).required()
  });

  // validate
  const { error, value } = schema.validate(req.args);
  if (error)
    return errorResponse(req, ERROR_CODES.BAD_REQUEST_INVALID_ARGUMENTS, joiErrorsMessage(error));
  req.args = value;

  try {
    // find post
    const post = await models.Post.findOne({
      where: {
        id: req.args.postId,
        userId: req.user.id // ownership check — user can only publish their own posts
      }
    });

    if (!post)
      return errorResponse(req, ERROR_CODES.POST_NOT_FOUND);

    let publishedPost;

    // begin transaction — DB write must be atomic
    await models.sequelize.transaction(async t => {
      publishedPost = await post.update({
        status: 'published',
        publishedAt: new Date()
      }, { transaction: t });
    });

    // emit AFTER the transaction commits — never emit inside the transaction block
    // (a rollback would leave clients with stale state)
    const io = getIO();
    if (io) {
      io.to(SOCKET_ROOMS.FEED).emit(SOCKET_EVENTS.POST_PUBLISHED, {
        postId: publishedPost.id,
        title: publishedPost.title,
        publishedAt: publishedPost.publishedAt
      });
    }

    // return
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

Key points:

- **`getIO()` not `socket.get()`** — `getIO()` is synchronous and returns `null` before the server initialises. The `if (io)` guard means tests that never start a socket server still pass.
- **Emit after commit** — emitting inside a `transaction()` callback risks notifying clients before the row is visible to other connections. Always emit after the `await models.sequelize.transaction(...)` call resolves.
- **Flat response** — payload fields are at the top level of the response object, not nested under `data`.

---

## Step 3: Client-side (reference only)

The browser (or React Native app) connects once on boot and subscribes to the `FEED` room, then listens for `POST_PUBLISHED`:

```js
import { io } from 'socket.io-client';

// connect with the user's access token
const socket = io(process.env.API_URL, {
  auth: { token: accessToken }
});

// join the feed room
socket.emit('join', 'FEED'); // the server puts authenticated sockets into rooms on join

// listen for new posts
socket.on('POST_PUBLISHED', ({ postId, title, publishedAt }) => {
  console.log(`New post: "${title}" published at ${publishedAt}`);
  // update your UI state here — e.g. prepend to a feed list
});
```

> The server-side `connect()` handler in `services/socket.js` is responsible for authenticating the JWT and placing the socket in the appropriate room. See the `add-socket-event` skill for the full room-join pattern.

---

## Step 4: Test the socket emit

Location: `app/Post/tests/integration/V1Publish.test.js`

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
    // reset post to draft before each test
    await models.Post.update({ status: 'draft', publishedAt: null }, { where: { id: post1.id } });

    // build a chainable io mock: io.to(...).emit(...)
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

    // assert socket call chain
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
      payload: { postId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } // not owned by user1
    });

    expect(res.statusCode).toBe(404);
    // socket should NOT have been called
    expect(toSpy).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
```

Run the suite:

```bash
yarn test --testPathPattern=V1Publish
```

---

## Step 5: Emit from a background task

Sometimes publishing is expensive — generating a preview image, running a content moderation check — so you hand it off to a background task. The pattern is identical: emit **after** the async work completes, never in the middle of it.

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
 * Runs content moderation, generates a preview image, then publishes the Post.
 * Called by V1Publish when async processing is required.
 *
 * @job = {
 *   @id - (INTEGER - REQUIRED): ID of the background job
 *   @data = {
 *     @postId - (STRING UUID - REQUIRED): The post to publish
 *   }
 * }
 *
 * Success: Return true
 */
async function V1PublishTask(job) {
  const schema = joi.object({
    postId: joi.string().uuid({ version: 'uuidv4' }).required()
  });

  const { error, value } = schema.validate(job.data);
  if (error)
    throw new Error(joiErrorsMessage(error));
  job.data = value;

  try {
    const post = await models.Post.findByPk(job.data.postId);
    if (!post)
      throw new Error(`Post ${job.data.postId} not found`);

    // --- do async work ---
    await runModerationCheck(post);
    await generatePreviewImage(post);
    // ---------------------

    // commit the status change
    await models.sequelize.transaction(async t => {
      await post.update({
        status: 'published',
        publishedAt: new Date()
      }, { transaction: t });
    });

    // emit only after everything is committed
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

The action that enqueues the task returns `202` (background-job handoff) instead of `200`:

```js
// inside V1Publish (async variant):
const PostQueue = queue.get('PostQueue');
const job = await PostQueue.add('V1PublishTask', { postId: req.args.postId });

return {
  status: 202,
  success: true,
  jobId: job.id
};
// no socket emit here — the task does it when the work is done
```

> **Key rule:** `202` signals to the client that the work is pending. The client should listen for `POST_PUBLISHED` to know when it actually lands.

---

## Summary

| Step | What changed |
|---|---|
| `services/socket.js` | Added `SOCKET_ROOMS.FEED` and `SOCKET_EVENTS.POST_PUBLISHED` |
| `app/Post/actions/V1Publish.js` | Validates args → finds + owns post → transaction → commit → emit |
| Client JS | Subscribes to `FEED` room, handles `POST_PUBLISHED` |
| `app/Post/tests/integration/V1Publish.test.js` | Mocks `getIO`, asserts `.to(FEED).emit(POST_PUBLISHED, ...)` |
| `app/Post/tasks/V1PublishTask.js` | Same emit pattern, runs after async processing completes |

**The one rule that prevents every socket bug:** emit outside and after the transaction, never inside it.
