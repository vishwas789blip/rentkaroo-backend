import Joi from "joi";
import validateBody from "../middleware/validation.middleware.js";

/* ─────────────────────────────────────────────
   Schemas
───────────────────────────────────────────── */

export const createTicketSchema = Joi.object({
  name:    Joi.string().min(2).max(50).trim().required(),
  email:   Joi.string().email().lowercase().trim().required(),
  subject: Joi.string().min(3).max(150).trim().required(),
  message: Joi.string().min(10).max(2000).trim().required(),
});

export const replySchema = Joi.object({
  message: Joi.string().min(5).max(2000).trim().required(),
});

export const statusSchema = Joi.object({
  status: Joi.string()
    .valid("open", "in-progress", "resolved", "closed")
    .required(),
});

export { validateBody };