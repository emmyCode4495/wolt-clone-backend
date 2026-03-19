// import { Router } from 'express';
// import { RestaurantController } from '../controllers/restaurant.controller';
// import { ValidationMiddleware } from '../middleware/validation.middleware';
// import { AuthMiddleware } from '../middleware/auth.middleware';

// const router = Router();

// // Extract user info from all requests
// router.use(AuthMiddleware.extractUser);

// // Restaurant CRUD
// router.post(
//   '/',
//   AuthMiddleware.requireAuth,
//   ValidationMiddleware.createRestaurantValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   RestaurantController.createRestaurant
// );

// router.get('/country/:country', RestaurantController.getRestaurantsByCountry);
// router.get('/cities', RestaurantController.getCities);
// router.get('/get-all', RestaurantController.getAllRestaurants);

// router.get('/:id', RestaurantController.getRestaurantById);





// router.put(
//   '/:id',
//   AuthMiddleware.requireAuth,
//   ValidationMiddleware.createRestaurantValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   RestaurantController.updateRestaurant
// );

// router.delete(
//   '/:id',
//   AuthMiddleware.requireAuth,
//   RestaurantController.deleteRestaurant
// );

// // Restaurant menu
// router.get('/:id/menu', RestaurantController.getRestaurantMenu);

// // Owner's restaurants
// router.get('/owner/:ownerId', RestaurantController.getOwnerRestaurants);

// export default router;


import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Populate req.user on every request
router.use(AuthMiddleware.extractUser);

// ═══════════════════════════════════════════════
// ADMIN ROUTES  —  /api/restaurants/admin/...
// Must be declared before /:id to avoid route conflicts
// ═══════════════════════════════════════════════

router.get(
  '/admin/stats',
  AuthMiddleware.requireAdmin,
  RestaurantController.adminGetStats
);

router.get(
  '/admin/pending',
  AuthMiddleware.requireAdmin,
  RestaurantController.adminGetPendingRestaurants
);

router.get(
  '/admin/restaurants',
  AuthMiddleware.requireAdmin,
  RestaurantController.adminGetAllRestaurants
);

router.patch(
  '/admin/restaurants/:id/status',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.adminUpdateRestaurantStatus
);

router.patch(
  '/admin/restaurants/:id/verify',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.adminToggleVerified
);

router.patch(
  '/admin/restaurants/:id/feature',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.adminToggleFeatured
);

router.delete(
  '/admin/restaurants/:id',
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.adminDeleteRestaurant
);

// ═══════════════════════════════════════════════
// PUBLIC / OWNER ROUTES
// ═══════════════════════════════════════════════

router.post(
  '/',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createRestaurantValidation(),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.createRestaurant
);

router.get('/country/:country', RestaurantController.getRestaurantsByCountry);
router.get('/cities', RestaurantController.getCities);
router.get('/get-all', RestaurantController.getAllRestaurants);

router.get(
  '/owner/:ownerId',
  AuthMiddleware.requireAuth,
  RestaurantController.getOwnerRestaurants
);

router.get('/:id', RestaurantController.getRestaurantById);
router.get('/:id/menu', RestaurantController.getRestaurantMenu);

router.put(
  '/:id',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createRestaurantValidation(),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.updateRestaurant
);

router.delete(
  '/:id',
  AuthMiddleware.requireAuth,
  RestaurantController.deleteRestaurant
);

export default router;