import Joi from "joi";

const createBookingSchema = Joi.object({
  pgListingId: Joi.string().required(),

  checkInDate: Joi.date()
    .min("now") // Prevents past bookings
    .required(),

  checkOutDate: Joi.date()
    .greater(Joi.ref("checkInDate"))
    .min(Joi.ref("checkInDate", {
      adjust: (value) => {
        const d = new Date(value);
        return d.setMonth(d.getMonth() + 1); // Adds exactly 1 calendar month
      }
    }))
    .max(Joi.ref("checkInDate", {
      adjust: (value) => {
        const d = new Date(value);
        return d.setFullYear(d.getFullYear() + 1); // Adds exactly 1 year
      }
    }))
    .required()
    .messages({
      "date.min": "Booking must be at least 1 month long",
      "date.max": "Booking cannot exceed 1 year"
    }),

  numberOfRooms: Joi.number()
    .min(1)
    .required(),

  guests: Joi.array().items(
    Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      phone: Joi.string().pattern(/^[0-9]{10}$/).required()
    })
  ),

  specialRequests: Joi.string().allow("")
});

export { createBookingSchema };