


import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(AuthMiddleware.extractUser);

// ═══════════════════════════════════════════════
// ADMIN ROUTES  —  /admin/...
// ═══════════════════════════════════════════════

router.get(
  '/admin/categories',
  AuthMiddleware.requireAdmin,
  CategoryController.adminGetAllCategories
);

router.patch(
  '/admin/categories/:id/toggle-active',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  CategoryController.adminToggleCategoryActive
);

// Admin can force-delete a category (bypasses item-count guard — use with care)
router.delete(
  '/admin/categories/:id',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  CategoryController.deleteCategory
);

// ═══════════════════════════════════════════════
// PUBLIC / OWNER ROUTES
// ═══════════════════════════════════════════════

router.post(
  '/restaurants/:restaurantId/categories',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createCategoryValidation(),
  ValidationMiddleware.handleValidationErrors,
  CategoryController.createCategory
);

router.get('/restaurants/:restaurantId/categories', CategoryController.getCategories);

router.post(
  '/restaurants/:restaurantId/categories/reorder',
  AuthMiddleware.requireAuth,
  CategoryController.reorderCategories
);

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