import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class PGListingService {

  /* ─────────────────────────────────────────────
     Create listing
  ───────────────────────────────────────────── */

  static async createListing(data, ownerId) {
    const listing = await PGListing.create({ ...data, owner: ownerId });
    return listing;
  }

  /* ─────────────────────────────────────────────
     Get listings  (filters + pagination)
  ───────────────────────────────────────────── */

  static async getListings(query = {}) {
    const filter = { isDeleted: { $ne: true } };

    /* Search — title, city, state */
    if (query.search?.trim()) {
      filter.$or = [
        { title:          { $regex: query.search, $options: "i" } },
        { "address.city":  { $regex: query.search, $options: "i" } },
        { "address.state": { $regex: query.search, $options: "i" } },
      ];
    }

    /* Location filter (city OR state) */
    const location = query.location || query.city;
    if (location && location !== "All" && location.trim()) {
      const locConditions = [
        { "address.city":  { $regex: location, $options: "i" } },
        { "address.state": { $regex: location, $options: "i" } },
      ];

      // Merge with existing $or using $and to avoid overwriting search filter
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: locConditions }];
        delete filter.$or;
      } else {
        filter.$or = locConditions;
      }
    }

    /* Room type */
    if (query.roomType) {
      filter["rooms.roomType"] = query.roomType;
    }

    /* Price range */
    if (query.minPrice || query.maxPrice) {
      filter.pricePerMonth = {};
      if (query.minPrice) filter.pricePerMonth.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.pricePerMonth.$lte = Number(query.maxPrice);
    }

    /* Amenities — $all means listing must have every requested amenity */
    if (query.amenities?.length > 0) {
      const amenitiesArray = Array.isArray(query.amenities)
        ? query.amenities
        : query.amenities.split(",").filter(Boolean);

      if (amenitiesArray.length > 0) {
        filter.amenities = { $all: amenitiesArray.map((a) => a.toLowerCase().trim()) };
      }
    }

    /* Sorting */
    const sortMap = {
      priceLow:  { pricePerMonth: 1 },
      priceHigh: { pricePerMonth: -1 },
      newest:    { createdAt: -1 },
      oldest:    { createdAt: 1 },
    };
    const sort = sortMap[query.sort] ?? { createdAt: -1 };

    /* Pagination */
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10)); // cap at 50
    const skip  = (page - 1) * limit;

    /* Execute — run count and fetch in parallel for performance */
    const [listings, total] = await Promise.all([
      PGListing.find(filter)
        .populate("owner", "name email phone")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PGListing.countDocuments(filter),
    ]);

    return {
      listings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /* ─────────────────────────────────────────────
     Get single listing
  ───────────────────────────────────────────── */

  static async getListingById(id) {
    const listing = await PGListing.findById(id)
      .populate("owner", "name email phone");

    if (!listing || listing.isDeleted) {
      throw new APIError("Listing not found", 404);
    }
    return listing;
  }

  /* ─────────────────────────────────────────────
     Owner's listings
  ───────────────────────────────────────────── */

  static async getOwnerListings(ownerId) {
    return PGListing.find({ owner: ownerId, isDeleted: { $ne: true } })
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ─────────────────────────────────────────────
     Update listing
     Uses Object.assign so adding new model fields
     doesn't require editing this method.
  ───────────────────────────────────────────── */

  static async updateListing(listingId, data, userId) {
    const listing = await PGListing.findById(listingId);
    if (!listing)                            throw new APIError("Listing not found", 404);
    if (listing.isDeleted)                   throw new APIError("Listing not found", 404);
    if (listing.owner.toString() !== userId) throw new APIError("You can only edit your own listing", 403);

    // Merge new images with existing ones instead of replacing
    if (data.images?.length > 0) {
      listing.images = [...listing.images, ...data.images];
      delete data.images;
    }

    // Assign all other fields dynamically — no per-field maintenance needed
    Object.assign(listing, data);

    await listing.save();
    return listing;
  }

  /* ─────────────────────────────────────────────
     Delete listing  (soft delete)
  ───────────────────────────────────────────── */

  static async deleteListing(id, ownerId, role) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

    if (listing.owner.toString() !== ownerId && role !== "admin") {
      throw new APIError("Unauthorized", 403);
    }

    listing.isDeleted   = true;
    listing.deletedAt   = new Date();
    await listing.save();
  }

  /* ─────────────────────────────────────────────
     Update availability
  ───────────────────────────────────────────── */

  static async updateAvailability(id, ownerId, availableRooms) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);
    if (listing.owner.toString() !== ownerId) throw new APIError("Unauthorized", 403);

    listing.rooms.availableRooms = availableRooms;
    await listing.save();
    return listing;
  }

  /* ─────────────────────────────────────────────
     Admin — approve
  ───────────────────────────────────────────── */

  static async approveListing(id) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

    listing.status     = "approved";
    listing.isVerified = true;
    await listing.save();
    return listing;
  }

  /* ─────────────────────────────────────────────
     Admin — reject
  ───────────────────────────────────────────── */

  static async rejectListing(id) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

    listing.status = "rejected";
    await listing.save();
    return listing;
  }
}