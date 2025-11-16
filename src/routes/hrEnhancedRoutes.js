const express = require("express");
const router = express.Router();
const coreHRController = require("../controllers/coreHRController");
const recruitmentController = require("../controllers/recruitmentController");
const payrollController = require("../controllers/payrollController");
const performanceController = require("../controllers/performanceController");
const trainingController = require("../controllers/trainingController");
const engagementController = require("../controllers/engagementController");
const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");
router.use(authMiddleware);
// ========== CORE HR ROUTES ==========
router.post(
  "/employees",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.createEmployee
);
router.get("/employees", coreHRController.getEmployees);
router.get("/employees/:id", coreHRController.getEmployeeDetails);
router.put(
  "/employees/:id",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.updateEmployee
);
router.post(
  "/employees/:id/documents",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.uploadEmployeeDocument
);
router.get("/employees/:id/documents", coreHRController.getEmployeeDocuments);
// Organization Structure
router.get("/organization/chart", coreHRController.getOrganizationChart);
router.get("/organization/departments", coreHRController.getDepartments);
router.post(
  "/organization/departments",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.createDepartment
);
// Shift Management
router.post(
  "/shifts",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.createShift
);
router.get("/shifts", coreHRController.getShifts);
router.post(
  "/employees/:id/shift",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.assignShiftToEmployee
);
// ========== RECRUITMENT ROUTES ==========
router.post(
  "/recruitment/jobs",
  roleMiddleware(["admin", "hr_staff"]),
  recruitmentController.createJobOpening
);
router.get("/recruitment/jobs", recruitmentController.getJobOpenings);
router.get("/recruitment/jobs/:id", recruitmentController.getJobOpeningDetails);
router.put(
  "/recruitment/jobs/:id",
  roleMiddleware(["admin", "hr_staff"]),
  recruitmentController.updateJobOpening
);
// Applications
router.post(
  "/recruitment/applications",
  recruitmentController.submitApplication
);
router.get("/recruitment/applications", recruitmentController.getApplications);
router.put(
  "/recruitment/applications/:id/status",
  roleMiddleware(["admin", "hr_staff"]),
  recruitmentController.updateApplicationStatus
);
router.post(
  "/recruitment/interviews/schedule",
  roleMiddleware(["admin", "hr_staff"]),
  recruitmentController.scheduleInterview
);
// Analytics
router.get(
  "/recruitment/analytics",
  roleMiddleware(["admin", "hr_staff"]),
  recruitmentController.getRecruitmentAnalytics
);
// ========== PAYROLL ROUTES ==========
router.post(
  "/payroll/process",
  roleMiddleware(["admin", "finance_staff"]),
  payrollController.processPayroll
);
router.get(
  "/payroll/payslip/:employeeId/:payrollPeriod",
  payrollController.generatePayslip
);
router.post(
  "/payroll/bank-file",
  roleMiddleware(["admin", "finance_staff"]),
  payrollController.generateBankTransferFile
);
router.get("/payroll/history/:employeeId", payrollController.getPayrollHistory);
// Statutory Management
router.post(
  "/payroll/statutory",
  roleMiddleware(["admin", "finance_staff"]),
  payrollController.updateStatutoryInfo
);
router.get(
  "/payroll/statutory/:employeeId",
  payrollController.getStatutoryInfo
);
// ========== PERFORMANCE MANAGEMENT ROUTES ==========
router.post("/performance/goals", performanceController.createGoal);
router.get(
  "/performance/goals/:employeeId",
  performanceController.getEmployeeGoals
);
router.put("/performance/goals/:id", performanceController.updateGoalProgress);
// Performance Reviews
router.post(
  "/performance/reviews",
  roleMiddleware(["admin", "hr_staff"]),
  performanceController.createPerformanceReview
);
router.get(
  "/performance/reviews/:employeeId",
  performanceController.getEmployeeReviews
);
router.post(
  "/performance/reviews/:id/acknowledge",
  performanceController.acknowledgeReview
);
// 360 Feedback
router.post("/performance/feedback", performanceController.submitFeedback);
router.get(
  "/performance/feedback/:employeeId",
  performanceController.getEmployeeFeedback
);
// ========== TRAINING & DEVELOPMENT ROUTES ==========
router.post(
  "/training/programs",
  roleMiddleware(["admin", "hr_staff"]),
  trainingController.createTrainingProgram
);
router.get("/training/programs", trainingController.getTrainingPrograms);
router.post(
  "/training/schedules",
  roleMiddleware(["admin", "hr_staff"]),
  trainingController.scheduleTraining
);
// Training Enrollment
router.post("/training/enroll", trainingController.enrollInTraining);
router.get(
  "/training/enrollments/:employeeId",
  trainingController.getEmployeeEnrollments
);
router.post(
  "/training/attendance",
  roleMiddleware(["admin", "hr_staff"]),
  trainingController.markTrainingAttendance
);
// ========== EMPLOYEE ENGAGEMENT ROUTES ==========
router.post(
  "/engagement/surveys",
  roleMiddleware(["admin", "hr_staff"]),
  engagementController.createSurvey
);
router.get("/engagement/surveys", engagementController.getSurveys);
router.post(
  "/engagement/surveys/:id/responses",
  engagementController.submitSurveyResponse
);
// Recognition & Rewards
router.post("/engagement/recognition", engagementController.giveRecognition);
router.get(
  "/engagement/recognition/:employeeId",
  engagementController.getEmployeeRecognition
);
// ========== SELF-SERVICE ROUTES ==========
// Employee Self-Service
router.get("/self-service/profile", coreHRController.getMyProfile);
router.put("/self-service/profile", coreHRController.updateMyProfile);
router.get("/self-service/payslips", payrollController.getMyPayslips);
router.get("/self-service/attendance", coreHRController.getMyAttendance);
router.post("/self-service/leave", coreHRController.applyForLeave);
// Manager Self-Service
router.get("/manager/team", coreHRController.getMyTeam);
router.get("/manager/approvals", coreHRController.getPendingApprovals);
router.post("/manager/approvals/:id/approve", coreHRController.approveRequest);
// ========== ANALYTICS & DASHBOARD ROUTES ==========
router.get(
  "/analytics/dashboard",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.getHRAnalytics
);
router.get(
  "/analytics/attrition",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.getAttritionAnalysis
);
router.get(
  "/analytics/workforce",
  roleMiddleware(["admin", "hr_staff"]),
  coreHRController.getWorkforceAnalytics
);
module.exports = router;
