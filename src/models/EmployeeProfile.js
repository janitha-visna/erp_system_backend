const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const EmployeeProfile = sequelize.define("EmployeeProfile", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  // Personal Information
  personalInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  // Contact Details
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  // Emergency Contacts
  emergencyContacts: {
    type: DataTypes.JSONB,
  },
  // Employment Details
  employmentInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  // Qualifications & Education
  qualifications: {
    type: DataTypes.JSONB,
  },
  // Skills & Certifications
  skills: {
    type: DataTypes.JSONB,
  },
  // Bank Details
  bankInfo: {
    type: DataTypes.JSONB,
  },
  // Status
  employmentStatus: {
    type: DataTypes.ENUM(
      "active",
      "probation",
      "suspended",
      "terminated",
      "resigned"
    ),
    defaultValue: "active",
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  terminationDate: {
    type: DataTypes.DATEONLY,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = EmployeeProfile;
