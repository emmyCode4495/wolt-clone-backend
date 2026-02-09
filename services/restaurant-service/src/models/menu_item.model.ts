import mongoose, { Document, Schema, Types } from 'mongoose';

export enum MenuItemStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum DietaryTag {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten_free',
  DAIRY_FREE = 'dairy_free',
  NUT_FREE = 'nut_free',
  HALAL = 'halal',
  KOSHER = 'kosher',
  SPICY = 'spicy',
  ORGANIC = 'organic',
}

export interface IAddOn {
  _id?: Types.ObjectId;
  name: string;
  price: number;
}

export interface IVariant {
  _id?: Types.ObjectId;
  name: string; // e.g., "Small", "Medium", "Large"
  price: number;
}

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  image?: string;
  images: string[];
  status: MenuItemStatus;
  dietaryTags: DietaryTag[];
  variants: IVariant[];
  addOns: IAddOn[];
  preparationTime: number; // in minutes
  calories?: number;
  isPopular: boolean;
  isRecommended: boolean;
  displayOrder: number;
  totalOrders: number;
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IVariant>({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const addOnSchema = new Schema<IAddOn>({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
});

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: String,
    images: [String],
    status: {
      type: String,
      enum: Object.values(MenuItemStatus),
      default: MenuItemStatus.AVAILABLE,
    },
    dietaryTags: [{
      type: String,
      enum: Object.values(DietaryTag),
    }],
    variants: [variantSchema],
    addOns: [addOnSchema],
    preparationTime: {
      type: Number,
      required: true,
      min: 0,
      default: 15,
    },
    calories: {
      type: Number,
      min: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { ret.__v = 0; return ret; } },
  }
);

// Indexes
menuItemSchema.index({ restaurantId: 1, categoryId: 1 });
menuItemSchema.index({ restaurantId: 1, status: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ isPopular: 1, averageRating: -1 });
menuItemSchema.index({ displayOrder: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);