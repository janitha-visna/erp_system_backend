const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PayrollComponent = sequelize.define("PayrollComponent", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  componentCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  componentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  componentType: {
    type: DataTypes.ENUM(
      "earning",
      "deduction",
      "reimbursement",
      "contribution"
    ),
    allowNull: false,
  },
  calculationType: {
    type: DataTypes.ENUM("fixed", "percentage", "formula_based"),
    defaultValue: "fixed",
  },
  calculationFormula: {
    type: DataTypes.TEXT,
  },
  isTaxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isStatutory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = PayrollComponent;
