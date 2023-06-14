/**
 * USER MODEL
 *
 * Find Table Schema Here: "/database/schema.sql"
 */

'use strict';

// require custom node modules
const constants = require('../../helpers/constants');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user', {

    // All foreign keys are added in associations

    example1: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },

    example2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: true
      }
    },

    example3: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: true
      },
      get() {
        // convert string to float
        const rawValue = this.getDataValue(example3);
        // must check because if allowNull is TRUE, because it might return 0 but should instead return NULL
        return (rawValue === null ? rawValue : Number(rawValue));
      }
    },

    example4: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'foo'
    },

    example5: {
      type: DataTypes.ENUM(constants.someList),
      allowNull: true,
      defaultValue: null
    },

    example6: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW, // now
      validate: {
        isDate: true
      }
    },

    example7: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },

    example8: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    }
  }, {
    timestamps: true, // allows sequelize to create timestamps automatically

    // A paranoid table is one that, when told to delete a record, it will not truly delete it. Instead, a special column called deletedAt will have its value set to the timestamp of that deletion request. This means that paranoid tables perform a soft-deletion of records, instead of a hard-deletion.
    // For select (findOne, findAll etc) automatically ignore all rows when deletedAt is not null, if you really want to let the query see the soft-deleted records, you can pass the paranoid: false option to the query method
    paranoid: true,
    freezeTableName: true, // allows sequelize to pluralize the model name
    tableName: 'Users', // define table name, must be PascalCase!
    hooks: {},
    indexes: []
  });

  // association
  User.associate = models => {
    // User belongs to <OtherModelName>
    User.belongsTo(models.otherModelName, {
      as: 'user',
      foreignKey: {
        name: 'otherModelId',
        allowNull: false,
      },
    });
  }

  return User;
}
