# Cron Jobs

## What cron jobs are for

Cron jobs handle recurring, time-based work: daily reports, cleanup sweeps, token refresh, digest emails, and similar scheduled operations.

**Cron jobs do not do the work themselves.** Their only job is to enqueue a Bull task at the right time. The actual logic lives in the task, which runs in the worker process. This keeps the clock process lightweight and the work retryable.

## cronjobs.js

All cron jobs are registered in `cronjobs.js` at the project root. The file follows the standard JS file structure (header comment, `'use strict'`, imports ordered by increasing length, module-level consts, then the job registrations).

Each job instantiates a `CronJob` with a schedule, an async callback that enqueues a task, and `true` as the fourth argument to start it immediately.

```js
'use strict'

const { CronJob } = require('cron')

const queue = require('./app/services/queue')

const UserQueue = queue.get('UserQueue')

// Every day at 10 AM UTC — enqueue a daily summary email task
const schedule = NODE_ENV === 'development' ? '0 */5 * * * *' : '0 0 10 * * *'
new CronJob(schedule, () => {
  UserQueue.add('V1DailySummaryEmailTask', {})
}, null, true, 'UTC')
```

Key points:

- The queue service is required up in the services section, and the specific queue instance (`UserQueue`) is declared in the queues section (after models).
- Cron expressions are **6-field**: `sec min hour day month weekday`. This differs from classic 5-field cron.
- Use a dev/prod schedule split (frequent in dev, real cadence in prod) so you can test without waiting.
- Always pass `'UTC'` as the timezone (last argument). All scheduling is UTC.
- The callback only **enqueues** — no business logic, no DB work inline. The task does the work.
- The task name string must exactly match the task's export key in the feature's `tasks/index.js`.

## Running the cron daemon

```
yarn cron
```

This starts `cronjobs.js` as a separate Node process. It must run alongside (not instead of) the web server and worker processes — each is independent.

In production the clock runs as a dedicated **Heroku clock dyno**, configured in `Procfile`:

```
clock: node cronjobs.js
```

## Only one clock process

**Never run more than one clock dyno.** If two clock processes are running simultaneously, every cron job fires twice, enqueuing duplicate tasks. Bull does not deduplicate by default, so the work executes twice. Set the clock dyno count to exactly `1` in your Heroku formation and never scale it up.

## Cron syntax reference

Orbital-Express uses standard five-field cron syntax: `minute hour day-of-month month day-of-week`.

| Schedule | Expression | Description |
|---|---|---|
| Every minute | `* * * * *` | Runs at the start of every minute |
| Every hour | `0 * * * *` | Runs at :00 of every hour |
| Daily at 10 AM UTC | `0 10 * * *` | Runs once per day at 10:00 UTC |
| Weekly (Monday 9 AM UTC) | `0 9 * * 1` | Runs every Monday at 09:00 UTC |
| Monthly (1st at midnight UTC) | `0 0 1 * *` | Runs on the 1st of each month at 00:00 UTC |

Use [crontab.guru](https://crontab.guru) to validate expressions before committing.

## Using the add-cronjob skill

For a step-by-step walkthrough of scaffolding a new cron job — including generating the task, wiring the queue, writing the test, and registering the schedule — follow the **`add-cronjob`** skill:

```
.claude/skills/add-cronjob/SKILL.md
```

Run it with `/add-cronjob` in Claude Code, or open the file directly in any other tool.
