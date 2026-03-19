
import { Request, Response } from 'express';
import { Category } from '../models/category.model';
import { Restaurant } from '../models/restaurant.model';
import { MenuItem } from '../models/menu_item.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export class CategoryController {

  // ─────────────────────────────────────────────
  // Owner / Public — Category CRUD
  // ─────────────────────────────────────────────

  static createCategory = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new AppError('Restaurant not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = restaurant.ownerId.toString() === req.user?.id;
    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorized to add categories to this restaurant', 403);
    }

    const category = await Category.create({ ...req.body, restaurantId });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  });

  static getCategories = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const { isActive } = req.query;

    const query: any = { restaurantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const categories = await Category.find(query).sort({ displayOrder: 1 });

    res.status(200).json({ success: true, data: { categories } });
  });

  static getCategoryById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    res.status(200).json({ success: true, data: { category } });
  });

  static updateCategory = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(category.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to update this category', 403);
      }
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updated },
    });
  });

  static deleteCategory = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(category.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to delete this category', 403);
      }
    }

    const itemCount = await MenuItem.countDocuments({ categoryId: req.params.id });
    if (itemCount > 0) {
      throw new AppError('Cannot delete category with existing menu items', 400);
    }

    await category.deleteOne();

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  });

  static reorderCategories = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { categoryOrders } = req.body;

    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== req.user?.id) {
        throw new AppError('Not authorized to reorder categories for this restaurant', 403);
      }
    }

    const updatePromises = categoryOrders.map((item: { categoryId: string; displayOrder: number }) =>
      Category.findByIdAndUpdate(item.categoryId, { displayOrder: item.displayOrder })
    );

    await Promise.all(updatePromises);

    res.status(200).json({ success: true, message: 'Categories reordered successfully' });
  });

  // ─────────────────────────────────────────────
  // Admin — Category Oversight
  // ─────────────────────────────────────────────

  /**
   * GET /admin/categories
   * All categories across all restaurants
   */
  static adminGetAllCategories = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { restaurantId, isActive } = req.query;

    const query: any = {};
    if (restaurantId) query.restaurantId = restaurantId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const [categories, total] = await Promise.all([
      Category.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('restaurantId', 'name'),
      Category.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  /**
   * PATCH /admin/categories/:id/toggle-active
   * Force-enable or disable a category
   */
  static adminToggleCategoryActive = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new AppError('Category not found', 404);

    category.isActive = !category.isActive;
    await category.save();

    res.status(200).json({
      success: true,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { category },
    });
  });
}