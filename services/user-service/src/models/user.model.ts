import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  RESTAURANT_OWNER = 'restaurant_owner',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export interface IAddress {
  _id?: Types.ObjectId;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  label?: string; // e.g., "Home", "Work"
  isDefault?: boolean;
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  profilePicture?: string;
  addresses: Types.DocumentArray<IAddress>;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  refreshTokens: string[];
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'USA' },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  label: { type: String },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    profilePicture: {
      type: String,
    },
    addresses: [addressSchema],
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    refreshTokens: [{
      type: String,
      select: false,
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.password ='';
        ret.refreshTokens = [];
        ret.__v = 0;
        return ret;
      },
    },
  }
);

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, status: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

export const User = mongoose.model<IUser>('User', userSchema);