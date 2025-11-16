const {
  Teacher,
  Attendance,
  Leave,
  User,
  Teacher,
  Attendance,
  Leave,
  User,
  SalaryStructure,
  Payroll,
  Recruitment,
  JobApplication,
  PerformanceReview,
  Training,
  TrainingParticipant,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");



class HRController {
  // Create new employee (teacher)
  async createEmployee(req, res) {
    try {
      const teacherData = req.body;
      // Generate employee ID
      const employeeCount = await Teacher.count();
      teacherData.employeeId = `EMP${(employeeCount + 1)
        .toString()
        .padStart(4, "0")}`;

      const teacher = await Teacher.create(teacherData);

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: teacher,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating employee",
        error: error.message,
      });
    }
  }

  // Get all employees with pagination and search
  async getAllEmployees(req, res) {
    try {
      const { page = 1, limit = 10, search = "", department = "" } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (search) {
        whereCondition[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { employeeId: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (department) {
        whereCondition.department = department;
      }

      const { count, rows: teachers } = await Teacher.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["email", "role", "isActive", "lastLogin"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: teachers,
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
        message: "Error fetching employees",
        error: error.message,
      });
    }
  }

  // Get employee by ID
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;

      const teacher = await Teacher.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["email", "role", "isActive", "lastLogin"],
          },
        ],
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      res.json({
        success: true,
        data: teacher,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching employee",
        error: error.message,
      });
    }
  }

  // Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const teacher = await Teacher.findByPk(id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      await teacher.update(updateData);

      res.json({
        success: true,
        message: "Employee updated successfully",
        data: teacher,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating employee",
        error: error.message,
      });
    }
  }

  // Mark attendance
  async markAttendance(req, res) {
    try {
      const { teacherId, date, checkIn, checkOut, status, notes } = req.body;

      let attendance = await Attendance.findOne({
        where: { teacherId, date },
      });

      if (attendance) {
        // Update existing attendance
        await attendance.update({
          checkIn: checkIn || attendance.checkIn,
          checkOut: checkOut || attendance.checkOut,
          status: status || attendance.status,
          notes: notes || attendance.notes,
        });
      } else {
        // Create new attendance record
        attendance = await Attendance.create({
          teacherId,
          date,
          checkIn,
          checkOut,
          status: status || "present",
          notes,
        });
      }

      // Calculate total hours if both check-in and check-out are provided
      if (checkIn && checkOut) {
        const diffMs = new Date(checkOut) - new Date(checkIn);
        attendance.totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        await attendance.save();
      }

      res.json({
        success: true,
        message: "Attendance marked successfully",
        data: attendance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error marking attendance",
        error: error.message,
      });
    }
  }

  // Apply for leave
  async applyLeave(req, res) {
    try {
      const leaveData = req.body;

      // Calculate total days
      const startDate = new Date(leaveData.startDate);
      const endDate = new Date(leaveData.endDate);
      const totalDays =
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      leaveData.totalDays = totalDays;

      const leave = await Leave.create(leaveData);

      res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error applying for leave",
        error: error.message,
      });
    }
  }

  async getLeaveApplications(req, res) {
    try {
      const { page = 1, limit = 10, status, employeeId, leaveType } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (employeeId) whereCondition.teacherId = employeeId;
      if (leaveType) whereCondition.leaveType = leaveType;

      const { count, rows: leaves } = await Leave.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Teacher,
            as: "teacher",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "employeeId",
              "department",
            ],
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
        data: leaves,
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
        message: "Error fetching leave applications",
        error: error.message,
      });
    }
  }

  async updateLeaveStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      const leave = await Leave.findByPk(id);
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      const updateData = {
        status,
        approvedBy: req.user.id,
        approvedAt: new Date(),
      };

      if (status === "rejected" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      await leave.update(updateData);

      res.json({
        success: true,
        message: `Leave application ${status} successfully`,
        data: leave,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating leave status",
        error: error.message,
      });
    }
  }

  async getLeaveBalance(req, res) {
    try {
      const { employeeId } = req.params;
      const currentYear = new Date().getFullYear();

      const leaves = await Leave.findAll({
        where: {
          teacherId: employeeId,
          status: "approved",
          [Op.or]: [
            {
              startDate: {
                [Op.between]: [
                  new Date(currentYear, 0, 1),
                  new Date(currentYear, 11, 31),
                ],
              },
            },
            {
              endDate: {
                [Op.between]: [
                  new Date(currentYear, 0, 1),
                  new Date(currentYear, 11, 31),
                ],
              },
            },
          ],
        },
      });

      const balance = {
        casual:
          12 -
          leaves
            .filter((l) => l.leaveType === "casual")
            .reduce((sum, l) => sum + l.totalDays, 0),
        sick:
          10 -
          leaves
            .filter((l) => l.leaveType === "sick")
            .reduce((sum, l) => sum + l.totalDays, 0),
        annual:
          21 -
          leaves
            .filter((l) => l.leaveType === "annual")
            .reduce((sum, l) => sum + l.totalDays, 0),
        maternity:
          84 -
          leaves
            .filter((l) => l.leaveType === "maternity")
            .reduce((sum, l) => sum + l.totalDays, 0),
        paternity:
          7 -
          leaves
            .filter((l) => l.leaveType === "paternity")
            .reduce((sum, l) => sum + l.totalDays, 0),
      };

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error calculating leave balance",
        error: error.message,
      });
    }
  }

  // ========== RECRUITMENT MANAGEMENT ==========
  async createJobOpening(req, res) {
    try {
      const jobData = req.body;
      jobData.createdBy = req.user.id;

      const job = await Recruitment.create(jobData);

      res.status(201).json({
        success: true,
        message: "Job opening created successfully",
        data: job,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating job opening",
        error: error.message,
      });
    }
  }

  async getJobOpenings(req, res) {
    try {
      const { page = 1, limit = 10, status, department } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (department) whereCondition.department = department;

      const { count, rows: jobs } = await Recruitment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["email"],
          },
          {
            model: JobApplication,
            as: "applications",
            attributes: ["id", "status"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: jobs,
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
        message: "Error fetching job openings",
        error: error.message,
      });
    }
  }

  async applyForJob(req, res) {
    try {
      const applicationData = req.body;
      applicationData.applicationDate = new Date();

      const application = await JobApplication.create(applicationData);

      res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: application,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error submitting application",
        error: error.message,
      });
    }
  }

  async getJobApplications(req, res) {
    try {
      const { page = 1, limit = 10, status, recruitmentId } = req.query;
      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (recruitmentId) whereCondition.recruitmentId = recruitmentId;

      const { count, rows: applications } =
        await JobApplication.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: Recruitment,
              as: "job",
              attributes: ["id", "jobTitle", "department"],
            },
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["applicationDate", "DESC"]],
        });

      res.json({
        success: true,
        data: applications,
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
        message: "Error fetching job applications",
        error: error.message,
      });
    }
  }

  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, interviewDate, interviewNotes, rating } = req.body;

      const application = await JobApplication.findByPk(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      await application.update({
        status,
        interviewDate,
        interviewNotes,
        rating,
      });

      res.json({
        success: true,
        message: "Application status updated successfully",
        data: application,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating application status",
        error: error.message,
      });
    }
  }

  // ========== PERFORMANCE MANAGEMENT ========== 
  async createPerformanceReview(req, res) { 
    try { 
      const reviewData = req.body; 
      reviewData.reviewerId = req.user.id; 
 
      // Calculate overall rating 
      const { technicalSkills, communication, teamwork, productivity, attendance } = 
reviewData; 
      reviewData.overallRating = ( 
        technicalSkills + communication + teamwork + productivity + attendance 
      ) / 5; 
 
      const review = await PerformanceReview.create(reviewData); 
 
      res.status(201).json({ 
        success: true, 
        message: 'Performance review created successfully', 
        data: review 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error creating performance review', 
        error: error.message 
      }); 
    } 
  } 
 
  async getPerformanceReviews(req, res) { 
    try { 
      const { page = 1, limit = 10, employeeId, reviewPeriod } = req.query; 
      const offset = (page - 1) * limit; 
 
      const whereCondition = {}; 
      if (employeeId) whereCondition.employeeId = employeeId; 
      if (reviewPeriod) whereCondition.reviewPeriod = reviewPeriod; 
 
      const { count, rows: reviews } = await PerformanceReview.findAndCountAll({ 
        where: whereCondition, 
        include: [{ 
          model: Teacher, 
          as: 'employee', 
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'department'] 
        }, { 
          model: User, 
          as: 'reviewer', 
          attributes: ['email'] 
        }], 
        limit: parseInt(limit), 
        offset: parseInt(offset), 
        order: [['reviewDate', 'DESC']] 
      }); 
 
      res.json({ 
        success: true, 
        data: reviews, 
        pagination: { 
          currentPage: parseInt(page), 
          totalPages: Math.ceil(count / limit), 
          totalItems: count, 
          itemsPerPage: parseInt(limit) 
        } 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching performance reviews', 
        error: error.message 
      }); 
    } 
  } 
 
  async acknowledgeReview(req, res) { 
    try { 
      const { id } = req.params; 
      const { employeeComments } = req.body; 
 
      const review = await PerformanceReview.findByPk(id); 
      if (!review) { 
        return res.status(404).json({ 
          success: false, 
          message: 'Performance review not found' 
        }); 
      } 
 
      await review.update({ 
        status: 'acknowledged', 
        employeeComments 
      }); 
 
      res.json({ 
        success: true, 
        message: 'Performance review acknowledged', 
        data: review 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error acknowledging review', 
        error: error.message 
      }); 
    } 
  } 
 
  // ========== TRAINING MANAGEMENT ========== 
  async createTraining(req, res) { 
    try { 
      const trainingData = req.body; 
 
      const training = await Training.create(trainingData); 
 
      res.status(201).json({ 
        success: true, 
        message: 'Training created successfully', 
        data: training 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error creating training', 
        error: error.message 
      }); 
    } 
  } 
 
  async getTrainings(req, res) { 
    try { 
      const { page = 1, limit = 10, status, trainingType } = req.query; 
      const offset = (page - 1) * limit; 
 
      const whereCondition = {}; 
      if (status) whereCondition.status = status; 
      if (trainingType) whereCondition.trainingType = trainingType; 
 
      const { count, rows: trainings } = await Training.findAndCountAll({ 
        where: whereCondition, 
        include: [{ 
          model: TrainingParticipant, 
          as: 'participants', 
          include: [{ 
            model: Teacher, 
            as: 'employee', 
            attributes: ['firstName', 'lastName', 'employeeId'] 
          }] 
        }], 
        limit: parseInt(limit), 
        offset: parseInt(offset), 
        order: [['startDate', 'DESC']] 
      }); 
 
      res.json({ 
        success: true, 
        data: trainings, 
        pagination: { 
          currentPage: parseInt(page), 
          totalPages: Math.ceil(count / limit), 
          totalItems: count, 
          itemsPerPage: parseInt(limit) 
        } 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching trainings', 
        error: error.message 
      }); 
    } 
  } 
 
  async registerForTraining(req, res) { 
    try { 
      const { trainingId, employeeId } = req.body; 
 
      const existingRegistration = await TrainingParticipant.findOne({ 
        where: { trainingId, employeeId } 
      }); 
 
      if (existingRegistration) { 
        return res.status(400).json({ 
          success: false, 
          message: 'Employee already registered for this training' 
        }); 
      } 
 
      const registration = await TrainingParticipant.create({ 
        trainingId, 
        employeeId, 
        status: 'registered' 
      }); 
 
      res.status(201).json({ 
        success: true, 
        message: 'Registered for training successfully', 
        data: registration 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error registering for training', 
        error: error.message 
      }); 
    } 
  } 
 
  async updateTrainingAttendance(req, res) { 
    try { 
      const { id } = req.params; 
      const { status, postTrainingScore, feedback, certificateIssued } = req.body; 
 
      const participant = await TrainingParticipant.findByPk(id); 
      if (!participant) { 
        return res.status(404).json({ 
          success: false, 
          message: 'Training participant not found' 
        }); 
      } 
 
      await participant.update({ 
        status, 
        postTrainingScore, 
        feedback, 
        certificateIssued 
      }); 
 
      res.json({ 
        success: true, 
        message: 'Training attendance updated successfully', 
        data: participant 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error updating training attendance', 
        error: error.message 
      }); 
    } 
  } 
 
  // ========== SALARY & PAYROLL ========== 
  async createSalaryStructure(req, res) { 
    try { 
      const salaryData = req.body; 
       
      // Calculate net salary 
      const totalEarnings = salaryData.basicSalary +  
        salaryData.houseRentAllowance +  
        salaryData.travelAllowance +  
        salaryData.medicalAllowance +  
        salaryData.specialAllowance; 
       
      const totalDeductions = salaryData.providentFund +  
        salaryData.professionalTax +  
        salaryData.incomeTax +  
        salaryData.otherDeductions; 
       
      salaryData.netSalary = totalEarnings - totalDeductions; 
 
      const salaryStructure = await SalaryStructure.create(salaryData); 
       
      res.status(201).json({ 
        success: true, 
        message: 'Salary structure created successfully', 
        data: salaryStructure 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error creating salary structure', 
        error: error.message 
      }); 
    } 
  } 
 
  async generatePayroll(req, res) { 
    try { 
      const { month, year } = req.body; 
       
      const employees = await Teacher.findAll({ 
        where: { isActive: true }, 
        include: [{ 
          model: SalaryStructure, 
          as: 'salaryStructure', 
          where: { isActive: true } 
        }] 
      }); 
 
      const payrolls = []; 
 
      for (const employee of employees) { 
        // Calculate attendance-based adjustments 
        const attendanceRecords = await Attendance.findAll({ 
          where: { 
            teacherId: employee.id, 
            date: { 
              [Op.between]: [ 
                new Date(year, month - 1, 1), 
                new Date(year, month, 0) 
              ] 
            } 
          } 
        }); 
 
        const leaveRecords = await Leave.findAll({ 
          where: { 
            teacherId: employee.id, 
            status: 'approved', 
            [Op.or]: [ 
              { 
                startDate: { 
                  [Op.between]: [ 
                    new Date(year, month - 1, 1), 
                    new Date(year, month, 0) 
                  ] 
                } 
              }, 
              { 
                endDate: { 
                  [Op.between]: [ 
                    new Date(year, month - 1, 1), 
                    new Date(year, month, 0) 
                  ] 
                } 
              } 
            ] 
          } 
        }); 
 
        // Calculate adjustments 
        const overtimeHours = attendanceRecords.reduce((total, record) =>  
          total + (record.overtimeMinutes / 60), 0); 
         
        const lateMinutes = attendanceRecords.reduce((total, record) =>  
          total + record.lateMinutes, 0); 
         
        const unpaidLeaves = leaveRecords.filter(leave =>  
          leave.leaveType === 'casual' || leave.leaveType === 'sick').length; 
 
        const salary = employee.salaryStructure; 
        const overtimeRate = salary.basicSalary / (22 * 8); // Assuming 22 working days, 8 hours per day 
        const lateDeductionRate = salary.basicSalary / (22 * 8 * 60); // Per minute 
        const perDaySalary = salary.basicSalary / 22; 
 
        const payrollData = { 
          employeeId: employee.id, 
          salaryMonth: month.toString().padStart(2, '0'), 
          salaryYear: year, 
          basicSalary: salary.basicSalary, 
          allowances: { 
            houseRent: salary.houseRentAllowance, 
            travel: salary.travelAllowance, 
            medical: salary.medicalAllowance, 
            special: salary.specialAllowance 
          }, 
          deductions: { 
            providentFund: salary.providentFund, 
            professionalTax: salary.professionalTax, 
            incomeTax: salary.incomeTax, 
            other: salary.otherDeductions 
          }, 
          overtimeAmount: overtimeHours * overtimeRate, 
          lateDeductions: lateMinutes * lateDeductionRate, 
          leaveDeductions: unpaidLeaves * perDaySalary, 
          bonus: 0 // Can be configured 
        }; 
 
        // Calculate totals 
        const totalEarnings = payrollData.basicSalary +  
          Object.values(payrollData.allowances).reduce((a, b) => a + b, 0) + 
          payrollData.overtimeAmount + payrollData.bonus; 
         
        const totalDeductions = Object.values(payrollData.deductions).reduce((a, b) => a + b, 
0) + 
          payrollData.lateDeductions + payrollData.leaveDeductions; 
         
        payrollData.totalEarnings = totalEarnings; 
        payrollData.totalDeductions = totalDeductions; 
        payrollData.netSalary = totalEarnings - totalDeductions; 
 
        const payroll = await Payroll.create(payrollData); 
        payrolls.push(payroll); 
      } 
 
      res.json({ 
        success: true, 
        message: `Payroll generated for ${payrolls.length} employees`, 
        data: payrolls 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error generating payroll', 
        error: error.message 
      }); 
    } 
  } 
 
  async getPayrolls(req, res) { 
    try { 
      const { page = 1, limit = 10, month, year, employeeId } = req.query; 
      const offset = (page - 1) * limit; 
 
      const whereCondition = {}; 
      if (month) whereCondition.salaryMonth = month; 
      if (year) whereCondition.salaryYear = year; 
      if (employeeId) whereCondition.employeeId = employeeId; 
 
      const { count, rows: payrolls } = await Payroll.findAndCountAll({ 
        where: whereCondition, 
        include: [{ 
          model: Teacher, 
          as: 'employee', 
          attributes: ['id', 'firstName', 'lastName', 'employeeId', 'department'] 
        }], 
        limit: parseInt(limit), 
        offset: parseInt(offset), 
        order: [['salaryYear', 'DESC'], ['salaryMonth', 'DESC']] 
      }); 
 
      res.json({ 
        success: true, 
        data: payrolls, 
        pagination: { 
          currentPage: parseInt(page), 
          totalPages: Math.ceil(count / limit), 
          totalItems: count, 
          itemsPerPage: parseInt(limit) 
        } 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching payrolls', 
        error: error.message 
      }); 
    } 
  } 
 
  async processSalaryPayment(req, res) { 
    try { 
      const { payrollId, paymentMethod, paymentDate, transactionId } = req.body; 
 
      const payroll = await Payroll.findByPk(payrollId); 
      if (!payroll) { 
        return res.status(404).json({ 
          success: false, 
          message: 'Payroll record not found' 
        }); 
      } 
 
      await payroll.update({ 
        paymentStatus: 'paid', 
        paymentMethod, 
        paymentDate: paymentDate || new Date(), 
        transactionId 
      }); 
 
      res.json({ 
        success: true, 
        message: 'Salary payment processed successfully', 
        data: payroll 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error processing salary payment', 
        error: error.message 
      }); 
    } 
  } 
 
  async getSalarySlip(req, res) { 
    try { 
      const { payrollId } = req.params; 
 
      const payroll = await Payroll.findByPk(payrollId, { 
        include: [{ 
          model: Teacher, 
          as: 'employee', 
          include: [{ 
            model: User, 
            as: 'user', 
            attributes: ['email'] 
          }] 
        }] 
      }); 
 
      if (!payroll) { 
        return res.status(404).json({ 
          success: false, 
          message: 'Payroll record not found' 
        }); 
      } 
 
      res.json({ 
        success: true, 
        data: payroll 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching salary slip', 
        error: error.message 
      }); 
    } 
  }

    // ========== HR DASHBOARD & ANALYTICS ========== 
  async getHRDashboard(req, res) {
    try {
      const totalEmployees = await Teacher.count({ where: { isActive: true } });

      const today = new Date().toISOString().split("T")[0];
      const presentToday = await Attendance.count({
        where: {
          date: today,
          status: "present",
        },
      });

      const pendingLeaves = await Leave.count({
        where: { status: "pending" },
      });

      // Recent employees (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newHires = await Teacher.count({
        where: {
          joiningDate: {
            [Op.gte]: thirtyDaysAgo,
          },
        },
      });

      // Attendance summary for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const attendanceSummary = await Attendance.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          date: {
            [Op.like]: `${currentMonth}%`,
          },
        },
        group: ["status"],
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalEmployees,
            presentToday,
            pendingLeaves,
            newHires,
          },
          attendanceSummary,
          recentEmployees: await Teacher.findAll({
            limit: 5,
            order: [["createdAt", "DESC"]],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["email"],
              },
            ],
          }),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching HR dashboard",
        error: error.message,
      });
    }
  }

  // ========== REPORTS & ANALYTICS ========== 
  async getHRAnalytics(req, res) { 
    try { 
      const { period } = req.query; // monthly, quarterly, yearly 
 
      // Employee turnover rate 
      const totalEmployees = await Teacher.count(); 
      const terminatedEmployees = await Teacher.count({ 
        where: { isActive: false } 
      }); 
      const turnoverRate = totalEmployees > 0 ? (terminatedEmployees / totalEmployees) * 
100 : 0; 
 
      // Attendance rate 
      const currentMonth = new Date().toISOString().slice(0, 7); 
      const totalAttendance = await Attendance.count({ 
        where: { 
          date: { 
            [Op.like]: `${currentMonth}%` 
          } 
        } 
      }); 
      const presentAttendance = await Attendance.count({ 
        where: { 
          date: { 
            [Op.like]: `${currentMonth}%` 
          }, 
          status: 'present' 
        } 
      }); 
      const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 
100 : 0; 
 
      // Training effectiveness 
      const completedTrainings = await Training.count({ 
        where: { status: 'completed' } 
      }); 
      const trainingParticipants = await TrainingParticipant.count({ 
        where: { status: 'completed' } 
      }); 
 
      // Recruitment metrics 
      const totalApplications = await JobApplication.count(); 
      const hiredApplications = await JobApplication.count({ 
        where: { status: 'hired' } 
      }); 
      const hiringSuccessRate = totalApplications > 0 ? (hiredApplications / totalApplications) 
* 100 : 0; 
 
      res.json({ 
        success: true, 
        data: { 
          turnoverRate: turnoverRate.toFixed(2), 
          attendanceRate: attendanceRate.toFixed(2), 
          trainingEffectiveness: { 
            completedTrainings, 
            totalParticipants: trainingParticipants, 
            averageParticipants: completedTrainings > 0 ? (trainingParticipants / 
completedTrainings).toFixed(1) : 0 
          }, 
          recruitmentMetrics: { 
            totalApplications, 
            hiredCandidates: hiredApplications, 
            successRate: hiringSuccessRate.toFixed(2) 
          }, 
          departmentPerformance: await this.getDepartmentPerformance(), 
          employeeSatisfaction: await this.getEmployeeSatisfactionMetrics() 
        } 
      }); 
    } catch (error) { 
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching HR analytics', 
        error: error.message 
      }); 
    } 
  } 
 
  async getDepartmentPerformance() { 
    const departments = await Teacher.findAll({ 
      attributes: ['department'], 
      group: ['department'], 
      where: { isActive: true } 
    }); 
 
    const performance = []; 
     
    for (const dept of departments) { 
      const employees = await Teacher.count({ 
        where: { department: dept.department, isActive: true } 
      }); 
 
      const avgPerformance = await PerformanceReview.findOne({ 
        attributes: [ 
          [sequelize.fn('AVG', sequelize.col('overallRating')), 'avgRating'] 
        ], 
        include: [{ 
          model: Teacher, 
          as: 'employee', 
          where: { department: dept.department } 
        }], 
        raw: true 
      }); 
 
      performance.push({ 
        department: dept.department, 
        employeeCount: employees, 
        averageRating: avgPerformance ? parseFloat(avgPerformance.avgRating).toFixed(2) : 0 
      }); 
    } 
 
    return performance; 
  } 
 
  async getEmployeeSatisfactionMetrics() { 
    // This would typically come from employee surveys 
    // For now, we'll calculate based on performance reviews and attendance 
    const recentReviews = await PerformanceReview.findAll({ 
      where: { 
        reviewDate: { 
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) 
        } 
      }, 
      attributes: ['overallRating'] 
    }); 
 
    const avgRating = recentReviews.length > 0 ? 
      recentReviews.reduce((sum, review) => sum + parseFloat(review.overallRating), 0) / 
recentReviews.length : 0; 
 
    const attendanceRate = await Attendance.findOne({ 
      attributes: [ 
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'], 
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = \'present\' THEN 1 ELSE 0 END')), 'present'] 
      ], 
      where: { 
        date: { 
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) 
        } 
      }, 
      raw: true 
    }); 
 
    const calculatedSatisfaction = attendanceRate && attendanceRate.total > 0 ? 
      ((attendanceRate.present / attendanceRate.total) * 40 + (avgRating * 12)) : 0; 
 
    return { 
      overallSatisfaction: Math.min(100, calculatedSatisfaction).toFixed(1), 
      averageRating: avgRating.toFixed(2), 
      basedOn: 'performance_reviews_attendance' 
    }; 
  } 
}




module.exports = new HRController();
