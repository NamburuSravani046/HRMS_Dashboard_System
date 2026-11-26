import { sequelize } from "../../config/db.js";
import { DataTypes } from "sequelize";

const Salary = sequelize.define(
  "Salary",
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

    basicSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    hra: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0 },
    },

    allowances: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0 },
    },

    // Employee Provident Fund percentage
    pfRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 12,
      allowNull: false,
      validate: { min: 0, max: 100 },
    },

    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0 },
    },
  },
  {
    tableName: "salaries",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["tenantId", "userId"],
      },
    ],
  }
);

export default Salary;