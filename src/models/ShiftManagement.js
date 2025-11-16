const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const ShiftManagement = sequelize.define("ShiftManagement", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  shiftCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  shiftName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  breakDuration: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 60,
  },
  isNightShift: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  flexibleHours: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  workingDays: {
    type: DataTypes.JSONB, // [1,2,3,4,5] for Mon-Fri
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = ShiftManagement;
