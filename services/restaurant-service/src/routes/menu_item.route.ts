import { Router } from 'express';
import { MenuItemController } from '../controllers/menu_item.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Extract user info
router.use(AuthMiddleware.extractUser);

// Menu items for a restaurant
router.post(
  '/restaurants/:restaurantId/menu-items',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createMenuItemValidation(),
  ValidationMiddleware.handleValidationErrors,
  MenuItemController.createMenuItem
);

router.get(
  '/restaurants/:restaurantId/menu-items',
  MenuItemController.getMenuItems
);

router.get(
  '/restaurants/:restaurantId/menu-items/popular',
  MenuItemController.getPopularItems
);

// Individual menu item operations
router.get('/menu-items/:id', MenuItemController.getMenuItemById);

router.put(
  '/menu-items/:id',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createMenuItemValidation(),
  ValidationMiddleware.handleValidationErrors,
  MenuItemController.updateMenuItem
);

router.delete(
  '/menu-items/:id',
  AuthMiddleware.requireAuth,
  MenuItemController.deleteMenuItem
);

router.patch(
  '/menu-items/:id/toggle-availability',
  AuthMiddleware.requireAuth,
  MenuItemController.toggleAvailability
);

export default router;