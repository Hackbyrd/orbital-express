---
name: add-socket-event
description: Add a real-time Socket.IO event (server listener and/or emit) in this codebase. Use when the user asks to "add a socket event", "emit something in real time", "push updates to clients", or wire a live feature (typing, presence, new message).
---

# Add a socket event

Socket wiring lives in `services/socket.js`; per-event logic lives in feature **actions** invoked with a context object (to avoid the circular dependency). Read README "Socket Architecture".

## Concepts
- **`SOCKET_ROOMS`** and **`SOCKET_EVENTS`** are constants in `services/socket.js`, `ALL_CAPS_WITH_UNDERSCORES`. Events are named `FEATURE_ACTION` (e.g. `ORDER_CREATED`).
- Two room kinds: **broadcast rooms** — a fixed name everyone of a type joins (`GLOBAL`, `ADMIN`); **instance rooms** — `ROOM_TYPE${socketWrapper(id)}` → `USER<uuid>`, `CHANNEL<uuid>` (`socketWrapper` wraps the id in `<>`).
- Socket.IO runs with a **Redis adapter**, so `io.to(room).emit(...)` reaches clients across all Node processes — never track sockets in a local variable.
- Never import `services/socket` inside an action it calls — use the injected context `{ io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper }`. HTTP actions that emit use `socket.getIO()` (never import `io` directly — it's null at require-time).

## Steps

1. **Add the event name** to `SOCKET_EVENTS` (and a room to `SOCKET_ROOMS` if needed) in `services/socket.js`.

2. **Inbound (client → server):** add a handler inside `connect(socket)`:
   ```javascript
   socket.on(SOCKET_EVENTS.<EVENT>, async (data, callback) => {
     try {
       const result = await V1<Action>({ ...data, userId: socket.user.id }, { io, SOCKET_ROOMS, SOCKET_EVENTS, socketWrapper });
       return callback(null, result);
     } catch (error) { return callback(error); }
   });
   ```
   The action validates with Joi and **throws** on failure (socket actions throw, like tasks). Import the action at the top of `socket.js` (that's why actions can't import socket back).

3. **Outbound (server → client) emit** — inside the action, **after `t.commit()`** (never emit an uncommitted record), and **never guard emits with `NODE_ENV`**:
   ```javascript
   const room = `${SOCKET_ROOMS.CHANNEL}${socketWrapper(channelId)}`;
   io.to(room).emit(SOCKET_EVENTS.<EVENT>, data); // io from context, or socket.getIO() in HTTP actions
   ```

4. **Client listener** (test page) in `public/js/socket.js`: `socket.on('<EVENT>', data => { ... })`.

5. **Tests:** mock the emit chain — `jest.spyOn(socket, 'getIO').mockReturnValue({ to: mockTo })` — and assert the room + event + payload. For connect/disconnect-style actions, call the action directly with the context object. See `write-tests` skill.
