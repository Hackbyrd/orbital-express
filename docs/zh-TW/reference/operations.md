# 運維與部署

涵蓋本機執行應用程式、管理資料庫、測試、部署，以及除錯基礎設施所需的一切。

---

## 指令速查表

| 指令 | 功能 |
|---|---|
| `yarn s` | 啟動 web server（nodemon，port 8000，開發環境） |
| `yarn w` | 啟動背景 worker（nodemon，開發環境） |
| `yarn cron` | 啟動 cron/clock daemon（nodemon，開發環境） |
| `yarn lang` | 將 `languages/*.js` 編譯為 `locales/*.json` 並驗證所有 i18n 鍵值 |
| `yarn gen <Feature>` | 建立新的 feature 資料夾骨架 |
| `yarn gen <Feature> -a V1Action` | 在 feature 內建立新的 action 骨架 |
| `yarn gen <Feature> -t V1Task` | 在 feature 內建立新的背景 task 骨架 |
| `yarn gen <Feature> -m Mailer` | 在 feature 內建立新的 mailer 骨架 |
| `yarn del <Feature> -a V1Action` | 移除已建立的 action 骨架（同時從 `actions/index.js` 移除匯出） |
| `yarn del <Feature> -t V1Task` | 移除已建立的 task 骨架 |
| `yarn mg` / `yarn migrate` | 執行待處理的 migration（開發環境） |
| `yarn migrate:prod` | 執行待處理的 migration（正式環境） |
| `yarn rb` / `yarn rollback` | 回滾最後一個 migration（開發環境） |
| `yarn rollback:prod` | 回滾最後一個 migration（正式環境） |
| `yarn backup` | 將開發 DB `pg_dump` 至 `database/backups/backup.sql` |
| `yarn restore` | 刪除、重建並從 `database/backups/backup.sql` 還原開發 DB |
| `yarn redis` | 啟動本機 Redis server（專案本地建置） |
| `yarn redis:stop` | 停止本機 Redis server |
| `yarn sql fix1` | 將 JS fixtures 編譯為 `test/fixtures/fix1.sql`（`yarn test` 會自動執行） |
| `yarn test` / `yarn t` | 完整測試套件：`yarn lang` → `yarn sql fix1` → jest `--runInBand` |
| `yarn ngrok` | 開啟連至 port 8000 的公開 tunnel（用於入站 webhook 測試） |
| `yarn ngrok:auth <token>` | 一次性 ngrok auth token 設定 |
| `yarn gulp` | 啟動 Gulp 監視器（檔案變更時自動重新編譯 mailer 預覽和 locales） |
| `yarn format` / `yarn lint` | 執行程式碼格式化工具 |
| `yarn seed` | 將 seed 資料載入開發資料庫 |
| `yarn knowledge [product] [--prune]` | 從 `knowledge/` 將產品知識更新至 DB（冪等；`--prune` 移除 manifest 中已不存在的資料列） |

---

## 本機執行

應用程式有三個程序。在各自獨立的終端機中執行：

```bash
yarn s     # web server — 處理 HTTP 請求（port 8000）
yarn w     # worker — 從 Redis queues 處理 Bull 背景工作
yarn cron  # clock — 依排程觸發 cronjob 並將工作放入 queue
```

**為什麼需要三個終端機？** 每個程序有各自明確的職責。web server 從不直接執行工作 — 它將工作放入 queue 後立即返回。worker 從 queue 取出並處理工作。clock 按時觸發排程工作。若 worker 未執行，放入 queue 的工作會堆積在 Redis 中而永遠不被執行。若 clock 未執行，則沒有任何排程工作會被觸發。

在啟動這三個程序之前，**Postgres 和 Redis 都必須在執行中**。沒有它們，應用程式將無法啟動。

```bash
yarn redis   # 若 Redis 尚未執行，先啟動本機 Redis
```

---

## 環境設定

複製範本並填入必要的值：

```bash
cp config/.env.template config/.env.development
cp config/.env.template config/.env.test
```

**必要變數：**

| 變數 | 用途 |
|---|---|
| `DATABASE_URL` | Postgres 連線字串 |
| `REDIS_URL` | Redis 連線字串 |
| `ACCESS_TOKEN_SECRET` | access token 的 JWT 簽署密鑰 |
| `REFRESH_TOKEN_SECRET` | refresh token 的 JWT 簽署密鑰 |
| `PORT` | HTTP port（預設：8000） |
| `API_VERSION` | 例如 `v1` |

開發與測試請使用不同的資料庫 — 測試套件會呼叫 `sync({ force: true })`，它會在每次執行前清除並重建 schema。

---

## 資料庫管理

### Migrations

```bash
yarn mg              # 套用待處理的 migration（開發環境）
yarn migrate:prod    # 套用待處理的 migration（正式環境）
yarn rb              # 回滾最後一個 migration（開發環境）
yarn rollback:prod   # 回滾最後一個 migration（正式環境）
```

產生新的 migration 檔案：

```bash
# 新資料表（model）
./node_modules/.bin/sequelize model:create --env development --name NewModel --attributes col:type

# 在現有資料表新增欄位
./node_modules/.bin/sequelize migration:create --env development --name add-cols-colName-to-TableName-tbl
```

產生後立即將檔案重新命名為符合專案慣例的格式 — 格式請參閱 [docs/conventions.txt](../conventions.txt)。

### 備份與還原

```bash
yarn backup    # pg_dump orbital_dev > database/backups/backup.sql
yarn restore   # 刪除 + 重建 orbital_dev，然後從備份還原
```

在開發環境執行任何有風險的 migration 之前，先執行 `yarn backup`。

---

## 部署至 Heroku

### Procfile

```
release: yarn migrate:prod
web:     node --optimize_for_size --max_old_space_size=480 --gc_interval=100 index.js
worker:  node --optimize_for_size --max_old_space_size=480 --gc_interval=100 worker.js
clock:   node --optimize_for_size --max_old_space_size=480 --gc_interval=100 cronjobs.js
```

`release` 階段在每次部署時執行 `yarn migrate:prod`。若失敗，新版本不會上線。這確保 migration 永遠在新程式碼接受流量之前執行。

正式環境執行**恰好一個** clock dyno。執行兩個會讓每個排程工作觸發兩次。

### 首次設定

1. 建立 Heroku 應用程式。
2. 新增 Heroku PostgreSQL 和 Heroku Redis 附加元件。
3. 設定配置變數 — 可在 Heroku dashboard 手動設定，或透過 `config/heroku-sync.js`。
4. 將 repo 的 `main` 分支連接至 Heroku 應用程式。
5. 點擊部署。
6. （可選）新增自訂網域和 SSL 憑證。

### 環境變數

將本機 env 同步至 Heroku：

```bash
node config/heroku-sync.js
```

此腳本讀取你的本機設定檔並將值推送至 `heroku config:set`。執行前請先檢閱 — 它會覆蓋應用程式上已設定的任何變數。

### 將知識內容發佈至正式環境

`Procfile` 的 release 階段在每次部署時也會執行 `yarn knowledge --prune production`。這會將已提交的 `knowledge/` 資料夾冪等地更新至正式 DB，並清除 manifest 中已不存在的資料列。若要發佈更新的知識內容：

1. 重新產生 `knowledge/` 資料夾：`yarn export:content`
2. 提交更新的檔案。
3. 部署 — release 階段會處理其餘事項。

---

## 健康與就緒探針

`routes.js` 中定義了兩個基礎設施端點。它們刻意繞過 action/controller 模式 — 它們是基礎設施，不是功能。全域速率限制器有針對兩者的 `skip`，確保探針永遠不會被限流。

| 端點 | 類型 | 檢查內容 | 用途 |
|---|---|---|---|
| `GET /health` | Liveness | 程序是否存活 — **不檢查依賴** | 平台重啟決策 |
| `GET /ready` | Readiness | `db.authenticate()` + Redis `ping` | 負載均衡器排水 |

在優雅關閉期間，`middleware/exit.js` 會在兩者到達路由處理器之前攔截並返回 `503` — 處理器本身不需要額外的排水邏輯。

**Heroku 備註：** Heroku 透過 port 綁定路由，並在崩潰時重啟，而非使用就緒探針，因此在 Heroku 上 `/health` 主要用於正常運行時間監控，`/ready` 用於儀表板。若你遷移至 k8s 或 ECS，兩者都不可或缺。

---

## ngrok — 本機測試入站 Webhook

第三方服務提供商（Stripe、Google、Twilio 等）無法連到 `localhost`。ngrok 開啟一個連至本機 server 的公開 tunnel，讓它們的 webhook 呼叫可以在開發期間到達你的處理器。

```bash
yarn ngrok:auth <token>   # 一次性設定 — 貼上你 ngrok 帳戶 dashboard 的 token
yarn ngrok                # 開啟連至 port 8000 的公開 tunnel
```

使用方式：

1. 啟動 server：`yarn s`
2. 啟動 tunnel：`yarn ngrok`
3. ngrok 會印出一個公開 URL，例如 `https://abc123.ngrok.io`。
4. 在第三方的 dashboard 中登錄 `https://abc123.ngrok.io/v1/<feature>/<webhookaction>`。
5. 在他們那邊觸發一個事件 — 呼叫會透過 tunnel 流至你的本機處理器。

**免費方案注意事項：** 每次重啟 ngrok，公開 URL 都會改變。重啟後需重新向服務提供商登錄新的 URL。

完整說明見 [docs/ngrok.txt](../ngrok.txt)。

---

## 疑難排解 — 常見問題

| 症狀 | 原因與修復方式 |
|---|---|
| 測試通過後掛起，永遠不退出 | 連線未關閉。每個測試檔案需要一個 `afterAll`，關閉 queue、socket、DB 和 app。 |
| 測試套件無法啟動 — 缺少 i18n 鍵值錯誤 | 某個 `.__('KEY')` 呼叫引用了 `languages/*.js` 中未定義的鍵值。新增該鍵值並執行 `yarn lang`。`yarn test` 會先執行 `yarn lang` 並快速失敗。 |
| 測試中 env 變數是 `undefined` | 在 `dotenv` 載入之前就讀取了 `process.env`。在測試檔案中，`require('dotenv').config(...)` 必須在解構 `process.env` 之前執行。 |
| 工作已放入 queue 但什麼都沒發生 | Worker 未執行。啟動 `yarn w`。背景工作只有在 worker 程序執行中且 Redis 可用時才會被執行。 |
| 排程 cronjob 從未觸發 | Clock 程序未執行。啟動 `yarn cron`（以及 `yarn w` 來處理它放入 queue 的工作）。正式環境請確保恰好只有一個 clock dyno。 |
| 你確定存在的資料列返回 `null` | 預設 scope（通常是軟刪除 / `paranoid: true`）隱藏了它。使用 `Model.scope(null).findByPk(...)` 來略過。 |
| 平行測試套件間歇性失敗 | 使用 `--runInBand` 執行。測試套件共用一個測試 DB，沒有此旗標會在 `sync({ force: true })` 上產生競爭條件。`yarn test` 已傳入此旗標。 |
| 你預期已驗證的請求返回 `401` | `Authorization` 標頭前綴必須符合使用者型別：使用者用 `jwt-user`，管理員用 `jwt-admin`。 |
| 啟動時連線被拒 | Postgres 和/或 Redis 未執行。啟動應用程式和執行測試套件都需要兩者。 |
| i18n/locale 的變更未顯示 | 你直接編輯了 `locales/*.json`。那些是編譯輸出 — 禁止直接編輯。請編輯 `languages/*.js` 並執行 `yarn lang`。 |
| 載入 fixtures 時出現 FK 約束錯誤 | `database/sequence.js` 的順序不正確。資料表必須按依賴順序列出（父層在子層之前），以便 SQL fixture 按正確順序插入資料列。 |
| 跳過了 `yarn del`，留下損壞的匯出 | 使用 `rm` 而非 `yarn del` 會在 `actions/index.js` 或 `tasks/index.js` 中留下死亡匯出。永遠使用 `yarn del` — 它會移除檔案並清理匯出。 |
