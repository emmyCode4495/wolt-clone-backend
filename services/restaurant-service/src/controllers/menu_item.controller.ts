

import { Request, Response } from 'express';
import { MenuItem, MenuItemStatus } from '../models/menu_item.model';
import { Restaurant } from '../models/restaurant.model';
import { Category } from '../models/category.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export class MenuItemController {

  // ─────────────────────────────────────────────
  // Owner / Public — Menu Item CRUD
  // ─────────────────────────────────────────────

  static createMenuItem = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = restaurant.ownerId.toString() === req.user?.id;
    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorized to add items to this restaurant', 403);
    }

    const category = await Category.findById(req.body.categoryId);
    if (!category || category.restaurantId.toString() !== restaurantId) {
      throw new AppError('Invalid category for this restaurant', 400);
    }

    const menuItem = await MenuItem.create({ ...req.body, restaurantId });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: { menuItem },
    });
  });

  static getMenuItems = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const { categoryId, status, search } = req.query;

    const query: any = { restaurantId };
    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    if (search) query.$text = { $search: search as string };

    const menuItems = await MenuItem.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('categoryId', 'name');

    res.status(200).json({ success: true, data: { menuItems } });
  });

  static getMenuItemById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id).populate('categoryId', 'name');
    if (!menuItem) throw new AppError('Menu item not found', 404);

    res.status(200).json({ success: true, data: { menuItem } });
  });

  static updateMenuItem = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) throw new AppError('Menu item not found', 404);

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to update this menu item', 403);
      }
    }

    const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem: updated },
    });
  });

  static deleteMenuItem = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) throw new AppError('Menu item not found', 404);

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to delete this menu item', 403);
      }
    }

    await menuItem.deleteOne();

    res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  });

  static toggleAvailability = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) throw new AppError('Menu item not found', 404);

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(menuItem.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to update this menu item', 403);
      }
    }

    menuItem.status =
      menuItem.status === MenuItemStatus.AVAILABLE
        ? MenuItemStatus.UNAVAILABLE
        : MenuItemStatus.AVAILABLE;

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: `Menu item is now ${menuItem.status}`,
      data: { menuItem },
    });
  });

  static getPopularItems = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const popularItems = await MenuItem.find({
      restaurantId,
      status: MenuItemStatus.AVAILABLE,
    })
      .sort({ totalOrders: -1, averageRating: -1 })
      .limit(limit);

    res.status(200).json({ success: true, data: { popularItems } });
  });

  // ─────────────────────────────────────────────
  // Admin — Menu Item Oversight
  // ─────────────────────────────────────────────

  /**
   * GET /admin/menu-items
   * All menu items across all restaurants — filterable for moderation
   */
  static adminGetAllMenuItems = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { restaurantId, status, search, dietaryTag } = req.query;

    const query: any = {};
    if (restaurantId) query.restaurantId = restaurantId;
    if (status) query.status = status;
    if (dietaryTag) query.dietaryTags = dietaryTag;
    if (search) query.$text = { $search: search as string };

    const [menuItems, total] = await Promise.all([
      MenuItem.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('restaurantId', 'name')
        .populate('categoryId', 'name'),
      MenuItem.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        menuItems,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  /**
   * PATCH /admin/menu-items/:id/status
   * Force-set a menu item's status (e.g., pull a dangerous item)
   */
  static adminSetMenuItemStatus = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const validStatuses = Object.values(MenuItemStatus);

    if (!validStatuses.includes(status)) {
      throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!menuItem) throw new AppError('Menu item not found', 404);

    res.status(200).json({
      success: true,
      message: `Menu item status set to '${status}'`,
      data: { menuItem },
    });
  });

  /**
   * GET /admin/menu-items/stats
   * Menu item stats for admin dashboard
   */
  static adminGetMenuStats = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const [total, available, unavailable, outOfStock, topOrdered] = await Promise.all([
      MenuItem.countDocuments(),
      MenuItem.countDocuments({ status: MenuItemStatus.AVAILABLE }),
      MenuItem.countDocuments({ status: MenuItemStatus.UNAVAILABLE }),
      MenuItem.countDocuments({ status: MenuItemStatus.OUT_OF_STOCK }),
      MenuItem.find({ status: MenuItemStatus.AVAILABLE })
        .sort({ totalOrders: -1 })
        .limit(10)
        .select('name totalOrders averageRating restaurantId')
        .populate('restaurantId', 'name'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total,
          byStatus: { available, unavailable, outOfStock },
          topOrdered,
        },
      },
    });
  });
}