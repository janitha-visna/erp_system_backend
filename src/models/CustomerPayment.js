const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const CustomerPayment = sequelize.define("CustomerPayment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  paymentNumber: {
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
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "CustomerInvoices",
      key: "id",
    },
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM(
      "cash",
      "check",
      "bank_transfer",
      "credit_card",
      "debit_card",
      "online",
      "wire_transfer"
    ),
    allowNull: false,
  },
  referenceNumber: {
    type: DataTypes.STRING,
  },
  bankName: {
    type: DataTypes.STRING,
  },
  checkNumber: {
    type: DataTypes.STRING,
  },
  cardLastFour: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
    defaultValue: "pending",
  },
  collectedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
  },
  notes: {
    type: DataTypes.TEXT,
  },
  receiptUrl: {
    type: DataTypes.STRING,
  },
});
module.exports = CustomerPayment;
