// import { Response } from 'express';
// import axios from 'axios';
// import {
//   Order,
//   OrderStatus,
//   PaymentStatus,
//   DeliveryType,
//   ItemSource,
//   StoreType,
//   IOrderItem,
// } from '../models/order.model';
// import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { config } from '../config';

// // ─── Internal helpers ─────────────────────────────────────────────────────────

// /**
//  * Maps a store-service category slug to the microservice that owns its items.
//  * Food → restaurant-service (menu items with variants + add-ons)
//  * Everything else → catalog-service (products with SKU + stock)
//  */
// const resolveItemSource = (storeType: string): ItemSource =>
//   storeType === StoreType.FOOD
//     ? ItemSource.RESTAURANT_SERVICE
//     : ItemSource.CATALOG_SERVICE;

// /**
//  * Fetch and validate the store from store-service.
//  * Returns the full store document including category slug and delivery info.
//  */
// const fetchStore = async (storeId: string) => {
//   const res = await axios
//     .get(`${config.storeServiceUrl}/api/stores/${storeId}`)
//     .catch(() => null);

//   if (!res?.data?.success || !res.data.data) {
//     throw new AppError('Store not found or unavailable', 404);
//   }

//   const store = res.data.data;

//   if (store.status !== 'active') {
//     throw new AppError('This store is not currently accepting orders', 422);
//   }

//   return store;
// };

// /**
//  * Validate items against restaurant-service (food orders).
//  * Returns enriched items with server-confirmed prices.
//  */
// const validateFoodItems = async (
//   restaurantId: string,
//   items: any[]
// ): Promise<{ processedItems: IOrderItem[]; subtotal: number }> => {
//   // Fetch the restaurant's menu from restaurant-service
//   const menuRes = await axios
//     .get(`${config.restaurantServiceUrl}/api/restaurants/${restaurantId}/menu`)
//     .catch(() => null);

//   // If restaurant-service is unavailable, trust client prices but flag it
//   // In production you would always require server-side validation
//   if (!menuRes?.data?.success) {
//     throw new AppError(
//       'Could not reach restaurant service to validate menu items. Please try again.',
//       503
//     );
//   }

//   const menuItems: Record<string, any> = {};
//   for (const item of menuRes.data.data ?? []) menuItems[item._id] = item;

//   let subtotal = 0;
//   const processedItems: IOrderItem[] = items.map((item: any) => {
//     const menuItem = menuItems[item.itemId];

//     // If item not found in menu, reject the order — don't trust client price
//     if (!menuItem) {
//       throw new AppError(`Menu item "${item.itemId}" not found in this restaurant's menu`, 422);
//     }
//     const basePrice = menuItem.price;

//     let itemTotal = basePrice * item.quantity;

//     if (item.variant && menuItem) {
//       const variant = menuItem.variants?.find((v: any) => v.name === item.variant.name);
//       itemTotal += (variant?.price ?? item.variant.price) * item.quantity;
//     }

//     if (item.addOns?.length) {
//       itemTotal += item.addOns.reduce(
//         (sum: number, addon: any) => sum + (addon.price ?? 0),
//         0
//       ) * item.quantity;
//     }

//     subtotal += itemTotal;

//     return {
//       itemId:     item.itemId,
//       itemSource: ItemSource.RESTAURANT_SERVICE,
//       name:       menuItem.name,
//       price:      basePrice,
//       quantity:   item.quantity,
//       variant:    item.variant,
//       addOns:     item.addOns ?? [],
//       specialInstructions: item.specialInstructions,
//       subtotal:   itemTotal,
//     };
//   });

//   return { processedItems, subtotal };
// };

// /**
//  * Validate items against catalog-service (grocery / pharmacy / shops).
//  * Checks stock availability and uses server-confirmed prices.
//  */
// const validateCatalogItems = async (
//   storeId: string,
//   items: any[]
// ): Promise<{ processedItems: IOrderItem[]; subtotal: number }> => {
//   // Fetch all products for this store in one call
//   const productsRes = await axios
//     .get(`${config.catalogServiceUrl}/api/catalog/products`, {
//       params: { storeId, limit: 200 },
//     })
//     .catch(() => null);

//   if (!productsRes?.data?.success) {
//     throw new AppError(
//       'Could not reach catalog service to validate products. Please try again.',
//       503
//     );
//   }

//   const productMap: Record<string, any> = {};
//   for (const p of productsRes.data.data ?? []) productMap[p._id] = p;

//   let subtotal = 0;
//   const processedItems: IOrderItem[] = [];

//   for (const item of items) {
//     const product = productMap[item.itemId];

//     // Reject unknown product IDs — never trust client-provided prices
//     if (!product) {
//       throw new AppError(`Product "${item.itemId}" was not found in this store`, 422);
//     }

//     // Stock checks
//     if (!product.inStock) {
//       throw new AppError(`"${product.name}" is currently out of stock`, 422);
//     }
//     if (product.stockCount !== -1 && product.stockCount < item.quantity) {
//       throw new AppError(
//         `Only ${product.stockCount} unit(s) of "${product.name}" available`,
//         422
//       );
//     }

//     // Use server price — client-provided price is ignored entirely
//     const price     = product.price;
//     const itemTotal = price * item.quantity;
//     subtotal       += itemTotal;

//     processedItems.push({
//       itemId:     item.itemId,
//       itemSource: ItemSource.CATALOG_SERVICE,
//       name:       product.name,
//       price,
//       quantity:   item.quantity,
//       addOns:     [],
//       specialInstructions: item.specialInstructions,
//       subtotal:   itemTotal,
//     });
//   }

//   return { processedItems, subtotal };
// };

// // buildItemsFromClient has been intentionally removed.
// // The order service ALWAYS fetches authoritative prices from the downstream
// // service. Client-provided prices are ignored to prevent manipulation.

// /**
//  * After a catalog order is placed, tell catalog-service to decrement stock
//  * and increment totalOrders on each product.
//  * Fire-and-forget — a failure here does not roll back the order.
//  */
// const notifyCatalogService = (storeId: string, items: IOrderItem[]) => {
//   const payload = {
//     items: items.map(i => ({ productId: i.itemId, quantity: i.quantity })),
//   };
//   axios
//     .patch(
//       `${config.catalogServiceUrl}/api/catalog/products/internal/order-update`,
//       payload,
//       { headers: { 'x-internal-service': 'order-service' } }
//     )
//     .catch(err =>
//       console.error('[order-service] catalog order-update notification failed:', err.message)
//     );
// };

// // ─── Controller ───────────────────────────────────────────────────────────────

// export class OrderController {

//   // ── Customer: Create Order ──────────────────────────────────────────────────

//   static createOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const customerId = req.user!.id;
//     const {
//       storeId,
//       items,
//       deliveryType,
//       deliveryAddress,
//       paymentMethod,
//       customerNotes,
//     } = req.body;

//     // ── Step 1: Validate the store via store-service ──────────────────────────
//     const store     = await fetchStore(storeId);
//     const storeType = store.category?.slug as StoreType;
//     const storeName = store.name as string;

//     // ── Step 2: Validate items from the correct downstream service ────────────
//     const itemSource = resolveItemSource(storeType);

//     let processedItems: IOrderItem[];
//     let subtotal: number;

//     if (itemSource === ItemSource.RESTAURANT_SERVICE) {
//       // Food orders: validate menu items against restaurant-service
//       // store-service stores map 1:1 to restaurants; use storeId as restaurantId
//       ({ processedItems, subtotal } = await validateFoodItems(storeId, items));
//     } else {
//       // Non-food orders: validate products against catalog-service
//       ({ processedItems, subtotal } = await validateCatalogItems(storeId, items));
//     }

//     // ── Step 3: Pricing ───────────────────────────────────────────────────────
//     const deliveryFee =
//       deliveryType === DeliveryType.PICKUP ? 0 : (store.deliveryFee ?? 0);

//     // Minimum order check (skip for pickup)
//     if (deliveryType === DeliveryType.DELIVERY) {
//       const minimumOrder = store.minimumOrder ?? 0;
//       if (subtotal < minimumOrder) {
//         throw new AppError(
//           `Minimum order for this store is ₦${minimumOrder.toLocaleString()}`,
//           400
//         );
//       }
//     }

//     const tax        = Math.round(subtotal * config.taxRate);
//     const total      = subtotal + deliveryFee + tax;

//     // Delivery address is required for delivery orders
//     if (deliveryType === DeliveryType.DELIVERY && !deliveryAddress?.street) {
//       throw new AppError('A delivery address is required for delivery orders', 400);
//     }

//     // ── Step 4: Persist the order ─────────────────────────────────────────────
//     const estimatedDeliveryTime = new Date();
//     estimatedDeliveryTime.setMinutes(
//       estimatedDeliveryTime.getMinutes() + (store.preparationTime ?? 30) + 15
//     );

//     const order = await Order.create({
//       customerId,
//       storeId,
//       storeType,
//       storeName,
//       items: processedItems,
//       subtotal,
//       deliveryFee,
//       tax,
//       total,
//       deliveryType,
//       deliveryAddress,
//       paymentMethod,
//       customerNotes,
//       estimatedDeliveryTime,
//       paymentStatus:
//         paymentMethod === 'cash' ? PaymentStatus.PENDING : PaymentStatus.PAID,
//     });

//     // ── Step 5: Side-effects ──────────────────────────────────────────────────
//     // Notify catalog-service to decrement stock (fire-and-forget)
//     if (itemSource === ItemSource.CATALOG_SERVICE) {
//       notifyCatalogService(storeId, processedItems);
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Order placed successfully',
//       data:    { order },
//     });
//   });

//   // ── Customer: Own Orders ────────────────────────────────────────────────────

//   static getCustomerOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const customerId = req.user!.id;
//     const page  = Math.max(1, parseInt(req.query.page as string) || 1);
//     const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
//     const skip  = (page - 1) * limit;

//     const query: Record<string, unknown> = { customerId };
//     if (req.query.status)    query.status    = req.query.status;
//     if (req.query.storeType) query.storeType = req.query.storeType;

//     const [orders, total] = await Promise.all([
//       Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
//       Order.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         orders,
//         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//       },
//     });
//   });

//   // ── Store Owner: Orders for their store ────────────────────────────────────
//   // Route: GET /api/orders/store/:storeId

//   static getStoreOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { storeId } = req.params;
//     const page  = Math.max(1, parseInt(req.query.page as string) || 1);
//     const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
//     const skip  = (page - 1) * limit;

//     const query: Record<string, unknown> = { storeId };
//     if (req.query.status) query.status = req.query.status;

//     const [orders, total] = await Promise.all([
//       Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
//       Order.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         orders,
//         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//       },
//     });
//   });

//   // ── Store Owner: Stats ─────────────────────────────────────────────────────

//   static getStoreOrderStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { storeId } = req.params;

//     const [statusBreakdown, totalOrders, revenueResult] = await Promise.all([
//       Order.aggregate([
//         { $match: { storeId } },
//         { $group: { _id: '$status', count: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
//       ]),
//       Order.countDocuments({ storeId }),
//       Order.aggregate([
//         { $match: { storeId, status: OrderStatus.DELIVERED } },
//         { $group: { _id: null, total: { $sum: '$total' } } },
//       ]),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         totalOrders,
//         totalRevenue:   revenueResult[0]?.total ?? 0,
//         statusBreakdown,
//       },
//     });
//   });

//   // ── Shared: Single Order ───────────────────────────────────────────────────

//   static getOrderById = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const order = await Order.findById(req.params.id).lean();
//     if (!order) throw new AppError('Order not found', 404);

//     // Access control: only the customer, their driver, or an admin may view
//     const isAdmin    = req.user?.role === 'admin';
//     const isCustomer = order.customerId === req.user?.id;
//     const isDriver   = order.driverId   === req.user?.id;

//     if (!isAdmin && !isCustomer && !isDriver) {
//       throw new AppError('You are not authorised to view this order', 403);
//     }

//     res.status(200).json({ success: true, data: { order } });
//   });

//   // ── Shared: Update Order Status ────────────────────────────────────────────

//   static updateOrderStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { id }                       = req.params;
//     const { status, restaurantNotes }  = req.body;

//     const order = await Order.findById(id);
//     if (!order) throw new AppError('Order not found', 404);

//     const isAdmin = req.user?.role === 'admin';

//     const STATUS_FLOW = [
//       OrderStatus.PENDING,
//       OrderStatus.CONFIRMED,
//       OrderStatus.PREPARING,
//       OrderStatus.READY,
//       OrderStatus.OUT_FOR_DELIVERY,
//       OrderStatus.DELIVERED,
//     ];

//     const currentIdx = STATUS_FLOW.indexOf(order.status as OrderStatus);
//     const newIdx     = STATUS_FLOW.indexOf(status);

//     if (!isAdmin && newIdx < currentIdx && status !== OrderStatus.CANCELLED) {
//       throw new AppError('Cannot move order back to a previous status', 400);
//     }

//     order.status = status;
//     if (restaurantNotes) order.restaurantNotes = restaurantNotes;

//     const now = new Date();
//     switch (status) {
//       case OrderStatus.CONFIRMED:        order.confirmedAt      = now; break;
//       case OrderStatus.PREPARING:        order.preparingAt      = now; break;
//       case OrderStatus.READY:            order.readyAt          = now; break;
//       case OrderStatus.OUT_FOR_DELIVERY: order.outForDeliveryAt = now; break;
//       case OrderStatus.DELIVERED:        order.deliveredAt      = now; break;
//       case OrderStatus.CANCELLED:        order.cancelledAt      = now; break;
//     }

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: `Order status updated to "${status}"`,
//       data:    { order },
//     });
//   });

//   // ── Shared: Assign Driver ──────────────────────────────────────────────────

//   static assignDriver = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { id }       = req.params;
//     const { driverId } = req.body;

//     const order = await Order.findById(id);
//     if (!order) throw new AppError('Order not found', 404);

//     order.driverId = driverId;

//     if (order.status === OrderStatus.READY) {
//       order.status           = OrderStatus.OUT_FOR_DELIVERY;
//       order.outForDeliveryAt = new Date();
//     }

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: 'Driver assigned successfully',
//       data:    { order },
//     });
//   });

//   // ── Customer / Admin: Cancel Order ─────────────────────────────────────────

//   static cancelOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { id }     = req.params;
//     const { reason } = req.body;

//     const order = await Order.findById(id);
//     if (!order) throw new AppError('Order not found', 404);

//     const isAdmin = req.user?.role === 'admin';
//     const isOwner = order.customerId === req.user?.id;

//     if (!isAdmin && !isOwner) {
//       throw new AppError('Not authorised to cancel this order', 403);
//     }

//     if (order.status === OrderStatus.DELIVERED) {
//       throw new AppError('Cannot cancel a delivered order', 400);
//     }

//     const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
//     if (!isAdmin && !cancellableStatuses.includes(order.status as OrderStatus)) {
//       throw new AppError(
//         'Order cannot be cancelled at this stage. Please contact support.',
//         400
//       );
//     }

//     order.status             = OrderStatus.CANCELLED;
//     order.cancelledAt        = new Date();
//     order.cancellationReason = reason;

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: 'Order cancelled successfully',
//       data:    { order },
//     });
//   });

//   // ══════════════════════════════════════════════════════════════════════════
//   // Admin Routes
//   // ══════════════════════════════════════════════════════════════════════════

//   static adminGetAllOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const page  = Math.max(1, parseInt(req.query.page as string) || 1);
//     const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
//     const skip  = (page - 1) * limit;

//     const {
//       status, paymentStatus, paymentMethod, deliveryType,
//       customerId, storeId, storeType, driverId,
//       dateFrom, dateTo, minTotal, maxTotal,
//     } = req.query;

//     const query: Record<string, unknown> = {};
//     if (status)        query.status        = status;
//     if (paymentStatus) query.paymentStatus = paymentStatus;
//     if (paymentMethod) query.paymentMethod = paymentMethod;
//     if (deliveryType)  query.deliveryType  = deliveryType;
//     if (customerId)    query.customerId    = customerId;
//     if (storeId)       query.storeId       = storeId;
//     if (storeType)     query.storeType     = storeType;
//     if (driverId)      query.driverId      = driverId;

//     if (dateFrom || dateTo) {
//       query.createdAt = {};
//       if (dateFrom) (query.createdAt as any).$gte = new Date(dateFrom as string);
//       if (dateTo)   (query.createdAt as any).$lte = new Date(dateTo   as string);
//     }

//     if (minTotal || maxTotal) {
//       query.total = {};
//       if (minTotal) (query.total as any).$gte = parseFloat(minTotal as string);
//       if (maxTotal) (query.total as any).$lte = parseFloat(maxTotal as string);
//     }

//     const [orders, total] = await Promise.all([
//       Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
//       Order.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         orders,
//         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//       },
//     });
//   });

//   static adminUpdatePaymentStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { id }                       = req.params;
//     const { paymentStatus, reason }    = req.body;

//     if (!Object.values(PaymentStatus).includes(paymentStatus)) {
//       throw new AppError(
//         `paymentStatus must be one of: ${Object.values(PaymentStatus).join(', ')}`,
//         400
//       );
//     }

//     const order = await Order.findById(id);
//     if (!order) throw new AppError('Order not found', 404);

//     const previousStatus   = order.paymentStatus;
//     order.paymentStatus    = paymentStatus;

//     if (
//       paymentStatus === PaymentStatus.REFUNDED &&
//       order.status  !== OrderStatus.DELIVERED
//     ) {
//       order.status             = OrderStatus.CANCELLED;
//       order.cancelledAt        = new Date();
//       order.cancellationReason = reason || 'Refunded by admin';
//     }

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: `Payment status changed from '${previousStatus}' to '${paymentStatus}'`,
//       data:    { order },
//     });
//   });

//   static adminForceCancel = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { id }     = req.params;
//     const { reason } = req.body;

//     if (!reason) {
//       throw new AppError('Cancellation reason is required for admin force-cancel', 400);
//     }

//     const order = await Order.findById(id);
//     if (!order) throw new AppError('Order not found', 404);

//     if (order.status === OrderStatus.DELIVERED) {
//       throw new AppError(
//         'Cannot cancel an already-delivered order. Use the refund flow instead.',
//         400
//       );
//     }
//     if (order.status === OrderStatus.CANCELLED) {
//       throw new AppError('Order is already cancelled', 400);
//     }

//     order.status             = OrderStatus.CANCELLED;
//     order.cancelledAt        = new Date();
//     order.cancellationReason = `[Admin] ${reason}`;

//     await order.save();

//     res.status(200).json({
//       success: true,
//       message: 'Order force-cancelled by admin',
//       data:    { order },
//     });
//   });

//   static adminGetPlatformStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const { dateFrom, dateTo } = req.query;

//     const dateFilter: Record<string, Date> = {};
//     if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
//     if (dateTo)   dateFilter.$lte = new Date(dateTo   as string);
//     const hasDateFilter = Object.keys(dateFilter).length > 0;

//     const baseMatch      = hasDateFilter ? { createdAt: dateFilter } : {};
//     const deliveredMatch = { ...baseMatch, status: OrderStatus.DELIVERED };

//     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
//     const todayStart    = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     const [
//       totalOrders,
//       deliveredOrders,
//       cancelledOrders,
//       pendingOrders,
//       totalRevenueResult,
//       byStatus,
//       byPaymentMethod,
//       byDeliveryType,
//       byStoreType,         // NEW — breakdown per store category
//       revenueByDay,
//       ordersByDay,
//       topStores,           // renamed from topRestaurants
//       ordersToday,
//       ordersThisWeek,
//       revenueToday,
//     ] = await Promise.all([
//       Order.countDocuments(baseMatch),
//       Order.countDocuments({ ...baseMatch, status: OrderStatus.DELIVERED }),
//       Order.countDocuments({ ...baseMatch, status: OrderStatus.CANCELLED }),
//       Order.countDocuments({ ...baseMatch, status: OrderStatus.PENDING }),

//       Order.aggregate([
//         { $match: deliveredMatch },
//         { $group: { _id: null, revenue: { $sum: '$total' }, tax: { $sum: '$tax' }, deliveryFees: { $sum: '$deliveryFee' } } },
//       ]),

//       Order.aggregate([
//         { $match: baseMatch },
//         { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
//         { $project: { _id: 0, status: '$_id', count: 1, revenue: 1 } },
//       ]),

//       Order.aggregate([
//         { $match: deliveredMatch },
//         { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
//         { $project: { _id: 0, method: '$_id', count: 1, revenue: 1 } },
//       ]),

//       Order.aggregate([
//         { $match: baseMatch },
//         { $group: { _id: '$deliveryType', count: { $sum: 1 } } },
//         { $project: { _id: 0, type: '$_id', count: 1 } },
//       ]),

//       // NEW — revenue + orders split by storeType (food vs groceries vs pharmacy etc.)
//       Order.aggregate([
//         { $match: deliveredMatch },
//         { $group: { _id: '$storeType', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
//         { $project: { _id: 0, storeType: '$_id', count: 1, revenue: 1 } },
//         { $sort: { revenue: -1 } },
//       ]),

//       Order.aggregate([
//         { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: thirtyDaysAgo } } },
//         { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
//         { $sort: { _id: 1 } },
//         { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
//       ]),

//       Order.aggregate([
//         { $match: { createdAt: { $gte: thirtyDaysAgo } } },
//         { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
//         { $sort: { _id: 1 } },
//         { $project: { _id: 0, date: '$_id', count: 1 } },
//       ]),

//       // Top 5 stores by delivered revenue (works for all store types)
//       Order.aggregate([
//         { $match: deliveredMatch },
//         { $group: { _id: '$storeId', storeName: { $first: '$storeName' }, storeType: { $first: '$storeType' }, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 } } },
//         { $sort: { totalRevenue: -1 } },
//         { $limit: 5 },
//         { $project: { _id: 0, storeId: '$_id', storeName: 1, storeType: 1, totalRevenue: 1, totalOrders: 1 } },
//       ]),

//       Order.countDocuments({ createdAt: { $gte: todayStart } }),
//       Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
//       Order.aggregate([
//         { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: todayStart } } },
//         { $group: { _id: null, revenue: { $sum: '$total' } } },
//       ]),
//     ]);

//     const revenue = totalRevenueResult[0] ?? { revenue: 0, tax: 0, deliveryFees: 0 };

//     res.status(200).json({
//       success: true,
//       data: {
//         stats: {
//           totalOrders,
//           deliveredOrders,
//           cancelledOrders,
//           pendingOrders,
//           completionRate: totalOrders > 0
//             ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2))
//             : 0,

//           totalRevenue:     revenue.revenue,
//           totalTax:         revenue.tax,
//           totalDeliveryFees: revenue.deliveryFees,

//           ordersToday,
//           ordersThisWeek,
//           revenueToday: revenueToday[0]?.revenue ?? 0,

//           byStatus,
//           byPaymentMethod,
//           byDeliveryType,
//           byStoreType,       // NEW

//           revenueByDay,
//           ordersByDay,

//           topStores,         // renamed from topRestaurants
//         },
//       },
//     });
//   });

//   static adminGetRevenueByStore = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
//     const page  = Math.max(1, parseInt(req.query.page as string) || 1);
//     const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
//     const skip  = (page - 1) * limit;

//     const { dateFrom, dateTo, storeType } = req.query;

//     const match: Record<string, unknown> = { status: OrderStatus.DELIVERED };
//     if (storeType) match.storeType = storeType;
//     if (dateFrom || dateTo) {
//       match.createdAt = {};
//       if (dateFrom) (match.createdAt as any).$gte = new Date(dateFrom as string);
//       if (dateTo)   (match.createdAt as any).$lte = new Date(dateTo   as string);
//     }

//     const [result, countResult] = await Promise.all([
//       Order.aggregate([
//         { $match: match },
//         { $group: {
//             _id:           '$storeId',
//             storeName:     { $first: '$storeName' },
//             storeType:     { $first: '$storeType' },
//             totalRevenue:  { $sum: '$total' },
//             totalOrders:   { $sum: 1 },
//             avgOrderValue: { $avg: '$total' },
//           },
//         },
//         { $sort: { totalRevenue: -1 } },
//         { $skip: skip },
//         { $limit: limit },
//         { $project: {
//             _id: 0,
//             storeId:       '$_id',
//             storeName:     1,
//             storeType:     1,
//             totalRevenue:  1,
//             totalOrders:   1,
//             avgOrderValue: { $round: ['$avgOrderValue', 2] },
//           },
//         },
//       ]),
//       Order.aggregate([
//         { $match: match },
//         { $group: { _id: '$storeId' } },
//         { $count: 'total' },
//       ]),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: {
//         stores: result,
//         pagination: {
//           page,
//           limit,
//           total: countResult[0]?.total ?? 0,
//           pages: Math.ceil((countResult[0]?.total ?? 0) / limit),
//         },
//       },
//     });
//   });
// }

import { Response } from 'express';
import axios from 'axios';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  DeliveryType,
  ItemSource,
  StoreType,
  IOrderItem,
} from '../models/order.model';
import { AppError, ErrorMiddleware } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { config } from '../config';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps a store-service category slug to the microservice that owns its items.
 * Food → restaurant-service (menu items with variants + add-ons)
 * Everything else → catalog-service (products with SKU + stock)
 */
const resolveItemSource = (storeType: string): ItemSource =>
  storeType === StoreType.FOOD
    ? ItemSource.RESTAURANT_SERVICE
    : ItemSource.CATALOG_SERVICE;

/**
 * Fetch and validate the store from store-service.
 * Returns the full store document including category slug and delivery info.
 */
const fetchStore = async (storeId: string) => {
  let res: any = null;

  try {
    res = await axios.get(`${config.storeServiceUrl}/api/stores/${storeId}`);
  } catch (err: any) {
    // Log the real error so it's visible in service logs
    console.error(
      `[order-service] fetchStore failed for storeId=${storeId}:`,
      err?.response?.status,
      err?.response?.data ?? err?.message
    );

    // 404 from store-service = genuinely not found
    if (err?.response?.status === 404) {
      throw new AppError('Store not found', 404);
    }

    // Any other error = store-service is unreachable
    throw new AppError(
      `Could not reach store service (${err?.response?.status ?? err?.message}). Please try again.`,
      503
    );
  }

  if (!res?.data?.success || !res.data.data) {
    console.error(
      `[order-service] Unexpected store-service response for storeId=${storeId}:`,
      res?.data
    );
    throw new AppError('Store not found or unavailable', 404);
  }

  const store = res.data.data;

  console.log(
    `[order-service] fetchStore resolved: storeId=${storeId} name="${store.name}" status="${store.status}" category="${store.category?.slug}"`
  );

  if (store.status !== 'active') {
    throw new AppError(
      `This store is currently "${store.status}" and not accepting orders`,
      422
    );
  }

  return store;
};

/**
 * Validate items against restaurant-service (food orders).
 * Returns enriched items with server-confirmed prices.
 */
const validateFoodItems = async (
  restaurantId: string,
  items: any[]
): Promise<{ processedItems: IOrderItem[]; subtotal: number }> => {
  // Fetch the restaurant's menu from restaurant-service
  const menuRes = await axios
    .get(`${config.restaurantServiceUrl}/api/restaurants/${restaurantId}/menu`)
    .catch(() => null);

  // If restaurant-service is unavailable, trust client prices but flag it
  // In production you would always require server-side validation
  if (!menuRes?.data?.success) {
    throw new AppError(
      'Could not reach restaurant service to validate menu items. Please try again.',
      503
    );
  }

  const menuItems: Record<string, any> = {};
  for (const item of menuRes.data.data ?? []) menuItems[item._id] = item;

  let subtotal = 0;
  const processedItems: IOrderItem[] = items.map((item: any) => {
    const menuItem = menuItems[item.itemId];

    // If item not found in menu, reject the order — don't trust client price
    if (!menuItem) {
      throw new AppError(`Menu item "${item.itemId}" not found in this restaurant's menu`, 422);
    }
    const basePrice = menuItem.price;

    let itemTotal = basePrice * item.quantity;

    if (item.variant && menuItem) {
      const variant = menuItem.variants?.find((v: any) => v.name === item.variant.name);
      itemTotal += (variant?.price ?? item.variant.price) * item.quantity;
    }

    if (item.addOns?.length) {
      itemTotal += item.addOns.reduce(
        (sum: number, addon: any) => sum + (addon.price ?? 0),
        0
      ) * item.quantity;
    }

    subtotal += itemTotal;

    return {
      itemId:     item.itemId,
      itemSource: ItemSource.RESTAURANT_SERVICE,
      name:       menuItem.name,
      price:      basePrice,
      quantity:   item.quantity,
      variant:    item.variant,
      addOns:     item.addOns ?? [],
      specialInstructions: item.specialInstructions,
      subtotal:   itemTotal,
    };
  });

  return { processedItems, subtotal };
};

/**
 * Validate items against catalog-service (grocery / pharmacy / shops).
 * Checks stock availability and uses server-confirmed prices.
 */
const validateCatalogItems = async (
  storeId: string,
  items: any[]
): Promise<{ processedItems: IOrderItem[]; subtotal: number }> => {
  // Fetch all products for this store in one call
  const productsRes = await axios
    .get(`${config.catalogServiceUrl}/api/catalog/products`, {
      params: { storeId, limit: 200 },
    })
    .catch(() => null);

  if (!productsRes?.data?.success) {
    throw new AppError(
      'Could not reach catalog service to validate products. Please try again.',
      503
    );
  }

  const productMap: Record<string, any> = {};
  for (const p of productsRes.data.data ?? []) productMap[p._id] = p;

  let subtotal = 0;
  const processedItems: IOrderItem[] = [];

  for (const item of items) {
    const product = productMap[item.itemId];

    // Reject unknown product IDs — never trust client-provided prices
    if (!product) {
      throw new AppError(`Product "${item.itemId}" was not found in this store`, 422);
    }

    // Stock checks
    if (!product.inStock) {
      throw new AppError(`"${product.name}" is currently out of stock`, 422);
    }
    if (product.stockCount !== -1 && product.stockCount < item.quantity) {
      throw new AppError(
        `Only ${product.stockCount} unit(s) of "${product.name}" available`,
        422
      );
    }

    // Use server price — client-provided price is ignored entirely
    const price     = product.price;
    const itemTotal = price * item.quantity;
    subtotal       += itemTotal;

    processedItems.push({
      itemId:     item.itemId,
      itemSource: ItemSource.CATALOG_SERVICE,
      name:       product.name,
      price,
      quantity:   item.quantity,
      addOns:     [],
      specialInstructions: item.specialInstructions,
      subtotal:   itemTotal,
    });
  }

  return { processedItems, subtotal };
};

// buildItemsFromClient has been intentionally removed.
// The order service ALWAYS fetches authoritative prices from the downstream
// service. Client-provided prices are ignored to prevent manipulation.

/**
 * After a catalog order is placed, tell catalog-service to decrement stock
 * and increment totalOrders on each product.
 * Fire-and-forget — a failure here does not roll back the order.
 */
const notifyCatalogService = (storeId: string, items: IOrderItem[]) => {
  const payload = {
    items: items.map(i => ({ productId: i.itemId, quantity: i.quantity })),
  };
  axios
    .patch(
      `${config.catalogServiceUrl}/api/catalog/products/internal/order-update`,
      payload,
      { headers: { 'x-internal-service': 'order-service' } }
    )
    .catch(err =>
      console.error('[order-service] catalog order-update notification failed:', err.message)
    );
};

// ─── Controller ───────────────────────────────────────────────────────────────

export class OrderController {

  // ── Customer: Create Order ──────────────────────────────────────────────────

  static createOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const {
      storeId,
      items,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      customerNotes,
    } = req.body;

    // ── Step 1: Validate the store via store-service ──────────────────────────
    const store     = await fetchStore(storeId);
    const storeType = store.category?.slug as StoreType;
    const storeName = store.name as string;

    // ── Step 2: Validate items from the correct downstream service ────────────
    const itemSource = resolveItemSource(storeType);

    let processedItems: IOrderItem[];
    let subtotal: number;

    if (itemSource === ItemSource.RESTAURANT_SERVICE) {
      // Food orders: validate menu items against restaurant-service
      // store-service stores map 1:1 to restaurants; use storeId as restaurantId
      ({ processedItems, subtotal } = await validateFoodItems(storeId, items));
    } else {
      // Non-food orders: validate products against catalog-service
      ({ processedItems, subtotal } = await validateCatalogItems(storeId, items));
    }

    // ── Step 3: Pricing ───────────────────────────────────────────────────────
    const deliveryFee =
      deliveryType === DeliveryType.PICKUP ? 0 : (store.deliveryFee ?? 0);

    // Minimum order check (skip for pickup)
    if (deliveryType === DeliveryType.DELIVERY) {
      const minimumOrder = store.minimumOrder ?? 0;
      if (subtotal < minimumOrder) {
        throw new AppError(
          `Minimum order for this store is ₦${minimumOrder.toLocaleString()}`,
          400
        );
      }
    }

    const tax        = Math.round(subtotal * config.taxRate);
    const total      = subtotal + deliveryFee + tax;

    // Delivery address is required for delivery orders
    if (deliveryType === DeliveryType.DELIVERY && !deliveryAddress?.street) {
      throw new AppError('A delivery address is required for delivery orders', 400);
    }

    // ── Step 4: Persist the order ─────────────────────────────────────────────
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(
      estimatedDeliveryTime.getMinutes() + (store.preparationTime ?? 30) + 15
    );

    const order = await Order.create({
      customerId,
      storeId,
      storeType,
      storeName,
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
      paymentStatus:
        paymentMethod === 'cash' ? PaymentStatus.PENDING : PaymentStatus.PAID,
    });

    // ── Step 5: Side-effects ──────────────────────────────────────────────────
    // Notify catalog-service to decrement stock (fire-and-forget)
    if (itemSource === ItemSource.CATALOG_SERVICE) {
      notifyCatalogService(storeId, processedItems);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data:    { order },
    });
  });

  // ── Customer: Own Orders ────────────────────────────────────────────────────

  static getCustomerOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const customerId = req.user!.id;
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { customerId };
    if (req.query.status)    query.status    = req.query.status;
    if (req.query.storeType) query.storeType = req.query.storeType;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
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

  // ── Store Owner: Orders for their store ────────────────────────────────────
  // Route: GET /api/orders/store/:storeId

  static getStoreOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { storeId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { storeId };
    if (req.query.status) query.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
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

  // ── Store Owner: Stats ─────────────────────────────────────────────────────

  static getStoreOrderStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { storeId } = req.params;

    const [statusBreakdown, totalOrders, revenueResult] = await Promise.all([
      Order.aggregate([
        { $match: { storeId } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ storeId }),
      Order.aggregate([
        { $match: { storeId, status: OrderStatus.DELIVERED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue:   revenueResult[0]?.total ?? 0,
        statusBreakdown,
      },
    });
  });

  // ── Shared: Single Order ───────────────────────────────────────────────────

  static getOrderById = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw new AppError('Order not found', 404);

    // Access control: only the customer, their driver, or an admin may view
    const isAdmin    = req.user?.role === 'admin';
    const isCustomer = order.customerId === req.user?.id;
    const isDriver   = order.driverId   === req.user?.id;

    if (!isAdmin && !isCustomer && !isDriver) {
      throw new AppError('You are not authorised to view this order', 403);
    }

    res.status(200).json({ success: true, data: { order } });
  });

  // ── Shared: Update Order Status ────────────────────────────────────────────

  static updateOrderStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id }                       = req.params;
    const { status, restaurantNotes }  = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const isAdmin = req.user?.role === 'admin';

    const STATUS_FLOW = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];

    const currentIdx = STATUS_FLOW.indexOf(order.status as OrderStatus);
    const newIdx     = STATUS_FLOW.indexOf(status);

    if (!isAdmin && newIdx < currentIdx && status !== OrderStatus.CANCELLED) {
      throw new AppError('Cannot move order back to a previous status', 400);
    }

    order.status = status;
    if (restaurantNotes) order.restaurantNotes = restaurantNotes;

    const now = new Date();
    switch (status) {
      case OrderStatus.CONFIRMED:        order.confirmedAt      = now; break;
      case OrderStatus.PREPARING:        order.preparingAt      = now; break;
      case OrderStatus.READY:            order.readyAt          = now; break;
      case OrderStatus.OUT_FOR_DELIVERY: order.outForDeliveryAt = now; break;
      case OrderStatus.DELIVERED:        order.deliveredAt      = now; break;
      case OrderStatus.CANCELLED:        order.cancelledAt      = now; break;
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data:    { order },
    });
  });

  // ── Shared: Assign Driver ──────────────────────────────────────────────────

  static assignDriver = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id }       = req.params;
    const { driverId } = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    order.driverId = driverId;

    if (order.status === OrderStatus.READY) {
      order.status           = OrderStatus.OUT_FOR_DELIVERY;
      order.outForDeliveryAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data:    { order },
    });
  });

  // ── Customer / Admin: Cancel Order ─────────────────────────────────────────

  static cancelOrder = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id }     = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = order.customerId === req.user?.id;

    if (!isAdmin && !isOwner) {
      throw new AppError('Not authorised to cancel this order', 403);
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError('Cannot cancel a delivered order', 400);
    }

    const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!isAdmin && !cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new AppError(
        'Order cannot be cancelled at this stage. Please contact support.',
        400
      );
    }

    order.status             = OrderStatus.CANCELLED;
    order.cancelledAt        = new Date();
    order.cancellationReason = reason;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data:    { order },
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Admin Routes
  // ══════════════════════════════════════════════════════════════════════════

  static adminGetAllOrders = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const {
      status, paymentStatus, paymentMethod, deliveryType,
      customerId, storeId, storeType, driverId,
      dateFrom, dateTo, minTotal, maxTotal,
    } = req.query;

    const query: Record<string, unknown> = {};
    if (status)        query.status        = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (deliveryType)  query.deliveryType  = deliveryType;
    if (customerId)    query.customerId    = customerId;
    if (storeId)       query.storeId       = storeId;
    if (storeType)     query.storeType     = storeType;
    if (driverId)      query.driverId      = driverId;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) (query.createdAt as any).$gte = new Date(dateFrom as string);
      if (dateTo)   (query.createdAt as any).$lte = new Date(dateTo   as string);
    }

    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) (query.total as any).$gte = parseFloat(minTotal as string);
      if (maxTotal) (query.total as any).$lte = parseFloat(maxTotal as string);
    }

    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
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

  static adminUpdatePaymentStatus = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id }                       = req.params;
    const { paymentStatus, reason }    = req.body;

    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      throw new AppError(
        `paymentStatus must be one of: ${Object.values(PaymentStatus).join(', ')}`,
        400
      );
    }

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    const previousStatus   = order.paymentStatus;
    order.paymentStatus    = paymentStatus;

    if (
      paymentStatus === PaymentStatus.REFUNDED &&
      order.status  !== OrderStatus.DELIVERED
    ) {
      order.status             = OrderStatus.CANCELLED;
      order.cancelledAt        = new Date();
      order.cancellationReason = reason || 'Refunded by admin';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment status changed from '${previousStatus}' to '${paymentStatus}'`,
      data:    { order },
    });
  });

  static adminForceCancel = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('Cancellation reason is required for admin force-cancel', 400);
    }

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError(
        'Cannot cancel an already-delivered order. Use the refund flow instead.',
        400
      );
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Order is already cancelled', 400);
    }

    order.status             = OrderStatus.CANCELLED;
    order.cancelledAt        = new Date();
    order.cancellationReason = `[Admin] ${reason}`;

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order force-cancelled by admin',
      data:    { order },
    });
  });

  static adminGetPlatformStats = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dateFrom, dateTo } = req.query;

    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
    if (dateTo)   dateFilter.$lte = new Date(dateTo   as string);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const baseMatch      = hasDateFilter ? { createdAt: dateFilter } : {};
    const deliveredMatch = { ...baseMatch, status: OrderStatus.DELIVERED };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
    const todayStart    = new Date();
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
      byStoreType,         // NEW — breakdown per store category
      revenueByDay,
      ordersByDay,
      topStores,           // renamed from topRestaurants
      ordersToday,
      ordersThisWeek,
      revenueToday,
    ] = await Promise.all([
      Order.countDocuments(baseMatch),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.DELIVERED }),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.CANCELLED }),
      Order.countDocuments({ ...baseMatch, status: OrderStatus.PENDING }),

      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: null, revenue: { $sum: '$total' }, tax: { $sum: '$tax' }, deliveryFees: { $sum: '$deliveryFee' } } },
      ]),

      Order.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, status: '$_id', count: 1, revenue: 1 } },
      ]),

      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, method: '$_id', count: 1, revenue: 1 } },
      ]),

      Order.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$deliveryType', count: { $sum: 1 } } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),

      // NEW — revenue + orders split by storeType (food vs groceries vs pharmacy etc.)
      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: '$storeType', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, storeType: '$_id', count: 1, revenue: 1 } },
        { $sort: { revenue: -1 } },
      ]),

      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
      ]),

      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ]),

      // Top 5 stores by delivered revenue (works for all store types)
      Order.aggregate([
        { $match: deliveredMatch },
        { $group: { _id: '$storeId', storeName: { $first: '$storeName' }, storeType: { $first: '$storeType' }, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, storeId: '$_id', storeName: 1, storeType: 1, totalRevenue: 1, totalOrders: 1 } },
      ]),

      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
    ]);

    const revenue = totalRevenueResult[0] ?? { revenue: 0, tax: 0, deliveryFees: 0 };

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          pendingOrders,
          completionRate: totalOrders > 0
            ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(2))
            : 0,

          totalRevenue:     revenue.revenue,
          totalTax:         revenue.tax,
          totalDeliveryFees: revenue.deliveryFees,

          ordersToday,
          ordersThisWeek,
          revenueToday: revenueToday[0]?.revenue ?? 0,

          byStatus,
          byPaymentMethod,
          byDeliveryType,
          byStoreType,       // NEW

          revenueByDay,
          ordersByDay,

          topStores,         // renamed from topRestaurants
        },
      },
    });
  });

  static adminGetRevenueByStore = ErrorMiddleware.asyncHandler(async (req: AuthRequest, res: Response) => {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip  = (page - 1) * limit;

    const { dateFrom, dateTo, storeType } = req.query;

    const match: Record<string, unknown> = { status: OrderStatus.DELIVERED };
    if (storeType) match.storeType = storeType;
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) (match.createdAt as any).$gte = new Date(dateFrom as string);
      if (dateTo)   (match.createdAt as any).$lte = new Date(dateTo   as string);
    }

    const [result, countResult] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $group: {
            _id:           '$storeId',
            storeName:     { $first: '$storeName' },
            storeType:     { $first: '$storeType' },
            totalRevenue:  { $sum: '$total' },
            totalOrders:   { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
            _id: 0,
            storeId:       '$_id',
            storeName:     1,
            storeType:     1,
            totalRevenue:  1,
            totalOrders:   1,
            avgOrderValue: { $round: ['$avgOrderValue', 2] },
          },
        },
      ]),
      Order.aggregate([
        { $match: match },
        { $group: { _id: '$storeId' } },
        { $count: 'total' },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stores: result,
        pagination: {
          page,
          limit,
          total: countResult[0]?.total ?? 0,
          pages: Math.ceil((countResult[0]?.total ?? 0) / limit),
        },
      },
    });
  });
}