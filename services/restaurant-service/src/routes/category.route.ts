import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Extract user info
router.use(AuthMiddleware.extractUser);

// Categories for a restaurant
router.post(
  '/restaurants/:restaurantId/categories',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createCategoryValidation(),
  ValidationMiddleware.handleValidationErrors,
  CategoryController.createCategory
);

router.get(
  '/restaurants/:restaurantId/categories',
  CategoryController.getCategories
);

router.post(
  '/restaurants/:restaurantId/categories/reorder',
  AuthMiddleware.requireAuth,
  CategoryController.reorderCategories
);

// Individual category operations
router.get('/categories/:id', CategoryController.getCategoryById);

router.put(
  '/categories/:id',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createCategoryValidation(),
  ValidationMiddleware.handleValidationErrors,
  CategoryController.updateCategory
);

router.delete(
  '/categories/:id',
  AuthMiddleware.requireAuth,
  CategoryController.deleteCategory
);

export default router;