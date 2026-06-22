# Migration

Migration 是每次 schema 變更的權威記錄。每個檔案都是一個凍結的快照——依序執行，它們會產生當前的資料庫狀態。永遠不要編輯已在任何環境中套用過的 migration。

---

## 建立 Migration

產生檔案有兩種方式：

```bash
# 直接方式——提供正確的名稱就不需要重命名：
./node_modules/.bin/sequelize migration:create --name add-cols-status-to-orders-tbl
./node_modules/.bin/sequelize migration:create --name create-products-model

# 快捷方式（產生通用名稱——填寫前先重命名符合慣例）：
yarn migration   # 修改資料表模板
yarn model       # 新建資料表模板
```

兩者都會在 `migrations/` 中放入一個帶有時間戳記的檔案。編輯之前先重命名，使其符合檔名慣例。或者，執行 **add-migration** skill 獲取逐步指引，它也會處理 model 更新、index 命名和 `schema.sql` 同步：

```
/add-migration
```

---

## Migration 檔案結構剖析

以下是一個完整附註的範例，將 `status` 欄位及其索引加入到現有的 `Orders` 資料表。

```js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  // ─── UP ──────────────────────────────────────────────────────────────────────
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {

      // 1. 新增欄位。
      //    使用字串字面值——migration 是凍結的快照，永遠不要引入
      //    constants 或 model 檔案。
      await queryInterface.addColumn('Orders', 'status', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',   // 字面值；對應常數值，而非常數 key
      }, { transaction: t });

      // 2.（可選）立即回填資料——在新增 NOT NULL 欄位時很有用。
      //    撰寫行內 SQL，而非引入 model 或 service。
      await queryInterface.sequelize.query(
        `UPDATE "Orders" SET status = 'PENDING' WHERE status IS NULL`,
        { transaction: t },
      );

      // 3. 新增索引。
      //    命名模式：{Table}_{col}_{idx|unique}
      //    必須與 Sequelize model 中宣告的索引名稱一致。
      await queryInterface.addIndex('Orders', ['status'], {
        name: 'Orders_status_idx',
        transaction: t,
      });

    });
  }, // END up

  // ─── DOWN ────────────────────────────────────────────────────────────────────
  async down(queryInterface /*, Sequelize */) {
    return queryInterface.sequelize.transaction(async (t) => {

      // up 的鏡像——以相反順序移除。
      await queryInterface.removeIndex('Orders', 'Orders_status_idx', { transaction: t });
      await queryInterface.removeColumn('Orders', 'status', { transaction: t });

    });
  }, // END down

}; // END migration
```

關鍵要點：

- **務必包裝在交易中。** `up` 和 `down` 都必須使用 `queryInterface.sequelize.transaction(async t => { ... })` 並將 `{ transaction: t }` 傳給每個呼叫。如果任何步驟失敗，整個 migration 會乾淨地回滾。
- **`up` 和 `down` 是對稱的。** 在 `up` 中新增的所有東西都在 `down` 中以相反順序移除。
- **只用字串字面值。** 不要 `require` constants、model 或 helper。檔案必須是獨立的，並且可以在歷史上的任何時間點執行。
- **Index 名稱**遵循 `{Table}_{col}_{idx|unique}`，且必須在 migration 和 Sequelize model 定義中完全相同地宣告。
- **鼓勵資料回填。** 在 `addColumn` 之後，立即撰寫行內 SQL 填充新欄位——特別是當它是 NOT NULL 時——這樣 app 就不會看到半遷移狀態。
- **永遠不要直接刪除或重命名欄位/資料表。** 要重命名：新增新欄位，在 migration 中複製資料，只有在部署確認穩定後才刪除舊欄位。這保留了回滾安全性。

---

## 執行 Migration

```bash
yarn migrate        # 開發環境——套用所有待處理的 migration
yarn migrate:prod   # 生產環境
yarn rollback       # 復原最後一次 migration（僅限開發）
```

> `yarn rollback` 是開發便利工具。永遠不要在沒有協調部署計畫的情況下在生產環境執行——它會改變線上 schema 狀態。

---

## Migration 慣例

| 慣例 | 說明 |
|---|---|
| **檔名** | `{action}-{description}-tbl`——例如 `add-cols-status-to-orders-tbl`、`create-products-tbl`、`remove-legacy-token-from-users-tbl` |
| **FK 欄位** | 務必為每個新的 FK 欄位新增索引 |
| **子孫的擁有者 FK** | 當子孫資料表獲得擁有者 FK（例如子記錄上的 `userId`）時，也要包含組合 FK 約束，將它綁定到父記錄 |
| **Index 名稱** | 非唯一用 `{Table}_{col}_{idx}`，唯一用 `{Table}_{col}_{unique}`——必須與 model 一致 |
| **凍結快照** | 使用字串字面值——永遠不要引入 `constants.js`、model 或任何 app 程式碼 |
| **冪等性** | 每個 migration 在每個環境中只執行一次；永遠不要修改已套用的 migration |

---

## 建立新資料表

使用 UUID 主鍵、標準時間戳記、paranoid 軟刪除（`deletedAt`）和索引的完整範例。

```js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {

  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('Products', {

      // ── 主鍵 ──────────────────────────────────────────────────────────────
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── 擁有者 FK（帶到每個子孫）─────────────────────────────────────────
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      // ── 業務欄位 ─────────────────────────────────────────────────────────
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ACTIVE',
      },

      // ── 標準時間戳記 ──────────────────────────────────────────────────────
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      // ── Paranoid 軟刪除 ───────────────────────────────────────────────────
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

    });

    // ── 索引 ─────────────────────────────────────────────────────────────────
    // FK 索引（每個 FK 欄位都必須有）
    await queryInterface.addIndex('Products', ['userId'], {
      name: 'Products_userId_idx',
    });

    // 組合 FK——將 (userId, id) 綁定到父資料表的擁有者記錄，
    // 即使在軟刪除的情況下也能防止孤立記錄。
    await queryInterface.addConstraint('Products', {
      fields: ['userId', 'id'],
      type: 'foreign key',
      name: 'Products_userId_id_fk',
      references: { table: 'Users', field: 'id' },   // 父 PK 的組合
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 常用過濾欄位的非唯一索引
    await queryInterface.addIndex('Products', ['status'], {
      name: 'Products_status_idx',
    });

  }, // END up

  async down(queryInterface /*, Sequelize */) {

    await queryInterface.dropTable('Products');

  }, // END down

}; // END migration
```

> Sequelize model 中的 `paranoid: true` 與這裡的 `deletedAt` 欄位配合使用。查詢自動過濾 `WHERE deletedAt IS NULL`；需要時使用 `scope(null)` 繞過過濾器。

---

## schema.sql 檔案

`database/schema.sql` 是當前資料庫狀態的人類可讀文件說明。它**不會被執行**——它是一個參考快照。

每次 migration 後，更新 `database/schema.sql` 以反映新的資料表或欄位。**add-migration** skill 包含這個步驟。保持欄位順序和註解風格與現有檔案標頭一致。

```
-- 執行 /add-migration——它會自動處理 schema.sql 同步。
```
