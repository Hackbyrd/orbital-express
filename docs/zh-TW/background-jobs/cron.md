# Cron 工作

## Cron 工作的用途

Cron 工作處理週期性、時間驅動的工作：每日報表、清理掃描、token 刷新、摘要電子郵件，以及類似的排程操作。

**Cron 工作本身不執行實際工作。** 它們唯一的職責是在正確的時間將 Bull 任務加入佇列。實際邏輯在任務中，並在 worker 進程中執行。這讓 clock 進程保持輕量，且工作可重試。

## cronjobs.js

所有 cron 工作都在專案根目錄的 `cronjobs.js` 中登錄。該檔案遵循標準 JS 檔案結構（header 注釋、`'use strict'`、依長度遞增排序的 imports、模組層級常數，然後是工作登錄）。

每個工作實例化一個帶有排程的 `CronJob`、一個將任務加入佇列的 async callback，以及第四個參數 `true` 以立即啟動。

```js
'use strict'

const { CronJob } = require('cron')

const queue = require('./app/services/queue')

const UserQueue = queue.get('UserQueue')

// 每天 UTC 上午 10 點 — 將每日摘要電子郵件任務加入佇列
const schedule = NODE_ENV === 'development' ? '0 */5 * * * *' : '0 0 10 * * *'
new CronJob(schedule, () => {
  UserQueue.add('V1DailySummaryEmailTask', {})
}, null, true, 'UTC')
```

重點：

- Queue service 在 services 區塊引入，特定的 queue 實例（`UserQueue`）在 queues 區塊宣告（在 models 之後）。
- Cron 表達式為 **6 個欄位**：`sec min hour day month weekday`。這與傳統 5 欄位 cron 不同。
- 使用開發/生產排程分離（開發環境頻繁，生產環境使用真實頻率），這樣就能在不等待的情況下測試。
- 永遠傳遞 `'UTC'` 作為時區（最後一個參數）。所有排程使用 UTC。
- Callback 只負責**加入佇列** — 沒有業務邏輯，沒有直接的 DB 操作。任務負責執行工作。
- 任務名稱字串必須與 feature 的 `tasks/index.js` 中的任務匯出鍵完全一致。

## 執行 cron 守護進程

```
yarn cron
```

這會將 `cronjobs.js` 作為獨立的 Node 進程啟動。它必須與 web server 和 worker 進程同時執行（而非取代它們）— 每個都是獨立的。

在生產環境中，clock 以專用的 **Heroku clock dyno** 執行，在 `Procfile` 中設定：

```
clock: node cronjobs.js
```

## 只能有一個 clock 進程

**絕不執行超過一個 clock dyno。** 若同時有兩個 clock 進程執行，每個 cron 工作都會觸發兩次，將重複的任務加入佇列。Bull 預設不去重，因此工作會執行兩次。在你的 Heroku formation 中將 clock dyno 數量設定為恰好 `1`，永遠不要擴展它。

## Cron 語法參考

Orbital-Express 使用標準五欄位 cron 語法：`minute hour day-of-month month day-of-week`。

| 排程 | 表達式 | 說明 |
|---|---|---|
| 每分鐘 | `* * * * *` | 在每分鐘開始時執行 |
| 每小時 | `0 * * * *` | 在每小時 :00 執行 |
| 每天 UTC 上午 10 點 | `0 10 * * *` | 每天 UTC 10:00 執行一次 |
| 每週（週一 UTC 上午 9 點） | `0 9 * * 1` | 每週一 UTC 09:00 執行 |
| 每月（1 日 UTC 午夜） | `0 0 1 * *` | 每月 1 日 UTC 00:00 執行 |

提交前使用 [crontab.guru](https://crontab.guru) 驗證表達式。

## 使用 add-cronjob skill

關於建立新 cron 工作的逐步操作 — 包括產生任務、連接 queue、撰寫測試以及登錄排程 — 請遵循 **`add-cronjob`** skill：

```
.claude/skills/add-cronjob/SKILL.md
```

在 Claude Code 中以 `/add-cronjob` 執行，或直接在任何其他工具中開啟該檔案。
