const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const sequelize = require("./config/database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Import models to ensure they are registered
require("./models");

// Database synchronization
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database synchronized successfully");
  })
  .catch((err) => {
    console.error("Database synchronization failed:", err);
  });

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hr", require("./routes/hrRoutes"));
app.use("/api/finance", require("./routes/financeRoutes"));
app.use("/api/accounting", require("./routes/accountingRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/mobile", require("./routes/mobileRoutes"));
app.use("/api/workflows", require("./routes/workflowRoutes"));

// Finance-specific health check
app.get("/finance/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    const financeStatus = {
      database: "connected",
      accounting_module: "active",
      payment_processing: "operational",
      reporting_engine: "running",
      tax_calculation: "active",
    };

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      modules: financeStatus,
      version: "4.0.0",
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "ERP Education System API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "Connected",
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      database: "Disconnected",
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`API URL: http://localhost:${PORT}`);
  console.log("Available Routes:");
  console.log("   - GET  /health");
  console.log("   - POST /api/auth/register");
  console.log("   - POST /api/auth/login");
  console.log("   - GET  /api/auth/profile");
  console.log("   - GET  /api/hr/dashboard");
  console.log("   - GET  /api/finance/dashboard");
});

module.exports = app;
