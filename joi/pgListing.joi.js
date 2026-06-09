import Joi from "joi";

const listingSchema = Joi.object({
  title:         Joi.string().min(3).max(120).required(),
  description:   Joi.string().min(10).required(),
  pricePerMonth: Joi.number().min(1000).required(),

  address: Joi.object({
    street:  Joi.string().required(),
    city:    Joi.string().required(),
    state:   Joi.string().required(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required(),
  }).required(),

  rooms: Joi.object({
    availableRooms: Joi.number().min(1).required(),
    roomType:       Joi.string()
      .valid("single", "double", "triple", "quad")
      .required(),
  }).required(),

  amenities: Joi.array()
    .items(Joi.string().lowercase().trim())
    .unique()
    .default([]),
});

// Partial schema for updates — every field optional but validated if present
const updateListingSchema = listingSchema.fork(
  ["title", "description", "pricePerMonth", "address", "rooms"],
  (field) => field.optional()
);

const availabilitySchema = Joi.object({
  availableRooms: Joi.number().min(0).required(),
});

/* ─────────────────────────────────────────────
   Shared body-mapping helper
   Flattens the frontend's flat field names into
   the nested structure Joi expects. Called once
   for both create and update.
───────────────────────────────────────────── */

function parseListingBody(body) {
  return {
    ...(body.title         !== undefined && { title: body.title }),
    ...(body.description   !== undefined && { description: body.description }),
    ...(body.pricePerMonth !== undefined && { pricePerMonth: Number(body.pricePerMonth) }),

    // Only include address if at least one field is present
    ...((body.street || body.city || body.state || body.pincode) && {
      address: {
        street:  body.street,
        city:    body.city,
        state:   body.state,
        pincode: body.pincode,
      },
    }),

    // Only include rooms if at least one field is present
    ...((body.availableRooms !== undefined || body.roomType) && {
      rooms: {
        availableRooms: Number(body.availableRooms),
        roomType:       body.roomType,
      },
    }),

    amenities: Array.isArray(body.amenities)
      ? body.amenities
      : body.amenities
      ? [body.amenities]
      : [],
  };
}

export {
  listingSchema,
  updateListingSchema,
  availabilitySchema,
  parseListingBody
};
