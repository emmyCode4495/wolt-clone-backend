import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Extract user info from all requests
router.use(AuthMiddleware.extractUser);

// All order routes require authentication
router.use(AuthMiddleware.requireAuth);

// Create order
router.post('/', OrderController.createOrder);

// Get all orders (admin/restaurant owner)
router.get('/', OrderController.getAllOrders);

// Get customer's orders
router.get('/my-orders', OrderController.getCustomerOrders);

// Get restaurant's orders
router.get('/restaurant/:restaurantId', OrderController.getRestaurantOrders);

// Get restaurant statistics
router.get('/restaurant/:restaurantId/stats', OrderController.getOrderStats);

// Get order by ID
router.get('/:id', OrderController.getOrderById);

// Update order status
router.patch('/:id/status', OrderController.updateOrderStatus);

// Assign driver
router.patch('/:id/assign-driver', OrderController.assignDriver);

// Cancel order
router.patch('/:id/cancel', OrderController.cancelOrder);

export default router;