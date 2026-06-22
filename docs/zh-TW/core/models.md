# 資料層 / Models

每個 feature 資料夾都對應一張資料庫資料表。資料夾內的 `model.js` 檔案定義了該資料表的 schema 和 Sequelize（ORM）的行為。在啟動時，全域 `models` 聚合器會自動載入每個 `model.js`，並透過單一的 `models` 物件提供存取。你永遠不會直接 import 一個 model — 你永遠透過 `models` 存取。

**三個不同的層，三個不同的角色：**

| 層級 | 檔案 | 目的 |
|---|---|---|
| 執行期 schema | `app/<Feature>/model.js` | ORM 使用這個來查詢和修改資料。可以自由更新。 |
| Schema 歷史 | `database/migrations/` | 實際修改 Postgres schema 的東西。一旦部署，永遠不再編輯。 |
| 人工參考 | `database/schema.sql` | 僅供文件參考 — 從不執行。工程師掃描這個以了解完整的 schema，而不需要開啟每個 model 檔案。 |

---

## `model.js` 的結構

每個 model 檔案都遵循相同的由上至下佈局。以下是使用 `User` model 的完整注釋範例。

```javascript
/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 *
 * A User is an account. Users authenticate with email + password or
 * Sign in with Google (googleId set).
 */

'use strict';

// third-party
const bcrypt = require('bcrypt');

// helpers
const constants = require('../../helpers/constants');
```

### 1. 敏感與私有資料陣列

在 model 之前定義在檔案頂部，使其可以同時在 `defaultScope` 和靜態方法中參照。

```javascript
// 在任何情況下都絕對不回傳給任何人的欄位。
// defaultScope 自動從每個查詢中排除這些欄位。
const sensitiveData = ['salt', 'password', 'passwordResetToken', 'accessToken', 'refreshToken'];

// 擴展 sensitiveData，包含 users 之間私有的欄位。
// 已認證的 user 可以看到自己的 phone/birthdate；另一個 user 則不能。
const privateData = sensitiveData.concat(['phone', 'birthdate']);
```

- **`sensitiveData`** — 憑證、tokens、機密。被 `defaultScope` 排除，使其永遠不會被意外回傳。
- **`privateData`** — 擴展 `sensitiveData`，加入個人私有欄位。將資料回傳給記錄本身的擁有者時使用 `getSensitiveData()`；將一個 user 的資料回傳給另一個 user 時使用 `getPrivateData()`。

---

### 2. `id` 欄位 — 永遠是 UUID v7

```javascript
id: {
  type: DataTypes.UUID,
  allowNull: false,
  defaultValue: () => uuidv7(),  // 在 ORM 層產生，在 INSERT 之前
  primaryKey: true,
  validate: { isUUID: 7 }
},
```

永遠使用 UUID v7。在 ORM 層產生，使你在資料庫寫入之前就知道 ID — 在建構相關記錄或在 insert 確認前回傳工作 payload 時很有用。

---

### 3. 外鍵佔位符

```javascript
// All foreign keys are added in associations
```

不要在欄位定義區塊中定義 FK 欄位。Sequelize 在你定義關聯時會自動加入它們。這個注釋是這個慣例的提醒。

---

### 4. 一般欄位

```javascript
timezone: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'UTC'
},

locale: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: constants.LOCALE.EN  // 永遠參照常數，而不是字串字面值
},

isActive: {
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue: true
},

email: {
  type: DataTypes.STRING,
  allowNull: false,
  // 不要在這裡設定 unique: true — 使用下方的 indexes 陣列
},

salt: {
  type: DataTypes.STRING,
  allowNull: false
},

password: {
  type: DataTypes.STRING,
  allowNull: false
},
```

---

### 5. Model 選項

```javascript
{
  timestamps: true,      // Sequelize 自動管理 createdAt 和 updatedAt — 永遠不要手動定義這些
  paranoid: true,        // 軟刪除：destroy() 設定 deletedAt 而不是發出 DELETE
  freezeTableName: true, // 防止 Sequelize 自動複數化 model 名稱來推導資料表名稱
  tableName: 'Users',    // 必須是 PascalCase 且為複數

  defaultScope: {
    attributes: { exclude: sensitiveData }  // sensitiveData 欄位自動從每個查詢中排除
  },

  hooks: {
    // 在 beforeValidate（而不是 beforeCreate）時雜湊，使 salt/password
    // 在 notNull 驗證執行之前被填入。
    // 由 changed('password') 守衛，使其在建立和真正的密碼變更時觸發，
    // 但在一般的個人資料更新時不觸發（那會重新雜湊現有的雜湊值）。
    beforeValidate(user, options) {
      if (user.changed('password') && user.password) {
        user.salt = bcrypt.genSaltSync(constants.BCRYPT_ROUNDS);
        user.password = bcrypt.hashSync(user.password, user.salt);
      }
    }
  },

  indexes: [ ... ]  // 見下方
}
```

---

### 6. 索引

三個規則：

1. **永遠為每個外鍵欄位建立索引。** Postgres 外鍵約束提供參照完整性，但不建立索引。每個沒有索引的 `WHERE userId = x` 在大規模下都是全表掃描。沒有例外。
2. **為每個有唯一約束的欄位建立索引。** 使用帶有 `unique: true` 的 `indexes` 陣列，而不是在欄位定義上設定 `unique: true` — 這讓你有明確的命名和一致性。
3. **永遠在每個索引上設定明確的 `name`**，使用慣例 `{TableName}_{columnName}_{unique|idx}`。絕對不要依賴自動產生的名稱。model 索引名稱和 migration 的 `addIndex` 名稱必須完全匹配。

```javascript
indexes: [
  // 唯一約束
  { name: 'Users_email_unique',                fields: ['email'],                unique: true },
  { name: 'Users_googleId_unique',             fields: ['googleId'],             unique: true },
  { name: 'Users_passwordResetToken_unique',   fields: ['passwordResetToken'],   unique: true },

  // 非唯一索引（用於你經常過濾/排序的欄位）
  { name: 'Users_role_idx',                    fields: ['role'] },

  // FK 索引範例（如果 Users 有外鍵的話）
  { name: 'Users_organizationId_idx',          fields: ['organizationId'] }
]
```

model 中的 `indexes` 陣列和 migration 中的 `addIndex` 呼叫必須保持完全同步 — 相同的欄位、相同的名稱。

---

### 7. 關聯

```javascript
User.associate = models => {

  // User has many UserSessions（可撤銷的 refresh-token sessions）
  // 刪除 user 會級聯到其所有 sessions — sessions 沒有 user 就沒有意義。
  User.hasMany(models.userSession, {
    as: 'userSessions',
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // User 可選地屬於一個 Organization
  // SET NULL：刪除 org 不會刪除 user — user 以孤立狀態存活。
  User.belongsTo(models.organization, {
    as: 'organization',
    foreignKey: { name: 'organizationId', allowNull: true },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });

}; // END associate
```

**`CASCADE` vs `SET NULL`：**
- **`CASCADE`** — 當父記錄被刪除/更新時，子記錄跟隨。當子記錄沒有父記錄就沒有意義時使用（例如沒有 user 的 session）。
- **`SET NULL`** — 當父記錄被刪除時，FK 被設為 null。子記錄存活。當子記錄應該比父記錄存活更久時使用（例如即使發送者被刪除也應該保留的訊息）。

永遠在每個關聯上加上注釋，用淺顯的英文解釋這個關係。關聯很快就會變得複雜 — 注釋使檔案易於導航。

---

### 8. 靜態方法

```javascript
// 回傳 sensitiveData 陣列 — 被 actions 用來排除欄位：
//   attributes: { exclude: models.user.getSensitiveData() }
User.getSensitiveData = () => sensitiveData;

// 回傳 privateData 陣列 — 用於 user 對 user 的可見度邊界
User.getPrivateData = () => privateData;

// 比較明文密碼與儲存的雜湊值
User.validatePassword = async (password, hash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => err ? reject(err) : resolve(result));
  });
};
```

`getSensitiveData()` 和 `getPrivateData()` 在每個有敏感欄位的 model 上都是必要的。`validatePassword()`（以及類似的方法）是從 actions 或 Passport 策略呼叫的 feature 專屬靜態工具。

---

## 命名慣例

| 項目 | 慣例 | 範例 |
|---|---|---|
| 資料表名稱 | 複數 PascalCase | `Users`、`UserOrders` |
| Model 名稱（Sequelize） | 單數 camelCase | `user`、`userOrder` |
| 欄位名稱 | camelCase | `firstName`、`lastLoginAt` |
| 外鍵欄位 | `<entity>Id` | `userId`、`organizationId` |
| 布林欄位 | `is/has/can/does` 前綴 | `isActive`、`hasPassword`、`canInvite` |
| 索引名稱 | `{Table}_{col}_{unique\|idx}` | `Users_email_unique` |

---

## 軟刪除（`paranoid: true`）

當 model 選項中設定 `paranoid: true` 時，呼叫 `instance.destroy()` 永遠不會發出 `DELETE` 語句。相反地，它設定 `deletedAt` 時間戳。每個標準查詢（`findOne`、`findAll`、`findByPk`）都自動加入 `WHERE "deletedAt" IS NULL` — 軟刪除的記錄對一般查詢是不可見的。

```javascript
// 這個 user 記錄在資料庫中存活 — deletedAt 被設定，而不是被刪除
await user.destroy();

// 標準查詢 — 回傳 null（記錄已軟刪除，預設被過濾掉）
await models.user.findByPk(userId);

// scope(null) — 繞過所有預設 scopes，回傳包含 deletedAt 的原始記錄
await models.user.scope(null).findOne({ where: { id: userId } });
```

**在以下情況使用 `scope(null)`：**
- 在測試中斷言記錄已被軟刪除
- 撰寫需要處理已刪除記錄的 admin/清理任務
- 建立「還原已刪除帳號」action

在硬刪除是正確做法的 models 上設定 `paranoid: false` — session 記錄、日誌條目、刪除後沒有理由保留的任何東西。

---

## 敏感資料與預設 Scope

`defaultScope` 是套用到 model 上每個 Sequelize 查詢的查詢 scope，除非明確覆蓋。其主要工作是排除敏感欄位，使其永遠不會被意外回傳：

```javascript
defaultScope: {
  attributes: { exclude: sensitiveData }
}
```

**三個可見度層級：**

```javascript
// 1. 公開 — 任何已認證的呼叫者看到的（套用 defaultScope）
const user = await models.user.findByPk(userId);
// → 除 sensitiveData 欄位外的所有欄位

// 2. 擁有者 — user 看到自己的資料（只排除真正的機密欄位）
const user = await models.user.scope(null).findOne({
  where: { id: req.user.id },
  attributes: { exclude: models.user.getSensitiveData() }
});
// → 除 salt、password 等之外的所有欄位

// 3. Admin / 原始 — 繞過一切（謹慎使用，通常在 auth 策略中）
const user = await models.user.scope(null).findOne({ where: { id } });
// → 包括敏感欄位在內的所有欄位（驗證密碼時需要）
```

靜態方法 `getSensitiveData()` 和 `getPrivateData()` 使這個模式可以跨 actions 重複使用，而不需要硬編碼欄位名稱。

---

## 扁平化所有權：將所有者 FK 向下傳遞

這是 Orbital-Express 中最重要的 schema 慣例之一。對於從教科書學習資料庫正規化的工程師來說，它也是感覺最不對的一個。請仔細閱讀本節。

### 純正規化 schema 的問題

考慮一個三層階層：

```
User  →  UserOrder  →  UserOrderItem
```

「教科書正規化」方法讓每張資料表只有指向其直接父級的 FK：

```
UserOrder.userId          → Users.id
UserOrderItem.userOrderId → UserOrders.id
// UserOrderItem 沒有直接的 userId
```

這看起來很乾淨。但現在回答最常見的查詢：*「屬於這個 user 的所有訂單明細是什麼？」*

你無法直接查詢 `UserOrderItems`。你必須透過 `UserOrders` 進行 JOIN：

```sql
SELECT i.* FROM "UserOrderItems" i
JOIN "UserOrders" o ON o.id = i."userOrderId"
WHERE o."userId" = :userId;
```

在 Sequelize 中，這意味著只是為了依 user 過濾就需要嵌套的 `include` 鏈。每增加一層嵌套，情況就更糟。

### 慣例：將所有者 FK 傳遞到每個後代

```
UserOrder.userId          → Users.id          ← 直接父級到所有者
UserOrderItem.userOrderId → UserOrders.id     ← 到直接父級
UserOrderItem.userId      → Users.id          ← 也到頂層所有者
```

現在常見的查詢變得簡單：

```javascript
// 無需 JOIN，有索引，在任何規模下都很快
await models.userOrderItem.findAll({ where: { userId } });
```

**為什麼這是正確的取捨：**

- `userId` 是你的安全範疇。系統中幾乎每個查詢都是「屬於*這個* user 的東西」。在每張資料表上都有 `userId` 意味著每個存取控制檢查和每個列表查詢都是一個扁平的 `WHERE userId = x`。這正是為什麼每個多租戶 SaaS 都在每張資料表上帶著 `accountId`/`orgId`，不論深度如何。
- 讀取遠多於寫入。消除 JOIN 在規模上是有回報的。一個冗餘 UUID 欄位的儲存成本微不足道。

### 用複合外鍵防止偏離

冗餘 `userId` 欄位的誠實缺點是，如果訂單被重新分配而明細沒有更新，它可能會失去同步。我們在資料庫層面解決這個問題。

**在 model 關聯中：**

```javascript
// UserOrder：到 user 的普通 FK
UserOrder.associate = models => {
  UserOrder.belongsTo(models.user, {
    foreignKey: { name: 'userId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};

// UserOrderItem：到直接父級的 FK，以及到所有者 user 的直接 FK
UserOrderItem.associate = models => {
  // 直接父級
  UserOrderItem.belongsTo(models.userOrder, {
    foreignKey: { name: 'userOrderId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  // 所有者 — 用於無 JOIN 查詢和安全範疇
  UserOrderItem.belongsTo(models.user, {
    foreignKey: { name: 'userId', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};
```

**在 migration 中：** 加入複合 FK，使 Postgres 強制 `item.userId` 必須等於其父訂單的 `userId`：

```javascript
// 步驟 1：UserOrders 需要在 (id, userId) 上的唯一約束，才能成為複合 FK 目標。
// id 已經是 PK（唯一），所以 (id, userId) 是平凡唯一的 — 這只是讓我們
// 可以一起參照兩個欄位作為 FK 目標。
await queryInterface.addConstraint('UserOrders', {
  fields: ['id', 'userId'],
  type: 'unique',
  name: 'UserOrders_id_userId_unique',
  transaction: t
});

// 步驟 2：UserOrderItems.(userOrderId, userId) 必須匹配現有的 UserOrders.(id, userId)。
// Postgres 現在會拒絕任何 item.userId != order.userId 的 item insert 或 update。
// 偏離現在是不可能的 — 資料庫強制一致性。
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

你得到兩全其美：在葉子資料表上有扁平 `userId` 的無 JOIN 查詢，以及它永遠不會失去同步的硬資料庫保證。

### Scope 規則 — 不要過度

永遠將**頂層所有者**（`userId`）向下傳遞到每個後代 — 它是你的 scope 鍵，是不可協商的。

只有當你實際上按那個中間層級查詢葉子時，才將*中間*祖先鍵（例如來自中間層分組的 `userOrderId`）傳遞到深層葉子。不要反射性地將每個祖先鍵加到每張資料表 — 那會讓寫入負擔倍增而沒有任何好處。

> 所有者鍵：永遠。中間鍵：只有當真正的查詢需要它們時。

---

## `database/sequence.js`

```javascript
/**
 * The table order in which test fixture and seed data is added into the database.
 * Model name must be Lower-case & Singular (NOT the table name).
 */

'use strict';

module.exports = [
  'admin',
  'adminSession',
  'user',
  'userSession'
];
```

**它的作用：** 當測試框架（或種子腳本）從夾具中填入資料庫時，它必須以 FK 安全的順序 insert 資料列 — 父資料表在子資料表之前。`sequence.js` 定義了那個順序。

**為什麼重要：** 如果 `userSession` 被列在 `user` 之前，insert 會失敗，因為 `UserSessions.userId` 參照的 `Users.id` 尚不存在。這個序列實際上是你資料層的依賴圖，表示為一個扁平的有序陣列。

**何時更新：** 產生器（`yarn gen FeatureName`）自動將新的 model 名稱附加到 `sequence.js`。如果你手動建立 model（你不應該這樣做），請自行加入 — 將其放在它所依賴的所有 models（其 FK 父級）之後，以及依賴它的所有 models（其 FK 子級）之前。

---

## 完整注釋的 Model 範例

來自程式碼庫的完整 User model，帶有行內注釋：

```javascript
/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 */

'use strict';

// third-party
const bcrypt = require('bcrypt');

// helpers
const constants = require('../../helpers/constants');

// ─── Sensitive / Private Data ─────────────────────────────────────────────────

// 這些欄位透過 defaultScope 從每個查詢中排除。
// 永遠不要將它們加到回應中 — ORM 自動強制執行這一點。
const sensitiveData = ['salt', 'password', 'passwordResetToken', 'accessToken', 'refreshToken'];

// 擴展 sensitiveData。將一個 user 的資料回傳給另一個 user 時使用 getPrivateData()。
const privateData = sensitiveData.slice();

// ─── Model Definition ─────────────────────────────────────────────────────────

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {

    // 永遠是 UUID v7，在 ORM 層產生（不是由 DB trigger 產生）
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: () => uuidv7(),
      primaryKey: true,
      validate: { isUUID: 7 }
    },

    // All foreign keys are added in associations

    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UTC'
    },

    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.LOCALE.EN
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    firstName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    lastName:  { type: DataTypes.STRING, allowNull: false, defaultValue: '' },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      // 唯一性透過下方的 indexes 陣列強制，而不是在這裡
    },

    salt:     { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },

    passwordResetToken:  { type: DataTypes.STRING, allowNull: true },
    passwordResetExpire: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: { isDate: true }
    },

    isEmailConfirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    loginCount:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastLoginAt:      { type: DataTypes.DATE,    allowNull: true,  defaultValue: null },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: constants.USER_ROLE.USER
    },

    // 在密碼變更或「到處登出」時遞增，以立即使所有
    // 未到期的 access tokens 失效，而不需要每個請求都觸碰 DB。
    tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }

  }, {
    timestamps: true,      // 自動管理 createdAt / updatedAt
    paranoid: true,        // 透過 deletedAt 進行軟刪除
    freezeTableName: true, // 不要自動複數化 'user' → 'users'
    tableName: 'Users',    // PascalCase，複數

    defaultScope: {
      attributes: { exclude: sensitiveData }
    },

    hooks: {
      // 在驗證之前雜湊，使建立時 salt/password 上的 notNull 不會失敗。
      // changed('password') 守衛：只在建立和真正的密碼變更時觸發。
      beforeValidate(user) {
        if (user.changed('password') && user.password) {
          user.salt = bcrypt.genSaltSync(constants.BCRYPT_ROUNDS);
          user.password = bcrypt.hashSync(user.password, user.salt);
        }
      }
    },

    indexes: [
      // 唯一約束 — 在這裡定義，而不是在欄位上，以便明確命名
      { name: 'Users_email_unique',               fields: ['email'],               unique: true },
      { name: 'Users_passwordResetToken_unique',  fields: ['passwordResetToken'],  unique: true },
      // 非唯一 — 經常過濾
      { name: 'Users_role_idx',                   fields: ['role'] }
    ]
  });

  // ─── Associations ─────────────────────────────────────────────────────────

  User.associate = models => {

    // 每個 User 有多個 UserSessions（可撤銷的 refresh-token sessions）。
    // Sessions 沒有其 user 就沒有意義 → 刪除時 CASCADE。
    User.hasMany(models.userSession, {
      as: 'userSessions',
      foreignKey: 'userId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

  }; // END associate

  // ─── Static Methods ───────────────────────────────────────────────────────

  // 被 actions 使用：attributes: { exclude: models.user.getSensitiveData() }
  User.getSensitiveData = () => sensitiveData;
  User.getPrivateData   = () => privateData;

  // 被 Passport local 策略和 changePassword action 使用
  User.validatePassword = async (password, hash) => {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hash, (err, result) => err ? reject(err) : resolve(result));
    });
  };

  return User;
}; // END USER MODEL
```
