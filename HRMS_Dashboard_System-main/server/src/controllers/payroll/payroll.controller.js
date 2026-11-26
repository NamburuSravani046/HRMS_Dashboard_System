import * as payrollService from "../../services/payroll/payroll.service.js";

const handle = (action, status = 200) => {
  return async (req, res) => {
    try {
      const data = await action(req);

      return res.status(status).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Payroll error:", error.message);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };
};

export const getEmployees = handle((req) =>
  payrollService.getEmployees(req.user)
);

export const assignSalary = handle((req) =>
  payrollService.assignSalary(req.user, req.body)
);

export const getSalaries = handle((req) =>
  payrollService.getSalaries(req.user)
);

export const generatePayroll = handle(
  (req) =>
    payrollService.generatePayroll(req.user, req.body),
  201
);

export const getPayrolls = handle((req) =>
  payrollService.getPayrolls(req.user)
);

export const markAsPaid = handle((req) =>
  payrollService.markAsPaid(req.user, req.params.id)
);

export const getMyPayslips = handle((req) =>
  payrollService.getMyPayslips(req.user)
);