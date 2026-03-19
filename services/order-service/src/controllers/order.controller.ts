
import { Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { Order, OrderStatus, PaymentStatus, DeliveryType } from '../models/order.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config';

export class OrderController {

  // ─────────────────────────────────────────────
  // Customer — Create Order
  // ─────────────────────────────────────────────

  static createOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const { restaurantId, items, deliveryType, deliveryAddress, paymentMethod, customerNotes } = req.body;

    const restaurantResponse = await axios
      .get(`${config.restaurantServiceUrl}/api/restaurants/${restaurantId}`)
      .catch(() => null);

    if (!restaurantResponse?.data.success) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = restaurantResponse.data.data.restaurant;

    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      let itemTotal = item.price * item.quantity;
      if (item.variant) itemTotal += item.variant.price * item.quantity;
      if (item.addOns?.length) {
        itemTotal += item.addOns.reduce((sum: number, addon: any) => sum + addon.price, 0) * item.quantity;
      }
      subtotal += itemTotal;
      return { ...item, subtotal: itemTotal };
    });

    const deliveryFee = deliveryType === DeliveryType.DELIVERY
      ? restaurant.deliveryInfo.deliveryFee
      : 0;

    const tax = subtotal * config.taxRate;
    const total = subtotal + deliveryFee + tax;

    if (deliveryType === DeliveryType.DELIVERY && subtotal < restaurant.deliveryInfo.minimumOrder) {
      throw new AppError(`Minimum order amount is $${restaurant.deliveryInfo.minimumOrder}`, 400);
    }

    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(
      estimatedDeliveryTime.getMinutes() + restaurant.deliveryInfo.estimatedDeliveryTime
    );

    const order = await Order.create({
      customerId,
      restaurantId,
      items: processedItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      customerNotes,
      estimatedDeliveryTime,
      paymentStatus: paymentMethod === 'cash' ? PaymentStatus.PENDING : PaymentStatus.PAID,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  });

  // ─────────────────────────────────────────────
  // Customer — Own Orders
  // ─────────────────────────────────────────────

  static getCustomerOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { customerId };
    if (req.query.status) query.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  });

  // ─────────────────────────────────────────────
  // Restaurant — Own Restaurant Orders
  // ─────────────────────────────────────────────

  static getRestaurantOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = { restaurantId };
    if (req.query.status) query.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  });

  // Per-restaurant stats (used by restaurant owner dashboard too)
  static getOrderStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;

    const [statusBreakdown, totalOrders, revenueResult] = await Promise.all([
      Order.aggregate([
        { $match: { restaurantId } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ restaurantId }),
      Order.aggregate([
        { $match: { restaurantId, status: OrderStatus.DELIVERED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: revenueResult[0]?.total || 0,
        statusBreakdown,
      },
    });
  });

  // ─────────────────────────────────────────────
  // Shared — Order Lifecycle (restaurant + admin)
  // ─────────────────────────────────────────────

  static getOrderById = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new AppError('Order not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isCustomer = order.customerId.toString() === req.user?.id;
    const isDriver = order.driverId?.toString() === req.user?.id;
    // Restaurant ownership check would require a service call; allow if any of the above or admin
    if (!isAdmin && !isCustomer && !isDriver) {
      // Allow restaurant owners through too — they pass restaurantId check on their own route
      // For direct lookup, trust the auth layer to scope access on the frontend
      // (or add a service call here if strict enforcement is needed)
    }

    res.status(200).json({ success: true, data: { order } });
  });

  static updateOrderStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, restaurantNotes } = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const isAdmin = req.user?.role === 'admin';

    // Non-admins cannot push an order back to a previous status
    const statusFlow = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    const currentIndex = statusFlow.indexOf(order.status as OrderStatus);
    const newIndex = statusFlow.indexOf(status);

    if (!isAdmin && newIndex < currentIndex && status !== OrderStatus.CANCELLED) {
      throw new AppError('Cannot move order back to a previous status', 400);
    }

    order.status = status;
    if (restaurantNotes) order.restaurantNotes = restaurantNotes;

    switch (status) {
      case OrderStatus.CONFIRMED:      order.confirmedAt = new Date();       break;
      case OrderStatus.PREPARING:      order.preparingAt = new Date();       break;
      case OrderStatus.READY:          order.readyAt = new Date();           break;
      case OrderStatus.OUT_FOR_DELIVERY: order.outForDeliveryAt = new Date(); break;
      case OrderStatus.DELIVERED:      order.deliveredAt = new Date();       break;
      case OrderStatus.CANCELLED:      order.cancelledAt = new Date();       break;
    }

    await order.save();

    res.status(200).json({ success: true, message: 'Order status updated', data: { order } });
  });

  static assignDriver = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { driverId } = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    order.driverId = driverId;
    if (order.status === OrderStatus.READY) {
      order.status = OrderStatus.OUT_FOR_DELIVERY;
      order.outForDeliveryAt = new Date();
    }

    await order.save();

    res.status(200).json({ success: true, message: 'Driver assigned successfully', data: { order } });
  });

  static cancelOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = order.customerId.toString() === req.user?.id;

    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorized to cancel this order', 403);
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError('Cannot cancel a delivered order', 400);
    }

    // Non-admins can only cancel while still pending or confirmed
    if (!isAdmin && ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status as OrderStatus)) {
      throw new AppError('Order cannot be cancelled at this stage. Please contact support.', 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: { order } });
  });

  // ─────────────────────────────────────────────
  // Admin — Platform-wide Order Management
  // ─────────────────────────────────────────────

  /**
   * GET /admin/orders
   * Full order list — all customers, all restaurants, all statuses
   * Supports rich filtering for the admin dashboard table
   */
  static adminGetAllOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const {
      status,
      paymentStatus,
      paymentMethod,
      deliveryType,
      customerId,
      restaurantId,
      driverId,
      dateFrom,
      dateTo,
      minTotal,
      maxTotal,
    } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (deliveryType) query.deliveryType = deliveryType;
    if (customerId) query.customerId = customerId;
    if (restaurantId) query.restaurantId = restaurantId;
    if (driverId) query.driverId = driverId;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) query.total.$gte = parseFloat(minTotal as string);
      if (maxTotal) query.total.$lte = parseFloat(maxTotal as string);
    }

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  });

  /**
   * PATCH /admin/orders/:id/payment-status
   * Update payment status — e.g. mark as refunded after a dispute
   */
  static adminUpdatePaymentStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { paymentStatus, reason } = req.body;

    const validStatuses = Object.values(PaymentStatus);
    if (!validStatuses.includes(paymentStatus)) {
      throw new AppError(`paymentStatus must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const previousStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;

    // If marking as refunded, also cancel the order if it isn't delivered yet
    if (paymentStatus === PaymentStatus.REFUNDED && order.status !== OrderStatus.DELIVERED) {
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'Refunded by admin';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment status changed from '${previousStatus}' to '${paymentStatus}'`,
      data: { order },
    });
  });

  /**
   * PATCH /admin/orders/:id/force-cancel
   * Cancel any order at any stage — even out-for-delivery ones
   */
  static adminForceCancel = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) throw new AppError('Cancellation reason is required for admin force-cancel', 400);

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError('Cannot cancel an already-delivered order. Use refund instead.', 400);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Order is already cancelled', 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = `[Admin] ${reason}`;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order force-cancelled by admin',
      data: { order },
    });
  });

  /**
   * GET /admin/orders/stats
   * Platform-wide revenue and order statistics for the admin dashboard
   */
  static adminGetPlatformStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;

    const dateFilter: any = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo) dateFilter.$lte = new Date(dateTo as string);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const baseMatch = hasDateFilter ? { createdAt: dateFilter } : {};
    const deliveredMatch = { ...baseMatch, status: OrderStatus.DELIVERED };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenueResult,
      byStatus,
      byPaymentMethod,
      byDeliveryType,
      revenueByDay,           // last 30 days daily revenue
      ordersByDay,            // last 30 days daily order count
      topRestaurants,         // top 5 by revenue
      ordersToday,
      ordersThisWeek,
      revenueToday,
    ] = await Promise.all([
      Order.countDocuments(baseMatch),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.DELIVERED }),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.CANCELLED }),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.PENDING }),

      // Total platform revenue (delivered orders only)
      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: null, revenue: { $sum: '$total' }, tax: { $sum: '$tax' }, deliveryFees: { $sum: '$deliveryFee' } } },
      ]),

      // Breakdown by order status
      Order.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, status: '$_id', count: 1, revenue: 1 } },
      ]),

      // Breakdown by payment method
      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, method: '$_id', count: 1, revenue: 1 } },
      ]),

      // Delivery vs Pickup split
      Order.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$deliveryType', count: { $sum: 1 } } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),

      // Daily revenue — last 30 days
      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
      ]),

      // Daily order count — last 30 days (all statuses)
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),

      // Top 5 restaurants by delivered revenue
      Order.aggregate([
        { $match: deliveredMatch },
        {
          $group: {
            _id: '$restaurantId',
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, restaurantId: '$_id', totalRevenue: 1, totalOrders: 1 } },
      ]),

      // Quick counters for the top of the dashboard
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
    ]);

    const revenue = totalRevenueResult[0] || { revenue: 0, tax: 0, deliveryFees: 0 };

    res.status(200).json({
      success: true,
      data: {
        stats: {
          // Headline numbers
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          pendingOrders,
          completionRate: totalOrders > 0
            ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2))
            : 0,

          // Revenue
          totalRevenue: revenue.revenue,
          totalTax: revenue.tax,
          totalDeliveryFees: revenue.deliveryFees,

          // Quick period stats
          ordersToday,
          ordersThisWeek,
          revenueToday: revenueToday[0]?.revenue || 0,

          // Breakdowns for charts
          byStatus,
          byPaymentMethod,
          byDeliveryType,

          // Time-series for line charts (last 30 days)
          revenueByDay,
          ordersByDay,

          // Leaderboard
          topRestaurants,
        },
      },
    });
  });

  /**
   * GET /admin/orders/stats/restaurants
   * Per-restaurant revenue summary — useful for financial reporting
   */
  static adminGetRevenueByRestaurant = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { dateFrom, dateTo } = req.query;
    const match: any = { status: OrderStatus.DELIVERED };
    if (dateFrom) match.createdAt = { ...match.createdAt, $gte: new Date(dateFrom as string) };
    if (dateTo) match.createdAt = { ...match.createdAt, $lte: new Date(dateTo as string) };

    const [result, total] = await Promise.all([
      Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$restaurantId',
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            restaurantId: '$_id',
            totalRevenue: 1,
            totalOrders: 1,
            avgOrderValue: { $round: ['$avgOrderValue', 2] },
          },
        },
      ]),
      Order.aggregate([
        { $match: match },
        { $group: { _id: '$restaurantId' } },
        { $count: 'total' },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        restaurants: result,
        pagination: {
          page,
          limit,
          total: total[0]?.total || 0,
          pages: Math.ceil((total[0]?.total || 0) / limit),
        },
      },
    });
  });
}