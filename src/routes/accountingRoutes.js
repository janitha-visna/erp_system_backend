const express = require("express");
const router = express.Router();
const accountingController = require("../controllers/accountingController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
router.use(authMiddleware);
// ========== CUSTOMER ROUTES ==========
router.post(
  "/customers",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createCustomer
);
router.get("/customers", accountingController.getCustomers);
router.get("/customers/:id", accountingController.getCustomerDetails);
router.put(
  "/customers/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateCustomer
);
// ========== VENDOR ROUTES ==========
router.post(
  "/vendors",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createVendor
);
router.get("/vendors", accountingController.getVendors);
router.get("/vendors/:id", accountingController.getVendorDetails);
router.put(
  "/vendors/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateVendor
);
// ========== INVOICE ROUTES ==========
router.post(
  "/invoices/customer",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createCustomerInvoice
);
router.get("/invoices/customer", accountingController.getCustomerInvoices);
router.get("/invoices/customer/:id", accountingController.getInvoiceDetails);
router.post(
  "/invoices/customer/:id/send",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.sendInvoice
);
router.put(
  "/invoices/customer/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateCustomerInvoice
);
// ========== BILL ROUTES ==========
router.post(
  "/bills/vendor",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createVendorBill
);
router.get("/bills/vendor", accountingController.getVendorBills);
router.post(
  "/bills/vendor/:id/approve",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.approveVendorBill
);
router.put(
  "/bills/vendor/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateVendorBill
);
// ========== PAYMENT ROUTES ==========
router.post(
  "/payments/customer",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.processCustomerPayment
);
router.post(
  "/payments/vendor",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.processVendorPayment
);
router.get("/payments/customer", accountingController.getCustomerPayments);
router.get("/payments/vendor", accountingController.getVendorPayments);
// ========== BANK ACCOUNT ROUTES ==========
router.post(
  "/accounts/bank",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createBankAccount
);
router.get("/accounts/bank", accountingController.getBankAccounts);
router.post(
  "/accounts/bank/:id/reconcile",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.reconcileBankAccount
);
router.put(
  "/accounts/bank/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateBankAccount
);
// ========== CASH ACCOUNT ROUTES ==========
router.post(
  "/accounts/cash",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createCashAccount
);
router.get("/accounts/cash", accountingController.getCashAccounts);
// ========== EXPENSE CATEGORY ROUTES ==========
router.post(
  "/expenses/categories",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createExpenseCategory
);
router.get("/expenses/categories", accountingController.getExpenseCategories);
router.put(
  "/expenses/categories/:id",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.updateExpenseCategory
);
// ========== EXPENSE REPORT ROUTES ==========
router.post("/expenses/reports", accountingController.createExpenseReport);
router.get("/expenses/reports", accountingController.getExpenseReports);
router.post(
  "/expenses/reports/:id/submit",
  accountingController.submitExpenseReport
);
router.post(
  "/expenses/reports/:id/approve",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.approveExpenseReport
);
router.get(
  "/expenses/reports/:id",
  accountingController.getExpenseReportDetails
);
// ========== TAX ROUTES ==========
router.post(
  "/taxes",
  roleMiddleware(["admin", "finance_staff"]),
  accountingController.createTaxConfiguration
);
router.get("/taxes", accountingController.getTaxConfigurations);
router.post("/taxes/calculate", accountingController.calculateTax);
// ========== REPORTING ROUTES ==========
router.get("/reports/aging", accountingController.getAgingReport);
router.get("/reports/cash-flow", accountingController.getCashFlowStatement);
router.get(
  "/reports/income-statement",
  accountingController.getIncomeStatement
);
router.get("/reports/balance-sheet", accountingController.getBalanceSheet);
// ========== DASHBOARD ROUTES ==========
router.get("/dashboard/overview", accountingController.getAccountingDashboard);
router.get("/dashboard/metrics", accountingController.getAccountingMetrics);
module.exports = router;
