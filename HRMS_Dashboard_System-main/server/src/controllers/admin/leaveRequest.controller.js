
import * as leaveApprovalService from "../../services/admin/leaveRequest.service.js";
import {
  successResponse,
  errorResponse,
} from "../../utils/response.utils.js";
import STATUS from "../../constants/Status.js";

// ========================================
// APPROVE LEAVE REQUEST
// ========================================

export const approveLeaveRequest = async (req, res, next) => {
  try {
    const response = await leaveApprovalService.approveLeaveRequest(
      req.params.id,
      req.user
    );

    if (!response.success) {
      return errorResponse(
        res,
        response.message,
        STATUS.BAD_REQUEST
      );
    }

    return successResponse(
      res,
      response.data,
      response.message,
      STATUS.ACCEPTED
    );
  } catch (error) {
    next(error);
  }
};

// ========================================
// REJECT LEAVE REQUEST
// ========================================

export const rejectLeaveRequest = async (req, res, next) => {
  try {
    const response = await leaveApprovalService.rejectLeaveRequest(
      req.params.id,
      req.body?.remark,
      req.user
    );

    if (!response.success) {
      return errorResponse(
        res,
        response.message,
        STATUS.BAD_REQUEST
      );
    }

    return successResponse(
      res,
      response.data,
      response.message,
      STATUS.ACCEPTED
    );
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET LEAVE REQUESTS
// ========================================

export const getLeaveRequests = async (req, res, next) => {
  try {
    const response = await leaveApprovalService.getLeaveRequests(
      req.query,
      req.user
    );

    if (!response.success) {
      return errorResponse(
        res,
        response.message,
        STATUS.BAD_REQUEST
      );
    }

    return successResponse(
      res,
      response.data,
      response.message,
      STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};
