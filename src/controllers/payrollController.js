const {
  EmployeeProfile,
  PayrollComponent,
  StatutoryDeduction,
  EmployeeShift,
  Attendance,
  Leave,
  FinancialTransaction,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class PayrollController {
  // ========== PAYROLL PROCESSING ==========
  async processPayroll(req, res) {
    try {
      const { payrollPeriod, department, paygroup } = req.body;

      // Get eligible employees
      const employees = await this.getEligibleEmployees(department, paygroup);

      const payrollResults = [];
      const errors = [];

      for (const employee of employees) {
        try {
          const payrollData = await this.calculateEmployeePayroll(
            employee.id,
            payrollPeriod
          );
          payrollResults.push(payrollData);
        } catch (error) {
          errors.push({
            employeeId: employee.id,
            employeeName: `${employee.personalInfo.firstName} 
  ${employee.personalInfo.lastName}`,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        message: `Payroll processed for ${payrollResults.length} employees`,
        data: {
          payrollResults,
          errors,
          summary: this.generatePayrollSummary(payrollResults),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error processing payroll",
        error: error.message,
      });
    }
  }

  async calculateEmployeePayroll(employeeId, payrollPeriod) {
    const employee = await EmployeeProfile.findByPk(employeeId, {
      include: [
        {
          model: StatutoryDeduction,
          as: "statutoryInfo",
        },
        {
          model: EmployeeShift,
          as: "shifts",
          where: { isActive: true },
          include: [{ model: ShiftManagement, as: "shift" }],
        },
      ],
    });
    if (!employee) {
      throw new Error("Employee not found");
    }
    // Calculate basic salary
    const basicSalary = this.calculateBasicSalary(employee);
    // Calculate attendance-based adjustments
    const attendanceData = await this.getAttendanceData(
      employeeId,
      payrollPeriod
    );
    const attendanceAdjustments = this.calculateAttendanceAdjustments(
      attendanceData,
      basicSalary
    );
    // Calculate overtime
    const overtime = await this.calculateOvertime(
      employeeId,
      payrollPeriod,
      employee.shifts[0]?.shift
    );
    // Calculate allowances
    const allowances = await this.calculateAllowances(employeeId, basicSalary);
    // Calculate deductions
    const deductions = await this.calculateDeductions(
      employeeId,
      basicSalary,
      employee.statutoryInfo
    );
    // Calculate statutory contributions
    const statutory = this.calculateStatutoryContributions(
      basicSalary,
      employee.statutoryInfo
    );
    // Calculate net salary
    const grossSalary =
      basicSalary +
      allowances.total +
      overtime.total +
      attendanceAdjustments.totalEarnings;
    const totalDeductions =
      deductions.total +
      statutory.total +
      attendanceAdjustments.totalDeductions;
    const netSalary = grossSalary - totalDeductions;
    return {
      employeeId: employee.id,
      employeeName: `${employee.personalInfo.firstName} 
  ${employee.personalInfo.lastName}`,
      employeeId: employee.employeeId,
      payrollPeriod,
      breakdown: {
        basicSalary,
        allowances,
        overtime,
        attendanceAdjustments,
        deductions,
        statutory,
      },
      summary: {
        grossSalary,
        totalDeductions,
        netSalary,
      },
      paymentDetails: {
        bankAccount: employee.bankInfo,
        paymentMethod: "bank_transfer",
      },
    };
  }

  // ========== STATUTORY CALCULATIONS (Sri Lanka Specific) ==========
  calculateStatutoryContributions(basicSalary, statutoryInfo) {
    if (!statutoryInfo) {
      return { epf: 0, etf: 0, paye: 0, total: 0 };
    }

    const epfEmployee = (basicSalary * statutoryInfo.epfRate) / 100;
    const epfEmployer = (basicSalary * statutoryInfo.employerEpfRate) / 100;
    const etfEmployer = (basicSalary * statutoryInfo.etfRate) / 100;

    // PAYE calculation (simplified)
    const paye = this.calculatePAYE(basicSalary, statutoryInfo.payeRate);

    return {
      epfEmployee,
      epfEmployer,
      etfEmployer,
      paye,
      total: epfEmployee + paye,
    };
  }

  calculatePAYE(basicSalary, payeRate) {
    // Simplified PAYE calculation for Sri Lanka
    // In production, implement proper tax slabs and calculations
    const annualSalary = basicSalary * 12;
    let tax = 0;

    if (annualSalary <= 500000) {
      tax = 0;
    } else if (annualSalary <= 1000000) {
      tax = (annualSalary - 500000) * 0.06;
    } else {
      tax = 30000 + (annualSalary - 1000000) * 0.12;
    }

    return tax / 12; // Monthly tax
  }

  // ========== ATTENDANCE & OVERTIME CALCULATIONS ==========
  async getAttendanceData(employeeId, payrollPeriod) {
    const [startDate, endDate] = this.getPayrollPeriodDates(payrollPeriod);

    const attendance = await Attendance.findAll({
      where: {
        employeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
    });

    const leaves = await Leave.findAll({
      where: {
        employeeId,
        status: "approved",
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] },
          },
          {
            endDate: { [Op.between]: [startDate, endDate] },
          },
        ],
      },
    });

    return { attendance, leaves };
  }

  calculateAttendanceAdjustments(attendanceData, basicSalary) {
    const workingDays = 22; // Assuming 22 working days per month
    const perDaySalary = basicSalary / workingDays;

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let lateMinutes = 0;

    attendanceData.attendance.forEach((record) => {
      if (record.status === "present") {
        presentDays++;
        lateMinutes += record.lateMinutes || 0;
      } else if (record.status === "absent") {
        absentDays++;
      } else if (record.status === "leave") {
        leaveDays++;
      }
    });

    // Calculate adjustments
    const absentDeductions = absentDays * perDaySalary;
    const lateDeductions = (lateMinutes / 60) * (perDaySalary / 8); // Assuming 8-hour day
    const unpaidLeaves = this.calculateUnpaidLeaves(
      attendanceData.leaves,
      perDaySalary
    );

    return {
      presentDays,
      absentDays,
      leaveDays,
      lateMinutes,
      absentDeductions,
      lateDeductions,
      unpaidLeaves,
      totalEarnings: 0, // Could include attendance bonuses
      totalDeductions: absentDeductions + lateDeductions + unpaidLeaves,
    };
  }

  calculateUnpaidLeaves(leaves, perDaySalary) {
    let unpaidDays = 0;

    leaves.forEach((leave) => {
      if (
        ["casual", "sick"].includes(leave.leaveType) &&
        leave.totalDays > leave.entitledDays
      ) {
        unpaidDays += leave.totalDays - leave.entitledDays;
      }
    });

    return unpaidDays * perDaySalary;
  }

  async calculateOvertime(employeeId, payrollPeriod, shift) {
    if (!shift) {
      return { regular: 0, holiday: 0, night: 0, total: 0 };
    }

    const [startDate, endDate] = this.getPayrollPeriodDates(payrollPeriod);

    const attendance = await Attendance.findAll({
      where: {
        employeeId,
        date: {
          [Op.between]: [startDate, endDate],
        },
        overtimeMinutes: {
          [Op.gt]: 0,
        },
      },
    });

    const hourlyRate = await this.getHourlyRate(employeeId);
    let totalOvertime = 0;

    attendance.forEach((record) => {
      const overtimeHours = record.overtimeMinutes / 60;
      let overtimeRate = hourlyRate;

      // Apply overtime multipliers
      if (this.isHoliday(record.date)) {
        overtimeRate *= 2; // Double rate for holidays
      } else if (this.isNightShift(record.date, shift)) {
        overtimeRate *= 1.5; // 1.5x for night shifts
      }

      totalOvertime += overtimeHours * overtimeRate;
    });

    return {
      regular: totalOvertime,
      holiday: 0, // Would need separate calculation
      night: 0, // Would need separate calculation
      total: totalOvertime,
    };
  }

  // ========== PAYSLIP GENERATION ==========
  async generatePayslip(req, res) {
    try {
      const { employeeId, payrollPeriod } = req.params;

      const payrollData = await this.calculateEmployeePayroll(
        employeeId,
        payrollPeriod
      );

      const payslip = {
        company: {
          name: "Your Company Name",
          address: "Company Address",
          logo: "https://your-company.com/logo.png",
        },
        employee: {
          id: payrollData.employeeId,
          name: payrollData.employeeName,
          designation: payrollData.employee.employmentInfo.designation,
          department: payrollData.employee.employmentInfo.department,
        },
        payrollPeriod,
        earnings: {
          basic: payrollData.breakdown.basicSalary,
          allowances: payrollData.breakdown.allowances.total,
          overtime: payrollData.breakdown.overtime.total,
          totalEarnings: payrollData.summary.grossSalary,
        },
        deductions: {
          epf: payrollData.breakdown.statutory.epfEmployee,
          etf: payrollData.breakdown.statutory.etfEmployer,
          paye: payrollData.breakdown.statutory.paye,
          other: payrollData.breakdown.deductions.total,
          totalDeductions: payrollData.summary.totalDeductions,
        },
        netSalary: payrollData.summary.netSalary,
        paymentDetails: payrollData.paymentDetails,
        generatedOn: new Date(),
      };

      res.json({
        success: true,
        data: payslip,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating payslip",
        error: error.message,
      });
    }
  }

  async generateBankTransferFile(req, res) {
    try {
      const { payrollPeriod, bankAccountId } = req.body;

      // Get all processed payroll for the period
      const payrollData = await this.getProcessedPayroll(payrollPeriod);

      // Generate bank transfer file (CSV format)
      const bankFile = this.formatBankTransferFile(payrollData, bankAccountId);

      res.json({
        success: true,
        data: {
          fileName: `salary_payment_${payrollPeriod}.csv`,
          fileContent: bankFile,
          totalAmount: payrollData.reduce(
            (sum, item) => sum + item.summary.netSalary,
            0
          ),
          totalEmployees: payrollData.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error generating bank transfer file",
        error: error.message,
      });
    }
  }

  // ========== HELPER METHODS ==========
  async getEligibleEmployees(department, paygroup) {
    const whereCondition = { isActive: true, employmentStatus: "active" };

    if (department) {
      whereCondition["$employmentInfo.department$"] = department;
    }

    if (paygroup) {
      whereCondition["$employmentInfo.paygroup$"] = paygroup;
    }

    return await EmployeeProfile.findAll({
      where: whereCondition,
      attributes: ["id", "employeeId", "personalInfo", "employmentInfo"],
    });
  }

  calculateBasicSalary(employee) {
    // Implementation depends on your salary structure
    return employee.employmentInfo?.basicSalary || 0;
  }

  async calculateAllowances(employeeId, basicSalary) {
    // Calculate various allowances (housing, transport, medical, etc.)
    const allowances = {
      housing: basicSalary * 0.25, // 25% of basic
      transport: 5000, // Fixed amount
      medical: 3000, // Fixed amount
      total: 0,
    };

    allowances.total = Object.values(allowances).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return allowances;
  }

  async calculateDeductions(employeeId, basicSalary, statutoryInfo) {
    // Calculate other deductions (loans, advances, insurance, etc.)
    const deductions = {
      loan: 0, // Would query loan records
      advance: 0, // Would query advance records
      insurance: 1000, // Fixed insurance premium
      total: 0,
    };
    deductions.total = Object.values(deductions).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return deductions;
  }
  async getHourlyRate(employeeId) {
    const employee = await EmployeeProfile.findByPk(employeeId);
    const monthlySalary = employee.employmentInfo?.basicSalary || 0;
    return monthlySalary / (22 * 8); // 22 working days, 8 hours per day
  }
  getPayrollPeriodDates(payrollPeriod) {
    // Parse payroll period (e.g., "2024-03")
    const [year, month] = payrollPeriod.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return [startDate, endDate];
  }
  isHoliday(date) {
    // Check if date is a holiday (would query holiday calendar)
    return false;
  }
  isNightShift(date, shift) {
    return shift.isNightShift;
  }
  generatePayrollSummary(payrollResults) {
    const totalGross = payrollResults.reduce(
      (sum, item) => sum + item.summary.grossSalary,
      0
    );
    const totalNet = payrollResults.reduce(
      (sum, item) => sum + item.summary.netSalary,
      0
    );
    const totalDeductions = payrollResults.reduce(
      (sum, item) => sum + item.summary.totalDeductions,
      0
    );
    return {
      totalEmployees: payrollResults.length,
      totalGrossSalary: totalGross,
      totalNetSalary: totalNet,
      totalDeductions: totalDeductions,
      averageSalary: totalNet / payrollResults.length,
    };
  }
  formatBankTransferFile(payrollData, bankAccountId) {
    // Generate CSV format for bank transfer
    let csv = "Employee ID,Account Number,Account Name,Amount,Reference\n";
    payrollData.forEach((employee) => {
      csv += `${employee.employeeId},${employee.paymentDetails.bankAccount.accountNumber},${employee.employeeName},${employee.summary.netSalary},SALARY${employee.payrollPeriod}\n`;
    });
    return csv;
  }
}
module.exports = new PayrollController();
