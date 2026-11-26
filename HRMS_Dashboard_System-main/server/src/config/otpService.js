
import { randomInt } from "node:crypto";
import { OTP } from "../models/Associations.model.js";
import { generateHash } from "../utils/hash.utils.js";

// LOCAL DEVELOPMENT EMAIL SERVICE
// No Brevo API key required.

// Create and store OTP
export const createOTP = async (email, otp, purpose) => {
  const hashedOtp = await generateHash(otp);

  await OTP.create({
    email,
    otp: hashedOtp,
    purpose,
  });

  await sendMailOtp(email, otp);
};

// Send OTP using local development mode
export const sendMailOtp = async (email, otp) => {
  console.log(
    `[DEV EMAIL] OTP email suppressed for ${email}`
  );

  // OTP is stored in the database.
  // No external email request is made.
  return { success: true };
};

// Other application emails
export async function sendMail(
  to,
  subject,
  html,
  attachments = []
) {
  console.log(
    `[DEV EMAIL] Email suppressed: ${subject} -> ${to}`
  );

  return {
    success: true,
    message: "Email suppressed in local development mode",
  };
}

// Find saved OTP
export const findOtpData = async (email, purpose) => {
  return OTP.findOne({
    where: {
      email,
      purpose,
      isUsed: false,
    },
    order: [["expiresAt", "DESC"]],
  });
};

// Generate secure 6-digit OTP
export const generateOtp = () =>
  randomInt(100000, 1000000).toString();

