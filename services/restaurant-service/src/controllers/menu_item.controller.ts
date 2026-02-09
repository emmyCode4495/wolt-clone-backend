import { Request, Response } from 'express';
import { MenuItem, MenuItemStatus } from '../models/menu_item.model';
import { Restaurant } from '../models/restaurant.model';
import { Category } from '../models/category.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';

export class MenuItemController {
  static createMenuItem = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Verify category exists and belongs to restaurant
    const category = await Category.findById(req.body.categoryId);
    if (!category || category.restaurantId.toString() !== restaurantId) {
      throw new AppError('Invalid category for this restaurant', 400);
    }

    const menuItem = await MenuItem.create({
      ...req.body,
      restaurantId,
    });

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

    res.status(200).json({
      success: true,
      data: { menuItems },
    });
  });

  static getMenuItemById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id).populate('categoryId', 'name');
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { menuItem },
    });
  });

  static updateMenuItem = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: { menuItem },
    });
  });

  static deleteMenuItem = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  });

  static toggleAvailability = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    menuItem.status = menuItem.status === MenuItemStatus.AVAILABLE 
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

    res.status(200).json({
      success: true,
      data: { popularItems },
    });
  });
}