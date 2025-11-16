const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const OrganizationStructure = sequelize.define("OrganizationStructure", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  departmentCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  departmentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parentDepartment: {
    type: DataTypes.UUID,
    references: {
      model: "OrganizationStructures",
      key: "id",
    },
  },
  location: {
    type: DataTypes.STRING,
  },
  costCenter: {
    type: DataTypes.STRING,
  },
  headOfDepartment: {
    type: DataTypes.UUID,
    references: {
      model: "EmployeeProfiles",
      key: "id",
    },
  },
  hierarchyLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = OrganizationStructure;
