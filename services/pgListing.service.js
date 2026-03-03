import PGListing from '../models/PGListing.js';
import { APIError } from '../middleware/errorHandler.js';

export class PGListingService {

  static async createListing(data, ownerId) {
    return PGListing.create({ ...data, owner: ownerId });
  }

  static async getListings(query) {
  const filter = { isDeleted: { $ne: true } };

  if (query.location) {
    filter.$or = [
      { "address.city": { $regex: query.location, $options: "i" } },
      { "address.state": { $regex: query.location, $options: "i" } }
    ];
  }

  return PGListing.find(filter);
  }

  static async getListingById(id) {
    const listing = await PGListing.findById(id);

    if (!listing || listing.isDeleted) {
      throw new APIError('Listing not found', 404);
    }

    return listing;
  }

  static async getOwnerListings(ownerId) {
  return PGListing.find({
    owner: ownerId,
    isDeleted: { $ne: true }
  });
  }

  static async deleteListing(id, ownerId) {
    const listing = await PGListing.findById(id);

    if (!listing) throw new APIError('Listing not found', 404);

    if (listing.owner.toString() !== ownerId)
      throw new APIError('Unauthorized', 403);

    listing.isDeleted = true;
    await listing.save();
  }
}