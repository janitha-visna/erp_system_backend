const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OnboardingChecklist = sequelize.define("OnboardingChecklist", {
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
  taskName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  taskCategory: {
    type: DataTypes.ENUM(
      "documentation",
      "it_setup",
      "hr_paperwork",
      "training",
      "equipment",
      "access_control"
    ),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  assignedTo: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
  dueDate: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM("pending", "in_progress", "completed", "overdue"),
    defaultValue: "pending",
  },
  completedDate: {
    type: DataTypes.DATE,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  isMandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = OnboardingChecklist; 