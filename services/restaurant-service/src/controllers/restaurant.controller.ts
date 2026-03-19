// import { Request, Response } from 'express';
// import { Restaurant, RestaurantStatus } from '../models/restaurant.model';
// import { MenuItem } from '../models/menu_item.model';
// import { Category } from '../models/category.model';
// import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
// import { AuthRequest } from '../middleware/auth.middleware';

// export class RestaurantController {
//   static createRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     // Get ownerId from authenticated user
//     const ownerId = req.user?.id;

//     if (!ownerId) {
//       throw new AppError('Authentication required. Please login to create a restaurant.', 401);
//     }

//     const restaurant = await Restaurant.create({
//       ...req.body,
//       ownerId,
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Restaurant created successfully',
//       data: { restaurant },
//     });
//   });

//   static getAllRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const skip = (page - 1) * limit;

//     const { cuisine, status, search, isFeatured, minRating, latitude, longitude, maxDistance } = req.query;

//     const query: any = {};
    
//     if (cuisine) query.cuisine = cuisine;
//     if (status) query.status = status;
//     if (isFeatured) query.isFeatured = isFeatured === 'true';
//     if (minRating) query.averageRating = { $gte: parseFloat(minRating as string) };
//     if (search) query.$text = { $search: search as string };

//     // Geospatial query for nearby restaurants
//     if (latitude && longitude) {
//       const lat = parseFloat(latitude as string);
//       const lng = parseFloat(longitude as string);
//       const distance = maxDistance ? parseFloat(maxDistance as string) : 10000;

//       query['address.coordinates'] = {
//         $near: {
//           $geometry: { type: 'Point', coordinates: [lng, lat] },
//           $maxDistance: distance,
//         },
//       };
//     }

//     const [restaurants, total] = await Promise.all([
//       Restaurant.find(query).skip(skip).limit(limit).sort({ isFeatured: -1, averageRating: -1 }),
//       Restaurant.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         restaurants,
//         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//       },
//     });
//   });

//   static getRestaurantById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const restaurant = await Restaurant.findById(req.params.id);
//     if (!restaurant) {
//       throw new AppError('Restaurant not found', 404);
//     }

//     res.status(200).json({
//       success: true,
//       data: { restaurant },
//     });
//   });

//   static updateRestaurant = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const restaurant = await Restaurant.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );

//     if (!restaurant) {
//       throw new AppError('Restaurant not found', 404);
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Restaurant updated successfully',
//       data: { restaurant },
//     });
//   });

//   static deleteRestaurant = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
//     if (!restaurant) {
//       throw new AppError('Restaurant not found', 404);
//     }

//     // Delete associated menu items and categories
//     await Promise.all([
//       MenuItem.deleteMany({ restaurantId: req.params.id }),
//       Category.deleteMany({ restaurantId: req.params.id }),
//     ]);

//     res.status(200).json({
//       success: true,
//       message: 'Restaurant deleted successfully',
//     });
//   });

//   static getRestaurantMenu = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const { id } = req.params;
    
//     const [restaurant, categories] = await Promise.all([
//       Restaurant.findById(id),
//       Category.find({ restaurantId: id, isActive: true }).sort({ displayOrder: 1 }),
//     ]);

//     if (!restaurant) {
//       throw new AppError('Restaurant not found', 404);
//     }

//     const menuItems = await MenuItem.find({
//       restaurantId: id,
//       status: 'available',
//     }).sort({ displayOrder: 1 });

//     const menu = categories.map(category => ({
//       ...category.toJSON(),
//       items: menuItems.filter(item => item.categoryId.toString() === category._id.toString()),
//     }));

//     res.status(200).json({
//       success: true,
//       data: {
//         restaurant: {
//           id: restaurant._id,
//           name: restaurant.name,
//           description: restaurant.description,
//           logo: restaurant.logo,
//           coverImage: restaurant.coverImage,
//           averageRating: restaurant.averageRating,
//           totalReviews: restaurant.totalReviews,
//           deliveryInfo: restaurant.deliveryInfo,
//         },
//         menu,
//       },
//     });
//   });

// static getRestaurantsByCountry = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//   const { country } = req.params;
//   const page = parseInt(req.query.page as string) || 1;
//   const limit = parseInt(req.query.limit as string) || 10;
//   const skip = (page - 1) * limit;

//   const query: any = {
//     'address.country': { $regex: new RegExp(`^${country}$`, 'i') }, // case-insensitive match
//   };

//   // Optional filters on top of country
//   if (req.query.city) query['address.city'] = { $regex: new RegExp(`^${req.query.city as string}$`, 'i') };
//   if (req.query.cuisine) query.cuisine = req.query.cuisine;
//   if (req.query.status) query.status = req.query.status;

//   const [restaurants, total] = await Promise.all([
//     Restaurant.find(query)
//       .skip(skip)
//       .limit(limit)
//       .sort({ isFeatured: -1, averageRating: -1 }),
//     Restaurant.countDocuments(query),
//   ]);

//   res.status(200).json({
//     success: true,
//     data: {
//       restaurants,
//       pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//     },
//   });
// });


//   static getCities = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//   const cities = await Restaurant.aggregate([
//     {
//       $match: {
//         'address.city': { $exists: true, $nin: [null, ''] },
//         status: { $ne: 'rejected' }, // only show cities with active/pending restaurants
//       },
//     },
//     {
//       $group: {
//         _id: '$address.city',
//         country: { $first: '$address.country' },
//         state: { $first: '$address.state' },
//         restaurantCount: { $sum: 1 },
//       },
//     },
//     {
//       $project: {
//         _id: 0,
//         city: '$_id',
//         country: 1,
//         state: 1,
//         restaurantCount: 1,
//       },
//     },
//     { $sort: { restaurantCount: -1 } }, // most restaurants first
//   ]);

//   res.status(200).json({
//     success: true,
//     data: { cities },
//   });
// });


//   static getOwnerRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
//     const { ownerId } = req.params;
//     const restaurants = await Restaurant.find({ ownerId });

//     res.status(200).json({
//       success: true,
//       data: { restaurants },
//     });
//   });
// }


import { Request, Response } from 'express';
import { Restaurant, RestaurantStatus } from '../models/restaurant.model';
import { MenuItem } from '../models/menu_item.model';
import { Category } from '../models/category.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export class RestaurantController {

  // ─────────────────────────────────────────────
  // Owner / Public — Restaurant CRUD
  // ─────────────────────────────────────────────

  static createRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) {
      throw new AppError('Authentication required', 401);
    }

    const restaurant = await Restaurant.create({
      ...req.body,
      ownerId,
      // Always start as pending — admin must approve
      status: RestaurantStatus.PENDING_APPROVAL,
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully. Pending admin approval.',
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
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    res.status(200).json({ success: true, data: { restaurant } });
  });

  static updateRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = restaurant.ownerId.toString() === req.user?.id;

    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorized to update this restaurant', 403);
    }

    // Non-admins cannot change status, isFeatured, or isVerified directly
    if (!isAdmin) {
      delete req.body.status;
      delete req.body.isFeatured;
      delete req.body.isVerified;
    }

    const updated = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: { restaurant: updated },
    });
  });

  static deleteRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = restaurant.ownerId.toString() === req.user?.id;

    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorized to delete this restaurant', 403);
    }

    await restaurant.deleteOne();

    await Promise.all([
      MenuItem.deleteMany({ restaurantId: req.params.id }),
      Category.deleteMany({ restaurantId: req.params.id }),
    ]);

    res.status(200).json({ success: true, message: 'Restaurant deleted successfully' });
  });

  static getRestaurantMenu = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const [restaurant, categories] = await Promise.all([
      Restaurant.findById(id),
      Category.find({ restaurantId: id, isActive: true }).sort({ displayOrder: 1 }),
    ]);

    if (!restaurant) throw new AppError('Restaurant not found', 404);

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

  static getRestaurantsByCountry = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { country } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {
      'address.country': { $regex: new RegExp(`^${country}$`, 'i') },
    };

    if (req.query.city) query['address.city'] = { $regex: new RegExp(`^${req.query.city as string}$`, 'i') };
    if (req.query.cuisine) query.cuisine = req.query.cuisine;
    if (req.query.status) query.status = req.query.status;

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

  static getCities = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const cities = await Restaurant.aggregate([
      {
        $match: {
          'address.city': { $exists: true, $nin: [null, ''] },
          status: { $ne: 'rejected' },
        },
      },
      {
        $group: {
          _id: '$address.city',
          country: { $first: '$address.country' },
          state: { $first: '$address.state' },
          restaurantCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          city: '$_id',
          country: 1,
          state: 1,
          restaurantCount: 1,
        },
      },
      { $sort: { restaurantCount: -1 } },
    ]);

    res.status(200).json({ success: true, data: { cities } });
  });

  static getOwnerRestaurants = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ownerId } = req.params;

    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.id === ownerId;

    if (!isAdmin && !isSelf) {
      throw new AppError('Not authorized to view these restaurants', 403);
    }

    const restaurants = await Restaurant.find({ ownerId });

    res.status(200).json({ success: true, data: { restaurants } });
  });

  // ─────────────────────────────────────────────
  // Admin — Restaurant Moderation
  // ─────────────────────────────────────────────

  /**
   * GET /admin/restaurants
   * Full list with ALL statuses visible, extra filters for admin dashboard
   */
  static adminGetAllRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { status, cuisine, search, isVerified, isFeatured, ownerId, city, country } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (cuisine) query.cuisine = cuisine;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (ownerId) query.ownerId = ownerId;
    if (city) query['address.city'] = { $regex: new RegExp(city as string, 'i') };
    if (country) query['address.country'] = { $regex: new RegExp(country as string, 'i') };
    if (search) query.$text = { $search: search as string };

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select('+ownerId'), // ensure ownerId always comes back
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

  /**
   * PATCH /admin/restaurants/:id/status
   * Approve, reject, suspend, or reactivate a restaurant
   */
  static adminUpdateRestaurantStatus = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = Object.values(RestaurantStatus);
    if (!validStatuses.includes(status)) {
      throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const previousStatus = restaurant.status;
    restaurant.status = status;

    // Store rejection/suspension reason in a note field if provided
    // (extend the model if you want to persist this)
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant status changed from '${previousStatus}' to '${status}'`,
      data: {
        restaurant,
        ...(reason && { reason }),
      },
    });
  });

  /**
   * PATCH /admin/restaurants/:id/verify
   * Toggle verified badge
   */
  static adminToggleVerified = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    restaurant.isVerified = !restaurant.isVerified;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant ${restaurant.isVerified ? 'verified' : 'unverified'} successfully`,
      data: { restaurant },
    });
  });

  /**
   * PATCH /admin/restaurants/:id/feature
   * Toggle featured status (appears at top of listings)
   */
  static adminToggleFeatured = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    restaurant.isFeatured = !restaurant.isFeatured;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant ${restaurant.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { restaurant },
    });
  });

  /**
   * GET /admin/restaurants/stats
   * Aggregate stats for the admin dashboard
   */
  static adminGetStats = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const [
      total,
      active,
      pending,
      suspended,
      inactive,
      verified,
      featured,
      topByOrders,
      topByRating,
      byCuisine,
      recentlyCreated,
    ] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ status: RestaurantStatus.ACTIVE }),
      Restaurant.countDocuments({ status: RestaurantStatus.PENDING_APPROVAL }),
      Restaurant.countDocuments({ status: RestaurantStatus.SUSPENDED }),
      Restaurant.countDocuments({ status: RestaurantStatus.INACTIVE }),
      Restaurant.countDocuments({ isVerified: true }),
      Restaurant.countDocuments({ isFeatured: true }),

      // Top 5 restaurants by total orders
      Restaurant.find({ status: RestaurantStatus.ACTIVE })
        .sort({ totalOrders: -1 })
        .limit(5)
        .select('name totalOrders averageRating address.city'),

      // Top 5 restaurants by rating
      Restaurant.find({ status: RestaurantStatus.ACTIVE, totalReviews: { $gte: 5 } })
        .sort({ averageRating: -1 })
        .limit(5)
        .select('name averageRating totalReviews address.city'),

      // Breakdown by cuisine
      Restaurant.aggregate([
        { $match: { status: RestaurantStatus.ACTIVE } },
        { $unwind: '$cuisine' },
        { $group: { _id: '$cuisine', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, cuisine: '$_id', count: 1 } },
      ]),

      // Restaurants created in the last 30 days
      Restaurant.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total,
          byStatus: { active, pending, suspended, inactive },
          verified,
          featured,
          recentlyCreated,
          topByOrders,
          topByRating,
          byCuisine,
        },
      },
    });
  });

  /**
   * GET /admin/restaurants/pending
   * Quick list of all restaurants awaiting approval
   */
  static adminGetPendingRestaurants = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      Restaurant.find({ status: RestaurantStatus.PENDING_APPROVAL })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }), // oldest first — review in order
      Restaurant.countDocuments({ status: RestaurantStatus.PENDING_APPROVAL }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurants,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  /**
   * DELETE /admin/restaurants/:id
   * Hard delete with cascade — removes all menu items and categories too
   */
  static adminDeleteRestaurant = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    await Promise.all([
      MenuItem.deleteMany({ restaurantId: req.params.id }),
      Category.deleteMany({ restaurantId: req.params.id }),
    ]);

    res.status(200).json({ success: true, message: 'Restaurant and all associated data deleted successfully' });
  });
}