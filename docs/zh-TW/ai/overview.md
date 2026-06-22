# AI 工具與程式助手

Orbital Express 的設計與任何 AI 程式助手都能完美搭配——Claude Code、Cursor、GitHub Copilot、OpenAI Codex、Windsurf，或你的團隊使用的任何工具。框架的一致性正是讓 AI 發揮效用的關鍵：每個功能遵循相同的結構，因此任何 AI 都能正確地擴展它，而無需猜測。

本頁說明如何將各工具與框架的慣例、skills 和文件連接起來。

---

## MCP Server（Claude Code 與 Cursor）

`orbital-express-mcp` 套件提供最豐富的整合。它讓任何支援 MCP 的 AI 助手完整掌握框架知識——慣例、skill playbook、完整文件——隨時按需取用。

**MCP 是開放協議，並非 Claude 專屬。** 任何支援 MCP client 的工具都可以連接 `orbital-express-mcp`。

### Claude Code

在你的專案 `.claude/settings.json` 中加入：

```json
{
  "mcpServers": {
    "orbital-express": {
      "command": "npx",
      "args": ["-y", "orbital-express-mcp"]
    }
  }
}
```

如果你是透過 `npx create-orbital-app` 建立專案，此檔案已預先包含。

### Cursor

在你的專案 `.cursor/mcp.json` 中加入（框架 repo 已內建）：

```json
{
  "mcpServers": {
    "orbital-express": {
      "command": "npx",
      "args": ["-y", "orbital-express-mcp"]
    }
  }
}
```

Cursor 在下次啟動時會自動載入。

### Windsurf 及其他支援 MCP 的工具

將相同的 server 設定加入你的工具的 MCP 設定（位置因工具而異）：

```json
{
  "orbital-express": {
    "command": "npx",
    "args": ["-y", "orbital-express-mcp"]
  }
}
```

### MCP Server 提供的工具

連線後，AI 可在你的 session 中靜默呼叫以下工具：

| 工具 | 回傳內容 |
|---|---|
| `get_framework_overview` | 完整 `AGENTS.md`——架構、黃金守則、指令速查表 |
| `get_conventions` | 完整慣例規範——命名、HTTP、資料庫、身份驗證、測試 |
| `list_skills` | 所有可用 skill playbook 及說明 |
| `get_skill` | 指定 skill 的完整步驟手冊 |
| `list_docs` | 所有文件頁面及標題 |
| `get_docs_page` | 依 slug 取得指定文件頁面 |
| `search_docs` | 全文搜尋所有文件、skills 與慣例 |

---

## AGENTS.md（OpenAI Codex、Cursor 及其他工具）

repo 根目錄的 `AGENTS.md` 是與工具無關的指令檔案，任何 AI agent 都能讀取。OpenAI Codex 會自動讀取它，Cursor 和 Claude Code 也會將其作為 context。許多其他工具也支援或即將支援。

內容包含：
- 完整框架架構概覽
- 每一條黃金守則（命名、HTTP、資料庫、身份驗證、錯誤、model、測試、i18n）
- 完整指令速查表
- 每個可用 skill 的表格及使用時機

無需任何設定——它已在 repo 中。任何指向此程式碼庫的 AI 工具都能找到它。

---

## Cursor Rules

`.cursor/rules/orbital-express.mdc`（框架 repo 已內建）是 Cursor 原生的指令檔案，會自動套用至專案中的每個檔案。內容涵蓋：

- Generator 工作流程（`yarn gen`、`yarn del`）
- Feature-folder 結構
- HTTP 慣例、命名規則、錯誤處理
- 所有可用 skill 的完整清單

Cursor 無需任何設定即可讀取。

---

## GitHub Copilot

`.github/copilot-instructions.md`（框架 repo 已內建）為 Copilot 提供專案特定的 context，適用於此程式碼庫中所有 Copilot 建議。內容涵蓋與其他整合檔案相同的慣例：generator 使用方式、HTTP 模式、命名、錯誤、model、測試。

無需任何設定。

---

## Skills——適用於任何 AI

Skills 是存放在 `.claude/skills/` 中的逐步操作手冊。Claude Code 會自動探索並執行它們。對於其他工具，你可以直接引用 skill 檔案，或要求 AI 在開始任務前讀取特定 skill。

**Claude Code 和 Cursor（透過 MCP）：** AI 會自動呼叫 `get_skill`。

**其他工具：** 直接將 AI 指向 skill 檔案：

```
請讀取 .claude/skills/create-feature/SKILL.md 並依照步驟建立一個新的 Order 功能。
```

所有 19 個 skills 都在 `.claude/skills/` 中。Skill 檔案是純 Markdown——任何 AI 都能讀取。

### 可用 Skills

| Skill | 功能說明 |
|---|---|
| `create-feature` | 完整功能 scaffold——新資料表、資料夾、model、routes、actions、tests |
| `add-action` | 為既有功能新增 HTTP action |
| `add-query-action` | 新增列表 / 搜尋 / 分頁端點 |
| `add-task` | 新增背景任務 |
| `add-migration` | 建立或修改資料庫資料表 |
| `add-auth-user-type` | 新增身份驗證使用者類型（Partner、Driver 等） |
| `add-error-code` | 新增客戶端錯誤碼 |
| `add-constant` | 新增全域常數或列舉值 |
| `add-fixtures` | 新增測試資料或 seed 資料 |
| `add-mailer` | 新增交易型電子郵件 |
| `add-cronjob` | 排程定時任務 |
| `add-socket-event` | 新增即時 Socket.IO 事件 |
| `add-locale` | 新增語言或翻譯鍵值 |
| `write-tests` | 撰寫或審核整合測試 |
| `review-conventions` | 上線前自我審查程式碼是否符合慣例 |
| `sync-docs` | 保持所有文件同步 |
| `sync-translations` | 英文文件更新後同步 zh-TW 翻譯 |
| `release` | 發布新版本——版號更新、changelog、tag |
| `setup-and-ops` | 環境設定、啟動服務、資料庫備份 / 還原、部署 |

---

## 為何 AI 在這個框架中特別有效

AI 程式助手是模式匹配器。它們在擴展一致模式方面表現出色，在每位工程師都做出不同選擇的任意程式碼庫中則不可靠。

Orbital Express 的設計本身就是一致的：
- 每個功能資料夾有相同的結構
- 每個 action 遵循相同的形式
- 每個錯誤遵循相同的格式
- 每個測試遵循相同的模式

當你要求任何 AI 在這個程式碼庫中建立功能時，它讀取到處都存在的模式並加以擴展。輸出的正確性不是因為 AI 聰明，而是因為框架讓「正確」成為唯一可辨識的路徑。

這就是為什麼使用哪種 AI 工具並不重要。框架承擔了繁重的工作，AI 只是跟隨模式。

---

## 快速設定總覽

| 工具 | 操作方式 |
|---|---|
| **Claude Code** | `.claude/settings.json` 已內建——MCP 自動連線 |
| **Cursor** | `.cursor/mcp.json` + `.cursor/rules/orbital-express.mdc` 已內建 |
| **GitHub Copilot** | `.github/copilot-instructions.md` 已內建 |
| **OpenAI Codex** | repo 根目錄的 `AGENTS.md`——自動讀取 |
| **Windsurf 及其他 MCP 工具** | 將 `orbital-express-mcp` 加入你的工具的 MCP server 設定 |
| **任何其他 AI** | 將其指向 `AGENTS.md` 或任意 `.claude/skills/*/SKILL.md` 檔案 |
