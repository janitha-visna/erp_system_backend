const {
  Customer,
  Vendor,
  CustomerInvoice,
  VendorBill,
  CustomerPayment,
  VendorPayment,
  BankAccount,
  CashAccount,
  TaxConfiguration,
  Expense,
  ExpenseCategory,
  ExpenseReport,
  FinancialTransaction,
  ChartOfAccount,
  User,
} = require("../models");

const { Op } = require("sequelize");
const sequelize = require("../config/database");

class AccountingController {
  // ========== CUSTOMER MANAGEMENT ==========
  async createCustomer(req, res) {
    try {
      const customerData = req.body;

      // Generate customer code
      const customerCount = await Customer.count();
      customerData.customerCode = `CUST${(customerCount + 1)
        .toString()
        .padStart(5, "0")}`;

      const customer = await Customer.create(customerData);

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating customer",
        error: error.message,
      });
    }
  }

  async getCustomers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        type = "",
        isActive = "",
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (search) {
        whereCondition[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { customerCode: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (type) whereCondition.type = type;
      if (isActive !== "") whereCondition.isActive = isActive === "true";

      const { count, rows: customers } = await Customer.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching customers",
        error: error.message,
      });
    }
  }

  async getCustomerDetails(req, res) {
    try {
      const { id } = req.params;

      const customer = await Customer.findByPk(id, {
        include: [
          {
            model: CustomerInvoice,
            as: "invoices",
            attributes: [
              "id",
              "invoiceNumber",
              "invoiceDate",
              "dueDate",
              "totalAmount",
              "balanceDue",
              "status",
            ],
            order: [["invoiceDate", "DESC"]],
            limit: 10,
          },
          {
            model: CustomerPayment,
            as: "payments",
            attributes: [
              "id",
              "paymentNumber",
              "paymentDate",
              "amount",
              "paymentMethod",
            ],
            order: [["paymentDate", "DESC"]],
            limit: 10,
          },
        ],
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Calculate customer statistics
      const totalInvoices = await CustomerInvoice.sum("totalAmount", {
        where: { customerId: id },
      });

      const totalPaid = await CustomerPayment.sum("amount", {
        where: { customerId: id, status: "completed" },
      });

      const outstandingBalance = await CustomerInvoice.sum("balanceDue", {
        where: {
          customerId: id,
          status: { [Op.in]: ["sent", "partial", "overdue"] },
        },
      });

      res.json({
        success: true,
        data: {
          ...customer.toJSON(),
          statistics: {
            totalInvoices: totalInvoices || 0,
            totalPaid: totalPaid || 0,
            outstandingBalance: outstandingBalance || 0,
            creditUtilization:
              customer.creditLimit > 0
                ? ((outstandingBalance / customer.creditLimit) * 100).toFixed(2)
                : 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching customer details",
        error: error.message,
      });
    }
  }

  // ========== VENDOR MANAGEMENT ==========
  async createVendor(req, res) {
    try {
      const vendorData = req.body;

      // Generate vendor code
      const vendorCount = await Vendor.count();
      vendorData.vendorCode = `VEND${(vendorCount + 1)
        .toString()
        .padStart(5, "0")}`;

      const vendor = await Vendor.create(vendorData);

      res.status(201).json({
        success: true,
        message: "Vendor created successfully",
        data: vendor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating vendor",
        error: error.message,
      });
    }
  }

  async getVendors(req, res) {
    try {
      const { page = 1, limit = 10, search = "", type = "" } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (search) {
        whereCondition[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { vendorCode: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (type) whereCondition.type = type;

      const { count, rows: vendors } = await Vendor.findAndCountAll({
        where: whereCondition,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: vendors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching vendors",
        error: error.message,
      });
    }
  }

  // ========== CUSTOMER INVOICE MANAGEMENT ==========
  async createCustomerInvoice(req, res) {
    try {
      const invoiceData = req.body;

      // Generate invoice number
      const invoiceCount = await CustomerInvoice.count();
      const year = new Date().getFullYear();
      invoiceData.invoiceNumber = `INV-${year}-${(invoiceCount + 1)
        .toString()
        .padStart(5, "0")}`;

      // Calculate totals
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        invoiceData.subtotal = invoiceData.items.reduce(
          (total, item) =>
            total + parseFloat(item.quantity) * parseFloat(item.unitPrice),
          0
        );

        // Calculate tax
        const taxConfig = await TaxConfiguration.findOne({
          where: { isActive: true, taxType: "sales_tax" },
        });

        if (taxConfig) {
          invoiceData.taxAmount =
            (invoiceData.subtotal * parseFloat(taxConfig.taxRate)) / 100;
        }

        invoiceData.totalAmount =
          invoiceData.subtotal +
          invoiceData.taxAmount -
          (invoiceData.discount || 0);
        invoiceData.balanceDue = invoiceData.totalAmount;
      }

      const invoice = await CustomerInvoice.create(invoiceData);

      // Create financial transaction
      await FinancialTransaction.create({
        transactionCode: `TXN-INV-${invoice.invoiceNumber}`,
        transactionDate: invoiceData.invoiceDate,
        transactionType: "revenue",
        category: "sales",
        amount: invoiceData.totalAmount,
        description: `Invoice ${invoiceData.invoiceNumber} for ${invoiceData.customerId}`,
        status: "pending",
        createdBy: req.user.id,
      });

      // Update customer balance
      await this.updateCustomerBalance(invoiceData.customerId);

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating invoice",
        error: error.message,
      });
    }
  }

  async getCustomerInvoices(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        customerId,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (customerId) whereCondition.customerId = customerId;
      if (startDate && endDate) {
        whereCondition.invoiceDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: invoices } = await CustomerInvoice.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "name", "customerCode"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["invoiceDate", "DESC"]],
      });

      res.json({
        success: true,
        data: invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching invoices",
        error: error.message,
      });
    }
  }

  async sendInvoice(req, res) {
    try {
      const { id } = req.params;

      const invoice = await CustomerInvoice.findByPk(id, {
        include: [
          {
            model: Customer,
            as: "customer",
          },
        ],
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Update invoice status and send date
      await invoice.update({
        status: "sent",
        sentDate: new Date(),
      });

      // TODO: Integrate with email service to send invoice
      // await this.sendInvoiceEmail(invoice);

      res.json({
        success: true,
        message: "Invoice sent successfully",
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error sending invoice",
        error: error.message,
      });
    }
  }

  // ========== VENDOR BILL MANAGEMENT ==========
  async createVendorBill(req, res) {
    try {
      const billData = req.body;

      // Generate bill number
      const billCount = await VendorBill.count();
      billData.billNumber = `BILL-${new Date().getFullYear()}-${(billCount + 1)
        .toString()
        .padStart(5, "0")}`;

      // Calculate totals
      if (billData.items && Array.isArray(billData.items)) {
        billData.subtotal = billData.items.reduce(
          (total, item) =>
            total + parseFloat(item.quantity) * parseFloat(item.unitPrice),
          0
        );

        billData.totalAmount = billData.subtotal + (billData.taxAmount || 0);
        billData.balanceDue = billData.totalAmount;
      }

      const bill = await VendorBill.create(billData);

      // Create financial transaction
      await FinancialTransaction.create({
        transactionCode: `TXN-BILL-${bill.billNumber}`,
        transactionDate: billData.billDate,
        transactionType: "expense",
        category: "purchases",
        amount: -billData.totalAmount, // Negative for expenses
        description: `Vendor bill ${billData.billNumber} from ${billData.vendorId}`,
        status: "pending",
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Vendor bill created successfully",
        data: bill,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating vendor bill",
        error: error.message,
      });
    }
  }

  async approveVendorBill(req, res) {
    try {
      const { id } = req.params;

      const bill = await VendorBill.findByPk(id);
      if (!bill) {
        return res.status(404).json({
          success: false,
          message: "Vendor bill not found",
        });
      }

      await bill.update({
        status: "approved",
        approvedBy: req.user.id,
        approvedDate: new Date(),
      });

      res.json({
        success: true,
        message: "Vendor bill approved successfully",
        data: bill,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error approving vendor bill",
        error: error.message,
      });
    }
  }

  // ========== PAYMENT PROCESSING ==========
  async processCustomerPayment(req, res) {
    try {
      const paymentData = req.body;
      paymentData.collectedBy = req.user.id;

      // Generate payment number
      const paymentCount = await CustomerPayment.count();
      paymentData.paymentNumber = `PAY-${new Date().getFullYear()}-${(
        paymentCount + 1
      )
        .toString()
        .padStart(5, "0")}`;

      const payment = await CustomerPayment.create(paymentData);

      // Update invoice balance
      const invoice = await CustomerInvoice.findByPk(paymentData.invoiceId);
      if (invoice) {
        const newPaidAmount =
          parseFloat(invoice.paidAmount) + parseFloat(paymentData.amount);
        const newBalanceDue = parseFloat(invoice.totalAmount) - newPaidAmount;

        let newStatus = invoice.status;
        if (newBalanceDue <= 0) {
          newStatus = "paid";
        } else if (newPaidAmount > 0) {
          newStatus = "partial";
        }

        await invoice.update({
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        });
      }

      // Update financial transaction
      const transaction = await FinancialTransaction.findOne({
        where: { invoiceId: paymentData.invoiceId },
      });

      if (transaction) {
        await transaction.update({
          status: "completed",
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: paymentData.referenceNumber,
        });
      }

      // Update customer balance
      await this.updateCustomerBalance(paymentData.customerId);

      res.status(201).json({
        success: true,
        message: "Payment processed successfully",
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error processing payment",
        error: error.message,
      });
    }
  }

  async processVendorPayment(req, res) {
    try {
      const paymentData = req.body;
      paymentData.processedBy = req.user.id;

      // Generate payment number
      const paymentCount = await VendorPayment.count();
      paymentData.paymentNumber = `VPAY-${new Date().getFullYear()}-${(
        paymentCount + 1
      )
        .toString()
        .padStart(5, "0")}`;

      const payment = await VendorPayment.create(paymentData);

      // Update vendor bill
      const bill = await VendorBill.findByPk(paymentData.billId);
      if (bill) {
        const newPaidAmount =
          parseFloat(bill.paidAmount) + parseFloat(paymentData.amount);
        const newBalanceDue = parseFloat(bill.totalAmount) - newPaidAmount;

        let newStatus = bill.status;
        if (newBalanceDue <= 0) {
          newStatus = "paid";
        } else if (newPaidAmount > 0) {
          newStatus = "partial";
        }

        await bill.update({
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        });
      }

      // Update bank account balance if applicable
      if (paymentData.bankAccountId) {
        await this.updateBankAccountBalance(
          paymentData.bankAccountId,
          paymentData.amount
        );
      }

      res.status(201).json({
        success: true,
        message: "Vendor payment processed successfully",
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error processing vendor payment",
        error: error.message,
      });
    }
  }

  // ========== BANK & CASH ACCOUNT MANAGEMENT ==========
  async createBankAccount(req, res) {
    try {
      const accountData = req.body;

      const account = await BankAccount.create(accountData);

      res.status(201).json({
        success: true,
        message: "Bank account created successfully",
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating bank account",
        error: error.message,
      });
    }
  }

  async getBankAccounts(req, res) {
    try {
      const accounts = await BankAccount.findAll({
        where: { isActive: true },
        order: [["bankName", "ASC"]],
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching bank accounts",
        error: error.message,
      });
    }
  }

  async reconcileBankAccount(req, res) {
    try {
      const { id } = req.params;
      const { statementBalance, reconciliationDate } = req.body;

      const account = await BankAccount.findByPk(id);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
        });
      }

      const difference = statementBalance - parseFloat(account.currentBalance);

      await account.update({
        lastReconciled: reconciliationDate,
      });

      res.json({
        success: true,
        message: "Bank account reconciled successfully",
        data: {
          account,
          reconciliation: {
            statementBalance,
            systemBalance: account.currentBalance,
            difference,
            reconciled: difference === 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error reconciling bank account",
        error: error.message,
      });
    }
  }

  // ========== EXPENSE CATEGORY MANAGEMENT ==========
  async createExpenseCategory(req, res) {
    try {
      const categoryData = req.body;
      categoryData.createdBy = req.user.id;

      // Generate category code
      const categoryCount = await ExpenseCategory.count();
      categoryData.categoryCode = `CAT${(categoryCount + 1)
        .toString()
        .padStart(3, "0")}`;

      const category = await ExpenseCategory.create(categoryData);

      res.status(201).json({
        success: true,
        message: "Expense category created successfully",
        data: category,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating expense category",
        error: error.message,
      });
    }
  }

  async getExpenseCategories(req, res) {
    try {
      const categories = await ExpenseCategory.findAll({
        where: { isActive: true },
        include: [
          {
            model: ExpenseCategory,
            as: "parent",
            attributes: ["id", "categoryName"],
          },
        ],
        order: [["categoryCode", "ASC"]],
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching expense categories",
        error: error.message,
      });
    }
  }

  // ========== EXPENSE REPORT MANAGEMENT ==========
  async createExpenseReport(req, res) {
    try {
      const reportData = req.body;

      // Generate report number
      const reportCount = await ExpenseReport.count();
      reportData.reportNumber = `EXP-RPT-${(reportCount + 1)
        .toString()
        .padStart(4, "0")}`;

      const report = await ExpenseReport.create(reportData);

      res.status(201).json({
        success: true,
        message: "Expense report created successfully",
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating expense report",
        error: error.message,
      });
    }
  }

  async submitExpenseReport(req, res) {
    try {
      const { id } = req.params;

      const report = await ExpenseReport.findByPk(id, {
        include: [
          {
            model: Expense,
            as: "expenses",
          },
        ],
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Expense report not found",
        });
      }

      // Calculate total amount from expenses
      const totalAmount = report.expenses.reduce(
        (sum, expense) => sum + parseFloat(expense.amount),
        0
      );

      await report.update({
        status: "submitted",
        totalAmount,
      });

      // Notify approvers
      await this.notifyExpenseApprovers(report);

      res.json({
        success: true,
        message: "Expense report submitted successfully",
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error submitting expense report",
        error: error.message,
      });
    }
  }

  async approveExpenseReport(req, res) {
    try {
      const { id } = req.params;
      const { approvedAmount, notes } = req.body;

      const report = await ExpenseReport.findByPk(id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Expense report not found",
        });
      }

      await report.update({
        status: "approved",
        approvedAmount: approvedAmount || report.totalAmount,
        approvedBy: req.user.id,
        approvedDate: new Date(),
      });

      // Process reimbursement if applicable
      if (report.approvedAmount > 0) {
        await this.processReimbursement(report);
      }

      res.json({
        success: true,
        message: "Expense report approved successfully",
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error approving expense report",
        error: error.message,
      });
    }
  }

  // ========== TAX MANAGEMENT ==========
  async createTaxConfiguration(req, res) {
    try {
      const taxData = req.body;

      const tax = await TaxConfiguration.create(taxData);

      res.status(201).json({
        success: true,
        message: "Tax configuration created successfully",
        data: tax,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating tax configuration",
        error: error.message,
      });
    }
  }

  async calculateTax(req, res) {
    try {
      const { amount, taxType } = req.body;

      const taxConfig = await TaxConfiguration.findOne({
        where: {
          taxType,
          isActive: true,
          applicableFrom: { [Op.lte]: new Date() },
          [Op.or]: [
            { applicableTo: null },
            { applicableTo: { [Op.gte]: new Date() } },
          ],
        },
      });

      if (!taxConfig) {
        return res.status(404).json({
          success: false,
          message: "No active tax configuration found",
        });
      }

      const taxAmount = (amount * parseFloat(taxConfig.taxRate)) / 100;
      const totalAmount = amount + taxAmount;

      res.json({
        success: true,
        data: {
          subtotal: amount,
          taxRate: taxConfig.taxRate,
          taxAmount,
          totalAmount,
          taxName: taxConfig.taxName,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error calculating tax",
        error: error.message,
      });
    }
  }

  // ========== HELPER METHODS ==========
  async updateCustomerBalance(customerId) {
    const outstandingBalance = await CustomerInvoice.sum("balanceDue", {
      where: {
        customerId,
        status: { [Op.in]: ["sent", "partial", "overdue"] },
      },
    });

    await Customer.update(
      { currentBalance: outstandingBalance || 0 },
      { where: { id: customerId } }
    );
  }

  async updateBankAccountBalance(accountId, amount) {
    const account = await BankAccount.findByPk(accountId);
    if (account) {
      const newBalance =
        parseFloat(account.currentBalance) + parseFloat(amount);
      await account.update({ currentBalance: newBalance });
    }
  }

  async notifyExpenseApprovers(report) {
    // Implementation for notifying expense approvers
    console.log(
      `Notification: Expense report ${report.reportNumber} requires approval`
    );
  }

  async processReimbursement(report) {
    // Implementation for processing employee reimbursement
    console.log(`Processing reimbursement for report ${report.reportNumber}`);
  }

  // ========== FINANCIAL REPORTING ==========
  async getAgingReport(req, res) {
    try {
      const { type = "receivables" } = req.query; // receivables or payables

      let report;
      if (type === "receivables") {
        report = await this.generateAgingReceivables();
      } else {
        report = await this.generateAgingPayables();
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating aging report",
        error: error.message,
      });
    }
  }

  async generateAgingReceivables() {
    const currentDate = new Date();
    const intervals = [
      { name: "current", days: 0 },
      { name: "1-30", days: 30 },
      { name: "31-60", days: 60 },
      { name: "61-90", days: 90 },
      { name: "90+", days: 91 },
    ];

    const agingData = [];

    for (const interval of intervals) {
      const dateThreshold = new Date();
      dateThreshold.setDate(currentDate.getDate() - interval.days);

      const whereCondition = {
        status: { [Op.in]: ["sent", "partial", "overdue"] },
      };

      if (interval.days === 0) {
        whereCondition.dueDate = { [Op.gte]: currentDate };
      } else if (interval.days === 91) {
        whereCondition.dueDate = {
          [Op.lt]: new Date(currentDate.setDate(currentDate.getDate() - 90)),
        };
      } else {
        const startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - interval.days);
        whereCondition.dueDate = {
          [Op.between]: [startDate, dateThreshold],
        };
      }

      const amount = await CustomerInvoice.sum("balanceDue", {
        where: whereCondition,
      });

      agingData.push({
        period: interval.name,
        amount: amount || 0,
      });
    }

    return {
      type: "receivables_aging",
      data: agingData,
      total: agingData.reduce((sum, item) => sum + item.amount, 0),
      generatedAt: new Date(),
    };
  }

  async generateAgingPayables() {
    // Similar implementation for vendor payables
    const currentDate = new Date();
    const intervals = [
      { name: "current", days: 0 },
      { name: "1-30", days: 30 },
      { name: "31-60", days: 60 },
      { name: "61-90", days: 90 },
      { name: "90+", days: 91 },
    ];

    const agingData = [];

    for (const interval of intervals) {
      const dateThreshold = new Date();
      dateThreshold.setDate(currentDate.getDate() - interval.days);

      const whereCondition = {
        status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
      };

      if (interval.days === 0) {
        whereCondition.dueDate = { [Op.gte]: currentDate };
      } else if (interval.days === 91) {
        whereCondition.dueDate = {
          [Op.lt]: new Date(currentDate.setDate(currentDate.getDate() - 90)),
        };
      } else {
        const startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - interval.days);
        whereCondition.dueDate = {
          [Op.between]: [startDate, dateThreshold],
        };
      }

      const amount = await VendorBill.sum("balanceDue", {
        where: whereCondition,
      });

      agingData.push({
        period: interval.name,
        amount: amount || 0,
      });
    }

    return {
      type: "payables_aging",
      data: agingData,
      total: agingData.reduce((sum, item) => sum + item.amount, 0),
      generatedAt: new Date(),
    };
  }

  async getCashFlowStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate || new Date().getFullYear() + "-01-01");
      const end = new Date(endDate || new Date().getFullYear() + "-12-31");

      // Operating Activities
      const customerPayments = await CustomerPayment.sum("amount", {
        where: {
          paymentDate: { [Op.between]: [start, end] },
          status: "completed",
        },
      });

      const vendorPayments = await VendorPayment.sum("amount", {
        where: {
          paymentDate: { [Op.between]: [start, end] },
          status: "completed",
        },
      });

      const expensePayments = await Expense.sum("amount", {
        where: {
          expenseDate: { [Op.between]: [start, end] },
          status: "paid",
        },
      });

      // Investing Activities
      const assetPurchases = await FinancialTransaction.sum("amount", {
        where: {
          transactionDate: { [Op.between]: [start, end] },
          transactionType: "asset_purchase",
        },
      });

      const cashFlow = {
        operating: {
          customerPayments: customerPayments || 0,
          vendorPayments: -(vendorPayments || 0),
          expensePayments: -(expensePayments || 0),
          netOperating:
            (customerPayments || 0) -
            (vendorPayments || 0) -
            (expensePayments || 0),
        },
        investing: {
          assetPurchases: assetPurchases || 0,
          netInvesting: -(assetPurchases || 0),
        },
        netCashFlow:
          (customerPayments || 0) -
          (vendorPayments || 0) -
          (expensePayments || 0) -
          (assetPurchases || 0),
      };

      res.json({
        success: true,
        data: cashFlow,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating cash flow statement",
        error: error.message,
      });
    }
  }

  // ========== MISSING METHODS TO ADD ==========
  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const customer = await Customer.findByPk(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      await customer.update(updateData);

      res.json({
        success: true,
        message: "Customer updated successfully",
        data: customer,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating customer",
        error: error.message,
      });
    }
  }

  async getVendorDetails(req, res) {
    try {
      const { id } = req.params;

      const vendor = await Vendor.findByPk(id, {
        include: [
          {
            model: VendorBill,
            as: "bills",
            attributes: [
              "id",
              "billNumber",
              "billDate",
              "dueDate",
              "totalAmount",
              "balanceDue",
              "status",
            ],
            order: [["billDate", "DESC"]],
            limit: 10,
          },
          {
            model: VendorPayment,
            as: "payments",
            attributes: [
              "id",
              "paymentNumber",
              "paymentDate",
              "amount",
              "paymentMethod",
            ],
            order: [["paymentDate", "DESC"]],
            limit: 10,
          },
        ],
      });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // Calculate vendor statistics
      const totalBills = await VendorBill.sum("totalAmount", {
        where: { vendorId: id },
      });

      const totalPaid = await VendorPayment.sum("amount", {
        where: { vendorId: id, status: "completed" },
      });

      const outstandingBalance = await VendorBill.sum("balanceDue", {
        where: {
          vendorId: id,
          status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
        },
      });

      res.json({
        success: true,
        data: {
          ...vendor.toJSON(),
          statistics: {
            totalBills: totalBills || 0,
            totalPaid: totalPaid || 0,
            outstandingBalance: outstandingBalance || 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching vendor details",
        error: error.message,
      });
    }
  }

  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const vendor = await Vendor.findByPk(id);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      await vendor.update(updateData);

      res.json({
        success: true,
        message: "Vendor updated successfully",
        data: vendor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating vendor",
        error: error.message,
      });
    }
  }

  async getInvoiceDetails(req, res) {
    try {
      const { id } = req.params;

      const invoice = await CustomerInvoice.findByPk(id, {
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "name", "customerCode", "email", "phone"],
          },
          {
            model: CustomerPayment,
            as: "payments",
            attributes: [
              "id",
              "paymentNumber",
              "paymentDate",
              "amount",
              "paymentMethod",
              "referenceNumber",
            ],
          },
        ],
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching invoice details",
        error: error.message,
      });
    }
  }

  async updateCustomerInvoice(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const invoice = await CustomerInvoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      await invoice.update(updateData);

      res.json({
        success: true,
        message: "Invoice updated successfully",
        data: invoice,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating invoice",
        error: error.message,
      });
    }
  }

  async getVendorBills(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        vendorId,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (vendorId) whereCondition.vendorId = vendorId;
      if (startDate && endDate) {
        whereCondition.billDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: bills } = await VendorBill.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Vendor,
            as: "vendor",
            attributes: ["id", "name", "vendorCode"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["billDate", "DESC"]],
      });

      res.json({
        success: true,
        data: bills,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching vendor bills",
        error: error.message,
      });
    }
  }
  async updateVendorBill(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const bill = await VendorBill.findByPk(id);
      if (!bill) {
        return res.status(404).json({
          success: false,
          message: "Vendor bill not found",
        });
      }

      await bill.update(updateData);

      res.json({
        success: true,
        message: "Vendor bill updated successfully",
        data: bill,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating vendor bill",
        error: error.message,
      });
    }
  }

  async getCustomerPayments(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (customerId) whereCondition.customerId = customerId;
      if (startDate && endDate) {
        whereCondition.paymentDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: payments } = await CustomerPayment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["id", "name", "customerCode"],
          },
          {
            model: CustomerInvoice,
            as: "invoice",
            attributes: ["id", "invoiceNumber"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["paymentDate", "DESC"]],
      });

      res.json({
        success: true,
        data: payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching customer payments",
        error: error.message,
      });
    }
  }

  async getVendorPayments(req, res) {
    try {
      const { page = 1, limit = 10, vendorId, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (vendorId) whereCondition.vendorId = vendorId;
      if (startDate && endDate) {
        whereCondition.paymentDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: payments } = await VendorPayment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Vendor,
            as: "vendor",
            attributes: ["id", "name", "vendorCode"],
          },
          {
            model: VendorBill,
            as: "bill",
            attributes: ["id", "billNumber"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["paymentDate", "DESC"]],
      });

      res.json({
        success: true,
        data: payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching vendor payments",
        error: error.message,
      });
    }
  }

  async updateBankAccount(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const account = await BankAccount.findByPk(id);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
        });
      }

      await account.update(updateData);

      res.json({
        success: true,
        message: "Bank account updated successfully",
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating bank account",
        error: error.message,
      });
    }
  }

  async createCashAccount(req, res) {
    try {
      const accountData = req.body;

      const account = await CashAccount.create(accountData);

      res.status(201).json({
        success: true,
        message: "Cash account created successfully",
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating cash account",
        error: error.message,
      });
    }
  }
  async getCashAccounts(req, res) {
    try {
      const accounts = await CashAccount.findAll({
        where: { isActive: true },
        order: [["accountName", "ASC"]],
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching cash accounts",
        error: error.message,
      });
    }
  }

  async updateExpenseCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await ExpenseCategory.findByPk(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Expense category not found",
        });
      }

      await category.update(updateData);

      res.json({
        success: true,
        message: "Expense category updated successfully",
        data: category,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating expense category",
        error: error.message,
      });
    }
  }

  async getExpenseReports(req, res) {
    try {
      const { page = 1, limit = 10, status, userId } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (userId) whereCondition.userId = userId;

      const { count, rows: reports } = await ExpenseReport.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: reports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching expense reports",
        error: error.message,
      });
    }
  }

  async getExpenseReportDetails(req, res) {
    try {
      const { id } = req.params;

      const report = await ExpenseReport.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: Expense,
            as: "expenses",
            include: [
              {
                model: ExpenseCategory,
                as: "category",
                attributes: ["id", "categoryName", "categoryCode"],
              },
            ],
          },
        ],
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: "Expense report not found",
        });
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching expense report details",
        error: error.message,
      });
    }
  }

  async getTaxConfigurations(req, res) {
    try {
      const configurations = await TaxConfiguration.findAll({
        order: [["taxType", "ASC"]],
      });

      res.json({
        success: true,
        data: configurations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching tax configurations",
        error: error.message,
      });
    }
  }

  async getIncomeStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // This is a simplified implementation - you'll want to expand this
      const revenue = await CustomerPayment.sum("amount", {
        where: {
          paymentDate: { [Op.between]: [startDate, endDate] },
          status: "completed",
        },
      });

      const expenses = await VendorPayment.sum("amount", {
        where: {
          paymentDate: { [Op.between]: [startDate, endDate] },
          status: "completed",
        },
      });

      const netIncome = revenue - expenses;

      res.json({
        success: true,
        data: {
          revenue: revenue || 0,
          expenses: expenses || 0,
          netIncome,
          period: { startDate, endDate },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating income statement",
        error: error.message,
      });
    }
  }

  async getBalanceSheet(req, res) {
    try {
      const { asOfDate } = req.query;

      // Simplified implementation
      const assets = await BankAccount.sum("currentBalance", {
        where: { isActive: true },
      });

      const liabilities = await VendorBill.sum("balanceDue", {
        where: {
          status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
        },
      });

      const equity = assets - liabilities;

      res.json({
        success: true,
        data: {
          assets: assets || 0,
          liabilities: liabilities || 0,
          equity,
          asOfDate,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating balance sheet",
        error: error.message,
      });
    }
  }

  async getAccountingDashboard(req, res) {
    try {
      const totalRevenue = await CustomerPayment.sum("amount", {
        where: { status: "completed" },
      });

      const totalExpenses = await VendorPayment.sum("amount", {
        where: { status: "completed" },
      });

      const outstandingReceivables = await CustomerInvoice.sum("balanceDue", {
        where: { status: { [Op.in]: ["sent", "partial", "overdue"] } },
      });

      const outstandingPayables = await VendorBill.sum("balanceDue", {
        where: {
          status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
        },
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalRevenue: totalRevenue || 0,
            totalExpenses: totalExpenses || 0,
            netIncome: (totalRevenue || 0) - (totalExpenses || 0),
            outstandingReceivables: outstandingReceivables || 0,
            outstandingPayables: outstandingPayables || 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard data",
        error: error.message,
      });
    }
  }
  async getAccountingMetrics(req, res) {
    try {
      // Add your specific metrics calculations here
      res.json({
        success: true,
        data: {
          metrics: {
            // Placeholder metrics
            cashFlow: 0,
            profitMargin: 0,
            currentRatio: 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching accounting metrics",
        error: error.message,
      });
    }
  }

  // ========== MISSING METHODS TO end ==========
}
module.exports = new AccountingController();
