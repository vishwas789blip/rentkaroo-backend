import Joi from "joi";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Listing from "../models/PGListing.js";
import { AuthService } from "../services/auth.service.js";

/* ================= VALIDATION SCHEMAS ================= */

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required(),

  password: Joi.string().min(6).required(),

  role: Joi.string().valid("user", "pg_owner").required()
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

/* ================= REGISTER CONTROLLER ================= */

export const register = async (req, res) => {

  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(", ")
    });
  }

  const { name, email, phone, password, role } = value;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered"
    });
  }

  await User.create({
    name,
    email,
    phone,
    password,
    role
  });

  res.status(201).json({
    success: true,
    message: "Registration successful. Please login."
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

/* ================= CHANGE PASSWORD ================= */
 
export const changePassword = async (req, res) => {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
 
  const user = await User.findById(req.user.id).select("+password");
  const isMatch = await bcrypt.compare(value.oldPassword, user.password);
 
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Old password incorrect"
    });
  }

  if (!user) {
  return res.status(404).json({
    success: false,
    message: "User not found"
  });
  }
 
  user.password = await bcrypt.hash(value.newPassword, 10);
  await user.save();
 
  res.status(200).json({
    success: true,
    message: "Password changed successfully"
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

export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("owner", "name email phone role"); // Add phone and role here

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    res.status(200).json({ 
      success: true, 
      data: { listing } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ================= LOGOUT ================= */

export const logout = async (req, res) => {
  await AuthService.logout(req.user.id);
  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });

};