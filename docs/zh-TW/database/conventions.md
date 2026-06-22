# 資料庫慣例

## UUID 主鍵

永遠使用 UUID v4，在 ORM 層產生（`defaultValue: DataTypes.UUIDV4`）。

```javascript
id: {
  type: DataTypes.UUID,
  allowNull: false,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
  validate: { isUUID: 4 }
}
```

為什麼不用自動遞增整數：UUID 不可預測，且在 URL 中暴露是安全的。在 ORM 層產生意味著在插入之前你就知道 ID——當你需要在資料庫寫入確認前建立關聯記錄或回傳任務 payload 時很有用。

---

## 軟刪除（`paranoid: true`）

在 model 上設定 `paranoid: true` 時，呼叫 `model.destroy()` 永遠不會發出 SQL `DELETE`。它會設定 `deletedAt` 時間戳記。所有標準查詢（`findOne`、`findAll`、`findByPk`）會自動過濾掉軟刪除的記錄。

```javascript
// 普通查詢——軟刪除的記錄回傳 null
await models.user.findByPk(userId);

// scope(null)——繞過 paranoid 過濾器，回傳記錄
await models.user.scope(null).findOne({ where: { id: userId } });
```

對於你想要硬刪除的 model（例如 session 記錄、日誌條目、任何刪除後沒有理由保留的資料），設定 `paranoid: false`。

---

## 命名慣例

| 項目 | 慣例 | 範例 |
|---|---|---|
| 資料表名稱 | 複數 PascalCase | `Users`、`Orders`、`UserSessions` |
| 欄位名稱 | camelCase | `firstName`、`userId`、`createdAt` |
| FK 欄位 | `<entity>Id` | `userId → Users.id` |
| 同一資料表的多個 FK | 角色前綴 | `hostUserId`、`guestUserId` 都指向 `Users.id` |
| 第三方廠商 ID | 廠商前綴 | `stripeId`、`twilioId`、`auth0Id` |
| Index 名稱 | `{Table}_{col}_{idx\|unique}` | `Users_email_unique`、`Orders_userId_idx` |
| ENUM 類型名稱 | 全大寫、不加分隔符 | `ACTIVE`、`PENDING`、`INREVIEW` |

### 每張資料表的欄位順序

1. 主鍵 `id`
2. Foreign key
3. 第三方廠商 ID
4. 功能特定欄位
5. Sequelize 自動管理的欄位：`deletedAt`、`createdAt`、`updatedAt`

---

## 務必為 Foreign Key 建立索引

Postgres 的 foreign key 約束提供參照完整性，但不建立索引。在沒有索引的資料表上，每個 `WHERE userId = x` 查詢在大規模時都是全資料表掃描。沒有例外。

```javascript
indexes: [
  { name: 'Orders_userId_idx', fields: ['userId'] },
  { name: 'Orders_email_unique', fields: ['email'], unique: true }
]
```

規則：
- **務必為 FK 欄位建立索引。** 沒有例外。
- **為任何有唯一約束的欄位建立索引。** 使用帶有 `unique: true` 的 `indexes` 陣列——不要直接在欄位定義上使用 `unique: true`。
- **務必在每個索引上設定明確的 `name`**——在 model 和 migration 中都要——使用 `{TableName}_{columnName}_{unique|idx}`。永遠不要依賴自動產生的名稱。

model `indexes` 陣列和 migration 的 `addIndex` 呼叫必須定義完全相同的索引，且名稱完全相同。

---

## 扁平化擁有權（將擁有者 FK 帶到每個子孫資料表）

將擁有實體的 foreign key 帶到每個子孫資料表——不只是直接的父資料表。

```
User -> UserOrder -> UserOrderItem
```

| 欄位 | 資料表 | 參照 |
|---|---|---|
| `userId` | `UserOrders` | `Users.id` |
| `userOrderId` | `UserOrderItems` | `UserOrders.id` |
| `userId` | `UserOrderItems` | `Users.id`——**這裡也要有** |

### 原因

擁有者 id 是你的安全範圍。幾乎每個查詢都是「屬於這個使用者的東西」。在每張資料表上都有 `userId`，每個存取控制檢查和列表查詢都是平坦的 `WHERE userId = x`——不需要 JOIN：

```javascript
// 無 JOIN、完全索引
await models.userOrderItem.findAll({ where: { userId } });
```

讀取遠多於寫入。以少量冗余儲存換取大規模時的無 JOIN 讀取。

### 必要：組合 Foreign Key 以防止資料漂移

子資料表上冗余的 `userId` 欄位，在訂單被重新指派時可能失去同步。在資料庫層面用組合 foreign key 來防止這種情況：

```javascript
// 1. 在父資料表上新增 UNIQUE (id, userId)，使其可作為組合 FK 目標
await queryInterface.addConstraint('UserOrders', {
  fields: ['id', 'userId'],
  type: 'unique',
  name: 'UserOrders_id_userId_unique',
  transaction: t
});

// 2. 在子資料表上新增組合 FK——Postgres 會拒絕任何 userId 與其訂單的 userId 不匹配的項目
await queryInterface.addConstraint('UserOrderItems', {
  fields: ['userOrderId', 'userId'],
  type: 'foreign key',
  name: 'UserOrderItems_userOrderId_userId_fkey',
  references: { table: 'UserOrders', fields: ['id', 'userId'] },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
  transaction: t
});
```

### Scope 規則

- **務必**將頂層擁有者（`userId`）帶到每個子孫資料表。不可妥協。
- 只有在你確實需要透過中間祖先層級查詢深層葉節點時，才將中間祖先的 key 帶到深層葉節點。不要反射性地新增每個祖先 key。

---

## 布林欄位

必須以連繫動詞開頭，讓它讀起來像是一個是/否問題。

| 前綴 | 範例 |
|---|---|
| `is` | `isActive`、`isVerified` |
| `has` | `hasPassword`、`hasCompletedOnboarding` |
| `can` | `canInviteOthers`、`canEdit` |
| `does` | `doesRequireApproval`、`doesAllowGuests` |
| `should` | `shouldNotify`、`shouldAutoRenew` |

永遠不要用裸名詞：`connectionsOnly` → `isConnectionsOnly`。

---

## 敏感與私密資料

在每個有敏感欄位的 `model.js` 頂部定義：

```javascript
const sensitiveData = ['salt', 'password', 'passwordResetToken'];
const privateData = sensitiveData.concat(['phone', 'birthdate', 'lastOnlineAt']);
```

- **`sensitiveData`**——在任何情況下都不暴露給任何人。自動從 `defaultScope` 中排除。
- **`privateData`**——以 `sensitiveData` 為基礎，加上使用者之間私密的欄位（擁有者可以看到自己的 `phone`；其他使用者不能）。

透過 model 上的靜態方法暴露：

```javascript
User.getSensitiveData = () => sensitiveData;
User.getPrivateData   = () => privateData;
```

---

## 關聯

在每個關聯上務必明確指定 `onDelete` 和 `onUpdate`。

- `CASCADE`——子記錄跟隨父記錄。當子記錄在沒有父記錄的情況下沒有意義時使用。
- `SET NULL`——父記錄被刪除時，FK 設為 null。當子記錄應該保留時使用（例如，訊息不應該因為發送者帳號被刪除而消失）。

在每個關聯上務必加上純文字的英文註解，描述這段關係。

```javascript
User.associate = models => {
  // 一個使用者有多個訂單記錄
  User.hasMany(models.userOrder, {
    as: 'userOrders',
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};
```

---

## `database/schema.sql`

每張資料表的文件說明。**從不執行。** 唯讀參考，讓工程師可以在一個地方掃描完整的 schema，而不用在各個 model 檔案之間跳轉。

欄位順序模板在檔案頂部。每當 migration 新增或移除欄位時，保持它的更新。

---

## `database/sequence.js`

定義 fixture 和 seed 資料的資料表建立順序——Sequelize 需要在子資料列之前插入父資料列，因為有 FK 約束。當一個新功能被 scaffold 時，`yarn gen` 會自動更新它。除非你要新增一個產生器不知道的資料表，否則不要手動編輯。
