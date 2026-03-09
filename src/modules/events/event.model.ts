import { Schema, model, type HydratedDocument, Types } from "mongoose";
import { EVENT_STATUS, type EventStatus } from "../../constants";

export interface IEvent {
  title: string;
  slug: string;
  gameName: string;
  description: string;
  bannerImage?: string;
  rules?: string;
  entryFee: number;
  currency: string;
  maxTeams?: number;
  registeredTeamsCount: number;
  registrationOpenAt: Date;
  registrationCloseAt: Date;
  eventStartAt: Date;
  eventEndAt: Date;
  status: EventStatus;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<IEvent>;

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    gameName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    bannerImage: {
      type: String,
      trim: true
    },
    rules: {
      type: String,
      trim: true
    },
    entryFee: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "LKR"
    },
    maxTeams: {
      type: Number,
      min: 1
    },
    registeredTeamsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    registrationOpenAt: {
      type: Date,
      required: true
    },
    registrationCloseAt: {
      type: Date,
      required: true
    },
    eventStartAt: {
      type: Date,
      required: true
    },
    eventEndAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound indexes for queries
eventSchema.index({ status: 1, registrationCloseAt: 1 });
eventSchema.index({ isDeleted: 1, gameName: 1 });

export const EventModel = model<IEvent>("Event", eventSchema);
