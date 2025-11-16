const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TrainingProgram = sequelize.define("TrainingProgram", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  programCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  programName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.ENUM(
      "technical",
      "soft_skills",
      "compliance",
      "leadership",
      "safety",
      "product_knowledge"
    ),
    allowNull: false,
  },
  trainer: {
    type: DataTypes.STRING,
  },
  duration: {
    type: DataTypes.INTEGER, // in hours
    allowNull: false,
  },
  deliveryMethod: {
    type: DataTypes.ENUM("classroom", "online", "blended", "on_the_job"),
    defaultValue: "classroom",
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
  },
  status: {
    type: DataTypes.ENUM(
      "draft",
      "scheduled",
      "ongoing",
      "completed",
      "cancelled"
    ),
    defaultValue: "draft",
  },
  materials: {
    type: DataTypes.JSONB,
  },
});
module.exports = TrainingProgram;
