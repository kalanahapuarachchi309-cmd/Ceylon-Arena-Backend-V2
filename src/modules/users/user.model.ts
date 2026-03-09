import { Schema, model, type HydratedDocument } from "mongoose";
import { USER_ROLES, type UserRole } from "../../constants";

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  phone: string;
  address: string;
  promoCode?: string;
  role: UserRole;
  isActive: boolean;
  refreshTokenHash?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    promoCode: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.PLAYER
    },
    isActive: {
      type: Boolean,
      default: true
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for role-based queries
userSchema.index({ role: 1, isActive: 1 });

export const UserModel = model<IUser>("User", userSchema);
