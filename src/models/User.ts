import mongoose, { Schema, Document } from "mongoose";

export enum Role {
  USER = "USER", ADMIN = "ADMIN"
}

export enum UserAccountStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface IGame {
  game: string;
  gameId: string;
  teamName: string;
  player2Name: string;
  player2GameId: string;
  player3Name: string;
  player3GameId: string;
  player4Name: string;
  player4GameId: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  playerName: string;
  role: string;
  email: string;
  phone: string;
  promoCode?: string;
  address: string;
  password: string;
  status: boolean;
  accountStatus: UserAccountStatus;
  games: IGame[];
  refreshToken: string;
}

const GameSchema = new Schema<IGame>(
  {
    game: String,
    gameId: String,
    teamName: String,
    player2Name: String,
    player2GameId: String,
    player3Name: String,
    player3GameId: String,
    player4Name: String,
    player4GameId: String
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    playerName: { type: String, required: true },
    role: { type: String, enum: Object.values(Role), default: Role.USER },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    promoCode: { type: String, required: false },
    address: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: Boolean, default: false },
    accountStatus: {
      type: String,
      enum: Object.values(UserAccountStatus),
      default: UserAccountStatus.PENDING
    },
    games: [GameSchema],
    refreshToken: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
