import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class PGListingService {

  /* ================= CREATE LISTING ================= */

  static async createListing(data, ownerId) {

    const listing = await PGListing.create({
      ...data,
      owner: ownerId,
      status: "pending"
    });

    return listing;
  }


  /* ================= GET LISTINGS ================= */

  static async getListings(query) {

    const filter = {
      isDeleted: { $ne: true },
      status: "approved"
    };

    if (query.location) {
      filter.$or = [
        { "address.city": { $regex: query.location, $options: "i" } },
        { "address.state": { $regex: query.location, $options: "i" } }
      ];
    }

    if (query.roomType) {
      filter["rooms.roomType"] = query.roomType;
    }

    if (query.minPrice || query.maxPrice) {

      filter.pricePerMonth = {};

      if (query.minPrice) {
        filter.pricePerMonth.$gte = Number(query.minPrice);
      }

      if (query.maxPrice) {
        filter.pricePerMonth.$lte = Number(query.maxPrice);
      }

    }

    if (query.amenities) {

      const amenities = query.amenities.split(",");

      filter.amenities = { $all: amenities };

    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const listings = await PGListing.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await PGListing.countDocuments(filter);

    return {
      listings,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };

  }


  /* ================= GET SINGLE LISTING ================= */

  static async getListingById(id) {

    const listing = await PGListing.findById(id);

    if (!listing || listing.isDeleted) {
      throw new APIError("Listing not found", 404);
    }

    return listing;
  }


  /* ================= OWNER LISTINGS ================= */

  static async getOwnerListings(ownerId) {

    return PGListing.find({
      owner: ownerId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 });

  }


  /* ================= UPDATE LISTING ================= */

  static async updateListing(id, data, ownerId) {

    const listing = await PGListing.findById(id);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    if (listing.owner.toString() !== ownerId) {
      throw new APIError("Unauthorized", 403);
    }

    Object.assign(listing, data);

    await listing.save();

    return listing;

  }


  /* ================= DELETE LISTING ================= */

  static async deleteListing(id, ownerId) {

    const listing = await PGListing.findById(id);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    if (listing.owner.toString() !== ownerId) {
      throw new APIError("Unauthorized", 403);
    }

    listing.isDeleted = true;

    await listing.save();

    return { message: "Listing deleted successfully" };

  }


  /* ================= UPDATE AVAILABILITY ================= */

  static async updateAvailability(id, ownerId, availableRooms) {

    const listing = await PGListing.findById(id);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    if (listing.owner.toString() !== ownerId) {
      throw new APIError("Unauthorized", 403);
    }

    listing.rooms.availableRooms = availableRooms;

    await listing.save();

    return listing;

  }


  /* ================= ADMIN APPROVE ================= */

  static async approveListing(id) {

    const listing = await PGListing.findById(id);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    listing.status = "approved";

    await listing.save();

    return listing;

  }


  /* ================= ADMIN REJECT ================= */

  static async rejectListing(id) {

    const listing = await PGListing.findById(id);

    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    listing.status = "rejected";

    await listing.save();

    return listing;

  }

}