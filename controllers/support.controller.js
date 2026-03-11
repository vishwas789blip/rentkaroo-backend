import { supportService } from "../services/supportService.js";

export const createTicket = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // If user is logged in, use their info; otherwise use body info
    const ticketData = {
      user: req.user?.id || null,
      name: req.user?.name || name,
      email: req.user?.email || email,
      subject: subject?.trim(),
      message: message?.trim()
    };

    if (!ticketData.name || !ticketData.email || !ticketData.message) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const ticket = await supportService.createTicket(ticketData);

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};