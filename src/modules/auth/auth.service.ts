import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { USER_ROLES } from "../../constants";
import { env } from "../../config/env";
import { TeamModel, type TeamMember } from "../teams/team.model";
import { UserModel } from "../users/user.model";
import { ApiError } from "../../utils/ApiError";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../../utils/token";
import type { AuthTokenPayload } from "../../types/auth.types";

interface RegisterLeaderInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  promoCode?: string;
  teamName: string;
  primaryGame?: string;
  leaderInGameId: string;
  members: TeamMember[];
}

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

const toAuthPayload = (user: { _id: mongoose.Types.ObjectId; role: string; email: string }): AuthTokenPayload => ({
  userId: user._id.toString(),
  role: user.role as AuthTokenPayload["role"],
  email: user.email
});

const sanitizeUser = (user: any) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  address: user.address,
  promoCode: user.promoCode,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const authService = {
  registerLeaderWithTeam: async (payload: RegisterLeaderInput) => {
    const existingUser = await UserModel.findOne({ email: payload.email }).lean();
    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, "Email already in use");
    }

    const teamNameNormalized = payload.teamName.trim().toLowerCase();
    const existingTeam = await TeamModel.findOne({ teamNameNormalized }).lean();
    if (existingTeam) {
      throw new ApiError(StatusCodes.CONFLICT, "Team name already in use");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);

      const [createdUser] = await UserModel.create(
        [
          {
            fullName: payload.fullName,
            email: payload.email,
            passwordHash,
            phone: payload.phone,
            address: payload.address,
            promoCode: payload.promoCode,
            role: USER_ROLES.PLAYER,
            isActive: true
          }
        ],
        { session }
      );

      const [createdTeam] = await TeamModel.create(
        [
          {
            leaderId: createdUser._id,
            teamName: payload.teamName,
            teamNameNormalized,
            primaryGame: payload.primaryGame,
            leaderInGameId: payload.leaderInGameId,
            members: payload.members,
            isActive: true
          }
        ],
        { session }
      );

      await session.commitTransaction();

      const tokenPayload = toAuthPayload({
        _id: createdUser._id,
        role: createdUser.role,
        email: createdUser.email
      });

      const accessToken = signAccessToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);
      createdUser.refreshTokenHash = hashToken(refreshToken);
      createdUser.lastLoginAt = new Date();
      await createdUser.save();

      return {
        user: sanitizeUser(createdUser.toObject()),
        team: {
          id: createdTeam._id,
          leaderId: createdTeam.leaderId,
          teamName: createdTeam.teamName,
          primaryGame: createdTeam.primaryGame,
          leaderInGameId: createdTeam.leaderInGameId,
          members: createdTeam.members,
          isActive: createdTeam.isActive,
          createdAt: createdTeam.createdAt,
          updatedAt: createdTeam.updatedAt
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      await session.abortTransaction();

      if (
        error instanceof mongoose.Error &&
        "code" in error &&
        Number((error as mongoose.Error & { code?: number }).code) === 11000
      ) {
        throw new ApiError(StatusCodes.CONFLICT, "Email or team name already exists");
      }

      throw error;
    } finally {
      session.endSession();
    }
  },

  login: async ({ email, password }: LoginInput) => {
    const user = await UserModel.findOne({ email })
      .select("+passwordHash +refreshTokenHash")
      .exec();

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
    }

    if (!user.isActive) {
      throw new ApiError(StatusCodes.FORBIDDEN, "User account is inactive");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
    }

    const payload = toAuthPayload({
      _id: user._id,
      role: user.role,
      email: user.email
    });

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    user.refreshTokenHash = hashToken(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: sanitizeUser(user.toObject()),
      accessToken,
      refreshToken
    };
  },

  refreshToken: async (incomingRefreshToken: string) => {
    let payload: AuthTokenPayload;

    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const user = await UserModel.findById(payload.userId)
      .select("+refreshTokenHash")
      .exec();

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const incomingHash = hashToken(incomingRefreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const nextPayload = toAuthPayload({
      _id: user._id,
      role: user.role,
      email: user.email
    });

    const accessToken = signAccessToken(nextPayload);
    const refreshToken = signRefreshToken(nextPayload);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    return {
      accessToken,
      refreshToken
    };
  },

  logout: async (refreshToken?: string): Promise<void> => {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      await UserModel.findByIdAndUpdate(payload.userId, {
        $unset: { refreshTokenHash: "" }
      }).exec();
    } catch {
      // Idempotent logout: invalid token still clears cookies on client.
    }
  },

  logoutAll: async (userId: string): Promise<void> => {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: "" }
    }).exec();
  },

  getMe: async (userId: string) => {
    const user = await UserModel.findById(userId).lean();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const team = await TeamModel.findOne({ leaderId: user._id }).lean();

    return {
      user: sanitizeUser(user as unknown as Record<string, unknown>),
      team: team
        ? {
            id: team._id,
            teamName: team.teamName,
            primaryGame: team.primaryGame,
            leaderInGameId: team.leaderInGameId,
            members: team.members,
            isActive: team.isActive,
            createdAt: team.createdAt,
            updatedAt: team.updatedAt
          }
        : null
    };
  },

  changePassword: async (userId: string, payload: ChangePasswordInput): Promise<void> => {
    const user = await UserModel.findById(userId).select("+passwordHash").exec();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    const isMatch = await bcrypt.compare(payload.currentPassword, user.passwordHash);

    if (!isMatch) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Current password is incorrect");
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "New password must be different from current password"
      );
    }

    user.passwordHash = await bcrypt.hash(payload.newPassword, env.BCRYPT_SALT_ROUNDS);
    user.refreshTokenHash = undefined;
    await user.save();
  }
};
