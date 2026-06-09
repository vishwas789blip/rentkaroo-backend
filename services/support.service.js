import Support from "../models/support.js";

export const supportService = {

  /* ─────────────────────────────────────────────
     Create Ticket
  ───────────────────────────────────────────── */

  async createTicket(ticketData) {
    return await Support.create(ticketData);
  },

  /* ─────────────────────────────────────────────
     Get My Tickets  (with pagination + status filter)
  ───────────────────────────────────────────── */

  async getMyTickets(userId, { page = 1, limit = 10, status } = {}) {
    const filter = { user: userId, isDeleted: false };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Support.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Support.countDocuments(filter),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* ─────────────────────────────────────────────
     Get All Tickets  (admin — with pagination, status, search)
  ───────────────────────────────────────────── */

  async getAllTickets({ page = 1, limit = 20, status, search } = {}) {
    const filter = { isDeleted: false };

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: "i" } },
        { email:   { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Support.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Support.countDocuments(filter),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /* ─────────────────────────────────────────────
     Get Single Ticket by ID
  ───────────────────────────────────────────── */

  async getTicketById(ticketId) {
    return await Support.findOne({ _id: ticketId, isDeleted: false })
      .populate("user", "name email");
  },

  /* ─────────────────────────────────────────────
     Admin Reply
  ───────────────────────────────────────────── */

  async adminReply(ticketId, adminId, replyMessage) {
    return await Support.findByIdAndUpdate(
      ticketId,
      {
        adminReply: {
          message:   replyMessage,
          repliedAt: new Date(),
          admin:     adminId,
        },
        status: "resolved",
      },
      { new: true }
    );
  },

  /* ─────────────────────────────────────────────
     Update Ticket Status
  ───────────────────────────────────────────── */

  async updateTicketStatus(ticketId, status) {
    return await Support.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true, runValidators: true }
    );
  },

  /* ─────────────────────────────────────────────
     Soft Delete Ticket
  ───────────────────────────────────────────── */

  async softDeleteTicket(ticketId) {
    return await Support.findByIdAndUpdate(
      ticketId,
      { isDeleted: true },
      { new: true }
    );
  },
};