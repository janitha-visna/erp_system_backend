const {
  FeeStructure,
  User,
  Expense,
  Payroll,
  Teacher,
  Student,
  Budget,
  Invoice,
  Payment,
  Asset,
  Tax,
  FinancialTransaction,
  ChartOfAccount,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class FinanceController {
  // Create fee structure
  async createFeeStructure(req, res) {
    try {
      const feeData = req.body;
      feeData.createdBy = req.user.id;

      // Calculate total amount from components
      if (feeData.feeComponents && Array.isArray(feeData.feeComponents)) {
        feeData.totalAmount = feeData.feeComponents.reduce(
          (total, component) => {
            return total + parseFloat(component.amount || 0);
          },
          0
        );
      }

      const feeStructure = await FeeStructure.create(feeData);

      res.status(201).json({
        success: true,
        message: "Fee structure created successfully",
        data: feeStructure,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating fee structure",
        error: error.message,
      });
    }
  }

  // Get all fee structures
  async getFeeStructures(req, res) {
    try {
      const { page = 1, limit = 10, academicYear = "", grade = "" } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = { isActive: true };
      if (academicYear) {
        whereCondition.academicYear = academicYear;
      }
      if (grade) {
        whereCondition.grade = grade;
      }

      const { count, rows: feeStructures } = await FeeStructure.findAndCountAll(
        {
          where: whereCondition,
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["email"],
            },
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["createdAt", "DESC"]],
        }
      );

      res.json({
        success: true,
        data: feeStructures,
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
        message: "Error fetching fee structures",
        error: error.message,
      });
    }
  }

  // Update fee structure
  async updateFeeStructure(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const feeStructure = await FeeStructure.findByPk(id);
      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: "Fee structure not found",
        });
      }

      // Recalculate total amount if components are updated
      if (updateData.feeComponents && Array.isArray(updateData.feeComponents)) {
        updateData.totalAmount = updateData.feeComponents.reduce(
          (total, component) => {
            return total + parseFloat(component.amount || 0);
          },
          0
        );
      }

      await feeStructure.update(updateData);

      res.json({
        success: true,
        message: "Fee structure updated successfully",
        data: feeStructure,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating fee structure",
        error: error.message,
      });
    }
  }

  // ========== INVOICE MANAGEMENT ==========
  async createInvoice(req, res) {
    try {
      const invoiceData = req.body;

      // Generate invoice number
      const invoiceCount = await Invoice.count();
      invoiceData.invoiceNumber = `INV-${new Date().getFullYear()}-${(
        invoiceCount + 1
      )
        .toString()
        .padStart(5, "0")}`;

      // Calculate totals
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        invoiceData.subtotal = invoiceData.items.reduce(
          (total, item) =>
            total + parseFloat(item.quantity) * parseFloat(item.unitPrice),
          0
        );

        invoiceData.totalAmount =
          invoiceData.subtotal -
          (invoiceData.discount || 0) +
          (invoiceData.taxAmount || 0);
        invoiceData.balanceDue = invoiceData.totalAmount;
      }

      const invoice = await Invoice.create(invoiceData);

      // Create financial transaction
      await FinancialTransaction.create({
        transactionCode: `TXN-${Date.now()}`,
        transactionDate: new Date(),
        transactionType: "revenue",
        category: "tuition_fee",
        amount: invoiceData.totalAmount,
        description: `Invoice ${invoiceData.invoiceNumber} for student`,
        paymentMethod: "pending",
        invoiceId: invoice.id,
        createdBy: req.user.id,
      });

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

  async getInvoices(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        studentId,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (studentId) whereCondition.studentId = studentId;
      if (startDate && endDate) {
        whereCondition.invoiceDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Student,
            as: "student",
            attributes: ["id", "firstName", "lastName", "studentId", "grade"],
          },
          {
            model: FeeStructure,
            as: "feeStructure",
            attributes: ["id", "name", "academicYear"],
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

  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id, {
        include: [
          {
            model: Student,
            as: "student",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "studentId",
              "grade",
              "parentName",
              "parentContact",
            ],
          },
          {
            model: FeeStructure,
            as: "feeStructure",
            attributes: ["id", "name", "academicYear", "feeComponents"],
          },
          {
            model: Payment,
            as: "payments",
            include: [
              {
                model: User,
                as: "collector",
                attributes: ["email"],
              },
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
        message: "Error fetching invoice",
        error: error.message,
      });
    }
  }

  // ========== PAYMENT MANAGEMENT ==========
  async processPayment(req, res) {
    try {
      const paymentData = req.body;
      paymentData.collectedBy = req.user.id;

      // Generate payment number
      const paymentCount = await Payment.count();
      paymentData.paymentNumber = `PAY-${new Date().getFullYear()}-${(
        paymentCount + 1
      )
        .toString()
        .padStart(5, "0")}`;

      const payment = await Payment.create(paymentData);

      // Update invoice balance
      const invoice = await Invoice.findByPk(paymentData.invoiceId);
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
      await FinancialTransaction.create({
        transactionCode: `TXN-${Date.now()}`,
        transactionDate: new Date(),
        transactionType: "revenue",
        category: "tuition_fee",
        amount: paymentData.amount,
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        invoiceId: paymentData.invoiceId,
        status: "completed",
        createdBy: req.user.id,
      });

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

  async getPayments(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        paymentMethod,
        startDate,
        endDate,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (paymentMethod) whereCondition.paymentMethod = paymentMethod;
      if (startDate && endDate) {
        whereCondition.paymentDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: ["invoiceNumber", "totalAmount"],
          },
          {
            model: Student,
            as: "student",
            attributes: ["firstName", "lastName", "studentId"],
          },
          {
            model: User,
            as: "collector",
            attributes: ["email"],
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
        message: "Error fetching payments",
        error: error.message,
      });
    }
  }

  async generateReceipt(req, res) {
    try {
      const { paymentId } = req.params;

      const payment = await Payment.findByPk(paymentId, {
        include: [
          {
            model: Invoice,
            as: "invoice",
            include: [
              {
                model: Student,
                as: "student",
                attributes: ["firstName", "lastName", "studentId", "grade"],
              },
            ],
          },
          {
            model: User,
            as: "collector",
            attributes: ["email"],
          },
        ],
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      const receipt = {
        receiptNumber: `RCP-${payment.paymentNumber}`,
        paymentDate: payment.paymentDate,
        studentName: `${payment.invoice.student.firstName} 
${payment.invoice.student.lastName}`,
        studentId: payment.invoice.student.studentId,
        grade: payment.invoice.student.grade,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        collectedBy: payment.collector.email,
        invoiceNumber: payment.invoice.invoiceNumber,
      };

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating receipt",
        error: error.message,
      });
    }
  }

  // ========== EXPENSE MANAGEMENT ==========
  async createExpense(req, res) {
    try {
      const expenseData = req.body;
      expenseData.approvedBy = req.user.id;

      const expense = await Expense.create(expenseData);

      // Create financial transaction if expense is paid
      if (expenseData.status === "paid") {
        await FinancialTransaction.create({
          transactionCode: `TXN-${Date.now()}`,
          transactionDate: new Date(),
          transactionType: "expense",
          category: expenseData.category,
          amount: -expenseData.amount, // Negative for expenses
          description: expenseData.description,
          paymentMethod: expenseData.paymentMethod,
          expenseId: expense.id,
          status: "completed",
          createdBy: req.user.id,
        });
      }

      res.status(201).json({
        success: true,
        message: "Expense recorded successfully",
        data: expense,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error recording expense",
        error: error.message,
      });
    }
  }

  async getExpenses(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        category,
        status,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (startDate && endDate) {
        whereCondition.expenseDate = {
          [Op.between]: [startDate, endDate],
        };
      }
      if (category) whereCondition.category = category;
      if (status) whereCondition.status = status;

      const { count, rows: expenses } = await Expense.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "approver",
            attributes: ["email", "role"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["expenseDate", "DESC"]],
      });

      res.json({
        success: true,
        data: expenses,
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
        message: "Error fetching expenses",
        error: error.message,
      });
    }
  }

  async updateExpenseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      const expense = await Expense.findByPk(id);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      const updateData = { status };
      if (status === "rejected" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      await expense.update(updateData);

      // Create financial transaction when expense is paid
      if (status === "paid") {
        await FinancialTransaction.create({
          transactionCode: `TXN-${Date.now()}`,
          transactionDate: new Date(),
          transactionType: "expense",
          category: expense.category,
          amount: -expense.amount,
          description: expense.description,
          paymentMethod: expense.paymentMethod,
          expenseId: expense.id,
          status: "completed",
          createdBy: req.user.id,
        });
      }

      res.json({
        success: true,
        message: `Expense ${status} successfully`,
        data: expense,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating expense status",
        error: error.message,
      });
    }
  }

  // ========== BUDGET MANAGEMENT ==========
  async createBudget(req, res) {
    try {
      const budgetData = req.body;
      budgetData.createdBy = req.user.id;

      // Generate budget code
      const budgetCount = await Budget.count();
      budgetData.budgetCode = `BUD-${budgetData.fiscalYear}-${(budgetCount + 1)
        .toString()
        .padStart(3, "0")}`;

      budgetData.remainingAmount = budgetData.allocatedAmount;

      const budget = await Budget.create(budgetData);

      res.status(201).json({
        success: true,
        message: "Budget created successfully",
        data: budget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating budget",
        error: error.message,
      });
    }
  }

  async getBudgets(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        fiscalYear,
        department,
        status,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (fiscalYear) whereCondition.fiscalYear = fiscalYear;
      if (department) whereCondition.department = department;
      if (status) whereCondition.status = status;

      const { count, rows: budgets } = await Budget.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["email"],
          },
          {
            model: User,
            as: "approver",
            attributes: ["email"],
            required: false,
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: budgets,
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
        message: "Error fetching budgets",
        error: error.message,
      });
    }
  }

  async updateBudgetStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const budget = await Budget.findByPk(id);
      if (!budget) {
        return res.status(404).json({
          success: false,
          message: "Budget not found",
        });
      }

      await budget.update({
        status,
        approvedBy: req.user.id,
      });

      res.json({
        success: true,
        message: `Budget ${status} successfully`,
        data: budget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating budget status",
        error: error.message,
      });
    }
  }

  async getBudgetUtilization(req, res) {
    try {
      const { budgetId } = req.params;

      const budget = await Budget.findByPk(budgetId, {
        include: [
          {
            model: FinancialTransaction,
            as: "transactions",
            attributes: ["id", "amount", "description", "transactionDate"],
          },
        ],
      });

      if (!budget) {
        return res.status(404).json({
          success: false,
          message: "Budget not found",
        });
      }

      const totalUtilized = budget.transactions.reduce(
        (sum, transaction) => sum + Math.abs(parseFloat(transaction.amount)),
        0
      );

      const utilizationRate =
        (totalUtilized / parseFloat(budget.allocatedAmount)) * 100;

      res.json({
        success: true,
        data: {
          budget,
          utilization: {
            allocated: budget.allocatedAmount,
            utilized: totalUtilized,
            remaining: parseFloat(budget.allocatedAmount) - totalUtilized,
            utilizationRate: utilizationRate.toFixed(2),
          },
          transactions: budget.transactions,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching budget utilization",
        error: error.message,
      });
    }
  }

  // ========== ASSET MANAGEMENT ==========
  async createAsset(req, res) {
    try {
      const assetData = req.body;

      // Generate asset code
      const assetCount = await Asset.count();
      assetData.assetCode = `AST-${new Date().getFullYear()}-${(assetCount + 1)
        .toString()
        .padStart(4, "0")}`;

      assetData.currentValue = assetData.purchaseCost;

      const asset = await Asset.create(assetData);

      // Create financial transaction for asset purchase
      await FinancialTransaction.create({
        transactionCode: `TXN-${Date.now()}`,
        transactionDate: new Date(),
        transactionType: "asset_purchase",
        category: "fixed_assets",
        amount: -assetData.purchaseCost,
        description: `Purchase of ${assetData.assetName}`,
        paymentMethod: "bank_transfer",
        status: "completed",
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Asset created successfully",
        data: asset,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating asset",
        error: error.message,
      });
    }
  }

  async getAssets(req, res) {
    try {
      const { page = 1, limit = 10, category, status } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (category) whereCondition.category = category;
      if (status) whereCondition.status = status;

      const { count, rows: assets } = await Asset.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Teacher,
            as: "assignedToEmployee",
            attributes: ["firstName", "lastName", "employeeId"],
            required: false,
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["purchaseDate", "DESC"]],
      });

      res.json({
        success: true,
        data: assets,
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
        message: "Error fetching assets",
        error: error.message,
      });
    }
  }

  async updateAsset(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const asset = await Asset.findByPk(id);
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }

      // Calculate depreciation if needed
      if (updateData.depreciationRate && asset.purchaseDate) {
        const purchaseDate = new Date(asset.purchaseDate);
        const currentDate = new Date();
        const monthsOwned =
          (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
          (currentDate.getMonth() - purchaseDate.getMonth());

        const monthlyDepreciation =
          (parseFloat(asset.purchaseCost) *
            parseFloat(updateData.depreciationRate)) /
          1200;
        updateData.currentValue = Math.max(
          0,
          parseFloat(asset.purchaseCost) - monthlyDepreciation * monthsOwned
        );
      }

      await asset.update(updateData);

      res.json({
        success: true,
        message: "Asset updated successfully",
        data: asset,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating asset",
        error: error.message,
      });
    }
  }

  // ========== TAX MANAGEMENT ==========
  async createTax(req, res) {
    try {
      const taxData = req.body;
      taxData.createdBy = req.user.id;

      const tax = await Tax.create(taxData);

      res.status(201).json({
        success: true,
        message: "Tax created successfully",
        data: tax,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating tax",
        error: error.message,
      });
    }
  }

  async getTaxes(req, res) {
    try {
      const { page = 1, limit = 10, taxType, isActive } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (taxType) whereCondition.taxType = taxType;
      if (isActive !== "") whereCondition.isActive = isActive === "true";

      const { count, rows: taxes } = await Tax.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["email"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["applicableFrom", "DESC"]],
      });

      res.json({
        success: true,
        data: taxes,
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
        message: "Error fetching taxes",
        error: error.message,
      });
    }
  }

  // ========== FINANCIAL TRANSACTIONS ==========
  async getFinancialTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        transactionType,
        startDate,
        endDate,
        status,
      } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (transactionType) whereCondition.transactionType = transactionType;
      if (status) whereCondition.status = status;
      if (startDate && endDate) {
        whereCondition.transactionDate = {
          [Op.between]: [startDate, endDate],
        };
      }

      const { count, rows: transactions } =
        await FinancialTransaction.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["email"],
            },
            {
              model: Invoice,
              as: "invoice",
              attributes: ["invoiceNumber"],
              required: false,
            },
            {
              model: Expense,
              as: "expense",
              attributes: ["description"],
              required: false,
            },
            {
              model: Budget,
              as: "budget",
              attributes: ["budgetName"],
              required: false,
            },
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["transactionDate", "DESC"]],
        });

      res.json({
        success: true,
        data: transactions,
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
        message: "Error fetching financial transactions",
        error: error.message,
      });
    }
  }

  // ========== CHART OF ACCOUNTS ==========
  async createChartOfAccount(req, res) {
    try {
      const accountData = req.body;
      accountData.createdBy = req.user.id;

      const account = await ChartOfAccount.create(accountData);

      res.status(201).json({
        success: true,
        message: "Chart of account created successfully",
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating chart of account",
        error: error.message,
      });
    }
  }

  async getChartOfAccounts(req, res) {
    try {
      const { accountType, isActive } = req.query;

      const whereCondition = {};
      if (accountType) whereCondition.accountType = accountType;
      if (isActive !== "") whereCondition.isActive = isActive === "true";

      const accounts = await ChartOfAccount.findAll({
        where: whereCondition,
        include: [
          {
            model: ChartOfAccount,
            as: "subAccounts",
            attributes: ["id", "accountCode", "accountName", "balance"],
          },
        ],
        order: [["accountCode", "ASC"]],
      });

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching chart of accounts",
        error: error.message,
      });
    }
  }

  // ========== FINANCIAL REPORTS ==========
  async getFinancialReports(req, res) {
    try {
      const { startDate, endDate, reportType } = req.query;

      const start = new Date(startDate || new Date().getFullYear() + "-01-01");
      const end = new Date(endDate || new Date().getFullYear() + "-12-31");

      let reports = {};

      switch (reportType) {
        case "income_statement":
          reports = await this.generateIncomeStatement(start, end);
          break;
        case "balance_sheet":
          reports = await this.generateBalanceSheet(start, end);
          break;
        case "cash_flow":
          reports = await this.generateCashFlow(start, end);
          break;
        case "budget_variance":
          reports = await this.generateBudgetVariance(start, end);
          break;
        default:
          reports = await this.generateComprehensiveReport(start, end);
      }

      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating financial reports",
        error: error.message,
      });
    }
  }

  async generateIncomeStatement(start, end) {
    // Revenue calculations
    const feeRevenue = await Payment.sum("amount", {
      where: {
        paymentDate: { [Op.between]: [start, end] },
        status: "completed",
      },
    });

    const otherRevenue = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: { [Op.between]: [start, end] },
        transactionType: "revenue",
        category: { [Op.not]: "tuition_fee" },
      },
    });

    const totalRevenue = (feeRevenue || 0) + (otherRevenue || 0);

    // Expense calculations
    const salaryExpenses = await Payroll.sum("netSalary", {
      where: {
        paymentDate: { [Op.between]: [start, end] },
        paymentStatus: "paid",
      },
    });

    const operationalExpenses = await Expense.sum("amount", {
      where: {
        expenseDate: { [Op.between]: [start, end] },
        status: "paid",
      },
    });

    const otherExpenses = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: { [Op.between]: [start, end] },
        transactionType: "expense",
      },
    });

    const totalExpenses =
      (salaryExpenses || 0) +
      (operationalExpenses || 0) +
      (Math.abs(otherExpenses) || 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      reportType: "income_statement",
      period: { start, end },
      revenue: {
        feeRevenue: feeRevenue || 0,
        otherRevenue: otherRevenue || 0,
        total: totalRevenue,
      },
      expenses: {
        salary: salaryExpenses || 0,
        operational: operationalExpenses || 0,
        other: Math.abs(otherExpenses) || 0,
        total: totalExpenses,
      },
      netIncome,
    };
  }

  async generateBalanceSheet(start, end) {
    // Assets
    const currentAssets = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: { [Op.between]: [start, end] },
        transactionType: { [Op.in]: ["revenue", "asset_purchase"] },
      },
    });

    const fixedAssets = await Asset.sum("currentValue", {
      where: {
        status: "active",
      },
    });

    const totalAssets = (currentAssets || 0) + (fixedAssets || 0);

    // Liabilities & Equity (simplified)
    const totalLiabilities = await this.calculateLiabilities();
    const totalEquity = totalAssets - totalLiabilities;

    return {
      reportType: "balance_sheet",
      asOf: end,
      assets: {
        currentAssets: currentAssets || 0,
        fixedAssets: fixedAssets || 0,
        total: totalAssets,
      },
      liabilities: {
        total: totalLiabilities,
      },
      equity: {
        total: totalEquity,
      },
    };
  }

  async calculateLiabilities() {
    // This would typically include loans, accounts payable, etc.
    // Simplified for this example
    const unpaidInvoices = await Invoice.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["issued", "partial", "overdue"] },
      },
    });

    return unpaidInvoices || 0;
  }

  async generateCashFlow(start, end) {
    const operatingActivities = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: { [Op.between]: [start, end] },
        transactionType: { [Op.in]: ["revenue", "expense"] },
      },
    });

    const investingActivities = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: { [Op.between]: [start, end] },
        transactionType: "asset_purchase",
      },
    });

    const netCashFlow = (operatingActivities || 0) + (investingActivities || 0);

    return {
      reportType: "cash_flow",
      period: { start, end },
      operatingActivities: operatingActivities || 0,
      investingActivities: investingActivities || 0,
      netCashFlow,
    };
  }

  async generateBudgetVariance(start, end) {
    const budgets = await Budget.findAll({
      where: {
        status: "active",
        startDate: { [Op.lte]: end },
        endDate: { [Op.gte]: start },
      },
      include: [
        {
          model: FinancialTransaction,
          as: "transactions",
          where: {
            transactionDate: { [Op.between]: [start, end] },
          },
          required: false,
        },
      ],
    });

    const varianceReport = budgets.map((budget) => {
      const utilized = budget.transactions.reduce(
        (sum, txn) => sum + Math.abs(parseFloat(txn.amount)),
        0
      );
      const allocated = parseFloat(budget.allocatedAmount);
      const variance = allocated - utilized;
      const variancePercentage = (variance / allocated) * 100;

      return {
        budget: budget.budgetName,
        department: budget.department,
        allocated,
        utilized,
        variance,
        variancePercentage: variancePercentage.toFixed(2),
        status: variance >= 0 ? "under_budget" : "over_budget",
      };
    });

    return {
      reportType: "budget_variance",
      period: { start, end },
      data: varianceReport,
    };
  }

  // ========== FINANCE DASHBOARD ==========

  async getFinanceDashboard(req, res) {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Revenue metrics
      const monthlyRevenue = await Payment.sum("amount", {
        where: {
          paymentDate: {
            [Op.between]: [
              new Date(currentYear, currentMonth - 1, 1),
              new Date(currentYear, currentMonth, 0),
            ],
          },
          status: "completed",
        },
      });

      const yearlyRevenue = await Payment.sum("amount", {
        where: {
          paymentDate: {
            [Op.between]: [
              new Date(currentYear, 0, 1),
              new Date(currentYear, 11, 31),
            ],
          },
          status: "completed",
        },
      });

      // Expense metrics
      const monthlyExpenses = await Expense.sum("amount", {
        where: {
          expenseDate: {
            [Op.between]: [
              new Date(currentYear, currentMonth - 1, 1),
              new Date(currentYear, currentMonth, 0),
            ],
          },
          status: "paid",
        },
      });

      const monthlyPayroll = await Payroll.sum("netSalary", {
        where: {
          paymentDate: {
            [Op.between]: [
              new Date(currentYear, currentMonth - 1, 1),
              new Date(currentYear, currentMonth, 0),
            ],
          },
          paymentStatus: "paid",
        },
      });

      // Invoice metrics
      const totalInvoices = await Invoice.count();
      const pendingInvoices = await Invoice.count({
        where: {
          status: { [Op.in]: ["issued", "partial", "overdue"] },
        },
      });

      const overdueInvoices = await Invoice.count({
        where: {
          status: "overdue",
        },
      });

      // Budget metrics
      const activeBudgets = await Budget.count({
        where: { status: "active" },
      });

      const budgetUtilization = await Budget.findOne({
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("allocatedAmount")),
            "totalAllocated",
          ],
          [
            sequelize.fn("SUM", sequelize.col("utilizedAmount")),
            "totalUtilized",
          ],
        ],
        where: { status: "active" },
        raw: true,
      });

      res.json({
        success: true,
        data: {
          summary: {
            monthlyRevenue: monthlyRevenue || 0,
            yearlyRevenue: yearlyRevenue || 0,
            monthlyExpenses: (monthlyExpenses || 0) + (monthlyPayroll || 0),
            netCashFlow:
              (monthlyRevenue || 0) -
              ((monthlyExpenses || 0) + (monthlyPayroll || 0)),
            totalInvoices,
            pendingInvoices,
            overdueInvoices,
            activeBudgets,
          },
          budgetOverview: {
            allocated: budgetUtilization?.totalAllocated || 0,
            utilized: budgetUtilization?.totalUtilized || 0,
            utilizationRate:
              budgetUtilization?.totalAllocated > 0
                ? (
                    (budgetUtilization.totalUtilized /
                      budgetUtilization.totalAllocated) *
                    100
                  ).toFixed(2)
                : 0,
          },
          recentTransactions: await FinancialTransaction.findAll({
            limit: 10,
            order: [["transactionDate", "DESC"]],
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["email"],
              },
            ],
          }),
          upcomingPayments: await Invoice.findAll({
            where: {
              dueDate: {
                [Op.between]: [
                  new Date(),
                  new Date(new Date().setDate(new Date().getDate() + 30)),
                ],
              },
              status: { [Op.in]: ["issued", "partial"] },
            },
            limit: 5,
            include: [
              {
                model: Student,
                as: "student",
                attributes: ["firstName", "lastName"],
              },
            ],
          }),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching finance dashboard",
        error: error.message,
      });
    }
  }

  // ========== FINANCIAL ANALYTICS ==========
  async getFinancialAnalytics(req, res) {
    try {
      const { period } = req.query; // monthly, quarterly, yearly

      // Revenue trends
      const revenueTrends = await this.getRevenueTrends(period);

      // Expense analysis
      const expenseAnalysis = await this.getExpenseAnalysis(period);

      // Profitability metrics
      const profitability = await this.getProfitabilityMetrics(period);

      // Cash flow analysis
      const cashFlow = await this.getCashFlowAnalysis(period);

      res.json({
        success: true,
        data: {
          revenueTrends,
          expenseAnalysis,
          profitability,
          cashFlow,
          keyMetrics: await this.getKeyFinancialMetrics(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching financial analytics",
        error: error.message,
      });
    }
  }

  async getRevenueTrends(period) {
    const months = 12; // Last 12 months
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const revenue = await Payment.sum("amount", {
        where: {
          paymentDate: { [Op.between]: [startOfMonth, endOfMonth] },
          status: "completed",
        },
      });

      trends.push({
        period: startOfMonth.toISOString().slice(0, 7),
        revenue: revenue || 0,
      });
    }

    return trends;
  }

  async getExpenseAnalysis(period) {
    const categories = await Expense.findAll({
      attributes: [
        "category",
        [sequelize.fn("SUM", sequelize.col("amount")), "total"],
      ],
      where: {
        expenseDate: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
        },
        status: "paid",
      },
      group: ["category"],
      order: [[sequelize.fn("SUM", sequelize.col("amount")), "DESC"]],
    });

    const payroll = await Payroll.sum("netSalary", {
      where: {
        paymentDate: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
        },
        paymentStatus: "paid",
      },
    });

    return {
      byCategory: categories,
      payroll: payroll || 0,
      totalExpenses:
        categories.reduce((sum, cat) => sum + parseFloat(cat.get("total")), 0) +
        (payroll || 0),
    };
  }

  async getProfitabilityMetrics(period) {
    const currentYear = new Date().getFullYear();

    const revenue = await Payment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
        status: "completed",
      },
    });

    const expenses = await Expense.sum("amount", {
      where: {
        expenseDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
        status: "paid",
      },
    });

    const payroll = await Payroll.sum("netSalary", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
        paymentStatus: "paid",
      },
    });

    const totalExpenses = (expenses || 0) + (payroll || 0);
    const netIncome = (revenue || 0) - totalExpenses;
    const profitMargin = (revenue || 0) > 0 ? (netIncome / revenue) * 100 : 0;

    return {
      grossRevenue: revenue || 0,
      totalExpenses,
      netIncome,
      profitMargin: profitMargin.toFixed(2),
      operatingRatio: (revenue || 0) > 0 ? (totalExpenses / revenue) * 100 : 0,
    };
  }

  async getCashFlowAnalysis(period) {
    const currentYear = new Date().getFullYear();

    const operating = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
        transactionType: { [Op.in]: ["revenue", "expense"] },
      },
    });

    const investing = await FinancialTransaction.sum("amount", {
      where: {
        transactionDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
        transactionType: "asset_purchase",
      },
    });

    return {
      operatingCashFlow: operating || 0,
      investingCashFlow: investing || 0,
      netCashFlow: (operating || 0) + (investing || 0),
    };
  }

  async getKeyFinancialMetrics() {
    const currentYear = new Date().getFullYear();

    // Current Ratio (simplified)
    const currentAssets = await Payment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
      },
    });

    const currentLiabilities = await Invoice.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["issued", "partial", "overdue"] },
      },
    });

    const currentRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

    // Accounts Receivable Turnover
    const averageReceivable = await Invoice.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["issued", "partial", "overdue"] },
      },
    });

    const revenue = await Payment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31),
          ],
        },
      },
    });

    const receivableTurnover =
      averageReceivable > 0 ? revenue / averageReceivable : 0;

    return {
      currentRatio: currentRatio.toFixed(2),
      receivableTurnover: receivableTurnover.toFixed(2),
      debtToEquity: 0.25, // Simplified
      returnOnAssets: 0.15, // Simplified
    };
  }
}
module.exports = new FinanceController();
