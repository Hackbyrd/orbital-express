# Testing Patterns

## Authentication in Tests

To authenticate in an integration test, call the login endpoint directly and extract the access token from the response. Store it and pass it in the `Authorization` header on subsequent requests.

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

// In a test:
const res = await request(app)
  .post('/v1/admins/someaction')
  .set('Authorization', `jwt-admin ${accessToken}`)
  .send({ ... });
```

**Header prefix must match the user type:**
- `jwt-user` — for User tokens
- `jwt-admin` — for Admin tokens

A wrong prefix returns `401` even if the token itself is valid.

---

## What to Assert

Every action test should assert all of the following that apply:

### 1. Status code
```javascript
expect(res.statusCode).toBe(200);
```

### 2. Response shape
```javascript
expect(res.body).toEqual({
  status: 200,
  success: true,
  user: expect.objectContaining({ id: expect.any(String), email: user.email }),
});
```

Responses are **flat** — never `res.body.data.user`. If you see a `data` wrapper, that is a convention violation.

### 3. Database state
Assert that the action actually changed the DB. Do not rely on the response body alone — an action could return `success: true` while silently failing to write.

```javascript
const updatedUser = await models.user.findByPk(user1.id);
expect(updatedUser.isActive).toBe(false);
expect(updatedUser.firstName).toBe('NewName');
```

### 4. Socket emits (if applicable)
See [Testing Socket.IO](#testing-socketio) below.

### 5. Queue jobs enqueued (if applicable)
See [Testing Background Tasks](#testing-background-tasks) below.

---

## Testing Access Control

Always write tests for who **cannot** do something. This is non-negotiable — if you only test the happy path, access control regressions are invisible.

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
  // mutate the baseline admin to the restricted role
  await models.admin.update({ role: ADMIN_ROLE.MANAGER }, { where: { id: admin1.id } });

  const res = await request(app)
    .post(routeUrl)
    .set('Authorization', `jwt-admin ${accessToken}`)
    .send({ ... });
  expect(res.statusCode).toBe(403);
});
```

**Prefix every test name with the actor in brackets:** `[logged-out]`, `[user]`, `[admin]`, `[admin:manager]`. This makes it immediately clear who the subject is when skimming the test output.

---

## Mocking Third-Party APIs

**Mock at the service boundary, never deep in the implementation.**

The framework wraps all third-party APIs in `services/` wrappers (e.g. `services/email.js`, `services/stripe.js`). Mock the wrapper function — not the underlying library method three levels down. This keeps tests resilient to library internals changing and makes the intent obvious.

### `jest.spyOn()` — prefer for service wrappers

Use when you want to mock a single method on a module that is already required, and restore it cleanly after the test. This is the standard choice for service wrappers.

```javascript
const email = require('../../../../services/email');

beforeEach(async () => {
  await populate('fix1');
  jest.spyOn(email, 'send').mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.restoreAllMocks(); // always restore after spyOn
});

it('[admin] should send a welcome email on create', async () => {
  await request(app).post(routeUrl).set('Authorization', ...).send({ ... });
  expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@example.com' }));
});
```

### `jest.mock()` — for modules you never want to execute

Use when the module has side effects at require-time, or you want to mock the entire module for the whole file without restoring per test.

```javascript
jest.mock('../../../../services/stripe', () => ({
  chargeCard: jest.fn().mockResolvedValue({ id: 'ch_test123' }),
}));
```

`jest.mock()` is hoisted to the top of the file by Jest. Use `jest.spyOn()` when you need different return values per test — it's easier to reconfigure in `beforeEach`.

**Rules:**
1. Never let a real network call happen in a test. Mock before it can reach the wire.
2. Assert that the mock was called with the correct arguments — not just that it didn't throw.
3. Always `jest.restoreAllMocks()` in `afterEach` when using `spyOn`.

---

## Testing Background Tasks

Task tests are **unit tests** — no HTTP layer, no supertest, no server boot. Call the task function directly with a mock `job` object shaped like Bull's `job`.

```javascript
const { V1ExportTask } = require('../../../tasks');

it('[admin] should export data and return true', async () => {
  const admin1 = adminFix[0];

  const job = { data: { adminId: admin1.id } };
  const result = await V1ExportTask(job);

  expect(result).toBe(true);

  // assert DB side effects just like an action test
  const exportRecord = await models.export.findOne({ where: { adminId: admin1.id } });
  expect(exportRecord).not.toBeNull();
});
```

**Testing that a task enqueues a further job:**

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

**Testing that an action enqueues a background job:**

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

## Testing Socket.IO

### Testing socket-invoked actions directly

Socket-invoked actions receive `(args, context)` — not `(req, res)`. Call them directly, passing the socket context explicitly.

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

  // assert DB side effects
  const userInDb = await models.user.findByPk(user1.id);
  expect(userInDb.isOnline).toBe(true);
});
```

Everything else — `beforeAll`, `beforeEach`, `afterAll`, fixture patterns, queue cleanup — is identical to a standard integration test.

### Testing that the correct events are emitted

Never guard socket emits with `if (NODE_ENV !== 'test')`. That pattern makes it impossible to verify the right event fired with the right data.

Use `jest.spyOn()` to mock `getIO()` and assert on the emit chain. Because `io` is accessed via `getIO()` at call-time (not cached at require-time), `spyOn` intercepts it cleanly.

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

    // assert the correct room was targeted
    expect(mockTo).toHaveBeenCalledWith(
      `CONVERSATION${socket.socketWrapper(conversationId)}`
    );

    // assert the correct event and data shape were emitted
    expect(mockEmit).toHaveBeenCalledWith(
      socket.SOCKET_EVENTS.MESSAGE_CREATED,
      expect.objectContaining({ message: expect.any(Object) })
    );
  });
});
```

**Rules:**
1. Always `jest.restoreAllMocks()` in `afterEach` when spying on `getIO`.
2. Assert both `mockTo` (correct room) and `mockEmit` (correct event + data shape).
3. If the action emits to multiple rooms, assert each `mockTo` call separately using `toHaveBeenNthCalledWith` or check `toHaveBeenCalledTimes`.

---

## Testing DB Scopes (`scope(null)`)

Sequelize models have `paranoid: true` by default, which means soft-deleted rows are hidden from all queries. In tests you often need to assert that a record was soft-deleted — meaning it exists in the DB with a non-null `deletedAt`, but a normal `findByPk` returns `null`.

Use `Model.scope(null)` to bypass the default scope and see all rows including soft-deleted ones:

```javascript
it('[admin] should soft-delete the user', async () => {
  await request(app)
    .post('/v1/admins/deleteuser')
    .set('Authorization', `jwt-admin ${accessToken}`)
    .send({ userId: user1.id });

  // normal query — returns null (soft-deleted, hidden by default scope)
  const hiddenUser = await models.user.findByPk(user1.id);
  expect(hiddenUser).toBeNull();

  // scope(null) bypasses paranoid — sees the row with deletedAt set
  const deletedUser = await models.user.scope(null).findByPk(user1.id);
  expect(deletedUser).not.toBeNull();
  expect(deletedUser.deletedAt).not.toBeNull();
});
```

Use `scope(null)` **only when you are asserting on soft-deletion**. Never use it as a workaround because a test is finding `null` unexpectedly — that usually means the test data was set up incorrectly or the action is soft-deleting when it shouldn't.

---

## Database Transactions in Tests

The test suite uses a **wipe-and-repopulate** strategy, not transaction rollbacks.

`beforeEach` calls `populate('fix1')`, which:
1. Truncates all tables
2. Bulk-inserts the fixture SQL

This means each test starts from a clean, known baseline regardless of what the previous test wrote. You do not need to manage transactions manually in tests — mutations from one test are wiped before the next.

```javascript
beforeEach(async () => {
  await populate('fix1'); // truncate + repopulate before every test
});
```

**What this means for test isolation:**
- Tests are fully isolated — a failed write in one test cannot affect another.
- Do not rely on data created by a previous test. Always mutate from the fixture baseline inside the test.
- Do not use `beforeAll` to insert test data that you expect to persist across tests — it will be wiped by the first `beforeEach`.

**When `beforeAll` is appropriate:**
Use `beforeAll` only for one-time setup that is not DB state — booting the server, obtaining an access token (which involves a DB read/write that `beforeEach` will reset anyway, so re-login after each populate if needed), or establishing a socket connection.

```javascript
beforeAll(async () => {
  // one-time: boot the server and login once
  // note: if populate() in beforeEach resets the user's password hash, re-login inside beforeEach instead
  await app.listen(...);
});

beforeEach(async () => {
  await populate('fix1'); // reset DB state before every single test
});

afterAll(async () => {
  // close all open handles: queue, socket, DB connection, server
  await queue.closeAll();
  await socket.close();
  await models.sequelize.close();
  await server.close();
});
```

**Closing handles in `afterAll`** is required — forgetting any one of them causes the test suite to hang after all tests pass.
