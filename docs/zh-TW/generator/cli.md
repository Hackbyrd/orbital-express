# 產生器（yarn gen / yarn del）

## 為什麼要用產生器？

一致性。每個功能、action 和 task 看起來都完全相同。不要手工建立。

## 產生功能

```bash
yarn gen Order
```

建立完整的功能資料夾：

- app/Order/model.js
- app/Order/controller.js
- app/Order/routes.js
- app/Order/worker.js
- app/Order/helper.js
- app/Order/error.js
- app/Order/actions/index.js + V1Example.js
- app/Order/tasks/index.js + V1ExampleTask.js
- app/Order/languages/en.js
- app/Order/tests/integration/ + tests/tasks/

同時更新：routes.js、models.js、worker.js、database/sequence.js

## 立即移除佔位符檔案

```bash
yarn del Order -a V1Example
yarn del Order -t V1ExampleTask
```

如果沒有自訂 helper，也請移除 helper.test.js。

## 產生 Action

```bash
yarn gen Order -a V1Create
```

建立 app/Order/actions/V1Create.js + 測試檔案。自動更新 actions/index.js。

## 產生 Task

```bash
yarn gen Order -t V1ProcessTask
```

## 產生 Mailer

```bash
yarn gen Order -m OrderConfirmation
```

## 刪除指令

```bash
yarn del Order -a V1Create        # 移除 action + 測試 + index.js 條目
yarn del Order -t V1ProcessTask
yarn del Order -m OrderConfirmation
yarn del Order                    # 移除整個功能
```

務必使用 `yarn del`，永遠不要用 `rm`——`del` 會更新聚合器檔案，`rm` 會留下損壞的 export。

## yarn lang

編輯 languages/ 檔案後編譯 i18n。

```bash
yarn lang
```
