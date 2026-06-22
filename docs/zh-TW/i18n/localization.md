# 國際化（i18n）與在地化

## 概覽

i18n 系統有三層：**原始碼檔案**（JS）、**編譯輸出**（JSON）以及**執行期 service**。核心規則是：

> 永遠不要直接編輯 `locales/*.json`。務必編輯 `languages/*.js` 原始碼檔案，然後執行 `yarn lang`。

---

## 流程

```
languages/en.js              （全域原始碼——GLOBAL namespace）
app/*/languages/en.js        （功能原始碼——FEATURENAME namespace）
        ↓  yarn lang
locales/en.json              （編譯後——請勿編輯）
        ↓  執行期
services/language.js         （i18n middleware + getLocalI18n()）
```

---

## Key 命名慣例

所有 key 遵循 `NAMESPACE[snake_case_key]` 模式：

- **Namespace**——`ALL_CAPS`（全大寫）。使用功能名稱（`ADMIN`、`USER`、`BOOKING`）或 `GLOBAL` 表示共用字串。
- **Key**——`all_lowercase_with_underscores`（全小寫底線分隔）。不使用 camelCase、不使用連字號、不混用大小寫。

```
GLOBAL[unauthorized]
GLOBAL[internal_server_error]
USER[profile_not_found]
ADMIN[invalid_login_credentials]
ORDER[payment_failed]
```

---

## 原始碼檔案

### 全域字串——`languages/en.js`

整個 app 中共享的字串。使用 `GLOBAL` namespace。

```javascript
// languages/en.js
module.exports = {
  'GLOBAL[unauthorized]':          'You do not have permission to make this request.',
  'GLOBAL[internal_server_error]': 'Oops... something went wrong.',
};
```

### 功能字串——`app/<Feature>/languages/en.js`

限定於單一功能的字串。使用功能名稱作為 namespace。

```javascript
// app/Admin/languages/en.js
module.exports = {
  // V1Login
  'ADMIN[invalid_login_credentials]': 'The email and/or password you entered is incorrect.',
  'ADMIN[admin_account_inactive]':    'Admin account is inactive.',

  // V1Create
  'ADMIN[admin_already_exists]':      'Admin user already exists.',
};
```

**按 action 分組：** 以行內註解按使用它們的 action 組織 key。這樣在移除 action 時，能輕鬆找到並刪除對應的 key。

### 插值

對動態值使用 `{{variable}}` 語法：

```javascript
'ADMIN[reset_email_success_message]': 'An email has been sent to {{email}}. Please check your email.',
```

在 action 中：

```javascript
res.__('ADMIN[reset_email_success_message]', { email: args.email });
```

---

## 編譯——`yarn lang`

執行 `yarn lang` 會呼叫 `services/language.js compile()`，它會：

1. 載入 `languages/en.js`（全域字串）
2. 走訪每個 `app/*/languages/en.js`（功能字串）
3. 將所有 key 合併成一個平坦物件
4. 寫入 `locales/en.json`

```json
// locales/en.json（編譯後——請勿手動編輯）
{
  "GLOBAL[unauthorized]": "You do not have permission to make this request.",
  "ADMIN[invalid_login_credentials]": "The email and/or password you entered is incorrect."
}
```

`yarn test` 在 Jest 啟動前自動執行 `yarn lang`，因此缺失或命名錯誤的 key 會在任何測試執行之前就快速失敗。

---

## 執行期 Service（`services/language.js`）

### 在 action 中（HTTP）

locale 由 middleware 自動設定——你永遠不需要手動呼叫 `setLocale`。偵測順序如下：

1. `req.user.locale`——已登入使用者儲存的偏好設定（在 `middleware/auth.js` 中設定）
2. `lang` 參數——如果任何請求在 `req.args` 中傳遞了 `lang`，`middleware/args.js` 會呼叫 `req.setLocale()` 並將其從 `req.args` 中移除
3. `i18n-locale` cookie——從先前的 locale 切換中持久保存
4. 預設 locale（`en`）

在 action 中直接使用 `req.__('KEY')` 或 `res.__('KEY')`：

```javascript
res.__('ADMIN[reset_email_success_message]', { email: args.email });
```

### 在 task 中（背景任務）

Task 在 worker 進程中執行——沒有 `req` 物件。使用 `getLocalI18n()` 並從 `job.data` 中手動設定 locale：

```javascript
const { getLocalI18n } = require('../../services/language');

// 在 action 中——排入佇列時擷取 locale
Queue.add('V1SendWelcomeEmailTask', {
  userId: user.id,
  locale: req.user.locale,
});
```

```javascript
// 在 task 中——在新的本地實例上設定 locale
const i18n = getLocalI18n();
i18n.setLocale(job.data.locale || 'en');

const message = i18n.__('ADMIN[reset_email_success_message]', { email: user.email });
```

**為什麼用 `getLocalI18n()` 而非共享實例？** i18n 模組是有狀態的。在並發任務之間共享一個實例，意味著一個任務可以改變 locale 並影響到另一個任務。`getLocalI18n()` 回傳一個限定於請求或任務範圍的全新物件。

`yarn gen` 的 task scaffold 模板自動包含這個 locale 樣板程式碼。如果 task 不產生任何面向使用者的字串，則將其移除。

### 在 service 中

與 task 相同——直接使用 `getLocalI18n()`。

---

## Key 安全性

兩個機制防止缺失的翻譯 key 悄悄到達使用者：

**編譯期（`validateKeys`）：** `yarn lang` 編譯完成後，它會掃描 `app/`、`services/`、`helpers/` 和 `middleware/` 中所有 JS 檔案的靜態 `.__('KEY')` 呼叫，並驗證每個 key 是否存在於已編譯的預設 locale 中。在 `test` 和 `production` 環境中，這會拋出錯誤並中止進程。在開發環境中，它會印出黃色警告。

**執行期（`missingKeyFn`）：** 如果在執行期缺少某個 key，i18n middleware 會呼叫 `missingKeyFn`。在 `test` 和 `production` 環境中，這會立即拋出錯誤。在開發環境中，它會記錄紅色錯誤並回傳原始 key 字串，讓 app 不會崩潰。

這兩者結合意味著缺失的翻譯 key 會在編譯期（`yarn lang` 期間）大聲失敗，如果有一個漏網之魚，也會在執行期再次失敗。

**常見陷阱：** 如果測試套件無法啟動並顯示缺少 i18n key 的錯誤，表示你使用了一個未定義的 `.__('KEY')`。將它加入 `languages/*.js` 並執行 `yarn lang`。

---

## 新增翻譯 Key

1. 將 key/value 對加入適當的 `languages/*.js` 檔案（全域或功能）
2. 執行 `yarn lang` 重新編譯
3. 在你的 action 中以 `req.__('KEY')` 或 `res.__('KEY')` 引用該 key

使用 **`add-locale`** skill 獲取逐步指引。

---

## 新增 Locale

1. 在每個功能資料夾和全域 `languages/` 資料夾中建立對應的語言檔案（例如 `languages/fr.js` 和 `app/*/languages/fr.js`）
2. 將 locale 識別符（例如 `'fr'`）加入 `helpers/constants.js` 中的 `LOCALES` 常數
3. 執行 `yarn lang` 進行編譯

> 一次性跨所有功能 scaffold 新語言檔案的輔助腳本已在 `app/feature.js` 中記錄為 TODO。

使用 **`add-locale`** skill——它端對端處理這一切。

---

## 與錯誤碼的關聯

i18n key 出現在 `app/<Feature>/error.js` 中的錯誤碼定義裡。`messages` 陣列存放翻譯 key：

```javascript
ADMIN_BAD_REQUEST_INVALID_LOGIN_CREDENTIALS: {
  error: 'ADMIN.BAD_REQUEST_INVALID_LOGIN_CREDENTIALS',
  status: 400,
  messages: ['ADMIN[invalid_login_credentials]']
}
```

新增錯誤碼時，在同一個 commit 中將對應的翻譯 key 加入 `languages/en.js` 並執行 `yarn lang`。`add-error-code` skill 會同時引導完成這兩個步驟。

---

## Gulp Watch

gulpfile 監視 `languages/*.js` 檔案。執行 `yarn gulp` 時，任何對語言原始碼檔案的變更都會自動重新編譯到 `locales/*.json`——與 `yarn lang` 做的事情相同，但是持續進行。在積極開發翻譯文案時非常有用。
