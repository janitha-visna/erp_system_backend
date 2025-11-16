const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Vendor = sequelize.define("Vendor", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vendorCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      "supplier",
      "contractor",
      "service_provider",
      "consultant"
    ),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
  },
  address: {
    type: DataTypes.TEXT,
  },
  taxId: {
    type: DataTypes.STRING,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "USD",
  },
  paymentTerms: {
    type: DataTypes.ENUM("net_15", "net_30", "net_60", "due_on_receipt"),
    defaultValue: "net_30",
  },
  bankAccount: {
    type: DataTypes.JSONB,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});
module.exports = Vendor;
