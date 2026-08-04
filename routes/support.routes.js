import express from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import * as supportController from "../controllers/support.controller.js";
import validateBody from "../middleware/validation.middleware.js";            
import {  createTicketSchema, replySchema, statusSchema } from "../joi/support.joi.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   Authenticated User Routes
───────────────────────────────────────────── */

// POST /api/v1/support
router.post(
  "/",
  authenticate,
  validateBody(createTicketSchema),
  asyncWrapper(supportController.createTicket)
);

// GET /api/v1/support/my-tickets
router.get(
  "/my-tickets",
  authenticate,
  asyncWrapper(supportController.getMyTickets)
);

// GET /api/v1/support/:id  
router.get(
  "/:id",
  authenticate,
  asyncWrapper(supportController.getTicketById)
);

/* ─────────────────────────────────────────────
   Admin Routes
───────────────────────────────────────────── */

router.use(authenticate, authorize("admin"));

// GET /api/v1/support
router.get(
  "/",
  asyncWrapper(supportController.getAllTickets)
);

// PATCH /api/v1/support/:id/reply
router.patch(
  "/:id/reply",
  validateBody(replySchema),
  asyncWrapper(supportController.adminReply)
);

// PATCH /api/v1/support/:id/status
router.patch(
  "/:id/status",
  validateBody(statusSchema),
  asyncWrapper(supportController.updateStatus)
);

export default router;