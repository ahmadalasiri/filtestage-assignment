import morgan from 'morgan';
import logger from '../utils/logger.js';

morgan.token('body', (req) => {
  if (req.body) {
    const filteredBody = { ...req.body };

    // Filter out sensitive fields
    if (filteredBody.password) filteredBody.password = '[FILTERED]';
    if (filteredBody.token) filteredBody.token = '[FILTERED]';
    if (filteredBody.cookie) filteredBody.cookie = '[FILTERED]';

    return JSON.stringify(filteredBody);
  }
  return '';
});

// Define custom token for response time in a more readable format
morgan.token('response-time-formatted', (req, res) => {
  const time = morgan['response-time'](req, res);
  return time ? `${time} ms` : '';
});

const developmentFormat = ':method :url :status :response-time-formatted - :body';
const productionFormat = ':remote-addr - :method :url :status :response-time-formatted';

const morganMiddleware = morgan(
  process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream: logger.stream,
    skip: (req, res) => {
      return req.url === '/health' && res.statusCode === 200;
    }
  }
);

export default morganMiddleware;
