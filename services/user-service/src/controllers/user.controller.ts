import { Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User, UserRole, UserStatus, IAddress } from '../models/user.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config';

export class UserController {
  /**
   * Generate JWT tokens
   */
  private static generateTokens(userId: string, email: string, role: UserRole) {
    const accessToken = jwt.sign(
      { id: userId, email, role },
      config.jwtSecret as Secret,
      { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: userId, email, role },
      config.jwtRefreshSecret as Secret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user
   */
  static async register(req: AuthRequest, res: Response): Promise<void> {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new AppError(
        existingUser.email === email
          ? 'Email already registered'
          : 'Phone number already registered',
        400
      );
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || UserRole.CUSTOMER,
    });

    // Generate tokens
    const { accessToken, refreshToken } = UserController.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    // Save refresh token
    user.refreshTokens = [refreshToken];
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  }

  /**
   * Login user
   */
  static async login(req: AuthRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError('Account is not active', 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = UserController.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    // Update refresh tokens (keep last 5)
    user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          status: user.status,
          profilePicture: user.profilePicture,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken, 
        config.jwtRefreshSecret as Secret
      ) as {
        id: string;
        email: string;
        role: UserRole;
      };

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.id).select('+refreshTokens');

      if (!user || !user.refreshTokens?.includes(refreshToken)) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Generate new tokens
      const tokens = UserController.generateTokens(
        user._id.toString(),
        user.email,
        user.role
      );

      // Replace old refresh token with new one
      user.refreshTokens = user.refreshTokens
        .filter(token => token !== refreshToken)
        .concat(tokens.refreshToken)
        .slice(-5);
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens,
        },
      });
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (req.user && refreshToken) {
      const user = await User.findById(req.user.id).select('+refreshTokens');
      
      if (user) {
        user.refreshTokens = user.refreshTokens?.filter(
          token => token !== refreshToken
        ) || [];
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const user = await User.findById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const { firstName, lastName, phone } = req.body;

    const user = await User.findById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if phone is already taken by another user
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        throw new AppError('Phone number already in use', 400);
      }
      user.phone = phone;
      user.phoneVerified = false; // Reset verification if phone changed
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    });
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!.id).select('+password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all refresh tokens
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  }

  /**
   * Add address
   */
  static async addAddress(req: AuthRequest, res: Response): Promise<void> {
    const addressData: IAddress = req.body;

    const user = await User.findById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // If this is the first address or marked as default, set it as default
    if (user.addresses.length === 0 || addressData.isDefault) {
      // Remove default from other addresses
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
      addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        user,
      },
    });
  }

  /**
   * Update address
   */
  static async updateAddress(req: AuthRequest, res: Response): Promise<void> {
    const { addressId } = req.params;
    const addressData: Partial<IAddress> = req.body;

    const user = await User.findById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const address = user.addresses.id(addressId as string);

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    // If setting as default, remove default from others
    if (addressData.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id?.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    Object.assign(address, addressData);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        user,
      },
    });
  }

  /**
   * Delete address
   */
  static async deleteAddress(req: AuthRequest, res: Response): Promise<void> {
    const { addressId } = req.params;

    const user = await User.findById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const address = user.addresses.id(addressId as string);

    if (!address) {
      throw new AppError('Address not found', 404);
    }

    const wasDefault = address.isDefault;
    
    // Remove the address using pull method
    user.addresses.pull(addressId);

    // If deleted address was default, set first remaining as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: {
        user,
      },
    });
  }

  /**
   * Get user by ID (Admin only or for inter-service communication)
   */
  static async getUserById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  }

  /**
   * Get all users (Admin only)
   */
  static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { role, status, search } = req.query;

    // Build query
    const query: any = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: new RegExp(search as string, 'i') },
        { lastName: new RegExp(search as string, 'i') },
        { email: new RegExp(search as string, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  }

  /**
   * Update user status (Admin only)
   */
  static async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: {
        user,
      },
    });
  }
}