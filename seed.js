/**
 * RentKaroo — Database Seed Script (Schema-matched)
 * Run: node seed.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt   from "bcryptjs";

/* ══════════════════════════════════════════
   CONNECT
══════════════════════════════════════════ */
await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rentkaroo");
console.log("✅ Connected to MongoDB");

/* ══════════════════════════════════════════
   SCHEMAS  (matching your exact DB structure)
══════════════════════════════════════════ */

const userSchema = new mongoose.Schema({
  name:                  String,
  email:                 { type: String, unique: true },
  phone:                 String,
  password:              String,
  role:                  { type: String, default: "user" },
  isActive:              { type: Boolean, default: true },
  isVerified:            { type: Boolean, default: true },
  isDeleted:             { type: Boolean, default: false },
  verificationOTP:       String,
  verificationOTPExpiry: Date,
  loginAttempts:         { type: Number, default: 0 },
  refreshTokens:         { type: Array,  default: [] },
  lastLogin:             Date,
}, { timestamps: true });

const listingSchema = new mongoose.Schema({
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title:         String,
  description:   String,
  images:        [{ url: String, publicId: String }],
  address:       { street: String, city: String, state: String, pincode: String },
  pricePerMonth: Number,
  rooms:         { availableRooms: Number, totalRooms: Number, roomType: String },
  amenities:     [String],
  rating:        { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  isDeleted:     { type: Boolean, default: false },
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pgListing:     { type: mongoose.Schema.Types.ObjectId, ref: "PGListing" },
  pgOwner:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  checkInDate:   Date,
  checkOutDate:  Date,
  duration:      Number,
  numberOfRooms: { type: Number, default: 1 },
  totalPrice:    Number,
  status:        { type: String, default: "pending" },
  paymentStatus: { type: String, default: "pending" },
  reviewEligible:{ type: Boolean, default: false },
  guests:        { type: Array, default: [] },
  isDeleted:     { type: Boolean, default: false },
  expiresAt:     Date,
  message:       String,
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  pgListing:    { type: mongoose.Schema.Types.ObjectId, ref: "PGListing" },
  pgOwner:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating:       Number,
  comment:      String,
  helpfulCount: { type: Number, default: 0 },
  helpfulBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  images:       { type: Array, default: [] },
  isDeleted:    { type: Boolean, default: false },
}, { timestamps: true });

const supportSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name:        String,
  email:       String,
  subject:     String,
  message:     String,
  status:      { type: String, default: "open" },
  priority:    { type: String, default: "medium" },
  isDeleted:   { type: Boolean, default: false },
  attachments: { type: Array, default: [] },
  adminReply:  { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

const User      = mongoose.models.User      || mongoose.model("User",      userSchema);
const PGListing = mongoose.models.PGListing || mongoose.model("PGListing", listingSchema);
const Booking   = mongoose.models.Booking   || mongoose.model("Booking",   bookingSchema);
const Review    = mongoose.models.Review    || mongoose.model("Review",    reviewSchema);
const Support   = mongoose.models.Support   || mongoose.model("Support",   supportSchema);

/* ── Clear ───────────────────────────────────────────────────── */
await Promise.all([
  User.deleteMany({}),
  PGListing.deleteMany({}),
  Booking.deleteMany({}),
  Review.deleteMany({}),
  Support.deleteMany({}),
]);
console.log("🗑️  Cleared existing data");

const hash = (pw) => bcrypt.hash(pw, 10);
const days = (n) => new Date(Date.now() + n * 86400000);

/* ══════════════════════════════════════════
   1. USERS
══════════════════════════════════════════ */

const users = await User.insertMany([
  // Admin
  {
    name: "Rahul Admin", email: "admin@rentkaroo.com",
    phone: "9999000001", password: await hash("Admin@1234"),
    role: "admin", isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-1),
  },
  // PG Owners
  {
    name: "Sunita Sharma", email: "sunita@owner.com",
    phone: "9811223344", password: await hash("Owner@1234"),
    role: "pg_owner", isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-2),
  },
  {
    name: "Manoj Gupta", email: "manoj@owner.com",
    phone: "9822334455", password: await hash("Owner@1234"),
    role: "pg_owner", isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-3),
  },
  {
    name: "Priya Verma", email: "priya@owner.com",
    phone: "9833445566", password: await hash("Owner@1234"),
    role: "pg_owner", isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-1),
  },
  {
    name: "Deepak Taneja", email: "deepak@owner.com",
    phone: "9844556677", password: await hash("Owner@1234"),
    role: "pg_owner", isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-5),
  },
  // Regular users
  {
    name: "Aarav Singh",   email: "aarav@gmail.com",   phone: "9711001001",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-1),
  },
  {
    name: "Sneha Patel",   email: "sneha@gmail.com",   phone: "9711001002",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-2),
  },
  {
    name: "Rohan Mehta",   email: "rohan@gmail.com",   phone: "9711001003",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-1),
  },
  {
    name: "Kavya Reddy",   email: "kavya@gmail.com",   phone: "9711001004",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-4),
  },
  {
    name: "Arjun Nair",    email: "arjun@gmail.com",   phone: "9711001005",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-2),
  },
  {
    name: "Pooja Joshi",   email: "pooja@gmail.com",   phone: "9711001006",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-6),
  },
  {
    name: "Vikram Yadav",  email: "vikram@gmail.com",  phone: "9711001007",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-3),
  },
  {
    name: "Ananya Kapoor", email: "ananya@gmail.com",  phone: "9711001008",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-1),
  },
  {
    name: "Siddharth Roy", email: "sid@gmail.com",     phone: "9711001009",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-7),
  },
  {
    name: "Meera Iyer",    email: "meera@gmail.com",   phone: "9711001010",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-2),
  },
  {
    name: "Karan Malhotra",email: "karan@gmail.com",   phone: "9711001011",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-5),
  },
  {
    name: "Riya Sharma",   email: "riya@gmail.com",    phone: "9711001012",
    password: await hash("User@1234"), role: "user",
    isActive: true, isVerified: true, isDeleted: false,
    loginAttempts: 0, refreshTokens: [], lastLogin: days(-3),
  },
]);

const [admin, o1, o2, o3, o4, ...regularUsers] = users;
const owners = [o1, o2, o3, o4];
console.log(`👤 Created ${users.length} users`);

/* ══════════════════════════════════════════
   2. PG LISTINGS
══════════════════════════════════════════ */

const IMG = "https://images.unsplash.com/photo";

const listings = await PGListing.insertMany([
  // ── Ghaziabad ──
  {
    owner: o1._id,
    title: "Sunshine Boys PG — Indirapuram",
    description: "Spacious well-ventilated rooms near Shipra Mall. Homemade meals, 24/7 security, and high-speed WiFi. Perfect for working professionals and students preparing for competitive exams.",
    images: [
      { url: `${IMG}-1555041469-9e08-4b2-a956-1f89f2c4f12?w=800`, publicId: "rk_ghz_1_a" },
      { url: `${IMG}-1522708323474-a09b71f62bb5?w=800`,            publicId: "rk_ghz_1_b" },
      { url: `${IMG}-1631049307264-da0ec9d70304?w=800`,            publicId: "rk_ghz_1_c" },
    ],
    address: { street: "A-12 Vaibhav Khand", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201014" },
    pricePerMonth: 7500,
    rooms: { availableRooms: 4, totalRooms: 10, roomType: "single" },
    amenities: ["wifi", "ac", "laundry", "kitchen", "security"],
    rating: { average: 4.5, count: 12 },
    isDeleted: false,
  },
  {
    owner: o1._id,
    title: "Green Valley Girls PG — Vaishali",
    description: "Safe and homely PG exclusively for girls. 5 mins from Vaishali Metro. Attached washroom, hygienic food, CCTV surveillance throughout the premises. Curfew: 10 PM.",
    images: [
      { url: `${IMG}-1586023492125-27b2c045efd5?w=800`, publicId: "rk_ghz_2_a" },
      { url: `${IMG}-1560448204-e02f11c3d0e2?w=800`, publicId: "rk_ghz_2_b" },
    ],
    address: { street: "C-45 Sector 4", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201010" },
    pricePerMonth: 8500,
    rooms: { availableRooms: 2, totalRooms: 8, roomType: "single" },
    amenities: ["wifi", "ac", "security", "kitchen", "laundry", "garden"],
    rating: { average: 4.7, count: 18 },
    isDeleted: false,
  },
  {
    owner: o2._id,
    title: "Royal Residency PG — Raj Nagar",
    description: "Premium PG with double sharing rooms. Rooftop recreation area, power backup, modern amenities. Walking distance from GT Road and Raj Nagar District Centre mall.",
    images: [
      { url: `${IMG}-1536376650-41ef17a30a97?w=800`, publicId: "rk_ghz_3_a" },
      { url: `${IMG}-1505873242700-f2a2b422b9a0?w=800`, publicId: "rk_ghz_3_b" },
    ],
    address: { street: "Plot 7 Raj Nagar Extension", city: "Ghaziabad", state: "Uttar Pradesh", pincode: "201003" },
    pricePerMonth: 6000,
    rooms: { availableRooms: 6, totalRooms: 14, roomType: "double" },
    amenities: ["wifi", "parking", "security", "electricity bill"],
    rating: { average: 4.2, count: 9 },
    isDeleted: false,
  },
  // ── Noida ──
  {
    owner: o2._id,
    title: "Metro View PG — Noida Sector 18",
    description: "Ultra-modern PG steps from Noida Sector 18 metro. Fully furnished AC rooms, daily housekeeping, 24-hour hot water. Food plan optional. Zero brokerage.",
    images: [
      { url: `${IMG}-1631049307264-da0ec9d70304?w=800`, publicId: "rk_noi_1_a" },
      { url: `${IMG}-1555041469-9e08-4b2-a956-1f89f2c4f12?w=800`, publicId: "rk_noi_1_b" },
      { url: `${IMG}-1522771739844-12a9b9b5b5c1?w=800`, publicId: "rk_noi_1_c" },
    ],
    address: { street: "B-88 Sector 18", city: "Noida", state: "Uttar Pradesh", pincode: "201301" },
    pricePerMonth: 12000,
    rooms: { availableRooms: 3, totalRooms: 12, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "security", "parking"],
    rating: { average: 4.8, count: 25 },
    isDeleted: false,
  },
  {
    owner: o3._id,
    title: "Techie Hub PG — Noida Sector 62",
    description: "Designed for IT professionals near Sector 62 tech parks. 200 Mbps WiFi, ergonomic work desks, silent study zone, rooftop lounge. 24/7 power backup.",
    images: [
      { url: `${IMG}-1560448204-e02f11c3d0e2?w=800`, publicId: "rk_noi_2_a" },
      { url: `${IMG}-1586023492125-27b2c045efd5?w=800`, publicId: "rk_noi_2_b" },
    ],
    address: { street: "H-55 Sector 62", city: "Noida", state: "Uttar Pradesh", pincode: "201309" },
    pricePerMonth: 10500,
    rooms: { availableRooms: 5, totalRooms: 20, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "security", "parking"],
    rating: { average: 4.6, count: 22 },
    isDeleted: false,
  },
  {
    owner: o4._id,
    title: "Cozy Nest PG — Noida Sector 50",
    description: "Homely PG for girls and boys both. Triple sharing available at budget rates. Common TV lounge, indoor games, evening snacks included in rent.",
    images: [
      { url: `${IMG}-1505873242700-f2a2b422b9a0?w=800`, publicId: "rk_noi_3_a" },
    ],
    address: { street: "G-17 Sector 50", city: "Noida", state: "Uttar Pradesh", pincode: "201307" },
    pricePerMonth: 5500,
    rooms: { availableRooms: 7, totalRooms: 18, roomType: "triple" },
    amenities: ["wifi", "kitchen", "security", "laundry"],
    rating: { average: 4.1, count: 8 },
    isDeleted: false,
  },
  // ── Delhi ──
  {
    owner: o3._id,
    title: "Budget Stay PG — Laxmi Nagar",
    description: "Affordable PG near Laxmi Nagar metro. Ideal for students and freshers. Includes breakfast and dinner. No brokerage. Strict no-alcohol policy.",
    images: [
      { url: `${IMG}-1522708323474-a09b71f62bb5?w=800`, publicId: "rk_del_1_a" },
      { url: `${IMG}-1536376650-41ef17a30a97?w=800`, publicId: "rk_del_1_b" },
    ],
    address: { street: "D-22 Laxmi Nagar", city: "Delhi", state: "Delhi", pincode: "110092" },
    pricePerMonth: 5000,
    rooms: { availableRooms: 8, totalRooms: 16, roomType: "triple" },
    amenities: ["wifi", "kitchen", "security"],
    rating: { average: 3.9, count: 7 },
    isDeleted: false,
  },
  {
    owner: o4._id,
    title: "Corporate PG — Connaught Place",
    description: "Premium fully-furnished PG for working professionals. 2-min walk from Rajiv Chowk metro. Meeting room access, rooftop lounge, chef-cooked meals, bi-weekly housekeeping.",
    images: [
      { url: `${IMG}-1631049307264-da0ec9d70304?w=800`, publicId: "rk_del_2_a" },
      { url: `${IMG}-1522771739844-12a9b9b5b5c1?w=800`, publicId: "rk_del_2_b" },
      { url: `${IMG}-1555041469-9e08-4b2-a956-1f89f2c4f12?w=800`, publicId: "rk_del_2_c" },
    ],
    address: { street: "K-14 Connaught Place", city: "Delhi", state: "Delhi", pincode: "110001" },
    pricePerMonth: 18000,
    rooms: { availableRooms: 1, totalRooms: 10, roomType: "single" },
    amenities: ["wifi", "ac", "gym", "laundry", "kitchen", "security", "parking", "electricity bill"],
    rating: { average: 4.9, count: 31 },
    isDeleted: false,
  },
  {
    owner: o1._id,
    title: "Comfort Zone PG — Dwarka Sector 10",
    description: "Peaceful family-managed PG in Dwarka. Home-cooked food, attached bathrooms, geyser in every room. Safe for girls and boys. 10 mins from Dwarka Sector 10 metro.",
    images: [
      { url: `${IMG}-1560448204-e02f11c3d0e2?w=800`, publicId: "rk_del_3_a" },
      { url: `${IMG}-1505873242700-f2a2b422b9a0?w=800`, publicId: "rk_del_3_b" },
    ],
    address: { street: "Pocket 5 Sector 10", city: "Delhi", state: "Delhi", pincode: "110075" },
    pricePerMonth: 9000,
    rooms: { availableRooms: 3, totalRooms: 8, roomType: "double" },
    amenities: ["wifi", "ac", "kitchen", "security", "laundry"],
    rating: { average: 4.3, count: 14 },
    isDeleted: false,
  },
  {
    owner: o2._id,
    title: "Scholar's Den PG — Mukherjee Nagar",
    description: "Top-rated PG for UPSC and SSC aspirants. Located in Delhi's study hub. 24-hour reading room, newspaper subscription, unlimited tea/coffee. 6 months minimum stay preferred.",
    images: [
      { url: `${IMG}-1586023492125-27b2c045efd5?w=800`, publicId: "rk_del_4_a" },
    ],
    address: { street: "T-56 Mukherjee Nagar", city: "Delhi", state: "Delhi", pincode: "110009" },
    pricePerMonth: 7000,
    rooms: { availableRooms: 4, totalRooms: 22, roomType: "double" },
    amenities: ["wifi", "kitchen", "security", "electricity bill"],
    rating: { average: 4.4, count: 19 },
    isDeleted: false,
  },
]);

console.log(`🏠 Created ${listings.length} listings`);

/* ══════════════════════════════════════════
   3. BOOKINGS (matching exact schema)
══════════════════════════════════════════ */

const bookingStatuses = ["pending", "approved", "approved", "rejected", "cancelled", "approved", "pending", "approved", "approved", "cancelled", "pending", "approved"];

const bookingsRaw = [
  { ui: 0, li: 0, dur: 31,  status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 1, li: 1, dur: 62,  status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 2, li: 2, dur: 31,  status: "pending",   payment: "pending", reviewEligible: false },
  { ui: 3, li: 3, dur: 93,  status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 4, li: 4, dur: 31,  status: "rejected",  payment: "pending", reviewEligible: false },
  { ui: 5, li: 5, dur: 186, status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 6, li: 6, dur: 31,  status: "pending",   payment: "pending", reviewEligible: false },
  { ui: 7, li: 7, dur: 93,  status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 8, li: 8, dur: 62,  status: "cancelled", payment: "refunded",reviewEligible: false },
  { ui: 9, li: 9, dur: 31,  status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 10,li: 0, dur: 186, status: "approved",  payment: "paid",    reviewEligible: true  },
  { ui: 11,li: 3, dur: 31,  status: "pending",   payment: "pending", reviewEligible: false },
];

const messages = [
  "Looking for a clean and safe place near my office.",
  "Student at nearby college, need accommodation from next month.",
  "Shifting from Bangalore, need immediate accommodation.",
  "Long term stay preferred, flexible on move-in date.",
  "Two friends looking for double sharing room.",
  "Working night shifts, need quiet accommodation.",
  "First time in Delhi, references available on request.",
  "Looking for minimum 6 months stay. Serious inquiry.",
  "Need from 15th of next month. Can pay advance.",
  "Immediate joining required, within 3 days.",
  "Company transfer to Delhi, need 6-month stay.",
  "UPSC aspirant, need peaceful environment.",
];

const bookings = await Booking.insertMany(
  bookingsRaw.map((b, i) => {
    const checkIn  = days(-(30 - i * 2));
    const checkOut = new Date(checkIn.getTime() + b.dur * 86400000);
    const listing  = listings[b.li % listings.length];
    return {
      user:          regularUsers[b.ui % regularUsers.length]._id,
      pgListing:     listing._id,
      pgOwner:       listing.owner,
      checkInDate:   checkIn,
      checkOutDate:  checkOut,
      duration:      b.dur,
      numberOfRooms: 1,
      totalPrice:    Math.round((listing.pricePerMonth / 30) * b.dur),
      status:        b.status,
      paymentStatus: b.payment,
      reviewEligible:b.reviewEligible,
      guests:        [],
      isDeleted:     false,
      expiresAt:     new Date(checkIn.getTime() + 86400000),
      message:       messages[i],
    };
  })
);

console.log(`📅 Created ${bookings.length} bookings`);

/* ══════════════════════════════════════════
   4. REVIEWS (matching exact schema)
══════════════════════════════════════════ */

const comments = [
  "Excellent place! Very clean and the owner is super cooperative. WiFi speed is consistently great. Would definitely recommend to friends.",
  "Good value for money. Food quality could be slightly better but overall very satisfied with my stay here.",
  "Loved the location — metro is just 3 mins walk. Room was spacious and well-furnished with all basic amenities.",
  "Security is top notch. Always felt safe during my 6-month stay. Highly recommend for girls staying alone.",
  "Decent PG. AC works well, hot water available 24/7. Minor issues were resolved quickly by the owner.",
  "The staff is very helpful and the place is always clean. Great experience overall. Will renew my stay.",
  "Slightly expensive but worth it for the amenities provided. Gym and laundry are great additions.",
  "Owner was very responsive. Maintenance request was resolved within a day. Very professional management.",
  "Best PG I have stayed in! The food is home-cooked and absolutely delicious. Feel like home.",
  "Parking facility is a big plus. No issues with power cuts even during summer. Great infrastructure.",
  "Nice ambiance. Fellow residents are friendly. Good community vibe. Monthly get-togethers are fun.",
  "Location is perfect for office commute. Metro is walkable. Would recommend to colleagues.",
  "Rooms are well-ventilated. No noise issues at all. Very peaceful stay. Good for WFH professionals.",
  "Price is very reasonable for the quality offered. No hidden charges. Transparent billing every month.",
  "The rooftop area is amazing. Great for evening relaxation after a long day at work.",
  "Clean washrooms, regular pest control done monthly. Hygiene is extremely well maintained here.",
  "Internet speed is consistent even during peak hours at 9 PM. Perfect for work from home.",
  "Checkout process was smooth. Got full security deposit back without any deductions. Honest owner.",
  "Breakfast options are varied every day. Chef accommodates dietary preferences including vegetarian.",
  "CCTV coverage throughout the premises. Feel very secure. Night security guard always present.",
  "Spacious common areas. TV lounge is well-maintained. Good place to unwind after work.",
  "The owner lives on the premises itself — very quick response to any complaint or request.",
];

const reviewsData = [];
// Each listing gets at least 2 reviews from different users
listings.forEach((listing, li) => {
  const count = li < 5 ? 3 : 2;
  for (let r = 0; r < count; r++) {
    const user = regularUsers[(li * 3 + r) % regularUsers.length];
    const helper = regularUsers[(li * 3 + r + 1) % regularUsers.length];
    reviewsData.push({
      user:          user._id,
      pgListing:     listing._id,
      pgOwner:       listing.owner,
      rating:        [3, 4, 4, 5, 5, 4, 5, 4, 5, 4, 4, 5][reviewsData.length % 12],
      comment:       comments[reviewsData.length % comments.length],
      helpfulCount:  Math.floor(Math.random() * 20),
      helpfulBy:     [helper._id],
      images:        [],
      isDeleted:     false,
    });
  }
});

const reviews = await Review.insertMany(reviewsData);
console.log(`⭐ Created ${reviews.length} reviews`);

/* ══════════════════════════════════════════
   5. SUPPORT TICKETS (matching exact schema)
══════════════════════════════════════════ */

const supports = await Support.insertMany([
  {
    user: regularUsers[0]._id, name: regularUsers[0].name, email: regularUsers[0].email,
    subject: "Refund not received after cancellation",
    message: "I cancelled my booking 5 days ago but have not received the refund yet. Transaction ID: TXN2026031501. Please look into this urgently.",
    status: "open", priority: "high", isDeleted: false, attachments: [],
    adminReply: null,
  },
  {
    user: regularUsers[1]._id, name: regularUsers[1].name, email: regularUsers[1].email,
    subject: "PG owner not responding to booking request",
    message: "The PG owner has not responded to my booking request in 3 days. I need to join within a week. Can you please follow up with them?",
    status: "in_progress", priority: "high", isDeleted: false, attachments: [],
    adminReply: { message: "We have contacted the owner and they will respond within 24 hours.", repliedAt: days(-1), repliedBy: admin._id },
  },
  {
    user: regularUsers[2]._id, name: regularUsers[2].name, email: regularUsers[2].email,
    subject: "Listing shows AC but room has no AC",
    message: "The listing clearly mentions AC included but my room has no AC. This is very misleading. I want either an AC room or a partial refund for the inconvenience.",
    status: "resolved", priority: "medium", isDeleted: false, attachments: [],
    adminReply: { message: "We have updated the listing and issued a partial refund of ₹500. Sincere apologies for the inconvenience.", repliedAt: days(-3), repliedBy: admin._id },
  },
  {
    user: regularUsers[3]._id, name: regularUsers[3].name, email: regularUsers[3].email,
    subject: "Unable to upload profile photo",
    message: "Every time I try to upload my profile photo it shows a server error. I have tried on Chrome, Firefox and mobile app. Please help resolve this.",
    status: "open", priority: "low", isDeleted: false, attachments: [],
    adminReply: null,
  },
  {
    user: regularUsers[4]._id, name: regularUsers[4].name, email: regularUsers[4].email,
    subject: "How to become a verified PG owner?",
    message: "I have a 10-room PG in Noida Sector 50 and want to list it on RentKaroo. What is the verification process and documents required?",
    status: "resolved", priority: "low", isDeleted: false, attachments: [],
    adminReply: { message: "Please register as a PG Owner, complete your profile, and submit property documents. Our team will verify within 48 hours.", repliedAt: days(-2), repliedBy: admin._id },
  },
  {
    user: regularUsers[5]._id, name: regularUsers[5].name, email: regularUsers[5].email,
    subject: "Wrong booking dates shown on my dashboard",
    message: "My dashboard shows check-in as March 20 but I had booked for April 20. This is causing confusion. Please correct the dates.",
    status: "in_progress", priority: "medium", isDeleted: false, attachments: [],
    adminReply: { message: "We are investigating the issue. Will update you within 2 hours.", repliedAt: days(0), repliedBy: admin._id },
  },
  {
    user: regularUsers[6]._id, name: regularUsers[6].name, email: regularUsers[6].email,
    subject: "Request to add more payment options",
    message: "Currently only UPI is available for payment. Please add credit card and net banking options as well. Many users would benefit from this.",
    status: "open", priority: "low", isDeleted: false, attachments: [],
    adminReply: null,
  },
  {
    user: regularUsers[7]._id, name: regularUsers[7].name, email: regularUsers[7].email,
    subject: "Owner asked for cash outside the platform",
    message: "The PG owner is asking me to pay 3 months rent in cash outside RentKaroo. This feels unsafe. What should I do? Is this allowed?",
    status: "open", priority: "high", isDeleted: false, attachments: [],
    adminReply: null,
  },
]);

console.log(`🎫 Created ${supports.length} support tickets`);

/* ── Summary ─────────────────────────────────────────────────── */
console.log("\n🎉 Seed complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`👤 Users:     ${users.length}     (1 admin, 4 owners, ${regularUsers.length} users)`);
console.log(`🏠 Listings:  ${listings.length}    (3 Ghaziabad, 3 Noida, 4 Delhi)`);
console.log(`📅 Bookings:  ${bookings.length}    (mix of all statuses)`);
console.log(`⭐ Reviews:   ${reviews.length}    (2-3 per listing)`);
console.log(`🎫 Support:   ${supports.length}     (open/in_progress/resolved)`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔴 Admin   → admin@rentkaroo.com  / Admin@1234");
console.log("🟡 Owner   → sunita@owner.com     / Owner@1234");
console.log("🟢 User    → aarav@gmail.com      / User@1234");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

await mongoose.disconnect();
process.exit(0);