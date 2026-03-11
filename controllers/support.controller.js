import Support from "../models/support.js";

export const createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;

    // 1. Validation
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide both a subject and a message."
      });
    }

    // 2. Database Operation
    // Note: Assuming req.user is populated by your auth middleware
    const ticket = await Support.create({
      user: req.user.id,
      subject: subject.trim(),
      message: message.trim()
    });

    // 3. Success Response
    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket
    });

  } catch (error) {
    // 4. Error Handling
    console.error("Error creating support ticket:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};