import morgan from "morgan";
import logger from "../utils/logger.js";

// Removing body token since we don't want to log request bodies
morgan.token("response-time-formatted", (req, res) => {
  const time = morgan["response-time"](req, res);
  return time ? `${time} ms` : "";
});

// Modified to remove body content from logs
const developmentFormat = ":method :url :status :response-time-formatted";
const productionFormat =
  ":remote-addr - :method :url :status :response-time-formatted";

const morganMiddleware = morgan(
  process.env.NODE_ENV === "production" ? productionFormat : developmentFormat,
  {
    stream: logger.stream,
    skip: (req, res) => {
      return req.url === "/health" && res.statusCode === 200;
    },
  }
);

export default morganMiddleware;
