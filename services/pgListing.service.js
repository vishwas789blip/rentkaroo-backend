import PGListing from "../models/PGListing.js";
import { APIError } from "../middleware/errorHandler.js";

export class PGListingService {

  /* ================= CREATE LISTING ================= */

  static async createListing(data, ownerId) {
    const listing = await PGListing.create({
      ...data,
      owner: ownerId
    });
    return listing;
  }


  /* ================= GET LISTINGS ================= */

  static async getListings(query) {

    const filter = {
      isDeleted: { $ne: true }
    };

    /* ================= SEARCH ================= */

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { "address.city": { $regex: query.search, $options: "i" } },
        { "address.state": { $regex: query.search, $options: "i" } }
      ];
    }

    /* ================= LOCATION ================= */

    if (query.location) {
      filter.$or = [
        { "address.city": { $regex: query.location, $options: "i" } },
        { "address.state": { $regex: query.location, $options: "i" } }
      ];
    }

    /* ================= ROOM TYPE ================= */

    if (query.roomType) {
      filter["rooms.roomType"] = query.roomType;
    }

    /* ================= PRICE RANGE ================= */

    if (query.minPrice || query.maxPrice) {

      filter.pricePerMonth = {};

      if (query.minPrice) {
        filter.pricePerMonth.$gte = Number(query.minPrice);
      }

      if (query.maxPrice) {
        filter.pricePerMonth.$lte = Number(query.maxPrice);
      }

    }

    /* ================= AMENITIES ================= */

    if (query.amenities) {

      const amenities = Array.isArray(query.amenities)
        ? query.amenities
        : query.amenities.split(",");

      filter.amenities = { $all: amenities };

    }

    /* ================= SORTING ================= */

    let sort = { createdAt: -1 };

    if (query.sort === "priceLow") {
      sort = { pricePerMonth: 1 };
    }

    if (query.sort === "priceHigh") {
      sort = { pricePerMonth: -1 };
    }

    /* ================= PAGINATION ================= */

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const skip = (page - 1) * limit;

    /* ================= DATABASE QUERY ================= */

    const listings = await PGListing.find(filter)
      .populate("owner", "name email")
      .skip(skip)
      .limit(limit)
      .sort(sort);

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

    const listing = await PGListing
      .findById(id)
      .populate("owner", "name email");

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
    })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

  }


  /* ================= UPDATE LISTING ================= */

  static async updateListing(listingId, data, userId) {
    const listing = await PGListing.findById(listingId);
    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    /* OWNER CHECK */

    if (listing.owner.toString() !== userId) {
      throw new APIError(
        "You can only edit your own listing",
        403
      );
    }

    listing.title = data.title;
    listing.description = data.description;
    listing.pricePerMonth = data.pricePerMonth;
    listing.address = data.address;
    listing.rooms = data.rooms;
    listing.amenities = data.amenities;

    await listing.save();
    return listing;

  }


  /* ================= DELETE LISTING ================= */

  static async deleteListing(id, ownerId, role) {
    const listing = await PGListing.findById(id);
    if (!listing) {
      throw new APIError("Listing not found", 404);
    }

    /* OWNER OR ADMIN CHECK */
    if (listing.owner.toString() !== ownerId && role !== "admin") {
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