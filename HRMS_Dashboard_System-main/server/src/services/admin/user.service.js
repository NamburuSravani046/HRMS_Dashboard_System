
import {
  AttendancePolicy,
  Employee,
  Organization,
  User,
  UserIP,
} from "../../models/Associations.model.js";
import ExpressError from "../../utils/Error.utils.js";

import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sendMail } from "../../config/otpService.js";
import STATUS from "../../constants/Status.js";
import { generateHash } from "../../utils/hash.utils.js";
import { getPagination } from "../../utils/paginations.utils.js";

import {
  getTenantOrGlobalWhere,
  requireTenantId,
} from "../../utils/tenant.utils.js";

import {
  getInviteEmailTemplate,
} from "../../utils/mailTemplate.utils.js";

// GET ALL EMPLOYEES
export const getUsersService = async (
  page,
  limits,
  search,
  adminUser
) => {
  try {
    const { limit, offset } = getPagination(page, limits);
    const tenantId = requireTenantId(adminUser);

    let whereCondition = {
      role: "employee",
      tenantId,
    };

    if (search && search.trim() !== "") {
      whereCondition = {
        tenantId,
        role: "employee",
        [Op.or]: [
          { email: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows } = await User.findAndCountAll({
      limit,
      offset,
      distinct: true,
      col: "id",
      where: whereCondition,

      attributes: {
        exclude: [
          "password",
          "createdAt",
          "updatedAt",
          "contact",
          "attendancePolicyId",
          "login_At",
          "leavePolicyId",
          "deletedAt",
        ],
      },

      include: [
        {
          model: User,
          as: "manager",
          attributes: [
            "id",
            "email",
            "first_name",
            "last_name",
          ],
        },
        {
          model: UserIP,
          required: false,
          attributes: [
            "ipAddress",
            "isBlocked",
            "createdAt",
            "updatedAt",
          ],
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    return {
      success: true,
      data: {
        users: rows,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          hasNext: page * limit < count,
        },
      },
      message: "Users fetched successfully",
    };

  } catch (error) {
    throw new ExpressError(400, error.message);
  }
};

// BLOCK EMPLOYEE
export const blockUserService = async (id, adminUser) => {
  try {
    const user = await User.findOne({
      where: {
        tenantId: adminUser.tenantId,
        id,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (user.role === "admin") {
      return {
        success: false,
        message: "Cannot block an admin user",
      };
    }

    user.isBlocked = true;
    await user.save();

    return {
      success: true,
      message: "User blocked successfully",
    };
  } catch (error) {
    throw new ExpressError(400, error.message);
  }
};

// UNBLOCK EMPLOYEE
export const unblockUserService = async (
  userId,
  adminUser
) => {
  try {
    const user = await User.findOne({
      where: {
        tenantId: adminUser.tenantId,
        id: userId,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    user.isBlocked = false;
    await user.save();

    return {
      success: true,
      message: "User unblocked successfully",
    };

  } catch (error) {
    throw new ExpressError(400, error.message);
  }
};

// BLOCK IP
export const blockIPService = async (ip, adminUser) => {
  try {
    const [updatedCount] = await UserIP.update(
      { isBlocked: true },
      {
        where: {
          tenantId: adminUser.tenantId,
          ipAddress: ip,
        },
      }
    );

    if (updatedCount === 0) {
      throw new ExpressError(
        404,
        "IP address not found"
      );
    }

    return {
      success: true,
      message: `IP ${ip} blocked successfully`,
    };
  } catch (error) {
    throw new ExpressError(400, error.message);
  }
};

// UNBLOCK IP
export const unblockIPService = async (
  ip,
  adminUser
) => {
  try {
    const [updatedCount] = await UserIP.update(
      { isBlocked: false },
      {
        where: {
          tenantId: adminUser.tenantId,
          ipAddress: ip,
        },
      }
    );

    if (updatedCount === 0) {
      throw new ExpressError(
        404,
        "IP address not found"
      );
    }

    return {
      success: true,
      message: `IP ${ip} unblocked successfully`,
    };
  } catch (error) {
    throw new ExpressError(400, error.message);
  }
};

// REGISTER EMPLOYEE
export const registerUserService = async (
  { data },
  adminUser
) => {

  if (!data?.email || !data?.password) {
    return {
      success: false,
      message: "All fields are required",
    };
  }

  if (adminUser?.role !== "admin") {
    throw new ExpressError(
      403,
      "Admin access required"
    );
  }

  const demoMode =
    process.env.NODE_ENV === "development" &&
    process.env.HRMS_DEMO_MODE === "true";

  const transaction = await sequelize.transaction();

  try {
    const tenantId = requireTenantId(adminUser);

    const existingUser = await User.findOne({
      where: {
        email: data.email,
        tenantId,
      },
      transaction,
    });

    if (existingUser) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "User already exists"
      );
    }

    const hashedPassword = await generateHash(
      data.password
    );

    const attendancePolicy =
      await AttendancePolicy.findOne({
        where: getTenantOrGlobalWhere(
          tenantId,
          { isDefault: true }
        ),
        order: [["tenantId", "DESC"]],
        transaction,
      });

    // CREATE LOGIN ACCOUNT
    const userData = await User.create(
      {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        tenantId,
        password: hashedPassword,
        role: "employee",
        isVerified: demoMode,
        isBlocked: false,
        attendancePolicyId:
          attendancePolicy?.id || null,
      },
      { transaction }
    );

    // CREATE EMPLOYEE PROFILE
    await Employee.create(
      {
        userId: userData.id,
        tenantId,
        departmentId: data.departmentId,
        joiningDate: new Date(),
        isActive: demoMode,
        role: "employee",
      },
      { transaction }
    );

    // EXTERNAL EMAIL DISABLED IN DEMO MODE
    if (!demoMode) {
      const organization =
        await Organization.findOne({
          where: { id: tenantId },
          transaction,
        });

      const html = getInviteEmailTemplate({
        name:
          userData.first_name ||
          userData.email.split("@")[0],
        role: "employee",
        companyName:
          organization?.name || "our organization",
        inviteLink: env.client_url,
        email: data.email,
      });

      await sendMail(
        data.email,
        "Welcome to the team!",
        html
      );
    }

    await transaction.commit();

    return {
      success: true,
      data: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        isVerified: userData.isVerified,
      },
      message: "User Registered Successfully",
    };

  } catch (error) {
    await transaction.rollback();

    throw new ExpressError(
      STATUS.BAD_REQUEST,
      error.message
    );
  }
};

// GET IP DETAILS
export const getIPService = async (
  page,
  limits,
  adminUser
) => {
  try {
    const { limit, offset } =
      getPagination(page, limits);

    const where = {
      tenantId: requireTenantId(adminUser),
    };

    const [rows, total] = await Promise.all([
      UserIP.findAll({
        where,
        attributes: [
          "ipAddress",
          [
            sequelize.fn(
              "MAX",
              sequelize.col("isBlocked")
            ),
            "isBlocked",
          ],
          [
            sequelize.fn(
              "MAX",
              sequelize.col("failedLogInAttempt")
            ),
            "failedLogInAttempt",
          ],
        ],
        group: ["ipAddress"],
        order: [["ipAddress", "ASC"]],
        raw: true,
        offset,
        limit,
      }),

      UserIP.count({
        where,
        distinct: true,
        col: "ipAddress",
      }),
    ]);

    return {
      success: true,
      data: { rows, total },
      message: "IPs fetched successfully",
    };

  } catch (error) {
    throw new ExpressError(
      STATUS.BAD_REQUEST,
      error.message
    );
  }
};
