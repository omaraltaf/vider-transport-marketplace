import winston from 'winston';
import { config } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: config.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// Add file transports in production (with error handling)
if (config.NODE_ENV === 'production') {
  try {
    logger.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      })
    );
    logger.add(
      new winston.transports.File({
        filename: 'logs/combined.log',
      })
    );
  } catch (error) {
    // If file logging fails, continue with console logging only
    console.warn('File logging disabled due to permissions:', error.message);
  }
}
