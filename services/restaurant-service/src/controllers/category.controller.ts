import { Request, Response } from 'express';
import { Category } from '../models/category.model';
import { Restaurant } from '../models/restaurant.model';
import { MenuItem } from '../models/menu_item.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';

export class CategoryController {
  static createCategory = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    const category = await Category.create({
      ...req.body,
      restaurantId,
    });

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

    res.status(200).json({
      success: true,
      data: { categories },
    });
  });

  static getCategoryById = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  });

  static updateCategory = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  });

  static deleteCategory = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if category has menu items
    const itemCount = await MenuItem.countDocuments({ categoryId: req.params.id });
    if (itemCount > 0) {
      throw new AppError('Cannot delete category with existing menu items', 400);
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  });

  static reorderCategories = ErrorMiddleware.asyncHandler(async (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const { categoryOrders } = req.body; // Array of { categoryId, displayOrder }

    const updatePromises = categoryOrders.map((item: any) =>
      Category.findByIdAndUpdate(item.categoryId, { displayOrder: item.displayOrder })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Categories reordered successfully',
    });
  });
}