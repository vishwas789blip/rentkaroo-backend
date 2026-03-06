import Joi from "joi";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { AuthService } from "../services/auth.service.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ================= VALIDATION SCHEMAS ================= */

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required(),

  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required()
});

/* ================= REGISTER ================= */

export const register = async (req, res) => {

  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(", ")
    });
  }

  const { name, email, phone, password } = value;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered"
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    phone,
    password: hashedPassword,
    role: "user",
    isVerified: false
  });

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.verificationToken = hashedToken;
  user.verificationTokenExpiry = Date.now() + 3600000;

  await user.save();

  await sendEmail(
    user.email,
    "Verify Your Email - RentKaroo",
    `
      <h2>Welcome to RentKaroo</h2>
      <p>Please verify your email:</p>
      <a href="${process.env.FRONTEND_URL}/verify-email/${verificationToken}">
        Verify Email
      </a>
    `
  );

  res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email."
  });

};


/* ================= LOGIN ================= */

export const login = async (req, res) => {

  const { error, value } = loginSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const result = await AuthService.login(value.email, value.password);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result
  });

};


/* ================= REFRESH TOKEN ================= */

export const refreshToken = async (req, res) => {

  const { error, value } = refreshTokenSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const result = await AuthService.refreshToken(value.refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: result
  });

};


/* ================= VERIFY EMAIL ================= */

export const verifyEmail = async (req, res) => {

  const { token } = req.params;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully"
  });

};


/* ================= FORGOT PASSWORD ================= */

export const forgotPassword = async (req, res) => {

  const { error, value } = forgotPasswordSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const user = await User.findOne({ email: value.email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = Date.now() + 3600000;

  await user.save();

  await sendEmail(
    user.email,
    "Password Reset Request",
    `
      <p>Click below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password/${resetToken}">
        Reset Password
      </a>
    `
  );

  res.status(200).json({
    success: true,
    message: "Password reset link sent"
  });

};


/* ================= RESET PASSWORD ================= */

export const resetPassword = async (req, res) => {

  const { token } = req.params;

  const { error, value } = resetPasswordSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  const hashedPassword = await bcrypt.hash(value.newPassword, 10);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful"
  });

};


/* ================= CURRENT USER ================= */

export const getCurrentUser = async (req, res) => {

  res.status(200).json({
    success: true,
    data: { user: req.user }
  });

};


/* ================= CHANGE PASSWORD ================= */

export const changePassword = async (req, res) => {

  const { error, value } = changePasswordSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const user = await User.findById(req.user.id);

  const isMatch = await bcrypt.compare(value.oldPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Old password incorrect"
    });
  }

  user.password = await bcrypt.hash(value.newPassword, 10);

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully"
  });

};


/* ================= LOGOUT ================= */

export const logout = async (req, res) => {

  await AuthService.logout(req.user.id);

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });

};