import Joi from "joi";
const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(50).required(),
  email:    Joi.string().email().required(),
  phone:    Joi.string().pattern(/^\d{10}$/).required(),
  password: Joi.string().min(6).required(),
  role:     Joi.string().valid("user", "pg_owner").required(),
});

const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  otp:   Joi.string().length(6).pattern(/^\d+$/).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const emailSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
});

const verifyResetOtpSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  otp:   Joi.string().length(6).pattern(/^\d+$/).required(),
});

const resetPasswordSchema = Joi.object({
  token:       Joi.string().min(10).optional(),
  resetToken:  Joi.string().min(10).optional(),
  newPassword: Joi.string().min(6).max(128).required(),
}).or("token", "resetToken");

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

export {
  registerSchema,
  verifyEmailSchema,
  emailSchema,
  loginSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  changePasswordSchema
};