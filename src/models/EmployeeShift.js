const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const EmployeeShift = sequelize.define("EmployeeShift", {
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
  shiftId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "ShiftManagements",
      key: "id",
    },
  },
  effectiveFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  effectiveTo: {
    type: DataTypes.DATEONLY,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
});
module.exports = EmployeeShift;
