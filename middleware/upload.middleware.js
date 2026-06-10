import multer from "multer";
import { storage } from "../config/cloudinary.js";

// FIX: fileFilter mein webp aur avif allow kiya
// Yeh client-side check hai — Cloudinary ka allowed_formats backend check hai
const fileFilter = (_req, file, cb) => {
  const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Image format not supported. Allowed: JPG, PNG, WebP, AVIF. Got: ${file.mimetype}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files:    10,               // max 10 images per listing
  },
});

export default upload;