import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, ret) => { ret.__v = 0; return ret; } },
  }
);

// Indexes
categorySchema.index({ restaurantId: 1, displayOrder: 1 });
categorySchema.index({ restaurantId: 1, isActive: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);