import { config } from 'dotenv';
import { cleanEnv, str, port, url } from 'envalid';

config();

export const env = cleanEnv(process.env, {
  PORT: port({ default: 3001 }),
  NODE_ENV: str({ choices: ['development', 'production', 'testing'], default: 'development' }),
  MONGO_URI: url(),
  FRONTEND_ORIGIN: url(),
  COOKIE_SECRET: str(),
  DOMAIN: str(),
  SMTP_NAME: str(),
  SMTP_USERNAME: str(),
  SMTP_PASSWORD: str(),
  SMTP_HOST: str(),
  SMTP_PORT: port(),
});
