import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const storage = multer.memoryStorage();

export const slipUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new ApiError(StatusCodes.BAD_REQUEST, "Only image files are allowed"));
      return;
    }

    cb(null, true);
  }
});
