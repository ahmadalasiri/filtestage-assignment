import { Database } from "./src/db/index.js";
import { Server } from "./src/server/index.js";
import Session from "./src/session.js";
import { env } from "./src/config/validateEnv.js";

async function main() {
  const database = new Database();
  const db = await database.connect(env.MONGO_URI);

  const session = await Session({ db });

  const server = new Server({
    db: database,
    session: session,
  });

  server.registerRoutes();

  server.initializeSocketIO();

  server.setupShutdown();

  await server.start(env.PORT);
}

main();
