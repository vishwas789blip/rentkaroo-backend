import mongoose from 'mongoose';

const pgListingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    title: {
      type: String,
      required: true
    },

    images: [
      {
        url: String,
        publicId: String
      }
    ],

    description: {
      type: String,
      required: true
    },

    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }   // ✅ changed
    },

    pricePerMonth: {
      type: Number,
      required: true,
      min: 0
    },

    rooms: {
      availableRooms: {
        type: Number,
        required: true,
        min: 0
      },
      roomType: {
        type: String,
        enum: ['single', 'double', 'triple', 'quad'],
        required: true
      }
    },

    amenities: [
      {
        type: String,
        enum: [
          'wifi',
          'ac',
          'parking',
          'laundry',
          'kitchen',
          'garden',
          'gym',
          'security',
          'electricity bill'  
        ]
      }
    ],

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model('PGListing', pgListingSchema);
