# 發布指南

如何為 Orbital Express 發布新版本。

---

## 版本號規則

Orbital Express 遵循[語意化版本控制](https://semver.org/)。版本號格式為 `MAJOR.MINOR.PATCH`：

| 變更類型 | 更新哪個數字 | 範例 |
|---|---|---|
| 錯誤修復、文件修正、小幅調整 | Patch | `3.0.0` → `3.0.1` |
| 新功能、非破壞性新增 | Minor | `3.0.1` → `3.1.0` |
| 破壞性變更或完整重寫 | Major | `3.1.0` → `4.0.0` |

**若有疑問：** 若使用 Orbital Express 的現有專案需要修改程式碼才能採用此更新，就是破壞性變更 → 更新 major 版本號。

---

## 逐步發布流程

### 1. 進行你的變更

照常將所有內容提交至 `main`。版本號直到準備好發布版本時才會變更。

### 2. 更新 `CHANGELOG.md`

開啟 repo 根目錄的 `CHANGELOG.md`。從檔案底部複製範本區塊，貼到上一個發布項目**之上**。填入內容：

```md
## [3.0.1] — 2026-07-15

### 概覽
一句話描述此版本的內容。

### 新增
- 之前不存在的新事物

### 變更
- 已存在但行為有所不同的事物

### 修復
- 已損壞且現已修復的錯誤

### 移除
- 不再存在的事物

### ⚠ 破壞性變更
- 任何需要使用者更新程式碼的事項
```

只包含相關的區段 — 略過空的區段。

### 3. 更新 `docs/changelog.md`

開啟 `docs/changelog.md`，在頂部（介紹段落下方）新增相同的項目。可以省略範本注釋區塊 — 只要內容即可。

::: tip 保持同步
`CHANGELOG.md`（repo 根目錄）是真實來源。`docs/changelog.md` 是使用者在文件網站上看到的內容。它們應該永遠保持一致。
:::

### 4. 更新 `package.json` 中的版本號

```json
{
  "version": "3.0.1"
}
```

### 5. 提交發布

```bash
git add CHANGELOG.md docs/changelog.md package.json
git commit -m "chore: release v3.0.1"
git push origin main
```

### 6. 標記並推送 tag

```bash
git tag v3.0.1
git push origin v3.0.1
```

就這樣。[發布工作流程](https://github.com/Hackbyrd/orbital-express/actions/workflows/release.yml)會自動觸發，讀取你的更新日誌項目，並建立 GitHub Release。

---

## 自動化做了什麼

當 `v*` tag 被推送時，`.github/workflows/release.yml` 會：

1. Checkout repo
2. 從 `CHANGELOG.md` 中提取符合 tag 版本的更新日誌區段
3. 在 `github.com/Hackbyrd/orbital-express/releases` 建立一個 GitHub Release，以該文字作為發布說明

你不需要在 GitHub 上撰寫任何內容 — 只需要更新日誌檔案即可。

---

## 標記破壞性變更

在更新日誌項目中新增 `### ⚠ 破壞性變更` 區段，並精確描述使用者端需要做什麼更改：

```md
### ⚠ 破壞性變更
- `middleware/auth.js` 不再匯出 `attachAuth` — 請替換為 `attachJWTAuth`
- `req.user.role` 欄位已移除 — 請改用 `req.user.userType`
```

破壞性變更需要**更新 major** 版本號。

---

## 快速參考

```bash
# Patch 發布（錯誤修復/小幅調整）
# 1. 編輯 CHANGELOG.md + docs/changelog.md + package.json
git add CHANGELOG.md docs/changelog.md package.json
git commit -m "chore: release v3.0.1"
git push origin main
git tag v3.0.1 && git push origin v3.0.1

# Minor 發布（新功能）
git tag v3.1.0 && git push origin v3.1.0

# Major 發布（破壞性變更/重寫）
git tag v4.0.0 && git push origin v4.0.0
```
