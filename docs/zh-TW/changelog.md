# 更新日誌

Orbital Express 的所有重要變更都記錄於此。

版本號遵循[語意化版本控制](https://semver.org/)：
- **Patch** `3.0.x` — 錯誤修復、文件修正、小幅調整
- **Minor** `3.x.0` — 新功能、非破壞性新增
- **Major** `x.0.0` — 破壞性變更或完整重寫

---

## 3.0.0 — 2026-06-21

### 概覽
Orbital Express 的第三代重寫版本。框架大幅擴充，新增了經生產環境驗證的 auth 系統、完整的 VitePress 文件網站，以及完整的 agent/AI skill 層開發工具。

### 新增
- **雙 token auth 系統** — 短效 access JWT + 可撤銷的不透明 refresh token，每種使用者類型一個 strategy（`User`、`Admin` 等），重用偵測，基於 `tokenVersion` 的即時撤銷
- **優雅關閉** — `middleware/exit.js` 排空進行中的請求，在程序退出前關閉 queues/sockets/DB
- **安全層** — 基於 Redis 的速率限制套用於所有路由，憑證端點有更嚴格的限制，AES-256-GCM 靜態加密（`services/secure.js`），bcrypt 搭配時序安全登入
- **健康與就緒探針** — `GET /health`（liveness）和 `GET /ready`（檢查 Postgres + Redis）
- **VitePress 文件網站** — 完整文件位於 https://hackbyrd.github.io/orbital-express/，包含指南、參考資料、教學和更新日誌
- **GitHub Actions CI** — 每次推送至 `docs/**` 時自動部署文件
- **Agent/AI skill 層** — `.claude/skills/` 中每個常見任務的操作手冊（create-feature、add-action、add-migration、write-tests 等）
- **`req.args` 標準化** — `middleware/args.js` 將 POST body 和 GET query 統一為一個物件；括號符號篩選運算子（`date[gte]=…`）自動轉換為 Sequelize 運算子
- **Audience × platform auth 模型** — `X-Client` 標頭（`web`/`app`）設定 JWT audience；`X-Platform` 標頭作為後設資料儲存於 session 資料列
- **`helpers/session.js`** — session 建立、輪換和撤銷的輔助函式
- **`helpers/schemas.js`** — 可重用的共享 Joi schemas，採用函式匯出模式
- **`services/secure.js`** — 用於敏感欄位的 AES-256-GCM 可逆加密

### 變更
- **JS 檔案結構** — 強制執行匯入順序：標頭 → `'use strict'` → ENV → 內建模組 → 第三方 → services → helpers → models → queues → 常數 → `module.exports` → 方法
- **命名慣例** — actions 格式 `V{n}{Action}[By{Role}][On{Device}]`；tasks 永遠加上 `Task` 後綴
- **Route URL 慣例** — 全小寫，無分隔符號（`V1LogoutAll` → `/v1/users/logoutall`）
- **Controller 模式** — 角色檢查在 controller 中；action 返回純 `{ status, success, ...payload }`
- **錯誤處理** — HTTP actions 返回 `errorResponse`；tasks/sockets 使用 `throw`
- **Model 慣例** — UUID v4 主鍵；預設 `paranoid: true`；每個 FK 都有具名索引；擁有者 FK 帶到所有後代
- **常數模式** — 雙重匯出：`ADMIN_ROLE`（物件）+ `ADMIN_ROLES`（陣列）
- **測試檔案位置** — 完全鏡像原始碼位置

### 移除
- 舊版單一資料表角色欄位使用者模式（以每種使用者類型一張資料表取代）
