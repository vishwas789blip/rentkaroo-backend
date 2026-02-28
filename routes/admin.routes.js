import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Dashboard Stats
router.get(
  '/dashboard/stats',
  authenticate,
  authorize('admin'),
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Dashboard stats',
      data: {
        totalUsers: 0,
        totalListings: 0,
        totalBookings: 0,
        totalRevenue: 0
      }
    });
  })
);

// Get All Users
router.get(
  '/users',
  authenticate,
  authorize('admin'),
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'All users',
      data: { users: [] }
    });
  })
);

// Verify Listing
router.patch(
  '/listings/:id/verify',
  authenticate,
  authorize('admin'),
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Listing verified'
    });
  })
);

export default router;