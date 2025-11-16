const {
  EmployeeProfile,
  EmployeeDocument,
  OrganizationStructure,
  EmployeeShift,
  ShiftManagement,
  User,
} = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

class CoreHRController {
  // ========== EMPLOYEE MANAGEMENT ==========
  async createEmployee(req, res) {
    try {
      const employeeData = req.body;
      // Generate employee ID
      const employeeCount = await EmployeeProfile.count();
      const departmentCode =
        employeeData.employmentInfo?.department
          ?.substring(0, 3)
          .toUpperCase() || "EMP";
      employeeData.employeeId = `${departmentCode}${(employeeCount + 1)
        .toString()
        .padStart(4, "0")}`;

      // Create user account first
      const user = await User.create({
        email: employeeData.contactInfo.email,
        password: "temp123", // Temporary password
        role: "employee",
        isActive: true,
      });

      employeeData.userId = user.id;

      const employee = await EmployeeProfile.create(employeeData);

      // Create onboarding checklist
      await this.createOnboardingChecklist(employee.id);

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: employee,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating employee",
        error: error.message,
      });
    }
  }

  async getEmployees(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        department = "",
        status = "",
        location = "",
      } = req.query;

      const offset = (page - 1) * limit;

      const whereCondition = { isActive: true };
      const includeCondition = [];

      if (search) {
        whereCondition[Op.or] = [
          { employeeId: { [Op.iLike]: `%${search}%` } },
          { "$personalInfo.firstName$": { [Op.iLike]: `%${search}%` } },
          { "$personalInfo.lastName$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (department) {
        whereCondition["$employmentInfo.department$"] = department;
      }

      if (status) {
        whereCondition.employmentStatus = status;
      }

      if (location) {
        whereCondition["$employmentInfo.location$"] = location;
      }

      const { count, rows: employees } = await EmployeeProfile.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["email", "lastLogin", "isActive"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["joiningDate", "DESC"]],
      });

      res.json({
        success: true,
        data: employees,
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

  async getEmployeeDetails(req, res) {
    try {
      const { id } = req.params;

      const employee = await EmployeeProfile.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["email", "lastLogin", "isActive"],
          },
          {
            model: EmployeeDocument,
            as: "documents",
            attributes: [
              "id",
              "documentType",
              "documentName",
              "expiryDate",
              "status",
            ],
          },
          {
            model: EmployeeShift,
            as: "shifts",
            include: [
              {
                model: ShiftManagement,
                as: "shift",
              },
            ],
          },
        ],
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching employee details",
        error: error.message,
      });
    }
  }

  // ========== DOCUMENT MANAGEMENT ==========
  async uploadEmployeeDocument(req, res) {
    try {
      const { employeeId } = req.params;
      const documentData = req.body;
      documentData.uploadedBy = req.user.id;

      // Handle file upload (implementation depends on your file storage)
      if (req.file) {
        documentData.documentUrl = await this.uploadToCloudStorage(req.file);
      }

      const document = await EmployeeDocument.create(documentData);

      // Set expiry notification if applicable
      if (documentData.expiryDate) {
        await this.scheduleExpiryNotification(
          document.id,
          documentData.expiryDate
        );
      }

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: document,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error uploading document",
        error: error.message,
      });
    }
  }

  async getEmployeeDocuments(req, res) {
    try {
      const { employeeId } = req.params;
      const { documentType, status } = req.query;

      const whereCondition = { employeeId };
      if (documentType) whereCondition.documentType = documentType;
      if (status) whereCondition.status = status;

      const documents = await EmployeeDocument.findAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: "uploader",
            attributes: ["email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching documents",
        error: error.message,
      });
    }
  }

  // ========== ORGANIZATION STRUCTURE ==========
  async getOrganizationChart(req, res) {
    try {
      const departments = await OrganizationStructure.findAll({
        where: { isActive: true },
        include: [
          {
            model: EmployeeProfile,
            as: "headOfDepartment",
            attributes: ["id", "employeeId", "personalInfo"],
          },
          {
            model: OrganizationStructure,
            as: "parent",
            attributes: ["id", "departmentName"],
          },
        ],
        order: [
          ["hierarchyLevel", "ASC"],
          ["departmentName", "ASC"],
        ],
      });

      // Build hierarchical structure
      const orgChart = this.buildHierarchicalStructure(departments);

      // Get employee counts per department
      const departmentStats = await this.getDepartmentEmployeeCounts();

      res.json({
        success: true,
        data: {
          orgChart,
          departmentStats,
          totalDepartments: departments.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching organization chart",
        error: error.message,
      });
    }
  }

  buildHierarchicalStructure(departments) {
    const departmentMap = new Map();
    const roots = [];

    departments.forEach((dept) => {
      departmentMap.set(dept.id, { ...dept.toJSON(), children: [] });
    });

    departments.forEach((dept) => {
      const node = departmentMap.get(dept.id);
      if (dept.parentDepartment) {
        const parent = departmentMap.get(dept.parentDepartment);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getDepartmentEmployeeCounts() {
    const departments = await OrganizationStructure.findAll({
      where: { isActive: true },
      attributes: ["id", "departmentName"],
    });

    const stats = [];

    for (const dept of departments) {
      const employeeCount = await EmployeeProfile.count({
        where: {
          isActive: true,
          "$employmentInfo.department$": dept.departmentName,
        },
      });

      stats.push({
        departmentId: dept.id,
        departmentName: dept.departmentName,
        employeeCount,
      });
    }

    return stats;
  }

  // ========== SHIFT MANAGEMENT ==========
  async createShift(req, res) {
    try {
      const shiftData = req.body;

      const shift = await ShiftManagement.create(shiftData);

      res.status(201).json({
        success: true,
        message: "Shift created successfully",
        data: shift,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating shift",
        error: error.message,
      });
    }
  }

  async assignShiftToEmployee(req, res) {
    try {
      const { employeeId, shiftId, effectiveFrom } = req.body;

      // Deactivate current shift if exists
      await EmployeeShift.update(
        { isActive: false },
        {
          where: {
            employeeId,
            isActive: true,
          },
        }
      );

      const employeeShift = await EmployeeShift.create({
        employeeId,
        shiftId,
        effectiveFrom,
        assignedBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        message: "Shift assigned successfully",
        data: employeeShift,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error assigning shift",
        error: error.message,
      });
    }
  }

  // ========== HELPER METHODS ==========
  async createOnboardingChecklist(employeeId) {
    const defaultTasks = [
      {
        employeeId,
        taskName: "Submit ID Documents",
        taskCategory: "documentation",
        isMandatory: true,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        employeeId,
        taskName: "IT Account Setup",
        taskCategory: "it_setup",
        isMandatory: true,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
      {
        employeeId,
        taskName: "HR Policy Acknowledgment",
        taskCategory: "hr_paperwork",
        isMandatory: true,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
      {
        employeeId,
        taskName: "Equipment Assignment",
        taskCategory: "equipment",
        isMandatory: false,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      },
    ];
    await OnboardingChecklist.bulkCreate(defaultTasks);
  }
  async scheduleExpiryNotification(documentId, expiryDate) {
    // Implementation for scheduling expiry notifications
    // This could integrate with your notification service
    console.log(`Scheduled expiry notification for document ${documentId} on 
    ${expiryDate}`);
  }
  async uploadToCloudStorage(file) {
    // Implementation for file upload to cloud storage (AWS S3, Google Cloud, etc.)
    // Return the file URL
    return `https://your-cloud-storage.com/documents/${file.filename}`;
  }
}
module.exports = new CoreHRController();
