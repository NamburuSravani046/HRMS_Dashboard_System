import { sequelize } from "../../config/db.js";
import { DataTypes } from "sequelize";

const Payroll = sequelize.define(
  "Payroll",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 2000, max: 9999 },
    },

    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    hra: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    allowances: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    pfRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0, max: 100 },
    },

    pfDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0 },
    },

    workingDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    presentDays: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    unpaidLeaveDays: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    leaveDeduction: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    otherDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    netSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    paymentStatus: {
      type: DataTypes.ENUM("PENDING", "PAID"),
      defaultValue: "PENDING",
      allowNull: false,
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payrolls",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["tenantId", "userId", "month", "year"],
      },
    ],
  }
);

export default Payroll;