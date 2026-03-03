import Joi from "joi";
import crypto from "crypto";
import User from "../models/User.js";
import { AuthService } from "../services/auth.service.js";
import { sendEmail } from "../utils/sendEmail.js";

// ================= VALIDATION SCHEMAS =================

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required(),

  password: Joi.string().min(6).required(),

  role: Joi.string()
    .valid("user", "pg_owner")
    .default("user")
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

// ================= REGISTER =================

export const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const err = new Error(error.details.map(d => d.message).join(", "));
    err.statusCode = 400;
    throw err;
  }

  const { name, email, phone, password, role } = value;

  // Check existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered"
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    isVerified: false
  });

  // Generate token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send email
  await sendEmail(
    user.email,
    "Verify Your Email - RentKaroo",
    `
      <h2>Welcome to RentKaroo</h2>
      <p>Please verify your email by clicking below:</p>
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


// ================= LOGIN =================

export const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const err = new Error(error.details.map(d => d.message).join(', '));
    err.statusCode = 400;
    throw err;
  }

  const result = await AuthService.login(value.email, value.password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
};

// ================= REFRESH TOKEN =================

export const refreshToken = async (req, res) => {
  const { error, value } = refreshTokenSchema.validate(req.body);

  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    throw err;
  }

  const result = await AuthService.refreshToken(value.refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result
  });
};

// ================= VERIFY EMAIL =================

export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    verificationToken: token,
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

// ================= CHANGE PASSWORD =================

export const changePassword = async (req, res) => {
  const { error, value } = changePasswordSchema.validate(req.body);

  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    throw err;
  }

  const user = await AuthService.changePassword(
    req.user.id,
    value.oldPassword,
    value.newPassword
  );

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: { user: user.toJSON() }
  });
};

// ================= CURRENT USER =================

export const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user }
  });
};

// ================= LOGOUT =================

export const logout = async (req, res) => {
  await AuthService.logout(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};




