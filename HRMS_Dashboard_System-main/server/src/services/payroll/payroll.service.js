import {
  User,
  Salary,
  Payroll,
} from "../../models/Associations.model.js";

import { Op } from "sequelize";

// Validate organization
const getTenant = (user) => {
  if (!user.tenantId) {
    throw new Error("Organization not found");
  }

  return user.tenantId;
};

// Validate salary amounts
const amount = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    throw new Error("Salary amount is required");
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Invalid salary amount");
  }

  return Math.round(number * 100) / 100;
};

// Validate PF percentage
const validatePFRate = (value) => {
  const rate = amount(value);

  if (rate > 100) {
    throw new Error("Invalid PF percentage");
  }

  return rate;
};

// 1. Get employees and managers
export const getEmployees = async (authUser) => {
  return User.findAll({
    where: {
      tenantId: getTenant(authUser),
      role: {
        [Op.in]: ["employee", "manager"],
      },
    },
    attributes: [
      "id",
      "first_name",
      "last_name",
      "email",
      "role",
    ],
  });
};

// 2. Assign or update salary
export const assignSalary = async (authUser, data) => {
  const tenantId = getTenant(authUser);

  const {
    userId,
    basicSalary,
    hra = 0,
    allowances = 0,
    pfRate = 12,
    deductions = 0,
  } = data;

  const employee = await User.findOne({
    where: {
      id: userId,
      tenantId,
      role: {
        [Op.in]: ["employee", "manager"],
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  const basic = amount(basicSalary);
  const houseRent = amount(hra);
  const otherAllowances = amount(allowances);
  const rate = validatePFRate(pfRate);
  const otherDeductions = amount(deductions);

  const grossSalary = amount(
    basic + houseRent + otherAllowances
  );

  const pfDeduction = amount(
    (basic * rate) / 100
  );

  if (pfDeduction + otherDeductions > grossSalary) {
    throw new Error(
      "Total deductions exceed gross salary"
    );
  }

  const values = {
    tenantId,
    userId,
    basicSalary: basic,
    hra: houseRent,
    allowances: otherAllowances,
    pfRate: rate,
    deductions: otherDeductions,
  };

  await Salary.upsert(values);

  return Salary.findOne({
    where: { tenantId, userId },
  });
};

// 3. Get all assigned salaries
export const getSalaries = async (authUser) => {
  return Salary.findAll({
    where: {
      tenantId: getTenant(authUser),
    },
  });
};

// 4. Generate monthly payroll
export const generatePayroll = async (authUser, data) => {
  const tenantId = getTenant(authUser);

  const userId = data.userId;
  const month = Number(data.month);
  const year = Number(data.year);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 9999
  ) {
    throw new Error("Invalid month or year");
  }

  const salary = await Salary.findOne({
    where: { tenantId, userId },
  });

  if (!salary) {
    throw new Error("Salary not assigned");
  }

  const existing = await Payroll.findOne({
    where: { tenantId, userId, month, year },
  });

  if (existing) {
    throw new Error("Payroll already generated");
  }

  const basicSalary = Number(salary.basicSalary);
  const hra = Number(salary.hra);
  const allowances = Number(salary.allowances);
  const pfRate = validatePFRate(salary.pfRate);
  const otherDeductions = Number(salary.deductions);

  // Calculate gross salary
  const grossSalary = amount(
    basicSalary + hra + allowances
  );

  // Calculate employee PF deduction
  const pfDeduction = amount(
    (basicSalary * pfRate) / 100
  );

  // Calculate total deductions
  const totalDeductions = amount(
    pfDeduction + otherDeductions
  );

  if (totalDeductions > grossSalary) {
    throw new Error(
      "Total deductions exceed gross salary"
    );
  }

  // Calculate final take-home salary
  const netSalary = amount(
    grossSalary - totalDeductions
  );

  return Payroll.create({
    tenantId,
    userId,
    month,
    year,
    basicSalary,
    hra,
    allowances,
    grossSalary,
    pfRate,
    pfDeduction,
    otherDeductions,
    netSalary,
    paymentStatus: "PENDING",
  });
};

// 5. Get all payroll records
export const getPayrolls = async (authUser) => {
  return Payroll.findAll({
    where: {
      tenantId: getTenant(authUser),
    },
    order: [
      ["year", "DESC"],
      ["month", "DESC"],
    ],
  });
};

// 6. Mark salary as paid
export const markAsPaid = async (authUser, id) => {
  const payroll = await Payroll.findOne({
    where: {
      id,
      tenantId: getTenant(authUser),
    },
  });

  if (!payroll) {
    throw new Error("Payroll record not found");
  }

  if (payroll.paymentStatus === "PAID") {
    return payroll;
  }

  await payroll.update({
    paymentStatus: "PAID",
    paidAt: new Date(),
  });

  return payroll;
};

// 7. Employee or manager views own payslips
export const getMyPayslips = async (authUser) => {
  return Payroll.findAll({
    where: {
      tenantId: getTenant(authUser),
      userId: authUser.id,
    },
    order: [
      ["year", "DESC"],
      ["month", "DESC"],
    ],
  });
};