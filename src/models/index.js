const User = require("./User");
const Teacher = require("./Teacher");
const Student = require("./Student");
const Attendance = require("./Attendance");
const Leave = require("./Leave");
const FeeStructure = require("./FeeStructure");
const SalaryStructure = require("./SalaryStructure");
const Payroll = require("./Payroll");
const Expense = require("./Expense");
const Recruitment = require("./Recruitment");
const JobApplication = require("./JobApplication");
const PerformanceReview = require("./PerformanceReview");
const Training = require("./Training");
const TrainingParticipant = require("./TrainingParticipant");
const Budget = require("./Budget");
const Invoice = require("./Invoice");
const Payment = require("./Payment");
const Asset = require("./Asset");
const Tax = require("./Tax");
const FinancialTransaction = require("./FinancialTransaction");
const ChartOfAccount = require("./ChartOfAccount");
const Customer = require("./Customer");
const Vendor = require("./Vendor");
const CustomerInvoice = require("./CustomerInvoice");
const VendorBill = require("./VendorBill");
const CustomerPayment = require("./CustomerPayment");
const VendorPayment = require("./VendorPayment");
const BankAccount = require("./BankAccount");
const CashAccount = require("./CashAccount");
const ExpenseCategory = require("./ExpenseCategory");
const ExpenseReport = require("./ExpenseReport");
const TaxConfiguration = require("./TaxConfiguration");



// ========== HR ASSOCIATIONS ==========
User.hasOne(Teacher, { foreignKey: "userId", as: "teacherProfile" });
Teacher.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasOne(Student, { foreignKey: "userId", as: "studentProfile" });
Student.belongsTo(User, { foreignKey: "userId", as: "user" });
Teacher.hasMany(Attendance, {
  foreignKey: "teacherId",
  as: "attendanceRecords",
});
Attendance.belongsTo(Teacher, { foreignKey: "teacherId", as: "teacher" });
Teacher.hasMany(Leave, { foreignKey: "teacherId", as: "leaves" });
Leave.belongsTo(Teacher, { foreignKey: "teacherId", as: "teacher" });
User.hasMany(Leave, { foreignKey: "approvedBy", as: "approvedLeaves" });
Leave.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
Teacher.hasOne(SalaryStructure, {
  foreignKey: "employeeId",
  as: "salaryStructure",
});
SalaryStructure.belongsTo(Teacher, {
  foreignKey: "employeeId",
  as: "employee",
});
Teacher.hasMany(Payroll, { foreignKey: "employeeId", as: "payrolls" });
Payroll.belongsTo(Teacher, { foreignKey: "employeeId", as: "employee" });
User.hasMany(Recruitment, {
  foreignKey: "createdBy",
  as: "createdJobOpenings",
});
Recruitment.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Recruitment.hasMany(JobApplication, {
  foreignKey: "recruitmentId",
  as: "applications",
});
JobApplication.belongsTo(Recruitment, {
  foreignKey: "recruitmentId",
  as: "job",
});
Teacher.hasMany(PerformanceReview, {
  foreignKey: "employeeId",
  as: "performanceReviews",
});
PerformanceReview.belongsTo(Teacher, {
  foreignKey: "employeeId",
  as: "employee",
});
User.hasMany(PerformanceReview, {
  foreignKey: "reviewerId",
  as: "conductedReviews",
});
PerformanceReview.belongsTo(User, { foreignKey: "reviewerId", as: "reviewer" });
Training.hasMany(TrainingParticipant, {
  foreignKey: "trainingId",
  as: "participants",
});
TrainingParticipant.belongsTo(Training, {
  foreignKey: "trainingId",
  as: "training",
});
Teacher.hasMany(TrainingParticipant, {
  foreignKey: "employeeId",
  as: "trainingParticipations",
});
TrainingParticipant.belongsTo(Teacher, {
  foreignKey: "employeeId",
  as: "employee",
});
// ========== FINANCE ASSOCIATIONS ==========
User.hasMany(FeeStructure, {
  foreignKey: "createdBy",
  as: "createdFeeStructures",
});
FeeStructure.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
User.hasMany(Expense, { foreignKey: "approvedBy", as: "approvedExpenses" });
Expense.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
User.hasMany(Budget, { foreignKey: "createdBy", as: "createdBudgets" });
Budget.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
User.hasMany(Budget, { foreignKey: "approvedBy", as: "approvedBudgets" });
Budget.belongsTo(User, { foreignKey: "approvedBy", as: "approver" });
FeeStructure.hasMany(Invoice, { foreignKey: "feeStructureId", as: "invoices" });
Invoice.belongsTo(FeeStructure, {
  foreignKey: "feeStructureId",
  as: "feeStructure",
});
Student.hasMany(Invoice, { foreignKey: "studentId", as: "invoices" });
Invoice.belongsTo(Student, { foreignKey: "studentId", as: "student" });
Invoice.hasMany(Payment, { foreignKey: "invoiceId", as: "payments" });
Payment.belongsTo(Invoice, { foreignKey: "invoiceId", as: "invoice" });
Student.hasMany(Payment, { foreignKey: "studentId", as: "payments" });
Payment.belongsTo(Student, { foreignKey: "studentId", as: "student" });
User.hasMany(Payment, { foreignKey: "collectedBy", as: "collectedPayments" });
Payment.belongsTo(User, { foreignKey: "collectedBy", as: "collector" });
Teacher.hasMany(Asset, { foreignKey: "assignedTo", as: "assignedAssets" });
Asset.belongsTo(Teacher, {
  foreignKey: "assignedTo",
  as: "assignedToEmployee",
});
User.hasMany(Tax, { foreignKey: "createdBy", as: "createdTaxes" });
Tax.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Budget.hasMany(FinancialTransaction, {
  foreignKey: "budgetId",
  as: "transactions",
});
FinancialTransaction.belongsTo(Budget, {
  foreignKey: "budgetId",
  as: "budget",
});
Invoice.hasMany(FinancialTransaction, {
  foreignKey: "invoiceId",
  as: "transactions",
});
FinancialTransaction.belongsTo(Invoice, {
  foreignKey: "invoiceId",
  as: "invoice",
});
Expense.hasMany(FinancialTransaction, {
  foreignKey: "expenseId",
  as: "transactions",
});
FinancialTransaction.belongsTo(Expense, {
  foreignKey: "expenseId",
  as: "expense",
});
User.hasMany(FinancialTransaction, {
  foreignKey: "createdBy",
  as: "createdTransactions",
});
FinancialTransaction.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});
ChartOfAccount.hasMany(FinancialTransaction, {
  foreignKey: "accountId",
  as: "transactions",
});
FinancialTransaction.belongsTo(ChartOfAccount, {
  foreignKey: "accountId",
  as: "account",
});
User.hasMany(ChartOfAccount, {
  foreignKey: "createdBy",
  as: "createdAccounts",
});
ChartOfAccount.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
ChartOfAccount.hasMany(ChartOfAccount, {
  foreignKey: "parentAccount",
  as: "subAccounts",
});
ChartOfAccount.belongsTo(ChartOfAccount, {
  foreignKey: "parentAccount",
  as: "parent",
});

// ========== FINANCE ENHANCED ASSOCIATIONS ==========
// Customer relationships
Customer.hasMany(CustomerInvoice, { foreignKey: "customerId", as: "invoices" });
CustomerInvoice.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});
Customer.hasMany(CustomerPayment, { foreignKey: "customerId", as: "payments" });
CustomerPayment.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});
// Vendor relationships
Vendor.hasMany(VendorBill, { foreignKey: "vendorId", as: "bills" });
VendorBill.belongsTo(Vendor, { foreignKey: "vendorId", as: "vendor" });
Vendor.hasMany(VendorPayment, { foreignKey: "vendorId", as: "payments" });
VendorPayment.belongsTo(Vendor, { foreignKey: "vendorId", as: "vendor" });
// Invoice/Payment relationships
CustomerInvoice.hasMany(CustomerPayment, {
  foreignKey: "invoiceId",
  as: "payments",
});
CustomerPayment.belongsTo(CustomerInvoice, {
  foreignKey: "invoiceId",
  as: "invoice",
});
VendorBill.hasMany(VendorPayment, { foreignKey: "billId", as: "payments" });
VendorPayment.belongsTo(VendorBill, { foreignKey: "billId", as: "bill" });
// Expense relationships
ExpenseCategory.hasMany(Expense, { foreignKey: "categoryId", as: "expenses" });
Expense.belongsTo(ExpenseCategory, {
  foreignKey: "categoryId",
  as: "category",
});
Teacher.hasMany(ExpenseReport, {
  foreignKey: "employeeId",
  as: "expenseReports",
});
ExpenseReport.belongsTo(Teacher, { foreignKey: "employeeId", as: "employee" });
ExpenseReport.hasMany(Expense, { foreignKey: "reportId", as: "expenses" });
Expense.belongsTo(ExpenseReport, {
  foreignKey: "reportId",
  as: "expenseReport",
});
// Account relationships
BankAccount.hasMany(CustomerPayment, {
  foreignKey: "bankAccountId",
  as: "customerPayments",
});
CustomerPayment.belongsTo(BankAccount, {
  foreignKey: "bankAccountId",
  as: "bankAccount",
});
BankAccount.hasMany(VendorPayment, {
  foreignKey: "bankAccountId",
  as: "vendorPayments",
});
VendorPayment.belongsTo(BankAccount, {
  foreignKey: "bankAccountId",
  as: "bankAccount",
});
CashAccount.hasMany(Expense, { foreignKey: "cashAccountId", as: "expenses" });
Expense.belongsTo(CashAccount, {
  foreignKey: "cashAccountId",
  as: "cashAccount",
});

module.exports = {
  User,
  Teacher,
  Student,
  Attendance,
  Leave,
  FeeStructure,
  SalaryStructure,
  Payroll,
  Expense,
  Recruitment,
  JobApplication,
  PerformanceReview,
  Training,
  TrainingParticipant,
  Budget,
  Invoice,
  Payment,
  Asset,
  Tax,
  FinancialTransaction,
  ChartOfAccount,
  Customer,
  Vendor,
  CustomerInvoice,
  VendorBill,
  CustomerPayment,
  VendorPayment,
  BankAccount,
  CashAccount,
  ExpenseCategory,
  ExpenseReport,
  TaxConfiguration,
};
