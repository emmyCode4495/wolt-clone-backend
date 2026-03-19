

import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Populate req.user on every request
router.use(AuthMiddleware.extractUser);

// ═══════════════════════════════════════════════
// ADMIN ROUTES  —  /admin/...
// Declared first — before any /:id wildcards
// All require admin role
// ═══════════════════════════════════════════════

/**
 * GET /api/orders/admin/stats
 * Platform-wide order & revenue dashboard stats
 * Query params: dateFrom, dateTo
 */
router.get(
  '/admin/stats',
  AuthMiddleware.requireAdmin,
  OrderController.adminGetPlatformStats
);

/**
 * GET /api/orders/admin/stats/restaurants
 * Per-restaurant revenue breakdown (paginated)
 * Query params: dateFrom, dateTo, page, limit
 */
router.get(
  '/admin/stats/restaurants',
  AuthMiddleware.requireAdmin,
  OrderController.adminGetRevenueByRestaurant
);

/**
 * GET /api/orders/admin/orders
 * Full paginated order list — all users, all restaurants
 * Query params: status, paymentStatus, paymentMethod, deliveryType,
 *               customerId, restaurantId, driverId,
 *               dateFrom, dateTo, minTotal, maxTotal, page, limit
 */
router.get(
  '/admin/orders',
  AuthMiddleware.requireAdmin,
  OrderController.adminGetAllOrders
);

/**
 * PATCH /api/orders/admin/orders/:id/payment-status
 * Update payment status — e.g. mark as refunded
 * Body: { paymentStatus, reason? }
 */
router.patch(
  '/admin/orders/:id/payment-status',
  AuthMiddleware.requireAdmin,
  OrderController.adminUpdatePaymentStatus
);

/**
 * PATCH /api/orders/admin/orders/:id/force-cancel
 * Cancel any order at any stage (except delivered)
 * Body: { reason }  ← required
 */
router.patch(
  '/admin/orders/:id/force-cancel',
  AuthMiddleware.requireAdmin,
  OrderController.adminForceCancel
);

/**
 * PATCH /api/orders/admin/orders/:id/status
 * Override order status freely — admin can move status in any direction
 * Body: { status, restaurantNotes? }
 */
router.patch(
  '/admin/orders/:id/status',
  AuthMiddleware.requireAdmin,
  OrderController.updateOrderStatus
);

// ═══════════════════════════════════════════════
// AUTHENTICATED USER ROUTES
// All routes below require a valid user session
// ═══════════════════════════════════════════════

router.use(AuthMiddleware.requireAuth);

/**
 * POST /api/orders
 * Create a new order (customer)
 */
router.post('/', OrderController.createOrder);

/**
 * GET /api/orders/my-orders
 * Get the logged-in customer's own orders
 * Query params: status, page, limit
 */
router.get('/my-orders', OrderController.getCustomerOrders);

/**
 * GET /api/orders/restaurant/:restaurantId
 * Get all orders for a specific restaurant (restaurant owner / admin)
 * Query params: status, page, limit
 */
router.get('/restaurant/:restaurantId', OrderController.getRestaurantOrders);

/**
 * GET /api/orders/restaurant/:restaurantId/stats
 * Per-restaurant order statistics (restaurant owner / admin)
 */
router.get('/restaurant/:restaurantId/stats', OrderController.getOrderStats);

/**
 * GET /api/orders/:id
 * Get a single order by ID
 */
router.get('/:id', OrderController.getOrderById);

/**
 * PATCH /api/orders/:id/status
 * Update order status (restaurant owner — forward-only)
 * Body: { status, restaurantNotes? }
 */
router.patch('/:id/status', OrderController.updateOrderStatus);

/**
 * PATCH /api/orders/:id/assign-driver
 * Assign a driver to a ready order
 * Body: { driverId }
 */
router.patch('/:id/assign-driver', OrderController.assignDriver);

/**
 * PATCH /api/orders/:id/cancel
 * Cancel an order (customer — pending/confirmed only; admin — any stage)
 * Body: { reason? }
 */
router.patch('/:id/cancel', OrderController.cancelOrder);

export default router;