import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export class PGListingService {

  static async createListing(data, ownerId) {
    const listing = await PGListing.create({ ...data, owner: ownerId, status: "approved" });
    return listing;
  }

  static async getListings(query = {}) {
    const filter = { isDeleted: { $ne: true } };

    /* Search — title, city, state (escaped) */
    if (query.search?.trim()) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { title:           { $regex: safe, $options: "i" } },
        { "address.city":  { $regex: safe, $options: "i" } },
        { "address.state": { $regex: safe, $options: "i" } },
      ];
    }

    /* Location filter (escaped) */
    const location = query.location || query.city;
    if (location && location !== "All" && location.trim()) {
      const safeLoc = escapeRegex(location.trim());
      const locConditions = [
        { "address.city":  { $regex: safeLoc, $options: "i" } },
        { "address.state": { $regex: safeLoc, $options: "i" } },
      ];
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

    /* Amenities */
    if (query.amenities?.length > 0) {
      const amenitiesArray = Array.isArray(query.amenities)
        ? query.amenities
        : query.amenities.split(",").filter(Boolean);

      if (amenitiesArray.length > 0) {
        filter.amenities = { $all: amenitiesArray.map((a) => a.toLowerCase().trim()) };
      }
    }

    /* Sort */
    const sortMap = {
      priceLow:  { pricePerMonth: 1 },
      priceHigh: { pricePerMonth: -1 },
      newest:    { createdAt: -1 },
      oldest:    { createdAt: 1 },
    };
    const sort = sortMap[query.sort] ?? { createdAt: -1 };

    /* Pagination */
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip  = (page - 1) * limit;

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
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    };
  }

  // ... baaki methods (getListingById, getOwnerListings, updateListing, deleteListing, updateAvailability) same rehne do
/* ── Get single listing ──────────────────────────────────── */

  static async getListingById(id) {
    const listing = await PGListing.findById(id)
      .populate("owner", "name email phone");

    if (!listing || listing.isDeleted) {
      throw new APIError("Listing not found", 404);
    }
    return listing;
  }

  /* ── Owner listings ──────────────────────────────────────── */

  static async getOwnerListings(ownerId) {
    return PGListing.find({ owner: ownerId, isDeleted: { $ne: true } })
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .lean();
  }

  /* ── Update listing ──────────────────────────────────────── */

  static async updateListing(listingId, data, userId) {
    const listing = await PGListing.findById(listingId);
    if (!listing)                            throw new APIError("Listing not found", 404);
    if (listing.isDeleted)                   throw new APIError("Listing not found", 404);
    if (listing.owner.toString() !== userId) throw new APIError("You can only edit your own listing", 403);

    if (data.images?.length > 0) {
      listing.images = [...listing.images, ...data.images];
      delete data.images;
    }

    if (data.address) {
      listing.address = { ...listing.address.toObject(), ...data.address };
    }

    if (data.rooms) {
      listing.rooms = { ...listing.rooms.toObject(), ...data.rooms };
    }

    // Remaining scalar fields
    const SCALAR_FIELDS = ["title", "description", "pricePerMonth", "amenities"];
    SCALAR_FIELDS.forEach((field) => {
      if (data[field] !== undefined) listing[field] = data[field];
    });

    await listing.save();
    return listing;
  }

  /* ── Delete listing (soft delete) ───────────────────────── */
  // FIX: admin can delete any listing — owner can only delete their own
  static async deleteListing(id, userId, role) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);

    if (role !== "admin" && listing.owner.toString() !== userId) {
      throw new APIError("Unauthorized — you can only delete your own listing", 403);
    }

    listing.isDeleted = true;
    listing.deletedAt = new Date();
    await listing.save();
  }

  /* ── Update availability ─────────────────────────────────── */

  static async updateAvailability(id, ownerId, availableRooms) {
    const listing = await PGListing.findById(id);
    if (!listing || listing.isDeleted) throw new APIError("Listing not found", 404);
    if (listing.owner.toString() !== ownerId) throw new APIError("Unauthorized", 403);

    listing.rooms.availableRooms = availableRooms;
    await listing.save();
    return listing;
  }
}