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

  password: Joi.string().min(6).required(),

  role: Joi.string().valid("USER", "PG_OWNER").required()
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

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});


const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required()
});

/* ================= REGISTER CONTROLLER ================= */

export const register = async (req, res) => {
  // 1. Validate Input
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(", ")
    });
  }

  const { name, email, phone, password, role } = value;

  // 2. Check Existence
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  // 3. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4. Create User 
  const user = await User.create({
    name,
    email,
    phone,
    password, 
    role,
    verificationOTP: otp,
    verificationOTPExpiry: Date.now() + 600000, // 10 minutes
    isVerified: false
  });

  // 5. Send OTP via Resend
  try {
    await sendEmail(
      email,
      "Verify Your Account - RentKaroo",
      `
      <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #0fb478;">Welcome to RentKaroo!</h2>
        <p>Hello ${name},</p>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>This code will expire in 10 minutes. Please do not share this OTP with anyone.</p>
      </div>
      `
    );
  } catch (emailError) {
    console.error("Email failed but user created:", emailError);
    // We don't block the response so the user can try "Resend OTP" later
  }

  res.status(201).json({
    success: true,
    message: "Registration successful. Please enter the OTP sent to your email."
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

/* ================= VERIFY OTP CONTROLLER ================= */

export const verifyOTP = async (req, res) => {
  // 1. Validate Input
  const { error, value } = verifyOTPSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  const { email, otp } = value;

  // 2. Find User with matching OTP and valid expiry
  const user = await User.findOne({
    email,
    verificationOTP: otp,
    verificationOTPExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP"
    });
  }

  // 3. Update User Status
  user.isVerified = true;
  user.verificationOTP = undefined; // Clear OTP fields
  user.verificationOTPExpiry = undefined;
  await user.save();

  // 4. Optionally generate tokens immediately so they are "logged in"
  const accessToken = AuthService.generateToken(user);
  const refreshToken = AuthService.generateToken(user, "refresh");

  res.status(200).json({
    success: true,
    message: "Account verified successfully!",
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken
    }
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
    data: { 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role 
      }
    }
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