import { Schema, model, type HydratedDocument, Types } from "mongoose";
import { REGISTRATION_STATUS, type RegistrationStatus } from "../../constants";

export interface IEventRegistration {
  teamId: Types.ObjectId;
  leaderId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: RegistrationStatus;
  notes?: string;
  registeredAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EventRegistrationDocument = HydratedDocument<IEventRegistration>;

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
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
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      default: REGISTRATION_STATUS.PENDING_PAYMENT
    },
    notes: {
      type: String,
      trim: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

eventRegistrationSchema.index({ teamId: 1, eventId: 1 }, { unique: true });
eventRegistrationSchema.index({ leaderId: 1, createdAt: -1 });
eventRegistrationSchema.index({ eventId: 1, status: 1 });

export const EventRegistrationModel = model<IEventRegistration>(
  "EventRegistration",
  eventRegistrationSchema
);
