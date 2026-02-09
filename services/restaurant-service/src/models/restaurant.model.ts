import mongoose, { Document, Schema, Types } from 'mongoose';

export enum RestaurantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_APPROVAL = 'pending_approval',
}

export enum CuisineType {
  ITALIAN = 'italian',
  CHINESE = 'chinese',
  JAPANESE = 'japanese',
  INDIAN = 'indian',
  MEXICAN = 'mexican',
  AMERICAN = 'american',
  THAI = 'thai',
  FRENCH = 'french',
  MEDITERRANEAN = 'mediterranean',
  MIDDLE_EASTERN = 'middle_eastern',
  KOREAN = 'korean',
  VIETNAMESE = 'vietnamese',
  FAST_FOOD = 'fast_food',
  PIZZA = 'pizza',
  BURGER = 'burger',
  SEAFOOD = 'seafood',
  VEGAN = 'vegan',
  VEGETARIAN = 'vegetarian',
  DESSERT = 'dessert',
  COFFEE = 'coffee',
  OTHER = 'other',
}

export interface IOperatingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface IDeliveryInfo {
  deliveryFee: number;
  minimumOrder: number;
  estimatedDeliveryTime: number;
  maxDeliveryDistance: number;
  freeDeliveryOver?: number;
}

export interface IRestaurant extends Document {
  name: string;
  description: string;
  ownerId: Types.ObjectId;
  cuisine: CuisineType[];
  status: RestaurantStatus;
  phone: string;
  email: string;
  address: IAddress;
  logo?: string;
  coverImage?: string;
  images: string[];
  operatingHours: IOperatingHours[];
  deliveryInfo: IDeliveryInfo;
  averageRating: number;
  totalReviews: number;
  isDeliveryAvailable: boolean;
  isPickupAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

const operatingHoursSchema = new Schema<IOperatingHours>({
  day: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  },
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true },
});

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'USA' },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
});

const deliveryInfoSchema = new Schema<IDeliveryInfo>({
  deliveryFee: { type: Number, required: true, min: 0 },
  minimumOrder: { type: Number, required: true, min: 0 },
  estimatedDeliveryTime: { type: Number, required: true, min: 0 },
  maxDeliveryDistance: { type: Number, required: true, min: 0 },
  freeDeliveryOver: { type: Number, min: 0 },
});

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cuisine: [{ type: String, enum: Object.values(CuisineType) }],
    status: { type: String, enum: Object.values(RestaurantStatus), default: RestaurantStatus.PENDING_APPROVAL },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'] },
    address: { type: addressSchema, required: true },
    logo: String,
    coverImage: String,
    images: [String],
    operatingHours: [operatingHoursSchema],
    deliveryInfo: { type: deliveryInfoSchema, required: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    isDeliveryAvailable: { type: Boolean, default: true },
    isPickupAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    totalOrders: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { ret.__v = 0; return ret; } },
  }
);

restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ status: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ 'address.coordinates': '2dsphere' });
restaurantSchema.index({ name: 'text', description: 'text' });
restaurantSchema.index({ averageRating: -1, totalReviews: -1 });
restaurantSchema.index({ isFeatured: 1, averageRating: -1 });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);