import { Request, Response } from 'express';
import { Restaurant, RestaurantStatus } from '../models/restaurant.model';
import { MenuItem } from '../models/menu_item.model';
import { Category } from '../models/category.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export class RestaurantController {
  static createRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    // Get ownerId from authenticated user
    const ownerId = req.user?.id;

    if (!ownerId) {
      throw new AppError('Authentication required. Please login to create a restaurant.', 401);
    }

    const restaurant = await Restaurant.create({
      ...req.body,
      ownerId,
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully',
      data: { restaurant },
    });
  });

  static getAllRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { cuisine, status, search, isFeatured, minRating, latitude, longitude, maxDistance } = req.query;

    const query: any = {};
    
    if (cuisine) query.cuisine = cuisine;
    if (status) query.status = status;
    if (isFeatured) query.isFeatured = isFeatured === 'true';
    if (minRating) query.averageRating = { $gte: parseFloat(minRating as string) };
    if (search) query.$text = { $search: search as string };

    // Geospatial query for nearby restaurants
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const distance = maxDistance ? parseFloat(maxDistance as string) : 10000;

      query['address.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: distance,
        },
      };
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).skip(skip).limit(limit).sort({ isFeatured: -1, averageRating: -1 }),
      Restaurant.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurants,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  static getRestaurantById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { restaurant },
    });
  });

  static updateRestaurant = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: { restaurant },
    });
  });

  static deleteRestaurant = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Delete associated menu items and categories
    await Promise.all([
      MenuItem.deleteMany({ restaurantId: req.params.id }),
      Category.deleteMany({ restaurantId: req.params.id }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  });

  static getRestaurantMenu = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const [restaurant, categories] = await Promise.all([
      Restaurant.findById(id),
      Category.find({ restaurantId: id, isActive: true }).sort({ displayOrder: 1 }),
    ]);

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    const menuItems = await MenuItem.find({
      restaurantId: id,
      status: 'available',
    }).sort({ displayOrder: 1 });

    const menu = categories.map(category => ({
      ...category.toJSON(),
      items: menuItems.filter(item => item.categoryId.toString() === category._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          description: restaurant.description,
          logo: restaurant.logo,
          coverImage: restaurant.coverImage,
          averageRating: restaurant.averageRating,
          totalReviews: restaurant.totalReviews,
          deliveryInfo: restaurant.deliveryInfo,
        },
        menu,
      },
    });
  });

  static getOwnerRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { ownerId } = req.params;
    const restaurants = await Restaurant.find({ ownerId });

    res.status(200).json({
      success: true,
      data: { restaurants },
    });
  });
}