const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Recognition = sequelize.define("Recognition", {
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
  recognizedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "EmployeeProfiles",
      key: "id",
    },
  },
  category: {
    type: DataTypes.ENUM(
      "excellence",
      "innovation",
      "teamwork",
      "leadership",
      "customer_service",
      "going_above"
    ),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM("active", "archived"),
    defaultValue: "active",
  },
});
module.exports = Recognition;
