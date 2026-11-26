
import { API } from "../AuthService/authService";

const handleApiError = (error) => {
  return {
    success: false,
    message:
      error.response?.data?.message ||
      error.message ||
      "Something went wrong",
  };
};

// GET ALL LEAVE REQUESTS
export const getAllManagerLeaveRequests = async (filters = {}) => {
  try {
    const response = await API.get("/admin/leave/requests", {
      params: filters,
    });

    return response.data;
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    return handleApiError(error);
  }
};

// APPROVE LEAVE REQUEST
export const approveLeaveRequest = async (id) => {
  try {
    const response = await API.patch(
      `/admin/leave/approve/${id}`
    );

    return response.data;
  } catch (error) {
    console.error("Failed to approve leave request:", error);
    return handleApiError(error);
  }
};

// REJECT LEAVE REQUEST
export const rejectLeaveRequest = async (id, remark) => {
  try {
    const response = await API.patch(
      `/admin/leave/reject/${id}`,
      { remark }
    );

    return response.data;
  } catch (error) {
    console.error("Failed to reject leave request:", error);
    return handleApiError(error);
  }
};
