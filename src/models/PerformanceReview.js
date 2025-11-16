const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const PerformanceReview = sequelize.define("PerformanceReview", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reviewCycle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "EmployeeProfiles",
      key: "id",
    },
  },
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "EmployeeProfiles",
      key: "id",
    },
  },
  reviewDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  // Competency Ratings
  technicalSkills: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 },
  },
  communication: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 },
  },
  teamwork: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 },
  },
  leadership: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 },
  },
  productivity: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 },
  },
  // Overall Evaluation
  overallRating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  performanceLevel: {
    type: DataTypes.ENUM(
      "exceeds",
      "meets",
      "needs_improvement",
      "unsatisfactory"
    ),
    defaultValue: "meets",
  },
  // Feedback
  strengths: {
    type: DataTypes.TEXT,
  },
  areasForImprovement: {
    type: DataTypes.TEXT,
  },
  developmentPlan: {
    type: DataTypes.TEXT,
  },
  employeeComments: {
    type: DataTypes.TEXT,
  },
  // Status
  status: {
    type: DataTypes.ENUM("draft", "in_review", "completed", "acknowledged"),
    defaultValue: "draft",
  },
});
module.exports = PerformanceReview;
