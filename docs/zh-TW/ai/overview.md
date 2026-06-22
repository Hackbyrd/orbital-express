# AI 與 Claude Code

Orbital Express 專為與 AI 程式助手協作而設計，尤其是 Claude Code。本頁說明如何在開發過程中充分發揮 AI 的效益。

---

## MCP Server

讓 Claude 完整了解 Orbital Express 最快的方法，是使用官方 MCP（Model Context Protocol）server：**`orbital-express-mcp`**。

連線後，Claude 可以查詢慣例、取得 skill 操作手冊、搜尋文件，並精確回答框架相關問題——無需將任何內容貼到對話框中。

### 設定方式

在專案的 `.claude/settings.json` 加入以下設定：

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

完成。Claude Code 會在下次啟動時自動載入此設定。MCP server 透過 `npx` 在本機執行，無需另外安裝或維持常駐程序。

::: tip 已預先設定
若你是透過 `npx create-orbital-app` 建立專案，`.claude/settings.json` 已預先完成設定。
:::

### MCP Server 提供 Claude 哪些能力

連線後，Claude 可呼叫以下 7 個工具（在背景靜默執行）：

| 工具 | 功能說明 |
|---|---|
| `get_framework_overview` | 完整 AGENTS.md——架構、黃金守則、指令速查表 |
| `get_conventions` | 完整慣例規範——命名、結構、HTTP、資料庫、身份驗證、測試 |
| `list_skills` | 所有可用 skill 清單與說明 |
| `get_skill` | 指定 skill 的完整步驟手冊 |
| `list_docs` | 所有文件頁面及標題 |
| `get_docs_page` | 依 slug 取得指定文件頁面 |
| `search_docs` | 全文搜尋所有文件、skills 與慣例 |

這些工具不需要你手動呼叫，Claude 會在你要求建立功能、新增 action、撰寫測試等情境下自動使用。

---

## Skills

Skills 是逐步操作手冊，告訴 Claude 如何在此框架中完成常見任務。它們存放於 `.claude/skills/`，Claude Code 會自動探索並載入。

當你說「在 Order 新增一個 V1Create action」或「幫我寫這個 action 的測試」，Claude 會讀取對應的 skill 並依照手冊執行，而非自行猜測。

### 可用 Skills

| Skill | Claude 的使用時機 |
|---|---|
| `create-feature` | 完整建立新功能（新資料表 + 資料夾） |
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

### 手動執行 Skill

你可以直接呼叫任何 skill：

```
/create-feature
/add-action
/write-tests
/release
```

或用白話文描述你要做什麼——Claude 會自動觸發對應的 skill。

---

## 為何 AI 在這裡特別有效

Orbital Express 從設計上就對 AI 友好：

**純 JavaScript。** Claude 對 JavaScript 的掌握程度超越其他任何語言。沒有 TypeScript 型別階層、沒有編譯步驟、沒有生成的輸出讓模型感到困惑。你寫的程式碼就是 Claude 讀到的程式碼。

**一致的慣例。** 每個功能資料夾結構相同，每個 action 遵循相同架構，每個 model 有相同模式。當程式碼庫具有一致性，AI 的協助就會更精確、更快速——因為一個功能的模式可以預測其他所有功能的模式。

**明確的操作手冊。** Skills 不只是建議——它們是 Claude 遵循的確切步驟。這意味著 AI 生成的程式碼會遵循你的慣例，而非模型從隨機 GitHub 儲存庫學到的通用模式。

**每個問題只有一個解法。** Orbital Express 對路由、驗證、錯誤處理各有一套固定做法。當只有一個正確答案，Claude 就會給你正確答案。

---

## 使用 Claude Code 開發 Orbital Express 的技巧

**從概覽開始。** 在對話開始時，Claude 會自動呼叫 `get_framework_overview` 來定位框架知識。你不需要把 `AGENTS.md` 貼進對話。

**必要時明確指定 skill。** 如果 Claude 沒有自動觸發正確的 skill，直接說出來：「使用 create-feature skill 來建立 Order 功能。」

**讓 Claude 執行產生器。** Skills 包含了 `yarn gen` 和 `yarn del` 指令。不要手動建立檔案——告訴 Claude 你想要什麼，讓它執行產生器。

**上線前執行審查。** 任何重要變更後，請 Claude 執行 `/review-conventions`——它會根據慣例規範自我審查程式碼，並標記任何不符合的地方。
