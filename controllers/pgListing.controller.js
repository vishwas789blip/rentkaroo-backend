import Joi from "joi";
import { PGListingService } from "../services/pgListing.service.js";
import { validate } from "../utils/validate.js";

/* ================= CREATE / UPDATE SCHEMA ================= */

const listingSchema = Joi.object({

  title: Joi.string().min(3).max(120).required(),

  description: Joi.string().min(10).required(),

  pricePerMonth: Joi.number().min(1000).required(),

  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required()
  }).required(),

  rooms: Joi.object({
    availableRooms: Joi.number().min(1).required(),
    roomType: Joi.string()
      .valid("single", "double", "triple", "quad")
      .required()
  }).required(),

  amenities: Joi.array().items(
    Joi.string().valid(
      "wifi",
      "ac",
      "parking",
      "laundry",
      "kitchen",
      "garden",
      "gym",
      "security",
      "electricity bill"
    )
  )

});

/* ================= CREATE LISTING ================= */

export const createListing = async (req, res) => {

  try {

    const parsedBody = {
      title: req.body.title,
      description: req.body.description,
      pricePerMonth: Number(req.body.pricePerMonth),

      address: {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode
      },

      rooms: {
        availableRooms: Number(req.body.availableRooms),
        roomType: req.body.roomType
      },

      amenities: Array.isArray(req.body.amenities)
        ? req.body.amenities
        : req.body.amenities
        ? [req.body.amenities]
        : []
    };

    const value = validate(listingSchema, parsedBody);

    const images =
      req.files?.map(file => ({
        url: file.path,
        publicId: file.filename
      })) || [];

    const listing = await PGListingService.createListing(
      { ...value, images },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: { listing }
    });

  } catch (error) {

    console.error("CREATE LISTING ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message
    });

  }

};

export const updateListing = async (req, res) => {

  try {

    const parsedBody = {
      title: req.body.title,
      description: req.body.description,
      pricePerMonth: Number(req.body.pricePerMonth),

      address: {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode
      },

      rooms: {
        availableRooms: Number(req.body.availableRooms),
        roomType: req.body.roomType
      }
    };
e
    const value = validate(listingSchema, parsedBody);

    const listing = await PGListingService.updateListing(
      req.params.id,
      value,
      req.user.id   // logged-in user id
    );

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: listing
    });

  } catch (error) {

    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });

  }

};

/* ================= GET ALL LISTINGS ================= */

export const getListings = async (req, res) => {

  try {

    const result = await PGListingService.getListings(req.query);

    res.status(200).json({
      success: true,
      message: "Listings retrieved successfully",
      data: result
    });

  } catch (error) {

    console.error("GET LISTINGS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

/* ================= OWNER LISTINGS ================= */

export const getOwnerListings = async (req, res) => {

  const listings = await PGListingService.getOwnerListings(req.user.id);

  res.status(200).json({
    success: true,
    message: "Owner listings retrieved successfully",
    data: listings
  });

};

/* ================= GET SINGLE LISTING ================= */

export const getListing = async (req, res) => {

  const listing = await PGListingService.getListingById(req.params.id);

  res.status(200).json({
    success: true,
    message: "Listing retrieved successfully",
    data: { listing }
  });

};

/* ================= DELETE LISTING ================= */

export const deleteListing = async (req, res) => {

  await PGListingService.deleteListing(req.params.id, req.user.id,req.user.role);

  res.status(200).json({
    success: true,
    message: "Listing deleted successfully"
  });

};