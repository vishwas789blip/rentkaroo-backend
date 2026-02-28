# PG Booking Platform - Backend

Production-ready SaaS PG Booking Platform backend built with Node.js, Express.js, and MongoDB.

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Request handlers
│   ├── auth.controller.js
│   ├── pgListing.controller.js
│   ├── booking.controller.js
│   └── review.controller.js
├── models/                  # Mongoose schemas
│   ├── User.js
│   ├── PGListing.js
│   ├── Booking.js
│   └── Review.js
├── middleware/              # Express middleware
│   ├── auth.js             # JWT authentication
│   ├── errorHandler.js     # Global error handling
│   ├── asyncWrapper.js     # Async error wrapper
│   └── rateLimiter.js      # Rate limiting
├── routes/                  # API routes
│   ├── auth.routes.js
│   ├── pgListing.routes.js
│   ├── booking.routes.js
│   ├── review.routes.js
│   ├── admin.routes.js
│   └── user.routes.js
├── services/                # Business logic
│   ├── auth.service.js
│   ├── pgListing.service.js
│   ├── booking.service.js
│   └── review.service.js
├── server.js               # Application entry point
├── package.json
└── .env.example
```

## Features

- **Authentication**: JWT-based auth with refresh tokens and role-based access control
- **PG Listings**: Full CRUD operations with search, filtering, and sorting
- **Bookings**: Booking creation, management, and status updates
- **Reviews**: Rating and review system for listings
- **Admin Dashboard**: Stats, user management, and listing verification
- **Security**: Helmet, CORS, rate limiting, input validation
- **Database**: MongoDB with Mongoose ODM and proper indexing
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 chars)
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `CLOUDINARY_*`: Cloudinary credentials (for image upload)

### 3. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `GET /api/v1/auth/me` - Get current user (protected)
- `POST /api/v1/auth/change-password` - Change password (protected)

### PG Listings
- `GET /api/v1/pg-listings` - Get all listings with filtering
- `POST /api/v1/pg-listings` - Create listing (owner only)
- `GET /api/v1/pg-listings/:id` - Get single listing
- `PUT /api/v1/pg-listings/:id` - Update listing (owner only)
- `DELETE /api/v1/pg-listings/:id` - Delete listing (owner only)
- `GET /api/v1/pg-listings/owner/my-listings` - Get owner's listings
- `PATCH /api/v1/pg-listings/:id/availability` - Update availability

### Bookings
- `POST /api/v1/bookings` - Create booking (user only)
- `GET /api/v1/bookings/user/my-bookings` - Get user's bookings
- `GET /api/v1/bookings/owner/my-bookings` - Get owner's bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/approve` - Approve booking (owner only)
- `POST /api/v1/bookings/:id/reject` - Reject booking (owner only)
- `POST /api/v1/bookings/:id/cancel` - Cancel booking (user only)

### Reviews
- `POST /api/v1/reviews` - Create review (user only)
- `GET /api/v1/reviews/listing/:listingId` - Get listing reviews
- `GET /api/v1/reviews/user/my-reviews` - Get user's reviews
- `GET /api/v1/reviews/:id` - Get review details
- `PUT /api/v1/reviews/:id` - Update review
- `DELETE /api/v1/reviews/:id` - Delete review
- `POST /api/v1/reviews/:id/helpful` - Mark review as helpful

## Database Schema

### Users Collection
- Stores user information with roles (user, pg_owner, admin)
- Password hashing with bcrypt
- Profile image support

### PG Listings Collection
- Property details, amenities, and pricing
- Availability status and date ranges
- Rating and review count
- Owner reference and soft delete flag

### Bookings Collection
- User and owner references
- Check-in/out dates and duration
- Booking status (pending, approved, rejected, cancelled, completed)
- Payment status and special requests

### Reviews Collection
- Rating with category breakdowns (cleanliness, communication, etc.)
- User feedback and images
- Helpful count tracking
- Soft delete support

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT authentication with expiration
- Role-based access control (RBAC)
- Rate limiting on auth and booking endpoints
- Helmet for HTTP headers security
- CORS properly configured
- Input validation with Joi
- SQL/NoSQL injection prevention
- Soft deletes for data preservation

## Performance Optimization

- Database indexing on frequently queried fields
- Pagination for list endpoints
- Lean queries where possible
- Connection pooling with MongoDB
- Efficient population of references

## Error Handling

All endpoints return standardized JSON responses:

```json
{
  "success": true/false,
  "message": "descriptive message",
  "data": {}
}
```

## Testing

API can be tested using:
- Postman
- Thunder Client
- cURL commands
- Any REST client

## Deployment

### Render Deployment

1. Create account on [Render](https://render.com)
2. Connect your GitHub repository
3. Create new Web Service
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables in Render dashboard
7. Deploy

## Future Enhancements

- Email notifications
- Payment integration (Stripe/Razorpay)
- Advanced analytics
- Messaging system
- Wishlist feature
- SMS notifications
- Advanced search filters
