import { config } from 'dotenv';
import { cleanEnv, str, port, url } from 'envalid';

config();

export const env = cleanEnv(process.env, {
  PORT: port({ default: 4000 }),
  NODE_ENV: str({ choices: ['development', 'production', 'testing'], default: 'development' }),
  MONGO_URI: url(),
  FRONTEND_ORIGIN: url({ default: 'http://localhost:3000' }),
  COOKIE_SECRET: str(),
  DOMAIN: str(),
});
