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

// ── Update schema — all fields optional including nested ──────────────────────
const updateListingSchema = Joi.object({
  title:         Joi.string().min(3).max(120).optional(),
  description:   Joi.string().min(10).optional(),
  pricePerMonth: Joi.number().min(1000).optional(),

  address: Joi.object({
    street:  Joi.string().optional(),
    city:    Joi.string().optional(),
    state:   Joi.string().optional(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).optional()
      .messages({ "string.pattern.base": "Pincode must be exactly 6 digits" }),
  }).optional(),

  rooms: Joi.object({
    availableRooms: Joi.number().min(0).optional(),
    roomType: Joi.string()
      .valid("single", "double", "triple", "quad")
      .optional(),
  }).optional(),

  amenities: Joi.array()
    .items(Joi.string().lowercase().trim())
    .unique()
    .optional(),
});

// ── Availability schema ───────────────────────────────────────
const availabilitySchema = Joi.object({
  availableRooms: Joi.number().min(0).required(),
});

function parseListingBody(body, isUpdate = false) {
  if (body.address && typeof body.address === "object" && body.rooms && typeof body.rooms === "object") {
    return body;
  }

  const parsed = {};

  // Scalar fields
  if (body.title         !== undefined) parsed.title         = body.title;
  if (body.description   !== undefined) parsed.description   = body.description;
  if (body.pricePerMonth !== undefined && body.pricePerMonth !== "") {
    parsed.pricePerMonth = Number(body.pricePerMonth);
  }

  // Nested: address
  if (body.street !== undefined || body.city !== undefined || body.state !== undefined || body.pincode !== undefined) {
    parsed.address = {};
    if (body.street  !== undefined) parsed.address.street  = body.street;
    if (body.city    !== undefined) parsed.address.city    = body.city;
    if (body.state   !== undefined) parsed.address.state   = body.state;
    if (body.pincode !== undefined) parsed.address.pincode = body.pincode;
  }

  // Nested: rooms
  if (body.availableRooms !== undefined || body.roomType !== undefined) {
    parsed.rooms = {};
    if (body.availableRooms !== undefined && body.availableRooms !== "") {
      parsed.rooms.availableRooms = Number(body.availableRooms);
    }
    if (body.roomType !== undefined) parsed.rooms.roomType = body.roomType;
  }

  // Amenities
  if (body.amenities !== undefined) {
    if (Array.isArray(body.amenities)) {
      parsed.amenities = body.amenities.map((a) => String(a).trim()).filter(Boolean);
    } else if (typeof body.amenities === "string") {
      parsed.amenities = body.amenities.trim()
        ? body.amenities.split(",").map((a) => a.trim()).filter(Boolean)
        : [];
    } else {
      parsed.amenities = [body.amenities];
    }
  } else if (!isUpdate) {
    parsed.amenities = [];
  }

  return parsed;
}

export {
  listingSchema,
  updateListingSchema,
  availabilitySchema,
  parseListingBody,
};