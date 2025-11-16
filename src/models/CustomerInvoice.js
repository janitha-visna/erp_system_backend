const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const CustomerInvoice = sequelize.define("CustomerInvoice", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Customers",
      key: "id",
    },
  },
  invoiceDate: {
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
  discount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  shipping: {
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
      "sent",
      "viewed",
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
  notes: {
    type: DataTypes.TEXT,
  },
  termsAndConditions: {
    type: DataTypes.TEXT,
  },
  sentDate: {
    type: DataTypes.DATE,
  },
  viewedDate: {
    type: DataTypes.DATE,
  },
});
module.exports = CustomerInvoice;
