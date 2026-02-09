import { Response } from 'express';
import axios from 'axios';
import { Order, OrderStatus, PaymentStatus, DeliveryType } from '../models/order.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config';

export class OrderController {
  // Create a new order
  static createOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const { restaurantId, items, deliveryType, deliveryAddress, paymentMethod, customerNotes } = req.body;

    // Validate restaurant exists (call restaurant service)
    const restaurantResponse = await axios.get(
      `${config.restaurantServiceUrl}/api/restaurants/${restaurantId}`
    ).catch(() => null);

    if (!restaurantResponse || !restaurantResponse.data.success) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = restaurantResponse.data.data.restaurant;

    // Calculate pricing
    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      let itemTotal = item.price * item.quantity;
      
      // Add variant price
      if (item.variant) {
        itemTotal += item.variant.price * item.quantity;
      }
      
      // Add addOns price
      if (item.addOns && item.addOns.length > 0) {
        const addOnsTotal = item.addOns.reduce((sum: number, addon: any) => sum + addon.price, 0);
        itemTotal += addOnsTotal * item.quantity;
      }
      
      subtotal += itemTotal;

      return {
        ...item,
        subtotal: itemTotal,
      };
    });

    const deliveryFee = deliveryType === DeliveryType.DELIVERY 
      ? restaurant.deliveryInfo.deliveryFee 
      : 0;

    const tax = subtotal * config.taxRate;
    const total = subtotal + deliveryFee + tax;

    // Check minimum order for delivery
    if (deliveryType === DeliveryType.DELIVERY && subtotal < restaurant.deliveryInfo.minimumOrder) {
      throw new AppError(
        `Minimum order amount is $${restaurant.deliveryInfo.minimumOrder}`,
        400
      );
    }

    // Estimate delivery time
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

  // Get all orders (with filters)
  static getAllOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { status, customerId, restaurantId, driverId } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (restaurantId) query.restaurantId = restaurantId;
    if (driverId) query.driverId = driverId;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  // Get order by ID
  static getOrderById = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  });

  // Get customer's orders
  static getCustomerOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ customerId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments({ customerId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  // Get restaurant's orders
  static getRestaurantOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { status } = req.query;
    const query: any = { restaurantId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  });

  // Update order status
  static updateOrderStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, restaurantNotes } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Update status and set timestamp
    order.status = status;
    if (restaurantNotes) order.restaurantNotes = restaurantNotes;

    switch (status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = new Date();
        break;
      case OrderStatus.PREPARING:
        order.preparingAt = new Date();
        break;
      case OrderStatus.READY:
        order.readyAt = new Date();
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        order.outForDeliveryAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        break;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: { order },
    });
  });

  // Assign driver to order
  static assignDriver = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { driverId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    order.driverId = driverId;
    if (order.status === OrderStatus.READY) {
      order.status = OrderStatus.OUT_FOR_DELIVERY;
      order.outForDeliveryAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data: { order },
    });
  });

  // Cancel order
  static cancelOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow cancellation if not delivered
    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError('Cannot cancel delivered order', 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  });

  // Get order statistics
  static getOrderStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { restaurantId } = req.params;

    const stats = await Order.aggregate([
      { $match: { restaurantId: restaurantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments({ restaurantId });
    const totalRevenue = await Order.aggregate([
      { $match: { restaurantId, status: OrderStatus.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats,
      },
    });
  });
}