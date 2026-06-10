import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const filename = file.originalname.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");

    return {
      folder:          "pg_listings",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
      public_id:       `${Date.now()}_${filename}`,
      transformation:  [{ quality: "auto", fetch_format: "auto" }],
    };
  },
});

export default cloudinary;