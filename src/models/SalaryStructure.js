const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SalaryStructure = sequelize.define(
  "SalaryStructure",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
  },
  {
    tableName: "salary_structures",
    timestamps: false,
  }
);

module.exports = SalaryStructure;