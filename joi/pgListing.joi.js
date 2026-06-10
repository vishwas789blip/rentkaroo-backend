import Joi from "joi";

const listingSchema = Joi.object({
  title:         Joi.string().min(3).max(120).required(),
  description:   Joi.string().min(10).required(),
  pricePerMonth: Joi.number().min(1000).required(),

  address: Joi.object({
    street:  Joi.string().required(),
    city:    Joi.string().required(),
    state:   Joi.string().required(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required()
      .messages({ "string.pattern.base": "Pincode must be exactly 6 digits" }),
  }).required(),

  rooms: Joi.object({
    availableRooms: Joi.number().min(1).required(),
    roomType: Joi.string()
      .valid("single", "double", "triple", "quad")
      .required(),
  }).required(),

  amenities: Joi.array()
    .items(Joi.string().lowercase().trim())
    .unique()
    .default([]),
});

// ── Update schema — all fields optional ──────────────────────
const updateListingSchema = listingSchema.fork(
  ["title", "description", "pricePerMonth", "address", "rooms"],
  (field) => field.optional()
);

// ── Availability schema ───────────────────────────────────────
const availabilitySchema = Joi.object({
  availableRooms: Joi.number().min(0).required(),
});

function parseListingBody(body) {
  if (body.address && typeof body.address === "object" && body.rooms) {
    return body;
  }

  const parsed = {};

  // Scalar fields
  if (body.title         !== undefined) parsed.title         = body.title;
  if (body.description   !== undefined) parsed.description   = body.description;
  if (body.pricePerMonth !== undefined) parsed.pricePerMonth = Number(body.pricePerMonth);

  // Nested: address
  if (body.street || body.city || body.state || body.pincode) {
    parsed.address = {
      street:  body.street  || "",
      city:    body.city    || "",
      state:   body.state   || "",
      pincode: body.pincode || "",
    };
  }

  // Nested: rooms
  if (body.availableRooms !== undefined || body.roomType !== undefined) {
    parsed.rooms = {};
    if (body.availableRooms !== undefined) parsed.rooms.availableRooms = Number(body.availableRooms);
    if (body.roomType       !== undefined) parsed.rooms.roomType       = body.roomType;
  }

  // Amenities — FormData sends multiple appends as array, or comma-separated string
  if (body.amenities !== undefined) {
    parsed.amenities = Array.isArray(body.amenities)
      ? body.amenities
      : typeof body.amenities === "string" && body.amenities.includes(",")
        ? body.amenities.split(",").map((a) => a.trim())
        : [body.amenities];
  } else {
    parsed.amenities = []; // default empty array
  }

  return parsed;
}

export {
  listingSchema,
  updateListingSchema,
  availabilitySchema,
  parseListingBody,
};