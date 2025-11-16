const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const ExpenseCategory = sequelize.define("ExpenseCategory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  categoryCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  categoryName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  parentCategory: {
    type: DataTypes.UUID,
    references: {
      model: "ExpenseCategories",
      key: "id",
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
});
module.exports = ExpenseCategory;
