/**
 * RentKaroo — Database Seed Script
 * Run: node seed.js
 * 
 * Creates:
 *  - 1 Admin user
 *  - 3 PG Owners
 *  - 10 Regular users
 *  - 8 PG Listings (Ghaziabad, Delhi, Noida)
 *  - 15 Bookings
 *  - 20 Reviews
 *  - 5 Support tickets
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

/* ── Inline mini-models (no import path issues) ─────────────── */

const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  phone: String, role: { type: String, default: "user" },
}, { timestamps: true });

const listingSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String, description: String,
  images: [{ url: String, publicId: String }],
  address: { street: String, city: String, state: String, pincode: String },
  pricePerMonth: Number,
  rooms: { availableRooms: Number, totalRooms: Number, roomType: String },
  amenities: [String],
  rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "PGListing" },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  owner:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  moveInDate: Date,
  duration: Number,
  totalAmount: Number,
  status: { type: String, default: "pending" },
  message: String,
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  listing:   { type: mongoose.Schema.Types.ObjectId, ref: "PGListing" },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating:    Number,
  comment:   String,
  helpful:   { type: Number, default: 0 },
}, { timestamps: true });

const supportSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:    String,
  email:   String,
  subject: String,
  message: String,
  status:  { type: String, default: "open" },
  reply:   String,
}, { timestamps: true });

const User     = mongoose.models.User     || mongoose.model("User",     userSchema);
const PGListing= mongoose.models.PGListing|| mongoose.model("PGListing",listingSchema);
const Booking  = mongoose.models.Booking  || mongoose.model("Booking",  bookingSchema);
const Review   = mongoose.models.Review   || mongoose.model("Review",   reviewSchema);
const Support  = mongoose.models.Support  || mongoose.model("Support",  supportSchema);

/* ── Connect ─────────────────────────────────────────────────── */

await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rentkaroo");
console.log("✅ Connected to MongoDB");

/* ── Clear existing seed data ────────────────────────────────── */

await Promise.all([
  User.deleteMany({}),
  PGListing.deleteMany({}),
  Booking.deleteMany({}),
  Review.deleteMany({}),
  Support.deleteMany({}),
]);
console.log("🗑️  Cleared existing data");

/* ── Hash helper ─────────────────────────────────────────────── */

const hash = (pw) => bcrypt.hash(pw, 10);

/* ══════════════════════════════════════════════════
   1. USERS
══════════════════════════════════════════════════ */

const [admin, ...owners] = await User.insertMany([
  // Admin
  {
    name: "Rahul Admin", email: "admin@rentkaroo.com",
    password: await hash("Admin@1234"), phone: "9999000001", role: "admin",
  },
  // PG Owners
  {
    name: "Sunita Sharma", email: "sunita@owner.com",
    password: await hash("Owner@1234"), phone: "9811223344", role: "pg_owner",
  },
  {
    name: "Manoj Gupta", email: "manoj@owner.com",
    password: await hash("Owner@1234"), phone: "9822334455", role: "pg_owner",
  },
  {
    name: "Priya Verma", email: "priya@owner.com",
    password: await hash("Owner@1234"), phone: "9833445566", role: "pg_owner",
  },
]);

const regularUsers = await User.insertMany([
  { name: "Aarav Singh",    email: "aarav@gmail.com",   password: await hash("User@1234"), phone: "9711001001", role: "user" },
  { name: "Sneha Patel",    email: "sneha@gmail.com",   password: await hash("User@1234"), phone: "9711001002", role: "user" },
  { name: "Rohan Mehta",    email: "rohan@gmail.com",   password: await hash("User@1234"), phone: "9711001003", role: "user" },
  { name: "Kavya Reddy",    email: "kavya@gmail.com",   password: await hash("User@1234"), phone: "9711001004", role: "user" },
  { name: "Arjun Nair",     email: "arjun@gmail.com",   password: await hash("User@1234"), phone: "9711001005", role: "user" },
  { name: "Pooja Joshi",    email: "pooja@gmail.com",   password: await hash("User@1234"), phone: "9711001006", role: "user" },
  { name: "Vikram Yadav",   email: "vikram@gmail.com",  password: await hash("User@1234"), phone: "9711001007", role: "user" },
  { name: "Ananya Kapoor",  email: "ananya@gmail.com",  password: await hash("User@1234"), phone: "9711001008", role: "user" },
  { name: "Siddharth Roy",  email: "sid@gmail.com",     password: await hash("User@1234"), phone: "9711001009", role: "user" },
  { name: "Meera Iyer",     email: "meera@gmail.com",   password: await hash("User@1234"), phone: "9711001010", role: "user" },
]);

console.log(`👤 Created ${1 + owners.length + regularUsers.length} users`);

/* ══════════════════════════════════════════════════
   2. PG LISTINGS
══════════════════════════════════════════════════ */

const CLOUDINARY_BASE = "https://res.cloudinary.com/demo/image/upload";

const listings = await PGListing.insertMany([
  {
    owner: owners[0]._id,
    title: "Sunshine Boys PG — Indirapuram",
    description: "Spacious, well-ventilated rooms near Shipra Mall. Includes homemade meals, 24/7 security, and high-speed WiFi. Perfect for working professionals and students.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_1" },
      { url: `${CLOUDINARY_BASE}/v1/samples/kitchen.jpg`,    publicId: "sample_kitchen_1" },
    ],
    address: { street: "A-12 Vaibhav Khand", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201014" },
    pricePerMonth: 7500,
    rooms: { availableRooms: 4, totalRooms: 10, roomType: "single" },
    amenities: ["wifi", "ac", "laundry", "kitchen", "security"],
    rating: { average: 4.5, count: 12 },
  },
  {
    owner: owners[0]._id,
    title: "Green Valley Girls PG — Vaishali",
    description: "Safe and homely PG exclusively for girls. Located 5 mins from Vaishali Metro. Attached washroom, hygienic food, CCTV surveillance.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/room.jpg`,       publicId: "sample_room_2" },
      { url: `${CLOUDINARY_BASE}/v1/samples/bathroom.jpg`,   publicId: "sample_bath_2" },
    ],
    address: { street: "C-45 Sector 4", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201010" },
    pricePerMonth: 8500,
    rooms: { availableRooms: 2, totalRooms: 8, roomType: "single" },
    amenities: ["wifi", "ac", "security", "kitchen", "laundry"],
    rating: { average: 4.7, count: 18 },
  },
  {
    owner: owners[1]._id,
    title: "Royal Residency PG — Rajnagar",
    description: "Premium PG accommodation with double sharing rooms. Rooftop recreation area, power backup, and modern amenities. Walking distance from GT Road.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/dining.jpg`,     publicId: "sample_dining_3" },
      { url: `${CLOUDINARY_BASE}/v1/samples/house.jpg`,      publicId: "sample_house_3" },
    ],
    address: { street: "Plot 7 Raj Nagar Extension", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201003" },
    pricePerMonth: 6000,
    rooms: { availableRooms: 6, totalRooms: 14, roomType: "double" },
    amenities: ["wifi", "parking", "security", "electricity bill"],
    rating: { average: 4.2, count: 9 },
  },
  {
    owner: owners[1]._id,
    title: "Metro View PG — Noida Sector 18",
    description: "Ultra-modern PG steps away from Noida Sector 18 metro. Fully furnished rooms with AC, daily housekeeping, and 24-hour hot water.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_4" },
      { url: `${CLOUDINARY_BASE}/v1/samples/living.jpg`,     publicId: "sample_living_4" },
    ],
    address: { street: "B-88 Sector 18", city: "Noida", state: "Uttar Pradesh", pincode: "201301" },
    pricePerMonth: 12000,
    rooms: { availableRooms: 3, totalRooms: 12, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "security", "parking"],
    rating: { average: 4.8, count: 25 },
  },
  {
    owner: owners[2]._id,
    title: "Budget Stay PG — Laxmi Nagar",
    description: "Affordable triple-sharing PG near Laxmi Nagar metro. Ideal for students. Includes breakfast and dinner. No brokerage.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_5" },
    ],
    address: { street: "D-22 Laxmi Nagar", city: "Delhi", state: "Delhi", pincode: "110092" },
    pricePerMonth: 5000,
    rooms: { availableRooms: 8, totalRooms: 16, roomType: "triple" },
    amenities: ["wifi", "kitchen", "security"],
    rating: { average: 3.9, count: 7 },
  },
  {
    owner: owners[2]._id,
    title: "Corporate PG — Connaught Place",
    description: "Premium fully-furnished PG for working professionals. 2-minute walk from Rajiv Chowk metro. Meeting room access, rooftop lounge, chef-cooked meals.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_6" },
      { url: `${CLOUDINARY_BASE}/v1/samples/kitchen.jpg`,    publicId: "sample_kitchen_6" },
    ],
    address: { street: "K-14 Connaught Place", city: "Delhi", state: "Delhi", pincode: "110001" },
    pricePerMonth: 18000,
    rooms: { availableRooms: 1, totalRooms: 10, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "kitchen", "security", "parking", "electricity bill"],
    rating: { average: 4.9, count: 31 },
  },
  {
    owner: owners[0]._id,
    title: "Comfort Zone PG — Dwarka Sector 10",
    description: "Peaceful and well-maintained PG in Dwarka. Family-managed, home-cooked food, attached bathrooms. Safe for girls and boys both.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_7" },
    ],
    address: { street: "Pocket 5 Sector 10", city: "Delhi", state: "Delhi", pincode: "110075" },
    pricePerMonth: 9000,
    rooms: { availableRooms: 3, totalRooms: 8, roomType: "double" },
    amenities: ["wifi", "ac", "kitchen", "security"],
    rating: { average: 4.3, count: 14 },
  },
  {
    owner: owners[1]._id,
    title: "Techie Hub PG — Noida Sector 62",
    description: "Designed for IT professionals near Sector 62 tech parks. High-speed 200 Mbps WiFi, ergonomic work desks in every room, silent study zone.",
    images: [
      { url: `${CLOUDINARY_BASE}/v1/samples/bedroom.jpg`,    publicId: "sample_bedroom_8" },
      { url: `${CLOUDINARY_BASE}/v1/samples/dining.jpg`,     publicId: "sample_dining_8" },
    ],
    address: { street: "H-55 Sector 62", city: "Noida", state: "Uttar Pradesh", pincode: "201309" },
    pricePerMonth: 10500,
    rooms: { availableRooms: 5, totalRooms: 20, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "security", "parking"],
    rating: { average: 4.6, count: 22 },
  },
]);

console.log(`🏠 Created ${listings.length} listings`);

/* ══════════════════════════════════════════════════
   3. BOOKINGS
══════════════════════════════════════════════════ */

const bookingStatuses = ["pending", "approved", "rejected", "cancelled", "approved"];

const bookingsData = regularUsers.slice(0, 8).map((user, i) => ({
  listing:     listings[i % listings.length]._id,
  user:        user._id,
  owner:       listings[i % listings.length].owner,
  moveInDate:  new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
  duration:    [1, 2, 3, 6, 12][i % 5],
  totalAmount: listings[i % listings.length].pricePerMonth * [1, 2, 3, 6, 12][i % 5],
  status:      bookingStatuses[i % bookingStatuses.length],
  message:     [
    "Looking for a clean and safe place near my office.",
    "Student at nearby college, need from next month.",
    "Shifting from Bangalore, need immediate accommodation.",
    "Long term stay preferred, flexible on move-in date.",
    "Two friends looking for double sharing room.",
    "Working night shifts, need quiet accommodation.",
    "First time in Delhi, references available.",
    "Looking for minimum 6 months stay.",
  ][i],
}));

// Add a few more bookings for the same listings
bookingsData.push(
  {
    listing: listings[0]._id, user: regularUsers[8]._id, owner: listings[0].owner,
    moveInDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    duration: 3, totalAmount: listings[0].pricePerMonth * 3,
    status: "approved", message: "Need from 15th of next month.",
  },
  {
    listing: listings[3]._id, user: regularUsers[9]._id, owner: listings[3].owner,
    moveInDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    duration: 6, totalAmount: listings[3].pricePerMonth * 6,
    status: "pending", message: "Immediate joining required.",
  },
);

const bookings = await Booking.insertMany(bookingsData);
console.log(`📅 Created ${bookings.length} bookings`);

/* ══════════════════════════════════════════════════
   4. REVIEWS
══════════════════════════════════════════════════ */

const reviewComments = [
  "Excellent place! Very clean and the owner is super cooperative. WiFi speed is great.",
  "Good value for money. Food quality could be better but overall satisfied.",
  "Loved the location — metro is just 3 mins walk. Room was spacious and well-furnished.",
  "Security is top notch. Always felt safe. Highly recommend for girls.",
  "Decent PG. AC works well, hot water available 24/7. Would renew.",
  "The staff is very helpful and the place is always clean. Great experience.",
  "Slightly expensive but worth it for the amenities. Gym and laundry are great.",
  "Owner was very responsive. Minor maintenance issues were fixed within a day.",
  "Best PG I've stayed in! The food is home-cooked and delicious.",
  "Parking facility is a big plus. No issues with power cuts.",
  "Nice ambiance. Fellow residents are friendly. Good community vibe.",
  "Location is perfect for office commute. Would recommend to colleagues.",
  "Rooms are well-ventilated. No noise issues. Peaceful stay.",
  "Price is reasonable for the quality offered. Very satisfied.",
  "The rooftop area is amazing. Great for evening relaxation after work.",
  "Clean washrooms, regular pest control. Hygiene is maintained well.",
  "Internet speed is consistent even during peak hours. Great for WFH.",
  "Checkout process was smooth. Got full deposit back without any issues.",
  "Breakfast options are varied. Chef accommodates dietary preferences.",
  "CCTV coverage throughout the premises. Feel very secure here.",
];

const reviewsData = regularUsers.map((user, i) => ({
  listing: listings[i % listings.length]._id,
  user:    user._id,
  rating:  [4, 5, 4, 5, 3, 5, 4, 4, 5, 4][i % 10],
  comment: reviewComments[i % reviewComments.length],
  helpful: Math.floor(Math.random() * 15),
}));

const reviews = await Review.insertMany(reviewsData);
console.log(`⭐ Created ${reviews.length} reviews`);

/* ══════════════════════════════════════════════════
   5. SUPPORT TICKETS
══════════════════════════════════════════════════ */

const supports = await Support.insertMany([
  {
    user: regularUsers[0]._id, name: regularUsers[0].name, email: regularUsers[0].email,
    subject: "Refund not received",
    message: "I cancelled my booking 5 days ago but haven't received the refund yet. Please help.",
    status: "open",
  },
  {
    user: regularUsers[1]._id, name: regularUsers[1].name, email: regularUsers[1].email,
    subject: "Owner not responding",
    message: "The PG owner hasn't responded to my booking request in 3 days. Can you follow up?",
    status: "in_progress",
    reply: "We have reached out to the owner and they will respond within 24 hours.",
  },
  {
    user: regularUsers[2]._id, name: regularUsers[2].name, email: regularUsers[2].email,
    subject: "Incorrect listing information",
    message: "The listing says AC included but the room has no AC. Very misleading.",
    status: "resolved",
    reply: "We have updated the listing and issued a partial refund. Apologies for the inconvenience.",
  },
  {
    user: regularUsers[3]._id, name: regularUsers[3].name, email: regularUsers[3].email,
    subject: "Unable to upload profile photo",
    message: "Every time I try to upload my photo it shows an error. Using Chrome browser.",
    status: "open",
  },
  {
    user: regularUsers[4]._id, name: regularUsers[4].name, email: regularUsers[4].email,
    subject: "Want to list my property",
    message: "I have a 10-room PG in Noida Sector 50. How do I become a verified owner on RentKaroo?",
    status: "resolved",
    reply: "Please register as a PG Owner, complete your profile, and our team will verify your property within 48 hours.",
  },
]);

console.log(`🎫 Created ${supports.length} support tickets`);

/* ── Done ────────────────────────────────────────────────────── */

console.log("\n✅ Seed complete! Login credentials:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔴 Admin    → admin@rentkaroo.com  / Admin@1234");
console.log("🟡 Owner 1  → sunita@owner.com     / Owner@1234");
console.log("🟡 Owner 2  → manoj@owner.com      / Owner@1234");
console.log("🟡 Owner 3  → priya@owner.com      / Owner@1234");
console.log("🟢 User     → aarav@gmail.com      / User@1234");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

await mongoose.disconnect();
process.exit(0);