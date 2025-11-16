const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const PerformanceGoal = sequelize.define("PerformanceGoal", {
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
  goalTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  goalDescription: {
    type: DataTypes.TEXT,
  },
  goalType: {
    type: DataTypes.ENUM("kpi", "okr", "smart", "development"),
    defaultValue: "kpi",
  },
  targetValue: {
    type: DataTypes.DECIMAL(10, 2),
  },
  currentValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  unit: {
    type: DataTypes.STRING,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  weightage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100,
  },
  status: {
    type: DataTypes.ENUM(
      "not_started",
      "in_progress",
      "completed",
      "cancelled"
    ),
    defaultValue: "not_started",
  },
  progress: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  managerId: {
    type: DataTypes.UUID,
    references: {
      model: "EmployeeProfiles",
      key: "id",
    },
  },
});
module.exports = PerformanceGoal;
