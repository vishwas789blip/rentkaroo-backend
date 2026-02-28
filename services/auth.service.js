import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { APIError } from '../middleware/errorHandler.js';

export class AuthService {

  static generateToken(user, type = 'access') {
    const secret =
      type === 'access'
        ? process.env.JWT_SECRET
        : process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new APIError('JWT secret not configured', 500);
    }

    const expiresIn =
      type === 'access'
        ? process.env.JWT_EXPIRE || '15m'
        : process.env.JWT_REFRESH_EXPIRE || '7d';

    return jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      secret,
      { expiresIn }
    );
  }

  static async register(data) {
    const { name, email,role, phone, password,address } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new APIError('User already exists', 409);
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      address
    });

    return {
      user: user.toJSON(),
      accessToken: this.generateToken(user),
      refreshToken: this.generateToken(user, 'refresh')
    };
  }

  static async login(email, password) {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isActive) {
      throw new APIError('Invalid credentials', 401);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new APIError('Invalid credentials', 401);
    }

    return {
      user: user.toJSON(),
      accessToken: this.generateToken(user),
      refreshToken: this.generateToken(user, 'refresh')
    };
  }

  static async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        throw new APIError('Invalid refresh token', 401);
      }

      return {
        accessToken: this.generateToken(user)
      };

    } catch {
      throw new APIError('Invalid refresh token', 401);
    }
  }

  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) throw new APIError('User not found', 404);

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) throw new APIError('Incorrect current password', 401);

    user.password = newPassword;
    await user.save();

    return user;
  }
}