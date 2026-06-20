# Real-Time with Socket.IO

Socket.IO is the real-time layer in Orbital-Express. The server broadcasts events to connected clients after database writes commit. Clients subscribe to rooms and react to events.

The implementation lives in `services/socket.js`. All room and event constants, the JWT auth middleware, the Redis adapter setup, and the connection handler live there. Per-event business logic lives in feature **actions** — never inside `socket.js` itself.

---

## Architecture

Server-side broadcasting only. The pattern is always:

1. An HTTP action (or background task) does its work and commits the transaction.
2. After the commit, the action emits a Socket.IO event carrying the relevant payload.
3. The Socket.IO server (backed by a Redis adapter) fans the event out to every process and every connected client in the target room.

Clients never push data through sockets in the primary flow — sockets are the delivery channel for server-initiated notifications. Inbound socket messages (client → server) are supported for things like typing indicators or presence, but all state lives in the database and is written through normal HTTP actions first.

---

## Getting the `io` instance

Always use `socket.getIO()`. Never import the `io` variable directly.

```javascript
const socket = require('../../../services/socket');

// correct
const io = socket.getIO();

// wrong — io is null at require-time; this captures the null snapshot, not the live instance
const { io } = require('../../../services/socket');
```

`getIO()` returns the live `io` instance set when `get()` initializes the Socket.IO server. Because Node.js caches `require()` results, any module that imports `io` directly gets the `null` value that existed at the moment the module was first loaded — before `get()` ran. `getIO()` always reads the current value of the module-level variable, so it is always correct.

In HTTP actions, use `socket.getIO()` directly. In socket-invoked actions (called from `connect()` inside `socket.js`), the `io` instance is passed in via a context argument — see the circular dependency section below.

---

## Rooms

Rooms are defined in `SOCKET_ROOMS` inside `services/socket.js`:

```javascript
const SOCKET_ROOMS = {
  GLOBAL: 'GLOBAL',   // every authenticated connection joins this
  USER: 'USER',       // per-user room — USER<userId>
  TEST: 'TEST',       // test page only
  ROOM: 'ROOM',       // placeholder — replace with your domain rooms
}
```

There are two kinds:

**Broadcast rooms** — a fixed string that all connections of a type join. `GLOBAL` is one; `ADMIN` would be another. Every client in the room receives the event.

**Instance rooms** — a fixed prefix plus a wrapped ID. Use `socketWrapper(id)` to wrap the ID:

```javascript
function socketWrapper(id) {
  return `<${id}>`;
}

// results in e.g. 'USER<8f1fbd57-7e71-4a9b-9ad4-3c6db06a76b2>'
const room = `${SOCKET_ROOMS.USER}${socketWrapper(userId)}`;
```

This convention (`ROOM_PREFIX<uuid>`) makes room names unambiguous and easy to read in logs.

**Naming convention:** room names are `ALL_CAPS_WITH_UNDERSCORES`.

When you add a new room, add the constant to `SOCKET_ROOMS`. Do not construct raw room strings inline in actions — always compose from `SOCKET_ROOMS` and `socketWrapper`.

---

## Events

Events are defined in `SOCKET_EVENTS` inside `services/socket.js`:

```javascript
const SOCKET_EVENTS = {
  TEST_SOCKET_EVENT_ONE: 'TEST_SOCKET_EVENT_ONE',
  TEST_SOCKET_EVENT_TWO: 'TEST_SOCKET_EVENT_TWO',
  // MESSAGE_CREATED: 'MESSAGE_CREATED',
  // DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
}
```

**Naming convention:** event names are `ALL_CAPS_WITH_UNDERSCORES`, typically `FEATURE_ACTION` — for example `MESSAGE_CREATED`, `ORDER_UPDATED`, `DOCUMENT_DELETED`.

When you add a new event, add the constant here. Never use raw string literals in emit calls — always reference `SOCKET_EVENTS.YOUR_EVENT`.

---

## Emitting from an action

The critical rule: **always emit after `t.commit()`**, never before.

If you emit before committing, the client receives a notification for a record that does not yet exist in the database (because the transaction hasn't landed). If the commit later fails, the client has stale data and no correction.

```javascript
// services
const socket = require('../../../services/socket');
const { SOCKET_ROOMS, SOCKET_EVENTS } = require('../../../services/socket');

// inside the action, after validating and doing work:
const t = await models.db.transaction();
try {
  const message = await models.message.create({ conversationId, text, userId }, { transaction: t });
  await t.commit(); // COMMIT FIRST — always before emit

  // now it is safe to emit
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

The payload passed to `emit` should be a plain object containing only the data the client needs. Do not emit the full Sequelize model instance — spread `.dataValues` or construct the payload explicitly.

**Targeting rooms:**

```javascript
// broadcast to everyone
io.to(SOCKET_ROOMS.GLOBAL).emit(SOCKET_EVENTS.SOME_EVENT, data);

// target a specific user
io.to(`${SOCKET_ROOMS.USER}${socketWrapper(userId)}`).emit(SOCKET_EVENTS.SOME_EVENT, data);

// target a specific conversation (example domain room)
io.to(`${SOCKET_ROOMS.CONVERSATION}${socketWrapper(conversationId)}`).emit(SOCKET_EVENTS.MESSAGE_CREATED, data);
```

The Redis adapter ensures the emit reaches clients on every Node process — not just the process that handled the HTTP request.

---

## The circular dependency problem

Actions emit socket events. But inbound socket events (client → server) need to call actions. If `socket.js` imports an action, and that action imports `socket.js` to emit, you get a circular dependency: Node resolves it by giving one side an empty object, which causes runtime errors.

**The solution:** `socket.js` never imports action files directly. Instead, when a socket event triggers an action, `socket.js` calls the action and passes a **context object** as the second argument:

```javascript
// inside connect(socket) in services/socket.js
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

The action receives `(req, context)` and uses `context.io` instead of calling `socket.getIO()`:

```javascript
async function V1Connect(req, context) {
  const { io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper } = context;
  // ... validate, do work, then emit using context.io
  io.to(`${SOCKET_ROOMS.USER}${socketWrapper(req.userId)}`).emit(SOCKET_EVENTS.SOME_EVENT, data);
}
```

This breaks the cycle: `socket.js` imports the action, but the action does not import `socket.js`. The socket service instances are passed in, not required.

**HTTP actions** do not have this constraint — they are not imported by `socket.js`. They call `socket.getIO()` directly.

**Socket-invoked actions throw on failure** (like background tasks) rather than returning `errorResponse`. The `catch` in the `socket.on` handler above catches the thrown error and passes it to `callback`.

---

## Testing socket emits

Mock the `getIO` function with `jest.spyOn` and assert on the chain.

```javascript
const socket = require('../../../../services/socket');

describe('Message.V1Create', () => {
  let mockEmit;
  let mockTo;
  let getIOStub;

  beforeEach(async () => {
    // build the mock chain: io.to(room).emit(event, data)
    mockEmit = jest.fn();
    mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
    getIOStub = jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo });

    await populate('fix1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('[user] should emit MESSAGE_CREATED after creating a message', async () => {
    const { token } = await userLogin(app, routeVersion, request, userFix[0]);

    const res = await request(app)
      .post(routeUrl)
      .set('authorization', `jwt-user ${token}`)
      .send({ conversationId: fix1.conversationId, text: 'Hello' });

    expect(res.statusCode).toBe(201);

    // assert the correct room and event
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

For socket-invoked actions (called from `connect()` directly rather than through HTTP), call the action function directly and pass a mock context object:

```javascript
const { V1Connect } = require('../../../../app/UserSocket/actions/V1Connect');

describe('UserSocket.V1Connect', () => {
  describe('Action Only', () => {
    it('should join the user room on connect', async () => {
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

## Adding a new socket event

Follow the `add-socket-event` skill (`.claude/skills/add-socket-event/SKILL.md`). The steps at a glance:

1. Add the event name to `SOCKET_EVENTS` (and a room to `SOCKET_ROOMS` if needed) in `services/socket.js`.
2. **Inbound (client → server):** add a `socket.on(...)` handler inside `connect(socket)` that calls the action with a context object.
3. **Outbound (server → client):** inside the action, emit after `t.commit()` using `socket.getIO()` (HTTP actions) or the injected `context.io` (socket-invoked actions).
4. Add the client-side listener in `public/js/socket.js` if the test page needs it.
5. Write tests: mock `getIO` with `jest.spyOn` and assert the room, event name, and payload.

For a full worked example — constants, action, client snippet, test, and background-task variant — see the build-along tutorial: [`docs/tutorials/real-time.md`](../tutorials/real-time.md).
