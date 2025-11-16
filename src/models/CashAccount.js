const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const CashAccount = sequelize.define("CashAccount", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  accountCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "USD",
  },
  openingBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  currentBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  custodian: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = CashAccount;
