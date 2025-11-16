const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StatutoryDeduction = sequelize.define("StatutoryDeduction", {
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
  // Sri Lanka Specific Statutory
  epfNumber: {
    type: DataTypes.STRING,
  },
  etfNumber: {
    type: DataTypes.STRING,
  },
  epfRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 8.0,
  },
  employerEpfRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 12.0,
  },
  etfRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 3.0,
  },
  // Tax Information
  payeRate: {
    type: DataTypes.DECIMAL(5, 2),
  },
  taxNumber: {
    type: DataTypes.STRING,
  },
  // Other Contributions
  otherContributions: {
    type: DataTypes.JSONB,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

module.exports = StatutoryDeduction;
