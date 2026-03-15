import express from "express";
import Support from "../models/support.js";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ================= PUBLIC / AUTHENTICATED USER ROUTES ================= */

// 1. Create a ticket (Public or Logged in)
router.post(
  "/",
  authenticate,
  asyncWrapper(async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message || !subject) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject and message are required"
      });
    }

    const ticket = await Support.create({
      user: req.user?.id || null, // Link if logged in
      name,
      email,
      subject,
      message
    });

    res.status(201).json({ success: true, data: ticket });
  })
);

router.get(
  "/my-tickets",
  authenticate,
  asyncWrapper(async (req, res) => {
    const tickets = await Support.find({ 
      user: req.user.id, 
      isDeleted: false 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets
    });
  })
);

router.use(authenticate, authorize("admin"));

// Get All Tickets
router.get(
  "/",
  asyncWrapper(async (req, res) => {
    const tickets = await Support.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: tickets });
  })
);

// Admin Reply
router.patch(
  "/:id/reply",
  asyncWrapper(async (req, res) => {
    const { message } = req.body;
    const ticket = await Support.findById(req.params.id);

    if (!ticket) return res.status(404).json({ success: false, message: "Not found" });

    ticket.adminReply = {
      message,
      repliedAt: new Date(),
      admin: req.user.id
    };
    ticket.status = "resolved";

    await ticket.save();
    res.status(200).json({ success: true, message: "Reply sent", data: ticket });
  })
);

// Update Status
router.patch(
  "/:id/status",
  asyncWrapper(async (req, res) => {
    const { status } = req.body;
    const ticket = await Support.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: ticket });
  })
);

export default router;