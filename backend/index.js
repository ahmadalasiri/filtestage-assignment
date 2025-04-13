import { Database } from "./src/db/index.js";
import { Server } from "./src/server/index.js";
import Session from "./src/session.js";
import { env } from "./src/config/validateEnv.js";

async function main() {
  try {
    const database = new Database();
    const db = await database.connect(env.MONGO_URI);

    const session = await Session({ db });

    const server = new Server({
      corsOrigin: env.FRONTEND_ORIGIN,
      cookieSecret: env.COOKIE_SECRET,
      db: database,
      session: session
    });

    server.registerRoutes();

    server.initializeSocketIO();

    server.setupShutdown();

    await server.start(env.PORT);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error during startup:", error);
  process.exit(1);
});
