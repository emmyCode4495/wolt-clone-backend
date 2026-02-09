import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Extract user info from all requests
router.use(AuthMiddleware.extractUser);

// Restaurant CRUD
router.post(
  '/',
  AuthMiddleware.requireAuth,
  ValidationMiddleware.createRestaurantValidation(),
  ValidationMiddleware.handleValidationErrors,
  RestaurantController.createRestaurant
);

router.get('/get-all', RestaurantController.getAllRestaurants);

router.get('/:id', RestaurantController.getRestaurantById);

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

// Restaurant menu
router.get('/:id/menu', RestaurantController.getRestaurantMenu);

// Owner's restaurants
router.get('/owner/:ownerId', RestaurantController.getOwnerRestaurants);

export default router;