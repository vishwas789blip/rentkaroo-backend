import { PGListingService } from "../services/pgListing.service.js";
import { APIError } from "../middleware/errorHandler.js";

/* ─────────────────────────────────────────────
   Create listing
   POST /api/v1/pg-listings
───────────────────────────────────────────── */
export const createListing = async (req, res) => {
  const value = req.body;

  // Multer handles image arrays
  const images = req.files?.map((file) => ({
    url:      file.path,
    publicId: file.filename,
  })) ?? [];

  if (images.length === 0 && process.env.NODE_ENV === "development") {
    images.push({
      url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      publicId: "sample_id"
    });
  } else if (images.length === 0) {
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
  // 🔥 FIXED: Validation router middleware par shift ho gayi hai
  const value = req.body;

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
   GET /api/v1/pg-listings
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
  // 🔥 FIXED: Local validate block removed, uses pre-validated req.body smoothly
  const listing = await PGListingService.updateAvailability(
    req.params.id,
    req.user.id,
    req.body.availableRooms
  );

  res.status(200).json({
    success: true,
    message: "Availability updated successfully",
    data:    { listing },
  });
};
