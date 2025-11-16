const {
  JobOpening,
  JobApplication,
  EmployeeProfile,
  User,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class RecruitmentController {
  // ========== JOB OPENING MANAGEMENT ==========
  async createJobOpening(req, res) {
    try {
      const jobData = req.body;
      jobData.createdBy = req.user.id;
      // Generate job code
      const jobCount = await JobOpening.count();
      jobData.jobCode = `JOB${(jobCount + 1).toString().padStart(5, "0")}`;

      const job = await JobOpening.create(jobData);

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
      const {
        page = 1,
        limit = 10,
        status = "",
        department = "",
        employmentType = "",
      } = req.query;

      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (department) whereCondition.departmentId = department;
      if (employmentType) whereCondition.employmentType = employmentType;

      const { count, rows: jobs } = await JobOpening.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: OrganizationStructure,
            as: "department",
            attributes: ["id", "departmentName"],
          },
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

      // Enhance with application statistics
      const enhancedJobs = jobs.map((job) => ({
        ...job.toJSON(),
        stats: {
          totalApplications: job.applications.length,
          newApplications: job.applications.filter(
            (app) => app.status === "applied"
          ).length,
          inProcess: job.applications.filter((app) =>
            [
              "screening",
              "phone_interview",
              "technical_interview",
              "hr_interview",
            ].includes(app.status)
          ).length,
          hired: job.applications.filter((app) => app.status === "hired")
            .length,
        },
      }));

      res.json({
        success: true,
        data: enhancedJobs,
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

  // ========== APPLICATION MANAGEMENT ==========
  async submitApplication(req, res) {
    try {
      const applicationData = req.body;

      // Generate application ID
      const applicationCount = await JobApplication.count();
      applicationData.applicationId = `APP${(applicationCount + 1)
        .toString()
        .padStart(6, "0")}`;

      const application = await JobApplication.create(applicationData);

      // Parse resume if provided
      if (applicationData.resumeUrl) {
        await this.parseResumeAndUpdateApplication(
          application.id,
          applicationData.resumeUrl
        );
      }

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

  async getApplications(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = "",
        jobOpeningId = "",
        stage = "",
      } = req.query;

      const offset = (page - 1) * limit;

      const whereCondition = {};
      if (status) whereCondition.status = status;
      if (jobOpeningId) whereCondition.jobOpeningId = jobOpeningId;
      if (stage) whereCondition.currentStage = stage;

      const { count, rows: applications } =
        await JobApplication.findAndCountAll({
          where: whereCondition,
          include: [
            {
              model: JobOpening,
              as: "job",
              attributes: ["id", "jobTitle", "departmentId"],
            },
            {
              model: User,
              as: "assignedToUser",
              attributes: ["email"],
              required: false,
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
        message: "Error fetching applications",
        error: error.message,
      });
    }
  }

  async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, currentStage, rating, notes, assignedTo } = req.body;

      const application = await JobApplication.findByPk(id);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (currentStage) updateData.currentStage = currentStage;
      if (rating !== undefined) updateData.rating = rating;
      if (notes) updateData.notes = notes;
      if (assignedTo) updateData.assignedTo = assignedTo;

      await application.update(updateData);

      // Trigger notifications based on status change
      await this.handleApplicationStatusChange(application, status);

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

  // ========== INTERVIEW MANAGEMENT ==========
  async scheduleInterview(req, res) {
    try {
      const {
        applicationId,
        interviewDate,
        interviewType,
        panelMembers,
        location,
        notes,
      } = req.body;

      const application = await JobApplication.findByPk(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      // Update application stage
      await application.update({
        currentStage: `${interviewType}_interview`,
        status: "in_process",
      });

      // Create interview record (you might have a separate Interview model)
      const interview = {
        applicationId,
        interviewDate,
        interviewType,
        panelMembers,
        location,
        notes,
        scheduledBy: req.user.id,
        status: "scheduled",
      };

      // Send calendar invites to panel members
      await this.sendInterviewInvites(interview);

      res.status(201).json({
        success: true,
        message: "Interview scheduled successfully",
        data: interview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error scheduling interview",
        error: error.message,
      });
    }
  }

  // ========== ANALYTICS & REPORTING ==========
  async getRecruitmentAnalytics(req, res) {
    try {
      const { period = "30d" } = req.query;

      const analytics = {
        overview: await this.getRecruitmentOverview(period),
        timeToHire: await this.calculateTimeToHire(),
        sourceEffectiveness: await this.analyzeSourceEffectiveness(),
        departmentWise: await this.getDepartmentWiseHiring(),
        pipeline: await this.getRecruitmentPipeline(),
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching recruitment analytics",
        error: error.message,
      });
    }
  }

  async getRecruitmentOverview(period) {
    const dateFilter = this.getDateFilter(period);

    const [
      totalApplications,
      newApplications,
      interviewsScheduled,
      offersMade,
      hires,
    ] = await Promise.all([
      JobApplication.count({
        where: {
          applicationDate: dateFilter,
        },
      }),
      JobApplication.count({
        where: {
          applicationDate: dateFilter,
          status: "applied",
        },
      }),
      JobApplication.count({
        where: {
          applicationDate: dateFilter,
          status: "in_process",
        },
      }),
      JobApplication.count({
        where: {
          applicationDate: dateFilter,
          status: "offer_sent",
        },
      }),
      JobApplication.count({
        where: {
          applicationDate: dateFilter,
          status: "hired",
        },
      }),
    ]);

    return {
      totalApplications,
      newApplications,
      interviewsScheduled,
      offersMade,
      hires,
      conversionRate:
        totalApplications > 0
          ? ((hires / totalApplications) * 100).toFixed(2)
          : 0,
    };
  }

  // ========== HELPER METHODS ==========
  async parseResumeAndUpdateApplication(applicationId, resumeUrl) {
    // Integration with resume parsing service (e.g., Affinda, Sovren)
    // This is a mock implementation
    console.log(`Parsing resume for application ${applicationId}`);

    // In production, you would:
    // 1. Download the resume file
    // 2. Send to resume parsing API
    // 3. Update application with parsed data
  }

  async handleApplicationStatusChange(application, newStatus) {
    // Handle notifications and workflow triggers based on status change
    switch (newStatus) {
      case "hired":
        await this.initiateOnboarding(application);
        break;
      case "rejected":
        await this.sendRejectionEmail(application);
        break;
      case "offer_sent":
        await this.sendOfferLetter(application);
        break;
    }
  }

  async sendInterviewInvites(interview) {
    // Integration with calendar service (Google Calendar, Outlook)
    console.log("Sending interview invites:", interview);
  }

  async initiateOnboarding(application) {
    // Create employee profile and onboarding checklist
    console.log("Initiating onboarding for:", application.id);
  }

  getDateFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case "7d":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30d":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90d":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1); // Year start
    }

    return {
      [Op.gte]: startDate,
    };
  }
}

module.exports = new RecruitmentController(); 