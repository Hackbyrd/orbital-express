# 常數與列舉

## 禁止魔術字串規則

任何在多個地方使用的字串，統一放在 `helpers/constants.js` 中。引用 `LOCALE.EN`，而非 `'en'`。引用 `STATUS.ACTIVE`，而非 `'active'`。如果一個字串常量出現在 — 或可能出現在 — 多個檔案中，它就屬於 constants。

## helpers/constants.js 結構

```js
const LOCALE = { EN: 'en', ES: 'es', FR: 'fr' }
const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending' }
```

每個常數都是一個純物件，鍵為 UPPER_CASE 縮寫，值為程式碼庫其他地方使用的標準字串（或數字）。

## 雙重匯出模式

```js
module.exports = { LOCALE, LOCALE_ARR: Object.values(LOCALE), STATUS, STATUS_ARR: Object.values(STATUS) }
```

原因：有些地方需要物件（用於程式碼中的點存取），有些地方需要陣列（用於 Joi 的 `.valid()` 驗證）。從同一來源匯出兩者，讓它們自動保持同步。

## 命名規則

- 物件名稱為 `UPPER_CASE`（`LOCALE`、`STATUS`、`TOKEN_TYPE`）。
- 值可以是小寫字串（`LOCALE.EN = 'en'`）— 這是正確且刻意的設計。
- 陣列變體加上 `_ARR` 後綴（`LOCALE_ARR`），或使用複數名稱 — 在檔案內保持一致。

## 新增常數

使用 `add-constant` skill。禁止在其他地方新增原始字串。此 skill 確保常數及其 `_ARR` 對應項都被匯出，且所有呼叫端都更新為引用該常數。

## Migration 保持字面值

Migration 是某個時間點的 schema 狀態的歷史快照。它們使用字串字面值，而非常數。這是刻意且正確的 — migration 從不重構，因此重複是可接受且預期的。

## 適合放在此處的範例

- `LOCALE` — 語言代碼（`en`、`es`、`fr`）
- `STATUS` — 實體狀態（`active`、`inactive`、`pending`）
- `ROLE` — 使用者角色（`admin`、`member` 等）
- `TOKEN_TYPE` — token 種類（`access`、`refresh`）
- 任何其他在兩個或多個地方使用的 enum 類型集合
