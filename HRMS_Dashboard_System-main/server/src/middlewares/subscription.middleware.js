
import { Subscription } from "../models/Associations.model.js";
import { Op } from "sequelize";

export const isSubscribed = async (req, res, next) => {
  try {
    // Free HRMS demo mode:
    // Skip subscription checks only in local development.
    // Authentication and role permissions remain separate.
    if (
      process.env.NODE_ENV === "development" &&
      process.env.HRMS_DEMO_MODE === "true"
    ) {
      return next();
    }

    const role = req.user?.role;
    const tenantId = req.user?.tenantId;

    if (role !== "admin") {
      return next();
    }

    if (!tenantId) {
      return res.status(403).json({
        message: "Tenant not found for this user",
        code: "TENANT_NOT_FOUND",
      });
    }

    const now = new Date();

    const activeSubscription = await Subscription.findOne({
      where: {
        tenantId,
        isActive: true,
        validTill: { [Op.gt]: now },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!activeSubscription) {
      return res.status(402).json({
        message: "Active subscription required",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    return next();
  } catch (error) {
    console.error("Subscription check error:", error);

    return res.status(500).json({
      message: error.message || "Subscription check failed",
    });
  }
};
