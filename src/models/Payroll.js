const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payroll = sequelize.define(
  "Payroll",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "EmployeeProfiles",
        key: "id",
      },
    },

    basicSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    overtimePay: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    bonus: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    epfEmployee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: "8% employee contribution",
    },

    epfEmployer: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: "12% employer contribution",
    },

    etfEmployer: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      comment: "3% employer contribution",
    },

    grossSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    totalDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },

    netSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    payPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    payPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    paymentStatus: {
      type: DataTypes.ENUM("Pending", "Paid"),
      defaultValue: "Pending",
    },
  },
  {
    tableName: "payrolls",
    timestamps: true,
  }
);

module.exports = Payroll;
