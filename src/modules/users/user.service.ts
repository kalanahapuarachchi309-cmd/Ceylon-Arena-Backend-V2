import { StatusCodes } from "http-status-codes";
import { USER_ROLES, type UserRole } from "../../constants";
import { ApiError } from "../../utils/ApiError";
import { UserModel } from "./user.model";

interface ListUsersInput {
  page: number;
  limit: number;
  role?: UserRole;
  isActive?: boolean;
}

const userProjection = "_id fullName email phone address promoCode role isActive lastLoginAt createdAt updatedAt";

export const userService = {
  listUsers: async ({ page, limit, role, isActive }: ListUsersInput) => {
    const filter: Record<string, unknown> = {};

    if (role) {
      filter.role = role;
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .select(userProjection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter)
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  getUserById: async (id: string) => {
    const user = await UserModel.findById(id).select(userProjection).lean();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    return user;
  },

  changeUserRole: async (id: string, role: UserRole) => {
    if (!Object.values(USER_ROLES).includes(role)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid role");
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        role
      },
      {
        new: true,
        runValidators: true,
        select: userProjection
      }
    ).lean();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    return user;
  },

  changeUserStatus: async (id: string, isActive: boolean) => {
    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        isActive
      },
      {
        new: true,
        runValidators: true,
        select: userProjection
      }
    ).lean();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    return user;
  }
};
