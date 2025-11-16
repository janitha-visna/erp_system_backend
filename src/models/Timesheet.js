const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Timesheet = sequelize.define("Timesheet", {
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
  projectId: {
    type: DataTypes.UUID,
    references: {
      model: "Projects",
      key: "id",
    },
  },
  taskId: {
    type: DataTypes.UUID,
    references: {
      model: "Tasks",
      key: "id",
    },
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hoursWorked: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM("draft", "submitted", "approved", "rejected"),
    defaultValue: "draft",
  },
  approvedBy: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
  approvedDate: {
    type: DataTypes.DATE,
  },
});
module.exports = Timesheet;
