const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const VendorBill = sequelize.define("VendorBill", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  billNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Vendors",
      key: "id",
    },
  },
  billDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  balanceDue: {
    type: DataTypes.DECIMAL(12, 2),
  },
  status: {
    type: DataTypes.ENUM(
      "draft",
      "received",
      "approved",
      "partial",
      "paid",
      "overdue",
      "cancelled"
    ),
    defaultValue: "draft",
  },
  paymentTerms: {
    type: DataTypes.TEXT,
  },
  reference: {
    type: DataTypes.STRING,
  },
  approvedBy: {
    type: DataTypes.UUID,
    references: {
      model: "Users",
      key: "id",
    },
  },
  approvedDate: {
    type: DataTypes.DATE,
  },
});
module.exports = VendorBill;
