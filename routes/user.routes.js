import express from 'express';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/profile',
  authenticate,
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'User profile',
      data: { user: req.user }
    });
  })
);

router.put(
  '/profile',
  authenticate,
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Profile updated'
    });
  })
);

router.get(
  '/preferences',
  authenticate,
  asyncWrapper(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'User preferences',
      data: { preferences: {} }
    });
  })
);

export default router;