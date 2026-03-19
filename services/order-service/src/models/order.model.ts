import mongoose, { Document, Schema, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  CASH = 'cash',
  WALLET = 'wallet',
}

export enum DeliveryType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
}

export interface IOrderItem {
  _id?: Types.ObjectId;
  menuItemId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  variant?: {
    name: string;
    price: number;
  };
  addOns: Array<{
    name: string;
    price: number;
  }>;
  specialInstructions?: string;
  subtotal: number;
}

export interface IDeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  items: IOrderItem[];

  // Pricing
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;

  // Delivery
  deliveryType: DeliveryType;
  deliveryAddress?: IDeliveryAddress;
  driverId?: Types.ObjectId;

  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  // Notes
  customerNotes?: string;
  restaurantNotes?: string;

  // Timestamps
  estimatedDeliveryTime?: Date;
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  menuItemId: {
    type: Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  variant: {
    name: String,
    price: Number,
  },
  addOns: [{
    name: String,
    price: Number,
  }],
  specialInstructions: String,
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const deliveryAddressSchema = new Schema<IDeliveryAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  instructions: String,
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const generateOrderNumber = (): string =>
  `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

// ─── Schema ───────────────────────────────────────────────────────────────────

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Auto-generated via default — no required:true so validation never blocks it
      default: generateOrderNumber,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryType: {
      type: String,
      enum: Object.values(DeliveryType),
      required: true,
    },
    deliveryAddress: deliveryAddressSchema,
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    customerNotes: String,
    restaurantNotes: String,
    estimatedDeliveryTime: Date,
    confirmedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { ret.__v = 0; return ret; } },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Fallback: ensure orderNumber is always set before validation runs
// (covers edge cases where default doesn't fire, e.g. raw insertMany)
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

// ─── Model ────────────────────────────────────────────────────────────────────

export const Order = mongoose.model<IOrder>('Order', orderSchema);