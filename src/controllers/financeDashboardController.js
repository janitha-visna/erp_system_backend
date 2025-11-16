const {
  Customer,
  Vendor,
  CustomerInvoice,
  VendorBill,
  CustomerPayment,
  VendorPayment,
  BankAccount,
  Expense,
  ExpenseReport,
  FinancialTransaction,
  ChartOfAccount,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class FinanceDashboardController {
  async getFinanceOverview(req, res) {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Parallel data fetching for performance
      const [
        revenueMetrics,
        expenseMetrics,
        cashFlow,
        agingSummary,
        bankBalances,
        pendingApprovals,
      ] = await Promise.all([
        this.getRevenueMetrics(currentMonth, currentYear),
        this.getExpenseMetrics(currentMonth, currentYear),
        this.getCashFlowOverview(),
        this.getAgingSummary(),
        this.getBankBalances(),
        this.getPendingApprovals(),
      ]);

      const overview = {
        financialHealth: {
          ...revenueMetrics,
          ...expenseMetrics,
          netIncome: revenueMetrics.totalRevenue - expenseMetrics.totalExpenses,
          profitMargin:
            revenueMetrics.totalRevenue > 0
              ? ((revenueMetrics.totalRevenue - expenseMetrics.totalExpenses) /
                  revenueMetrics.totalRevenue) *
                100
              : 0,
        },
        cashPosition: cashFlow,
        receivables: agingSummary.receivables,
        payables: agingSummary.payables,
        bankAccounts: bankBalances,
        alerts: await this.getFinancialAlerts(),
        quickActions: this.getQuickActions(),
        pendingApprovals,
      };

      res.json({
        success: true,
        data: overview,
        lastUpdated: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching finance overview",
        error: error.message,
      });
    }
  }

  async getRevenueMetrics(month, year) {
    const totalRevenue = await CustomerPayment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0),
          ],
        },
        status: "completed",
      },
    });

    const previousMonthRevenue = await CustomerPayment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(year, month - 2, 1),
            new Date(year, month - 1, 0),
          ],
        },
        status: "completed",
      },
    });

    const growthRate =
      previousMonthRevenue > 0
        ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

    return {
      totalRevenue: totalRevenue || 0,
      previousMonthRevenue: previousMonthRevenue || 0,
      growthRate: growthRate.toFixed(2),
      invoiceCount: await CustomerInvoice.count({
        where: {
          invoiceDate: {
            [Op.between]: [
              new Date(year, month - 1, 1),
              new Date(year, month, 0),
            ],
          },
        },
      }),
    };
  }

  async getExpenseMetrics(month, year) {
    const [vendorPayments, expenses, payroll] = await Promise.all([
      VendorPayment.sum("amount", {
        where: {
          paymentDate: {
            [Op.between]: [
              new Date(year, month - 1, 1),
              new Date(year, month, 0),
            ],
          },
          status: "completed",
        },
      }),
      Expense.sum("amount", {
        where: {
          expenseDate: {
            [Op.between]: [
              new Date(year, month - 1, 1),
              new Date(year, month, 0),
            ],
          },
          status: "paid",
        },
      }),
      // Payroll would be calculated from payroll module
      0, // Placeholder
    ]);

    const totalExpenses =
      (vendorPayments || 0) + (expenses || 0) + (payroll || 0);

    return {
      totalExpenses,
      vendorPayments: vendorPayments || 0,
      operationalExpenses: expenses || 0,
      payrollExpenses: payroll || 0,
    };
  }

  async getCashFlowOverview() {
    const currentDate = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    const inflows = await CustomerPayment.sum("amount", {
      where: {
        paymentDate: { [Op.gte]: thirtyDaysAgo },
        status: "completed",
      },
    });

    const outflows = await VendorPayment.sum("amount", {
      where: {
        paymentDate: { [Op.gte]: thirtyDaysAgo },
        status: "completed",
      },
    });

    const netCashFlow = (inflows || 0) - (outflows || 0);

    return {
      inflows: inflows || 0,
      outflows: outflows || 0,
      netCashFlow,
      cashBalance: await this.getTotalCashBalance(),
    };
  }

  async getTotalCashBalance() {
    const [bankBalance, cashBalance] = await Promise.all([
      BankAccount.sum("currentBalance", {
        where: { isActive: true },
      }),
      // Cash account balance calculation
      0, // Placeholder
    ]);

    return (bankBalance || 0) + (cashBalance || 0);
  }

  async getAgingSummary() {
    const receivables = await CustomerInvoice.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["sent", "partial", "overdue"] },
      },
    });

    const payables = await VendorBill.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
      },
    });

    return {
      receivables: receivables || 0,
      payables: payables || 0,
      netWorkingCapital: (receivables || 0) - (payables || 0),
    };
  }

  async getBankBalances() {
    const accounts = await BankAccount.findAll({
      where: { isActive: true },
      attributes: [
        "id",
        "bankName",
        "accountNumber",
        "currentBalance",
        "accountType",
      ],
    });

    return accounts.map((account) => ({
      id: account.id,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      balance: account.currentBalance,
      type: account.accountType,
    }));
  }

  async getPendingApprovals() {
    const [pendingBills, pendingExpenses, pendingReports] = await Promise.all([
      VendorBill.count({
        where: { status: "received" },
      }),
      Expense.count({
        where: { status: "pending" },
      }),
      ExpenseReport.count({
        where: { status: "submitted" },
      }),
    ]);

    return {
      vendorBills: pendingBills,
      expenses: pendingExpenses,
      expenseReports: pendingReports,
      total: pendingBills + pendingExpenses + pendingReports,
    };
  }

  async getFinancialAlerts() {
    const alerts = [];

    // Low cash balance alert
    const cashBalance = await this.getTotalCashBalance();
    if (cashBalance < 10000) {
      alerts.push({
        type: "cash_balance",
        severity: "high",
        message: "Low cash balance",
        details: `Current balance: $${cashBalance.toFixed(2)}`,
        action: "review_cash_flow",
      });
    }

    // Overdue invoices alert
    const overdueInvoices = await CustomerInvoice.count({
      where: { status: "overdue" },
    });

    if (overdueInvoices > 5) {
      alerts.push({
        type: "overdue_invoices",
        severity: "medium",
        message: `${overdueInvoices} overdue invoices`,
        action: "review_receivables",
      });
    }

    // Budget overrun alerts would go here

    return alerts;
  }

  getQuickActions() {
    return [
      {
        icon: "file-invoice-dollar",
        title: "Create Invoice",
        action: "create_invoice",
        path: "/accounting/invoices/create",
      },
      {
        icon: "money-bill-wave",
        title: "Record Payment",
        action: "record_payment",
        path: "/accounting/payments/customer",
      },
      {
        icon: "file-invoice",
        title: "Enter Bill",
        action: "enter_bill",
        path: "/accounting/bills/create",
      },
      {
        icon: "chart-line",
        title: "View Reports",
        action: "view_reports",
        path: "/accounting/reports",
      },
      {
        icon: "exchange-alt",
        title: "Bank Reconciliation",
        action: "bank_reconciliation",
        path: "/accounting/bank/reconcile",
      },
      {
        icon: "receipt",
        title: "Expense Report",
        action: "expense_report",
        path: "/expenses/reports/create",
      },
    ];
  }

  // Financial KPIs and Trends
  async getFinancialKPIs(req, res) {
    try {
      const { period = "monthly" } = req.query;

      const kpis = await this.calculateFinancialKPIs(period);

      res.json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error calculating financial KPIs",
        error: error.message,
      });
    }
  }

  async calculateFinancialKPIs(period) {
    const currentDate = new Date();
    let startDate, endDate;

    if (period === "monthly") {
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );
    } else if (period === "quarterly") {
      const quarter = Math.floor(currentDate.getMonth() / 3);
      startDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
      endDate = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0);
    } else {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
    }

    const [revenue, expenses, receivables, payables, cashBalance] =
      await Promise.all([
        this.getRevenueMetrics(
          startDate.getMonth() + 1,
          startDate.getFullYear()
        ),
        this.getExpenseMetrics(
          startDate.getMonth() + 1,
          startDate.getFullYear()
        ),
        this.getAgingSummary(),
        this.getAgingSummary(), // Payables are in aging summary
        this.getTotalCashBalance(),
      ]);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      profitability: {
        grossRevenue: revenue.totalRevenue,
        netIncome: revenue.totalRevenue - expenses.totalExpenses,
        profitMargin:
          revenue.totalRevenue > 0
            ? ((revenue.totalRevenue - expenses.totalExpenses) /
                revenue.totalRevenue) *
              100
            : 0,
      },
      liquidity: {
        currentRatio: await this.calculateCurrentRatio(),
        quickRatio: await this.calculateQuickRatio(),
        workingCapital: receivables.receivables - payables.payables,
      },
      efficiency: {
        accountsReceivableTurnover: await this.calculateReceivableTurnover(),
        accountsPayableTurnover: await this.calculatePayableTurnover(),
        collectionPeriod: await this.calculateCollectionPeriod(),
      },
      solvency: {
        debtToEquity: await this.calculateDebtToEquity(),
        interestCoverage: await this.calculateInterestCoverage(),
      },
    };
  }

  async calculateCurrentRatio() {
    // Current Assets / Current Liabilities
    const currentAssets = await this.getTotalCashBalance(); // Simplified
    const currentLiabilities = await VendorBill.sum("balanceDue", {
      where: {
        status: { [Op.in]: ["received", "approved", "partial", "overdue"] },
      },
    });

    return currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  }

  async calculateQuickRatio() {
    // (Current Assets - Inventory) / Current Liabilities
    // Simplified for this implementation
    return await this.calculateCurrentRatio();
  }

  async calculateReceivableTurnover() {
    const annualRevenue = await CustomerPayment.sum("amount", {
      where: {
        paymentDate: {
          [Op.between]: [
            new Date(new Date().getFullYear(), 0, 1),
            new Date(new Date().getFullYear(), 11, 31),
          ],
        },
      },
    });

    const averageReceivables =
      (await CustomerInvoice.sum("balanceDue", {
        where: { status: { [Op.in]: ["sent", "partial", "overdue"] } },
      })) / 2; // Simplified average
    return averageReceivables > 0 ? annualRevenue / averageReceivables : 0;
  }
  async calculatePayableTurnover() {
    // Similar to receivable turnover but for payables
    return 0; // Placeholder
  }
  async calculateCollectionPeriod() {
    const turnover = await this.calculateReceivableTurnover();
    return turnover > 0 ? 365 / turnover : 0;
  }
  async calculateDebtToEquity() {
    // Total Liabilities / Total Equity
    // Simplified implementation
    return 0.5; // Placeholder
  }
  async calculateInterestCoverage() {
    // EBIT / Interest Expense
    // Simplified implementation
    return 8.5; // Placeholder
  }
}
module.exports = new FinanceDashboardController();
