import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// Public routes
router.post(
  '/register',
  ValidationMiddleware.registerValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.register)
);

router.post(
  '/login',
  ValidationMiddleware.loginValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.login)
);

router.post(
  '/refresh-token',
  ErrorMiddleware.asyncHandler(UserController.refreshToken)
);

// Protected routes
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(UserController.logout)
);

router.get(
  '/profile',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(UserController.getProfile)
);

router.put(
  '/profile',
  AuthMiddleware.authenticate,
  ValidationMiddleware.updateProfileValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.updateProfile)
);

router.put(
  '/change-password',
  AuthMiddleware.authenticate,
  ValidationMiddleware.changePasswordValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.changePassword)
);

// Address routes
router.post(
  '/addresses',
  AuthMiddleware.authenticate,
  ValidationMiddleware.addAddressValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.addAddress)
);

router.put(
  '/addresses/:addressId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.mongoIdValidation('addressId'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.updateAddress)
);

router.delete(
  '/addresses/:addressId',
  AuthMiddleware.authenticate,
  ValidationMiddleware.mongoIdValidation('addressId'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.deleteAddress)
);

// Admin routes
router.get(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ErrorMiddleware.asyncHandler(UserController.getAllUsers)
);

router.get(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.getUserById)
);

router.patch(
  '/:id/status',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.updateUserStatus)
);

export default router;