import express from "express";
import Support from "../models/support.js";
import { asyncWrapper } from "../middleware/asyncWrapper.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

/* ================= CREATE SUPPORT TICKET ================= */

router.post(
  "/",
  asyncWrapper(async (req, res) => {

    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required"
      });
    }

    const ticket = await Support.create({
      name,
      email,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: "Support request created",
      data: ticket
    });

  })
);


/* ================= GET ALL TICKETS (ADMIN) ================= */

router.get(
  "/",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const tickets = await Support.find({ isDeleted: false })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets
    });

  })
);


/* ================= GET SINGLE TICKET ================= */

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });

  })
);


/* ================= ADMIN REPLY ================= */

router.patch(
  "/:id/reply",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const { message } = req.body;

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.adminReply = {
      message,
      repliedAt: new Date(),
      admin: req.user.id
    };

    ticket.status = "resolved";

    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Reply sent",
      data: ticket
    });

  })
);


/* ================= UPDATE STATUS ================= */

router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  asyncWrapper(async (req, res) => {

    const { status } = req.body;

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.status = status;

    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Status updated",
      data: ticket
    });

  })
);

export default router;