const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const EmployeeDocument = sequelize.define("EmployeeDocument", {
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
  documentType: {
    type: DataTypes.ENUM(
      "id_proof",
      "passport",
      "nic",
      "appointment_letter",
      "contract",
      "certificate",
      "degree",
      "resume",
      "bank_details",
      "tax_forms",
      "other"
    ),
    allowNull: false,
  },
  documentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  documentUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
  },
  status: {
    type: DataTypes.ENUM("active", "expired", "pending_review"),
    defaultValue: "active",
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  metadata: {
    type: DataTypes.JSONB,
  },
});
module.exports = EmployeeDocument;
