import Support from "../models/support.js";

export const supportService = {
  async createTicket(ticketData) {
    return await Support.create(ticketData);
  },

  async adminReply(ticketId, adminId, replyMessage) {
    return await Support.findByIdAndUpdate(
      ticketId,
      {
        adminReply: { message: replyMessage, repliedAt: new Date(), admin: adminId },
        status: "resolved"
      },
      { new: true }
    );
  },

  // Logic for a user creating a ticket
  async createTicket(ticketData, userId) {
    return await Support.create({
      ...ticketData,
      user: userId,
    });
  },

  // Logic for admin to fetch all tickets
  async getAllTickets() {
    return await Support.find({ isDeleted: false })
      .populate("user", "name email")
      .sort({ createdAt: -1 });
  },

  // Logic for updating status
  async updateTicketStatus(ticketId, status) {
    return await Support.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true, runValidators: true }
    );
  },

  // Logic for admin viewing a single ticket
  async getTicketById(ticketId) {
    return await Support.findById(ticketId).populate("user", "name email");
  }
};