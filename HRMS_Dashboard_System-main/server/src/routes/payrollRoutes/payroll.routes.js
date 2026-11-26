import express from "express";

import {
  userAuth,
  adminAuth,
} from "../../middlewares/auth.middleware.js";

import * as payrollController from "../../controllers/payroll/payroll.controller.js";

const Router = express.Router();

// HR Admin routes
Router.get(
  "/employees",
  adminAuth,
  payrollController.getEmployees
);

Router.post(
  "/salary",
  adminAuth,
  payrollController.assignSalary
);

Router.get(
  "/salary",
  adminAuth,
  payrollController.getSalaries
);

Router.post(
  "/generate",
  adminAuth,
  payrollController.generatePayroll
);

Router.get(
  "/records",
  adminAuth,
  payrollController.getPayrolls
);

Router.patch(
  "/:id/paid",
  adminAuth,
  payrollController.markAsPaid
);

// Employee and Manager payslips
Router.get(
  "/my-payslips",
  userAuth,
  (req, res, next) => {
    if (
      !["employee", "manager", "admin"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  },
  payrollController.getMyPayslips
);

export const payrollRouter = Router;