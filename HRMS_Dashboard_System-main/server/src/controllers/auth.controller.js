
import * as authServices from "../services/auth.service.js";
import {
  successResponse,
  errorResponse,
} from "../utils/response.utils.js";
import {
  setCookie,
  setAccessTokenCookie,
  clearCookie,
} from "../services/cookie.service.js";
import STATUS from "../constants/Status.js";
import AppError from "../utils/Error.utils.js";
import { UserIP } from "../models/Associations.model.js";
import { getLocationFromIp } from "../utils/geo.utils.js";

// SIGNUP
export const signUp = async (req, res, next) => {
  try {
    const result = await authServices.signUpService(req.body);

    if (result.success) {
      return successResponse(
        res,
        result,
        result.message,
        STATUS.ACCEPTED
      );
    }

    return errorResponse(
      res,
      result.message,
      STATUS.NOT_ACCEPTABLE
    );
  } catch (error) {
    next(error);
  }
};

// VERIFY OTP
export const verifyOtp = async (req, res, next) => {
  try {
    let { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      throw new AppError(
        403,
        "Email or Purpose or OTP is required"
      );
    }

    purpose = purpose.toUpperCase();

    const result = await authServices.verifyOtpService(
      email,
      otp,
      purpose
    );

    if (result.success) {
      return successResponse(
        res,
        result,
        result.message,
        STATUS.ACCEPTED
      );
    }

    return errorResponse(
      res,
      result.message,
      STATUS.NOT_ACCEPTABLE
    );
  } catch (error) {
    next(error);
  }
};

// LOGIN
export const logIn = async (req, res, next) => {
  try {
    const result = await authServices.logInService(req.body);

    if (!result.success) {
      return errorResponse(
        res,
        result.message,
        STATUS.UNAUTHORIZED
      );
    }

    // Short-lived access token
    setAccessTokenCookie(res, "token", result.token);

    // Long-lived refresh token
    setCookie(res, "accessToken", result.refreshToken);

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const ipData = await getLocationFromIp(ip);

    await UserIP.create({
      tenantId: result.user.tenantId || null,
      userAgent: req.headers["user-agent"] || "unknown",
      ipAddress: ipData?.ip || ip,
      country: ipData?.country_name || null,
      region: ipData?.state_prov || null,
      city: ipData?.city || null,
      isp: ipData?.isp || ipData?.organization || null,
      userId: result.user.id,
    });

    return successResponse(
      res,
      result,
      result.message,
      STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

// LOGOUT
export const logOut = async (req, res, next) => {
  try {
    const response = await authServices.logOutService(
      req.user.id
    );

    if (response.success) {
      clearCookie(res, "token");
      clearCookie(res, "accessToken");

      return successResponse(
        res,
        response.data,
        "User Successfully LogOut",
        STATUS.OK
      );
    }

    return errorResponse(
      res,
      "Something went wrong",
      STATUS.UNAUTHORIZED
    );
  } catch (error) {
    next(error);
  }
};

// CURRENT USER
export const me = async (req, res, next) => {
  try {
    const response = await authServices.me(req.user.id);

    if (response.success) {
      return successResponse(
        res,
        response.user,
        response.message,
        STATUS.OK
      );
    }

    return errorResponse(
      res,
      response.message,
      STATUS.UNAUTHORIZED
    );
  } catch (error) {
    next(error);
  }
};

// REFRESH ACCESS TOKEN
export const getAccessToken = async (req, res, next) => {
  try {
    // Read the refresh token from the correct cookie
    const refreshToken = req.cookies.accessToken;

    if (!refreshToken) {
      return errorResponse(
        res,
        "Refresh token not found",
        STATUS.UNAUTHORIZED
      );
    }

    const response =
      await authServices.getAccessToken(refreshToken);

    if (!response.success) {
      return errorResponse(
        res,
        response.message,
        STATUS.UNAUTHORIZED
      );
    }

    // Update the access-token cookie, not the refresh cookie
    setAccessTokenCookie(
      res,
      "token",
      response.accessToken
    );

    return successResponse(
      res,
      { accessToken: response.accessToken },
      response.message,
      STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

// FORGOT PASSWORD
export const forgetPassword = async (req, res, next) => {
  try {
    const response =
      await authServices.forgetPasswordService(
        req.body.email
      );

    if (response.success) {
      return successResponse(
        res,
        response.data,
        response.message,
        response.status
      );
    }

    return errorResponse(
      res,
      response.message,
      response.status
    );
  } catch (error) {
    next(error);
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res, next) => {
  try {
    const response =
      await authServices.resetPasswordService(req.body);

    if (response.success) {
      return successResponse(
        res,
        response.data,
        response.message,
        response.status
      );
    }

    return errorResponse(
      res,
      response.message,
      response.status
    );
  } catch (error) {
    next(error);
  }
};

// RESEND OTP
export const resendOtp = async (req, res, next) => {
  try {
    const response =
      await authServices.resendOtpService(
        req.body.email,
        req.body.purpose
      );

    if (response.success) {
      return successResponse(
        res,
        response.data,
        response.message,
        response.status
      );
    }

    return errorResponse(
      res,
      response.message,
      response.status
    );
  } catch (error) {
    next(error);
  }
};
