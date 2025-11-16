const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Expense = sequelize.define(
  "Expense",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "ExpenseCategories",
        key: "id",
      },
    },

    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "EmployeeProfiles",
        key: "id",
      },
    },

    vendorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Vendors",
        key: "id",
      },
    },

    status: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      defaultValue: "Pending",
    },

    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Uploaded receipt file path",
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "Expense", // exact table name
    freezeTableName: true, // disables pluralization
    timestamps: true,
  }
);

module.exports = Expense;
