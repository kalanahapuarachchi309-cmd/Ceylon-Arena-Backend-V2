/* eslint-disable no-console */

export const logger = {
  info: (message: string, meta?: unknown): void => {
    if (meta !== undefined) {
      console.log(`[INFO] ${message}`, meta);
      return;
    }
    console.log(`[INFO] ${message}`);
  },
  warn: (message: string, meta?: unknown): void => {
    if (meta !== undefined) {
      console.warn(`[WARN] ${message}`, meta);
      return;
    }
    console.warn(`[WARN] ${message}`);
  },
  error: (message: string, meta?: unknown): void => {
    if (meta !== undefined) {
      console.error(`[ERROR] ${message}`, meta);
      return;
    }
    console.error(`[ERROR] ${message}`);
  }
};
