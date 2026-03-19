

import { Router } from 'express';
import { MenuItemController } from '../controllers/menu_item.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(AuthMiddleware.extractUser);

// ═══════════════════════════════════════════════
// ADMIN ROUTES  —  /admin/...
// ═══════════════════════════════════════════════

router.get(
  '/admin/menu-items',
  AuthMiddleware.requireAdmin,
  MenuItemController.adminGetAllMenuItems
);

router.get(
  '/admin/menu-items/stats',
  AuthMiddleware.requireAdmin,
  MenuItemController.adminGetMenuStats
);

router.patch(
  '/admin/menu-items/:id/status',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  MenuItemController.adminSetMenuItemStatus
);

// Admin can also hard-delete any menu item
router.delete(
  '/admin/menu-items/:id',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  MenuItemController.deleteMenuItem
);

// ═══════════════════════════════════════════════
// PUBLIC / OWNER ROUTES
// ═══════════════════════════════════════════════

router.post(
  '/restaurants/:restaurantId/menu-items',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createMenuItemValidation(),
  ValidationMiddleware.handleValidationErrors,
  MenuItemController.createMenuItem
);

router.get('/restaurants/:restaurantId/menu-items', MenuItemController.getMenuItems);
router.get('/restaurants/:restaurantId/menu-items/popular', MenuItemController.getPopularItems);

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