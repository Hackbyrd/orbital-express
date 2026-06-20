---
name: add-cronjob
description: Schedule recurring work with a cronjob in this codebase (runs in the clock process, enqueues a background task on a schedule). Use when the user asks to "run something every day/hour", "add a scheduled/cron job", or do periodic maintenance (token refresh, cleanup, daily emails).
---

# Add a cronjob

Cronjobs live in the top-level **`cronjobs.js`** (the clock process — only 1 instance runs it). A cronjob should **not** do work itself — it **enqueues a background task** on a schedule. Read README "The Entry Points" and "How a Job Gets Created".

## Pattern

```javascript
// cronjobs.js — grouped by feature with a comment header
const <Feature>Queue = queue.get('<Feature>Queue');

// <plain-English what + when>. Often: every 5 min in dev, real cadence in prod.
const schedule = NODE_ENV === 'development' ? '0 */5 * * * *' : '0 0 0 * * *';
new CronJob(schedule, () => {
  <Feature>Queue.add('V1<Action>Task', {}); // enqueue — the task does the work
}, null, true, 'UTC'); // ALWAYS 'UTC'
```

## Rules
- **Always `'UTC'`** as the timezone (last arg). All scheduling is UTC.
- The cron callback only **enqueues** — no business logic, no DB work inline. Put the work in a task (`add-task` skill).
- For large datasets use the **aggregate → singular** task pattern: the cron enqueues the aggregate task, which fans out one singular task per record.
- Cron expressions here are 6-field (`sec min hour day month weekday`).
- Group by feature with a comment header (match the existing style in `cronjobs.js`).

## Steps
1. Make sure the task exists (`add-task` skill) and its processor is registered in the feature's `worker.js`.
2. Add the `new CronJob(...)` entry to `cronjobs.js` under the feature's section.
3. Verify locally: run `yarn cron` (and `yarn worker` to process the jobs). Tasks are tested directly; the cron wiring itself is config.
