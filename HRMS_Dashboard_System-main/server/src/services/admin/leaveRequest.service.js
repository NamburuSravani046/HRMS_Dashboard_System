
import { sequelize } from "../../config/db.js";
import { sendMail } from "../../config/otpService.js";
import STATUS from "../../constants/Status.js";
import {
  LeaveAuditLog,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  User,
} from "../../models/Associations.model.js";
import ExpressError from "../../utils/Error.utils.js";
import {
  getLeaveApprovedTemplate,
  getLeaveRejectedTemplate,
} from "../../utils/mailTemplate.utils.js";
import {
  getScopedWhere,
  requireTenantId,
} from "../../utils/tenant.utils.js";

// ========================================
// APPROVE EMPLOYEE LEAVE REQUEST
// ========================================

export const approveLeaveRequest = async (id, adminUser) => {
  const tenantId = requireTenantId(adminUser);

  const transaction = await sequelize.transaction();

  let notification = null;

  try {
    const leaveData = await LeaveRequest.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: User,
          where: {
            role: "employee",
            tenantId,
          },
          as: "employee",
          required: true,
        },
        {
          model: LeaveType,
          as: "LeaveType",
          required: true,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!leaveData) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "Leave Request Not Found"
      );
    }

    if (
      leaveData.status !== "PENDING" ||
      leaveData.cancelRequest
    ) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "This leave request is already processed or cancelled"
      );
    }

    // Find employee's leave balance
    const leaveBalanceData = await LeaveBalance.findOne({
      where: {
        userId: leaveData.userId,
        leaveTypeId: leaveData.leaveTypeId,
        tenantId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!leaveBalanceData) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "Employee leave balance not found"
      );
    }

    const requestedDays = Number(leaveData.daysRequested);
    const currentBalance = Number(leaveBalanceData.balance);
    const currentUsed = Number(leaveBalanceData.used || 0);

    if (
      !Number.isFinite(requestedDays) ||
      requestedDays <= 0 ||
      !Number.isFinite(currentBalance) ||
      currentBalance < requestedDays
    ) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "Insufficient or invalid leave balance"
      );
    }

    const remainingBalance = currentBalance - requestedDays;
    const updatedUsed = currentUsed + requestedDays;

    // Update leave balance
    await leaveBalanceData.update(
      {
        balance: remainingBalance,
        used: updatedUsed,
      },
      { transaction }
    );

    const reviewedAt = new Date();

    // Approve leave
    await leaveData.update(
      {
        status: "APPROVED",
        reviewedBy: adminUser.id,
        reviewedAt,
        remark: "Approved By Admin",
      },
      { transaction }
    );

    // Save audit history
    await LeaveAuditLog.create(
      {
        leaveRequestId: leaveData.id,
        tenantId,
        newStatus: "APPROVED",
        action: "APPROVED",
        reviewedAt,
        reviewedBy: adminUser.id,
      },
      { transaction }
    );

    const admin = await User.findOne({
      where: getScopedWhere(adminUser, {
        role: "admin",
      }),
      attributes: ["email"],
      raw: true,
      transaction,
    });

    notification = {
      email: leaveData.employee.email,
      subject: "Leave Request Approved",
      html: getLeaveApprovedTemplate({
        managerName: admin?.email?.split("@")[0] || "Admin",
        employeeName:
          leaveData.employee.first_name ||
          leaveData.employee.email.split("@")[0],
        leaveType: leaveData.LeaveType.name,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        daysRequested: leaveData.daysRequested,
        reason: leaveData.reason,
      }),
    };

    await transaction.commit();

    // Email must not prevent a successful database approval
    try {
      await Promise.resolve(
        sendMail(
          notification.email,
          notification.subject,
          notification.html
        )
      );
    } catch (mailError) {
      console.error(
        "Leave approval notification failed:",
        mailError.message
      );
    }

    return {
      success: true,
      data: {
        status: "APPROVED",
      },
      message: "Leave Approved Successfully",
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw new ExpressError(
      STATUS.BAD_REQUEST,
      error.message
    );
  }
};

// ========================================
// REJECT EMPLOYEE LEAVE REQUEST
// ========================================

export const rejectLeaveRequest = async (
  id,
  remark,
  adminUser
) => {
  const tenantId = requireTenantId(adminUser);

  const transaction = await sequelize.transaction();

  let notification = null;

  try {
    const leaveData = await LeaveRequest.findOne({
      where: {
        id,
        tenantId,
      },
      include: [
        {
          model: User,
          where: {
            role: "employee",
            tenantId,
          },
          as: "employee",
          required: true,
        },
        {
          model: LeaveType,
          as: "LeaveType",
          required: true,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!leaveData) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "Leave Request Not Found"
      );
    }

    if (
      leaveData.status !== "PENDING" ||
      leaveData.cancelRequest
    ) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "This leave request is already processed or cancelled"
      );
    }

    const reviewedAt = new Date();

    // Reject leave
    await leaveData.update(
      {
        status: "REJECTED",
        reviewedBy: adminUser.id,
        reviewedAt,
        remark: remark || "Rejected By Admin",
      },
      { transaction }
    );

    // Save audit history
    await LeaveAuditLog.create(
      {
        leaveRequestId: leaveData.id,
        tenantId,
        newStatus: "REJECTED",
        action: "REJECTED",
        reviewedAt,
        reviewedBy: adminUser.id,
      },
      { transaction }
    );

    const admin = await User.findOne({
      where: getScopedWhere(adminUser, {
        role: "admin",
      }),
      attributes: ["email"],
      raw: true,
      transaction,
    });

    notification = {
      email: leaveData.employee.email,
      subject: "Leave Request Rejected",
      html: getLeaveRejectedTemplate({
        managerName: admin?.email?.split("@")[0] || "Admin",
        employeeName:
          leaveData.employee.first_name ||
          leaveData.employee.email.split("@")[0],
        leaveType: leaveData.LeaveType.name,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        daysRequested: leaveData.daysRequested,
        reason: remark || "Rejected By Admin",
      }),
    };

    await transaction.commit();

    // Email failure should not undo rejection
    try {
      await Promise.resolve(
        sendMail(
          notification.email,
          notification.subject,
          notification.html
        )
      );
    } catch (mailError) {
      console.error(
        "Leave rejection notification failed:",
        mailError.message
      );
    }

    return {
      success: true,
      data: {
        status: "REJECTED",
      },
      message: "Leave Rejected Successfully",
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw new ExpressError(
      STATUS.BAD_REQUEST,
      error.message
    );
  }
};

// ========================================
// GET ALL EMPLOYEE LEAVE REQUESTS
// ========================================

export const getLeaveRequests = async (
  { status = "PENDING", page = 1, limit = 10 },
  adminUser
) => {
  try {
    const tenantId = requireTenantId(adminUser);

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageLimit = Math.max(
      1,
      Math.min(100, Number(limit) || 10)
    );

    const offset = (pageNumber - 1) * pageLimit;

    const whereClause = {
      tenantId,
    };

    const normalizedStatus = String(
      status || "PENDING"
    ).toUpperCase();

    const allowedStatuses = [
      "ALL",
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new ExpressError(
        STATUS.BAD_REQUEST,
        "Invalid leave request status"
      );
    }

    if (normalizedStatus !== "ALL") {
      whereClause.status = normalizedStatus;
    }

    const { rows, count } =
      await LeaveRequest.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            where: {
              role: "employee",
              tenantId,
            },
            as: "employee",
            required: true,
            attributes: [
              "id",
              "first_name",
              "email",
            ],
          },
          {
            model: LeaveType,
            as: "LeaveType",
            attributes: [
              "id",
              "name",
              "code",
            ],
            required: true,
          },
        ],
        order: [["createdAt", "DESC"]],
        offset,
        limit: pageLimit,
      });

    return {
      success: true,
      data: rows,
      total: count,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / pageLimit),
      message: "Leave Requests Fetched Successfully",
    };
  } catch (error) {
    throw new ExpressError(
      STATUS.BAD_REQUEST,
      error.message
    );
  }
};
