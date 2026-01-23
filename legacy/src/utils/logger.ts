/**
 * Logger utility for consistent logging across the application
 */

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  error(message: string, error?: Error | LogContext, context?: LogContext): void {
    let errorContext: LogContext = {};
    let actualContext: LogContext = {};

    if (error instanceof Error) {
      errorContext = {
        error: error.message,
        stack: error.stack,
        name: error.name,
      };
      actualContext = context || {};
    } else {
      errorContext = error || {};
      actualContext = {};
    }

    this.log('ERROR', message, { ...errorContext, ...actualContext });
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('DEBUG', message, context);
    }
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty print for development
      console.log(`[${timestamp}] ${level}: ${message}`);
      if (context && Object.keys(context).length > 0) {
        console.log('Context:', context);
      }
    } else {
      // JSON format for production
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();