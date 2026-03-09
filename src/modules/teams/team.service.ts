import { StatusCodes } from "http-status-codes";
import { ApiError } from "../../utils/ApiError";
import { TeamModel, type TeamMember } from "./team.model";

interface UpdateMyTeamInput {
  teamName?: string;
  primaryGame?: string;
  leaderInGameId?: string;
  members?: TeamMember[];
  isActive?: boolean;
}

interface ListTeamsInput {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export const teamService = {
  getMyTeam: async (leaderId: string) => {
    const team = await TeamModel.findOne({ leaderId }).lean();

    if (!team) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Team not found for current leader");
    }

    return team;
  },

  updateMyTeam: async (leaderId: string, updates: UpdateMyTeamInput) => {
    const team = await TeamModel.findOne({ leaderId }).exec();

    if (!team) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Team not found for current leader");
    }

    if (updates.teamName) {
      const normalized = updates.teamName.trim().toLowerCase();
      const duplicateTeam = await TeamModel.findOne({
        teamNameNormalized: normalized,
        _id: { $ne: team._id }
      }).lean();

      if (duplicateTeam) {
        throw new ApiError(StatusCodes.CONFLICT, "Team name already in use");
      }

      team.teamName = updates.teamName;
      team.teamNameNormalized = normalized;
    }

    if (updates.primaryGame !== undefined) {
      team.primaryGame = updates.primaryGame;
    }

    if (updates.leaderInGameId !== undefined) {
      team.leaderInGameId = updates.leaderInGameId;
    }

    if (updates.members !== undefined) {
      team.members = updates.members;
    }

    if (updates.isActive !== undefined) {
      team.isActive = updates.isActive;
    }

    await team.save();
    return team.toObject();
  },

  listTeams: async ({ page, limit, search, isActive }: ListTeamsInput) => {
    const filter: Record<string, unknown> = {};

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { teamName: { $regex: search, $options: "i" } },
        { primaryGame: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TeamModel.find(filter)
        .populate({ path: "leaderId", select: "_id fullName email phone role isActive" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TeamModel.countDocuments(filter)
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

  getTeamById: async (id: string) => {
    const team = await TeamModel.findById(id)
      .populate({ path: "leaderId", select: "_id fullName email phone role isActive" })
      .lean();

    if (!team) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Team not found");
    }

    return team;
  }
};
