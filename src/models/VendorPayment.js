const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const VendorPayment = sequelize.define("VendorPayment", {
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
  vendorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Vendors",
      key: "id",
    },
  },
  billId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "VendorBills",
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
  status: {
    type: DataTypes.ENUM(
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled"
    ),
    defaultValue: "pending",
  },
  processedBy: {
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
});
module.exports = VendorPayment;
