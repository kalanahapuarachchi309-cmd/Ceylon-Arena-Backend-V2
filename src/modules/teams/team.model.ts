import { Schema, model, type HydratedDocument, Types } from "mongoose";

export interface TeamMember {
  name: string;
  inGameId: string;
}

export interface ITeam {
  leaderId: Types.ObjectId;
  teamName: string;
  teamNameNormalized: string;
  primaryGame?: string;
  leaderInGameId: string;
  members: TeamMember[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamDocument = HydratedDocument<ITeam>;

const teamMemberSchema = new Schema<TeamMember>(
  {
    name: { type: String, required: true, trim: true },
    inGameId: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    teamName: {
      type: String,
      required: true,
      trim: true
    },
    teamNameNormalized: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    primaryGame: {
      type: String,
      trim: true
    },
    leaderInGameId: {
      type: String,
      required: true,
      trim: true
    },
    members: {
      type: [teamMemberSchema],
      required: true,
      validate: {
        validator: (members: TeamMember[]) => members.length === 3,
        message: "Team must have exactly 3 non-leader members"
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// No additional indexes needed - unique constraints are defined in schema

export const TeamModel = model<ITeam>("Team", teamSchema);
