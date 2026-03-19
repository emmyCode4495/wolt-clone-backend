// import { Router } from 'express';
// import { UserController } from '../controllers/user.controller';
// import { AuthMiddleware } from '../middleware/auth.middleware';
// import { ValidationMiddleware } from '../middleware/validation.middleware';
// import { ErrorMiddleware } from '../middleware/error.middleware';
// import { UserRole } from '../models/user.model';

// const router = Router();

// // Public routes
// router.post(
//   '/register',
//   ValidationMiddleware.registerValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.register)
// );

// router.post(
//   '/login',
//   ValidationMiddleware.loginValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.login)
// );

// router.post(
//   '/refresh-token',
//   ErrorMiddleware.asyncHandler(UserController.refreshToken)
// );

// // Protected routes
// router.post(
//   '/logout',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(UserController.logout)
// );

// router.get(
//   '/profile',
//   AuthMiddleware.authenticate,
//   ErrorMiddleware.asyncHandler(UserController.getProfile)
// );

// router.put(
//   '/profile',
//   AuthMiddleware.authenticate,
//   ValidationMiddleware.updateProfileValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.updateProfile)
// );

// router.put(
//   '/change-password',
//   AuthMiddleware.authenticate,
//   ValidationMiddleware.changePasswordValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.changePassword)
// );

// // Address routes
// router.post(
//   '/addresses',
//   AuthMiddleware.authenticate,
//   ValidationMiddleware.addAddressValidation(),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.addAddress)
// );

// router.put(
//   '/addresses/:addressId',
//   AuthMiddleware.authenticate,
//   ValidationMiddleware.mongoIdValidation('addressId'),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.updateAddress)
// );

// router.delete(
//   '/addresses/:addressId',
//   AuthMiddleware.authenticate,
//   ValidationMiddleware.mongoIdValidation('addressId'),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.deleteAddress)
// );

// // Admin routes
// router.get(
//   '/',
//   AuthMiddleware.authenticate,
//   AuthMiddleware.authorize(UserRole.ADMIN),
//   ErrorMiddleware.asyncHandler(UserController.getAllUsers)
// );

// router.get(
//   '/:id',
//   AuthMiddleware.authenticate,
//   AuthMiddleware.authorize(UserRole.ADMIN),
//   ValidationMiddleware.mongoIdValidation('id'),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.getUserById)
// );

// router.patch(
//   '/:id/status',
//   AuthMiddleware.authenticate,
//   AuthMiddleware.authorize(UserRole.ADMIN),
//   ValidationMiddleware.mongoIdValidation('id'),
//   ValidationMiddleware.handleValidationErrors,
//   ErrorMiddleware.asyncHandler(UserController.updateUserStatus)
// );

// export default router;

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// ═══════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════

/**
 * POST /api/users/register
 * Register a new user (customer / driver / restaurant_owner only)
 */
router.post(
  '/register',
  ValidationMiddleware.registerValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.register)
);

/**
 * POST /api/users/login
 * Login for all roles — returns role in token so client can route accordingly
 */
router.post(
  '/login',
  ValidationMiddleware.loginValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.login)
);

/**
 * POST /api/users/admin/login
 * Admin-only login — requires X-Admin-Secret header in addition to credentials.
 * Responds with the same token shape but sets role: "admin".
 *
 * Headers required:
 *   X-Admin-Secret: <ADMIN_SECRET from env>
 */
router.post(
  '/admin/login',
  ValidationMiddleware.adminLoginValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.adminLogin)
);

/**
 * POST /api/users/refresh-token
 */
router.post(
  '/refresh-token',
  ErrorMiddleware.asyncHandler(UserController.refreshToken)
);

// ═══════════════════════════════════════════════
// PROTECTED — Authenticated Users
// ═══════════════════════════════════════════════

/**
 * POST /api/users/logout
 */
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(UserController.logout)
);

/**
 * GET  /api/users/profile
 * PUT  /api/users/profile
 */
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

/**
 * PUT /api/users/change-password
 */
router.put(
  '/change-password',
  AuthMiddleware.authenticate,
  ValidationMiddleware.changePasswordValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.changePassword)
);

/**
 * Address CRUD
 * POST   /api/users/addresses
 * PUT    /api/users/addresses/:addressId
 * DELETE /api/users/addresses/:addressId
 */
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

// ═══════════════════════════════════════════════
// ADMIN ROUTES — Require admin role
// ═══════════════════════════════════════════════

/**
 * GET /api/users/admin/stats
 * Platform-wide user statistics
 */
router.get(
  '/admin/stats',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ErrorMiddleware.asyncHandler(UserController.getStats)
);

/**
 * POST /api/users/admin/create
 * Create a new admin account.
 * Requires: authenticated admin + X-Admin-Secret header.
 *
 * Headers required:
 *   Authorization: Bearer <admin_access_token>
 *   X-Admin-Secret: <ADMIN_SECRET from env>
 */
router.post(
  '/admin/create',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ValidationMiddleware.createAdminValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.createAdmin)
);

/**
 * GET  /api/users          — list all users (paginated, filterable)
 * GET  /api/users/:id      — get single user
 */
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

/**
 * PATCH  /api/users/:id/status  — activate, suspend, etc.
 * DELETE /api/users/:id          — hard delete
 */
router.patch(
  '/:id/status',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.updateUserStatusValidation(),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.updateUserStatus)
);

router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize(UserRole.ADMIN),
  ValidationMiddleware.mongoIdValidation('id'),
  ValidationMiddleware.handleValidationErrors,
  ErrorMiddleware.asyncHandler(UserController.deleteUser)
);

export default router;