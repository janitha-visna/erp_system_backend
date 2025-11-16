const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const JobOpening = sequelize.define("JobOpening", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "OrganizationStructures",
      key: "id",
    },
  },
  jobDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  requirements: {
    type: DataTypes.JSONB,
  },
  responsibilities: {
    type: DataTypes.JSONB,
  },
  employmentType: {
    type: DataTypes.ENUM("full_time", "part_time", "contract", "internship"),
    allowNull: false,
  },
  experienceLevel: {
    type: DataTypes.ENUM("entry", "mid", "senior", "executive"),
  },
  salaryRange: {
    type: DataTypes.JSONB,
  },
  vacancies: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM("draft", "published", "closed", "cancelled"),
    defaultValue: "draft",
  },
  applicationDeadline: {
    type: DataTypes.DATEONLY,
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
module.exports = JobOpening;
