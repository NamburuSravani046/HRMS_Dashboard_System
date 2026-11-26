import Razorpay from "razorpay";
import { env } from "../config/env.js";

let razorpayInstance = null;

if (env.razorpay_key_id && env.razorpay_key_secret) {
  razorpayInstance = new Razorpay({
    key_id: env.razorpay_key_id,
    key_secret: env.razorpay_key_secret,
  });
} else {
  console.log("Razorpay disabled: credentials not configured");
}

export default razorpayInstance;