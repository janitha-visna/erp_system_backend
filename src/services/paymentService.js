const axios = require("axios");
const {
  CustomerPayment,
  VendorPayment,
  BankAccount,
  FinancialTransaction,
} = require("../models");
class PaymentService {
  // Online Payment Processing
  async processOnlinePayment(paymentData) {
    try {
      const { amount, paymentMethod, customerId, invoiceId, cardDetails } =
        paymentData;

      // Integration with payment gateway (e.g., Stripe, PayPal)
      let paymentResult;

      switch (paymentMethod) {
        case "credit_card":
          paymentResult = await this.processCreditCardPayment(
            amount,
            cardDetails
          );
          break;
        case "debit_card":
          paymentResult = await this.processDebitCardPayment(
            amount,
            cardDetails
          );
          break;
        case "online":
          paymentResult = await this.processOnlineGatewayPayment(
            amount,
            paymentData
          );
          break;
        default:
          throw new Error("Unsupported payment method");
      }

      if (paymentResult.success) {
        // Record successful payment
        const payment = await CustomerPayment.create({
          ...paymentData,
          status: "completed",
          referenceNumber: paymentResult.transactionId,
          collectedBy: "system", // System processed
        });

        // Update financial records
        await this.updateFinancialRecords(payment);

        return {
          success: true,
          paymentId: payment.id,
          transactionId: paymentResult.transactionId,
          message: "Payment processed successfully",
        };
      } else {
        throw new Error(paymentResult.error);
      }
    } catch (error) {
      console.error("Online payment processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async processCreditCardPayment(amount, cardDetails) {
    // Integration with credit card processor
    // This is a mock implementation - replace with actual payment gateway
    const mockResponse = {
      success: true,
      transactionId: `CC${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      amount: amount,
      timestamp: new Date(),
    };

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return mockResponse;
  }

  async processOnlineGatewayPayment(amount, paymentData) {
    // Integration with online payment gateway (PayPal, Stripe, etc.)
    const mockResponse = {
      success: true,
      transactionId: `PG${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      amount: amount,
      gateway: "stripe",
      timestamp: new Date(),
    };

    await new Promise((resolve) => setTimeout(resolve, 1500));

    return mockResponse;
  }

  // Wire Transfer Processing
  async processWireTransfer(paymentData) {
    try {
      const { amount, vendorId, billId, bankAccountId, wireDetails } =
        paymentData;

      // Validate bank account
      const bankAccount = await BankAccount.findByPk(bankAccountId);
      if (!bankAccount) {
        throw new Error("Bank account not found");
      }

      // Check sufficient funds
      if (parseFloat(bankAccount.currentBalance) < amount) {
        throw new Error("Insufficient funds in bank account");
      }

      // Process wire transfer (mock implementation)
      const wireResult = await this.executeWireTransfer(amount, wireDetails);

      if (wireResult.success) {
        // Record vendor payment
        const payment = await VendorPayment.create({
          ...paymentData,
          status: "completed",
          referenceNumber: wireResult.reference,
          processedBy: "system",
        });

        // Update bank account balance
        await this.updateBankAccountBalance(bankAccountId, -amount);

        // Update financial records
        await this.updateFinancialRecords(payment);

        return {
          success: true,
          paymentId: payment.id,
          reference: wireResult.reference,
          message: "Wire transfer processed successfully",
        };
      } else {
        throw new Error(wireResult.error);
      }
    } catch (error) {
      console.error("Wire transfer processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeWireTransfer(amount, wireDetails) {
    // Mock wire transfer execution
    // In production, integrate with bank API or service like Western Union
    const mockResponse = {
      success: true,
      reference: `WT${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      timestamp: new Date(),
      fees: this.calculateWireTransferFees(amount),
    };

    // Simulate bank processing delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return mockResponse;
  }

  calculateWireTransferFees(amount) {
    // Simple fee calculation - can be customized
    if (amount <= 1000) return 25;
    if (amount <= 5000) return 35;
    if (amount <= 10000) return 50;
    return 75;
  }

  // Bulk Payment Processing
  async processBulkPayments(payments) {
    try {
      const results = [];

      for (const payment of payments) {
        try {
          let result;

          if (payment.paymentType === "customer") {
            result = await this.processOnlinePayment(payment);
          } else if (payment.paymentType === "vendor") {
            result = await this.processWireTransfer(payment);
          }

          results.push({
            paymentId: payment.id,
            success: result.success,
            transactionId: result.transactionId,
            message: result.message,
          });
        } catch (error) {
          results.push({
            paymentId: payment.id,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      console.error("Bulk payment processing error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Payment Reconciliation
  async reconcilePayments(startDate, endDate) {
    try {
      const payments = await CustomerPayment.findAll({
        where: {
          paymentDate: { [Op.between]: [startDate, endDate] },
          status: "completed",
        },
        include: ["invoice", "customer"],
      });

      const reconciliation = {
        period: { startDate, endDate },
        totalPayments: payments.length,
        totalAmount: payments.reduce(
          (sum, payment) => sum + parseFloat(payment.amount),
          0
        ),
        byPaymentMethod: this.groupByPaymentMethod(payments),
        discrepancies: await this.findPaymentDiscrepancies(payments),
      };

      return reconciliation;
    } catch (error) {
      console.error("Payment reconciliation error:", error);
      throw error;
    }
  }

  groupByPaymentMethod(payments) {
    return payments.reduce((groups, payment) => {
      const method = payment.paymentMethod;
      if (!groups[method]) {
        groups[method] = {
          count: 0,
          amount: 0,
        };
      }
      groups[method].count++;
      groups[method].amount += parseFloat(payment.amount);
      return groups;
    }, {});
  }

  async findPaymentDiscrepancies(payments) {
    const discrepancies = [];

    for (const payment of payments) {
      // Check if payment matches invoice amount
      if (
        payment.invoice &&
        parseFloat(payment.amount) !== parseFloat(payment.invoice.balanceDue)
      ) {
        discrepancies.push({
          paymentId: payment.id,
          type: "amount_mismatch",
          expected: payment.invoice.balanceDue,
          actual: payment.amount,
          difference:
            parseFloat(payment.amount) - parseFloat(payment.invoice.balanceDue),
        });
      }

      // Check for duplicate payments
      const duplicatePayments = await CustomerPayment.findAll({
        where: {
          invoiceId: payment.invoiceId,
          id: { [Op.ne]: payment.id },
          paymentDate: payment.paymentDate,
        },
      });

      if (duplicatePayments.length > 0) {
        discrepancies.push({
          paymentId: payment.id,
          type: "possible_duplicate",
          duplicates: duplicatePayments.map((dp) => dp.id),
        });
      }
    }

    return discrepancies;
  }

  // Helper Methods
  async updateFinancialRecords(payment) {
    // Update relevant financial transactions
    const transaction = await FinancialTransaction.findOne({
      where: { invoiceId: payment.invoiceId },
    });

    if (transaction) {
      await transaction.update({
        status: "completed",
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
      });
    }
  }

  async updateBankAccountBalance(accountId, amount) {
    const account = await BankAccount.findByPk(accountId);
    if (account) {
      const newBalance =
        parseFloat(account.currentBalance) + parseFloat(amount);
      await account.update({ currentBalance: newBalance });
    }
  }
}

module.exports = new PaymentService();
