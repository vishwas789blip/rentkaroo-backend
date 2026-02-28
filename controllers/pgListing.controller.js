import Joi from 'joi';
import { PGListingService } from '../services/pgListing.service.js';
import { validate } from '../utils/validate.js';

const createListingSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),

  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().required()
  }).required(),

  pricePerMonth: Joi.number().required(),

  rooms: Joi.object({
    availableRooms: Joi.number().required(),
    roomType: Joi.string()
      .valid('single', 'double', 'triple', 'quad')
      .required()
  }).required(),

  amenities: Joi.array().items(
    Joi.string().valid(
      'wifi',
      'ac',
      'parking',
      'laundry',
      'kitchen',
      'garden',
      'gym',
      'security',
      'electricity bill'
    )
  )
});

// Create Listing (Role Protected)
export const createListing = async (req, res) => {
  try {
    // 1. Manually reconstruct the object structure for Joi
    const parsedBody = {
      title: req.body.title,
      description: req.body.description,
      pricePerMonth: Number(req.body.pricePerMonth),
      address: {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
      },
      rooms: {
        availableRooms: Number(req.body.availableRooms),
        roomType: req.body.roomType,
      },
      // Multer/Express handles multiple fields with same name as an array
      amenities: Array.isArray(req.body.amenities) 
        ? req.body.amenities 
        : req.body.amenities ? [req.body.amenities] : [],
    };

    // 2. Validate against Joi Schema
    const value = validate(createListingSchema, parsedBody);

    // 3. Handle Images from Multer
    const images = req.files?.map(file => ({
      url: file.path,        // Cloudinary URL
      publicId: file.filename, // Cloudinary ID
    })) || [];

    // 4. Save to Database
    const listing = await PGListingService.createListing(
      { ...value, images },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: { listing },
    });

  } catch (error) {
    console.log("🔥 Backend Validation Error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message, // This will show which specific Joi field failed
    });
  }
};

// Other methods clean and safe
export const getListings = async (req, res) => {
  try {
    const result = await PGListingService.getListings(req.query);

    res.status(200).json({
      success: true,
      message: 'Listings retrieved successfully',
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

export const getListing = async (req, res) => {
  const listing = await PGListingService.getListingById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Listing retrieved successfully',
    data: { listing }
  });
};

export const deleteListing = async (req, res) => {
  await PGListingService.deleteListing(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Listing deleted successfully'
  });
};