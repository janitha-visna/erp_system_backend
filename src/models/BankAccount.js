const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const BankAccount = sequelize.define("BankAccount", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  accountNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
  },
  accountType: {
    type: DataTypes.ENUM(
      "checking",
      "savings",
      "credit_card",
      "loan",
      "investment"
    ),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "USD",
  },
  openingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  currentBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  overdraftLimit: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  lastReconciled: {
    type: DataTypes.DATE,
  },
});
module.exports = BankAccount;
