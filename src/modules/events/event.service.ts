import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { EVENT_STATUS, USER_ROLES, type EventStatus, type UserRole } from "../../constants";
import { ApiError } from "../../utils/ApiError";
import { EventModel, type IEvent } from "./event.model";

interface EventQuery {
  page: number;
  limit: number;
  status?: EventStatus;
  gameName?: string;
  search?: string;
}

const normalizeSlugBase = (title: string): string => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || `event-${Date.now()}`;
};

const ensureDateConsistency = (eventData: {
  registrationOpenAt: Date;
  registrationCloseAt: Date;
  eventStartAt: Date;
  eventEndAt: Date;
}): void => {
  if (eventData.registrationOpenAt >= eventData.registrationCloseAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "registrationOpenAt must be before registrationCloseAt"
    );
  }

  if (eventData.eventStartAt >= eventData.eventEndAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "eventStartAt must be before eventEndAt");
  }

  if (eventData.registrationCloseAt > eventData.eventStartAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "registrationCloseAt must be on or before eventStartAt"
    );
  }
};

const generateUniqueSlug = async (
  title: string,
  excludeEventId?: mongoose.Types.ObjectId
): Promise<string> => {
  const baseSlug = normalizeSlugBase(title);
  let counter = 0;

  while (counter < 1000) {
    const candidate = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
    const existing = await EventModel.findOne({
      slug: candidate,
      ...(excludeEventId ? { _id: { $ne: excludeEventId } } : {})
    })
      .select("_id")
      .lean();

    if (!existing) {
      return candidate;
    }

    counter += 1;
  }

  throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Unable to generate unique event slug");
};

export const eventService = {
  createEvent: async (adminId: string, payload: Omit<IEvent, "slug" | "registeredTeamsCount" | "createdBy" | "updatedBy" | "isDeleted" | "createdAt" | "updatedAt"> & { slug?: string }) => {
    ensureDateConsistency({
      registrationOpenAt: payload.registrationOpenAt,
      registrationCloseAt: payload.registrationCloseAt,
      eventStartAt: payload.eventStartAt,
      eventEndAt: payload.eventEndAt
    });

    const slug = await generateUniqueSlug(payload.title);

    const event = await EventModel.create({
      ...payload,
      slug,
      registeredTeamsCount: 0,
      createdBy: adminId,
      updatedBy: adminId,
      isDeleted: false
    });

    return event.toObject();
  },

  updateEvent: async (
    eventId: string,
    adminId: string,
    updates: Partial<IEvent>
  ) => {
    const event = await EventModel.findOne({
      _id: eventId,
      isDeleted: false
    }).exec();

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
    }

    if (updates.title && updates.title !== event.title) {
      event.slug = await generateUniqueSlug(updates.title, event._id);
      event.title = updates.title;
    }

    if (updates.gameName !== undefined) {
      event.gameName = updates.gameName;
    }
    if (updates.description !== undefined) {
      event.description = updates.description;
    }
    if (updates.bannerImage !== undefined) {
      event.bannerImage = updates.bannerImage;
    }
    if (updates.rules !== undefined) {
      event.rules = updates.rules;
    }
    if (updates.entryFee !== undefined) {
      event.entryFee = updates.entryFee;
    }
    if (updates.currency !== undefined) {
      event.currency = updates.currency;
    }
    if (updates.maxTeams !== undefined) {
      if (updates.maxTeams < event.registeredTeamsCount) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "maxTeams cannot be lower than current registeredTeamsCount"
        );
      }
      event.maxTeams = updates.maxTeams;
    }
    if (updates.registrationOpenAt !== undefined) {
      event.registrationOpenAt = updates.registrationOpenAt;
    }
    if (updates.registrationCloseAt !== undefined) {
      event.registrationCloseAt = updates.registrationCloseAt;
    }
    if (updates.eventStartAt !== undefined) {
      event.eventStartAt = updates.eventStartAt;
    }
    if (updates.eventEndAt !== undefined) {
      event.eventEndAt = updates.eventEndAt;
    }
    if (updates.status !== undefined) {
      event.status = updates.status;
    }

    ensureDateConsistency({
      registrationOpenAt: event.registrationOpenAt,
      registrationCloseAt: event.registrationCloseAt,
      eventStartAt: event.eventStartAt,
      eventEndAt: event.eventEndAt
    });

    event.updatedBy = new mongoose.Types.ObjectId(adminId);
    await event.save();

    return event.toObject();
  },

  deleteEvent: async (eventId: string, adminId: string) => {
    const event = await EventModel.findOneAndUpdate(
      {
        _id: eventId,
        isDeleted: false
      },
      {
        isDeleted: true,
        status: EVENT_STATUS.CANCELLED,
        updatedBy: adminId
      },
      {
        new: true
      }
    ).lean();

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
    }

    return event;
  },

  listPublicEvents: async ({ page, limit, gameName, search }: EventQuery) => {
    const filter: Record<string, unknown> = {
      isDeleted: false,
      status: {
        $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ACTIVE]
      }
    };

    if (gameName) {
      filter.gameName = { $regex: gameName, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      EventModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EventModel.countDocuments(filter)
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

  getPublicEventBySlug: async (slug: string) => {
    const event = await EventModel.findOne({
      slug,
      isDeleted: false,
      status: {
        $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ACTIVE]
      }
    }).lean();

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Public event not found");
    }

    return event;
  },

  listEvents: async (
    userRole: UserRole,
    { page, limit, gameName, search, status }: EventQuery
  ) => {
    const filter: Record<string, unknown> = {
      isDeleted: false
    };

    if (userRole !== USER_ROLES.ADMIN) {
      filter.status = {
        $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ACTIVE]
      };
    } else if (status) {
      filter.status = status;
    }

    if (gameName) {
      filter.gameName = { $regex: gameName, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      EventModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EventModel.countDocuments(filter)
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

  getEventById: async (eventId: string, userRole: UserRole) => {
    const filter: Record<string, unknown> = {
      _id: eventId,
      isDeleted: false
    };

    if (userRole !== USER_ROLES.ADMIN) {
      filter.status = {
        $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ACTIVE]
      };
    }

    const event = await EventModel.findOne(filter).lean();

    if (!event) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Event not found");
    }

    return event;
  }
};
