import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { seedAdmin } from "./scripts/seedAdmin";
import { logger } from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    await seedAdmin();

    app.listen(env.PORT, () => {
      logger.info(`${env.APP_NAME} listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

void startServer();
