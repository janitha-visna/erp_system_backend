const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const ExpenseReport = sequelize.define("ExpenseReport", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reportNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Teachers",
      key: "id",
    },
  },
  reportDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  approvedAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM("draft", "submitted", "approved", "rejected", "paid"),
    defaultValue: "draft",
  },
  purpose: {
    type: DataTypes.TEXT,
  },
  approvedBy: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
  approvedDate: {
    type: DataTypes.DATE,
  },
  paymentDate: {
    type: DataTypes.DATE,
  },
});
module.exports = ExpenseReport;
