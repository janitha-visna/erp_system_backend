const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const EmployeeSurvey = sequelize.define("EmployeeSurvey", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  surveyTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  surveyDescription: {
    type: DataTypes.TEXT,
  },
  surveyType: {
    type: DataTypes.ENUM(
      "engagement",
      "satisfaction",
      "pulse",
      "exit",
      "onboarding"
    ),
    allowNull: false,
  },
  questions: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  targetAudience: {
    type: DataTypes.JSONB, // { departments: [], locations: [], roles: [] }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  anonymity: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM("draft", "active", "closed", "archived"),
    defaultValue: "draft",
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
});
module.exports = EmployeeSurvey;
