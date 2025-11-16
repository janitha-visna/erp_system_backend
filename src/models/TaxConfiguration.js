const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TaxConfiguration = sequelize.define("TaxConfiguration", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  taxName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  taxType: {
    type: DataTypes.ENUM(
      "sales_tax",
      "vat",
      "gst",
      "withholding_tax",
      "service_tax"
    ),
    allowNull: false,
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  isCompound: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  applicableFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  applicableTo: {
    type: DataTypes.DATEONLY,
  },
  jurisdiction: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.TEXT,
  },
});
module.exports = TaxConfiguration;
