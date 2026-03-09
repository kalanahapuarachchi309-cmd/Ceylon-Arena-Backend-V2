import { Schema, model, type HydratedDocument, Types } from "mongoose";
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  type PaymentMethod,
  type PaymentStatus
} from "../../constants";

export interface IPayment {
  registrationId: Types.ObjectId;
  teamId: Types.ObjectId;
  leaderId: Types.ObjectId;
  eventId: Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  slipUrl: string;
  transactionReference?: string;
  bankName?: string;
  accountHolder?: string;
  adminNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = HydratedDocument<IPayment>;

const paymentSchema = new Schema<IPayment>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "EventRegistration",
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true
    },
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.BANK_TRANSFER,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      required: true
    },
    slipUrl: {
      type: String,
      required: true,
      trim: true
    },
    transactionReference: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    accountHolder: {
      type: String,
      trim: true
    },
    adminNote: {
      type: String,
      trim: true
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

paymentSchema.index({ registrationId: 1, createdAt: -1 });
paymentSchema.index({ leaderId: 1, createdAt: -1 });
paymentSchema.index({ eventId: 1, status: 1 });
paymentSchema.index({ isDeleted: 1, status: 1 });

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
