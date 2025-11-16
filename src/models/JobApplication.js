const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const JobApplication = sequelize.define("JobApplication", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  applicationId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  jobOpeningId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "JobOpenings",
      key: "id",
    },
  },
  // Applicant Information
  personalInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  education: {
    type: DataTypes.JSONB,
  },
  experience: {
    type: DataTypes.JSONB,
  },
  skills: {
    type: DataTypes.JSONB,
  },
  resumeUrl: {
    type: DataTypes.STRING,
  },
  coverLetter: {
    type: DataTypes.TEXT,
  },
  // Application Process
  status: {
    type: DataTypes.ENUM(
      "applied",
      "screening",
      "phone_interview",
      "technical_interview",
      "hr_interview",
      "offer_sent",
      "hired",
      "rejected",
      "withdrawn"
    ),
    defaultValue: "applied",
  },
  currentStage: {
    type: DataTypes.STRING,
  },
  applicationDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  // Evaluation
  rating: {
    type: DataTypes.INTEGER,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  assignedTo: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
});
module.exports = JobApplication;
