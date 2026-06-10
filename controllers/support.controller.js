import { supportService } from "../services/support.service.js";
import { APIError } from "../middleware/errorHandler.js";

/* ─────────────────────────────────────────────
   Create Ticket
   POST /api/v1/support
───────────────────────────────────────────── */

export const createTicket = async (req, res) => {
  const { name, email, subject, message } = req.body;

  const ticketData = {
    user:    req.user?.id   || null,
    name:    req.user?.name  || name,
    email:   req.user?.email || email,
    subject: subject.trim(),
    message: message.trim(),
  };

  const ticket = await supportService.createTicket(ticketData);

  res.status(201).json({
    success: true,
    message: "Ticket created successfully",
    data:    { ticket },
  });
};

/* ─────────────────────────────────────────────
   Get My Tickets  (logged-in user)
   GET /api/v1/support/my-tickets
───────────────────────────────────────────── */

export const getMyTickets = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const tickets = await supportService.getMyTickets(req.user.id, {
    page:   Number(page),
    limit:  Number(limit),
    status,
  });

  res.status(200).json({
    success: true,
    message: "Tickets retrieved successfully",
    data:    tickets,
  });
};

/* ─────────────────────────────────────────────
   Get Single Ticket
   GET /api/v1/support/:id
───────────────────────────────────────────── */

export const getTicketById = async (req, res) => {
  const ticket = await supportService.getTicketById(req.params.id);

  if (!ticket) throw new APIError("Ticket not found", 404);

  // User sirf apna ticket dekh sake, admin sab dekh sake
  if (ticket.user?.toString() !== req.user.id && req.user.role !== "admin") {
    throw new APIError("Not authorized to view this ticket", 403);
  }

  res.status(200).json({
    success: true,
    message: "Ticket retrieved successfully",
    data:    { ticket },
  });
};

/* ─────────────────────────────────────────────
   Get All Tickets  (admin)
   GET /api/v1/support
───────────────────────────────────────────── */

export const getAllTickets = async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const result = await supportService.getAllTickets({
    page:   Number(page),
    limit:  Number(limit),
    status,
    search,
  });

  res.status(200).json({
    success: true,
    message: "All tickets retrieved successfully",
    data:    result,
  });
};

/* ─────────────────────────────────────────────
   Admin Reply
   PATCH /api/v1/support/:id/reply
───────────────────────────────────────────── */

export const adminReply = async (req, res) => {
  const ticket = await supportService.adminReply(
    req.params.id,
    req.user.id,
    req.body.message.trim()
  );

  if (!ticket) throw new APIError("Ticket not found", 404);

  res.status(200).json({
    success: true,
    message: "Reply sent successfully",
    data:    { ticket },
  });
};
