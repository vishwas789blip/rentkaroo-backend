import Joi from "joi";
import { PGListingService } from "../services/pgListing.service.js";
import { APIError } from "../middleware/errorHandler.js";

/* ─────────────────────────────────────────────
   Create listing
   POST /api/v1/pg-listings
───────────────────────────────────────────── */

export const createListing = async (req, res) => {
  const parsed = parseListingBody(req.body);
  const value  = validateBody(listingSchema, parsed);

  const images = req.files?.map((file) => ({
    url:      file.path,
    publicId: file.filename,
  })) ?? [];

  if (images.length === 0) {
    throw new APIError("At least one image is required", 400);
  }

  const listing = await PGListingService.createListing(
    { ...value, images },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Listing created successfully",
    data:    { listing },
  });
};

/* ─────────────────────────────────────────────
   Update listing
   PUT /api/v1/pg-listings/:id
───────────────────────────────────────────── */

export const updateListing = async (req, res) => {
  const parsed = parseListingBody(req.body);
  const value  = validateBody(updateListingSchema, parsed);

  // Attach any newly uploaded images (optional on update)
  const newImages = req.files?.map((file) => ({
    url:      file.path,
    publicId: file.filename,
  })) ?? [];

  const listing = await PGListingService.updateListing(
    req.params.id,
    newImages.length > 0 ? { ...value, images: newImages } : value,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Listing updated successfully",
    data:    { listing },
  });
};

/* ─────────────────────────────────────────────
   Get all listings (with filters + pagination)
   GET /api/v1/pg-listings?search=&city=&minPrice=&maxPrice=&amenities=&sort=&page=&limit=
───────────────────────────────────────────── */

export const getListings = async (req, res) => {
  const { search, city, location, minPrice, maxPrice, amenities, roomType, sort, page, limit } =
    req.query;

  const filters = {
    ...(search   && { search }),
    ...(city     && city     !== "All" && { city }),
    ...(location && location !== "All" && { location }),
    ...(minPrice && { minPrice: Number(minPrice) }),
    ...(maxPrice && { maxPrice: Number(maxPrice) }),
    ...(roomType && { roomType }),
    ...(sort     && { sort }),
    ...(page     && { page: Number(page) }),
    ...(limit    && { limit: Number(limit) }),
    ...(amenities && {
      amenities: Array.isArray(amenities) ? amenities : amenities.split(","),
    }),
  };

  const result = await PGListingService.getListings(filters);

  res.status(200).json({
    success: true,
    message: "Listings retrieved successfully",
    data:    result,
  });
};

/* ─────────────────────────────────────────────
   Get single listing
   GET /api/v1/pg-listings/:id
───────────────────────────────────────────── */

export const getListing = async (req, res) => {
  const listing = await PGListingService.getListingById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Listing retrieved successfully",
    data:    { listing },
  });
};

/* ─────────────────────────────────────────────
   Get owner's own listings
   GET /api/v1/pg-listings/owner/my-listings
───────────────────────────────────────────── */

export const getOwnerListings = async (req, res) => {
  const listings = await PGListingService.getOwnerListings(req.user.id);

  res.status(200).json({
    success: true,
    message: "Owner listings retrieved successfully",
    data:    { listings },
  });
};

/* ─────────────────────────────────────────────
   Delete listing
   DELETE /api/v1/pg-listings/:id
───────────────────────────────────────────── */

export const deleteListing = async (req, res) => {
  await PGListingService.deleteListing(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    message: "Listing deleted successfully",
  });
};

/* ─────────────────────────────────────────────
   Update room availability
   PATCH /api/v1/pg-listings/:id/availability
───────────────────────────────────────────── */

export const updateAvailability = async (req, res) => {
  const { error, value } = availabilitySchema.validate(req.body);
  if (error) throw new APIError(error.details[0].message, 400);

  const listing = await PGListingService.updateAvailability(
    req.params.id,
    req.user.id,
    value.availableRooms
  );

  res.status(200).json({
    success: true,
    message: "Availability updated successfully",
    data:    { listing },
  });
};

/* ─────────────────────────────────────────────
   Admin — approve listing
   PATCH /api/v1/pg-listings/:id/approve
───────────────────────────────────────────── */

export const approveListing = async (req, res) => {
  const listing = await PGListingService.approveListing(req.params.id);

  res.status(200).json({
    success: true,
    message: "Listing approved successfully",
    data:    { listing },
  });
};

/* ─────────────────────────────────────────────
   Admin — reject listing
   PATCH /api/v1/pg-listings/:id/reject
───────────────────────────────────────────── */

export const rejectListing = async (req, res) => {
  const listing = await PGListingService.rejectListing(req.params.id);

  res.status(200).json({
    success: true,
    message: "Listing rejected successfully",
    data:    { listing },
  });
};