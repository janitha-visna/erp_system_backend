const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TrainingSchedule = sequelize.define("TrainingSchedule", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  trainingProgramId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "TrainingPrograms",
      key: "id",
    },
  },
  scheduleDate: {
    type: DataTypes.DATEONLY,
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
  location: {
    type: DataTypes.STRING,
  },
  trainer: {
    type: DataTypes.STRING,
  },
  availableSlots: {
    type: DataTypes.INTEGER,
  },
  status: {
    type: DataTypes.ENUM("scheduled", "ongoing", "completed", "cancelled"),
    defaultValue: "scheduled",
  },
});
module.exports = TrainingSchedule;
