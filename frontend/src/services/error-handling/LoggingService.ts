/**
 * Logging Service
 * Centralized logging with filtering, storage, and remote reporting capabilities
 */

import type { ILoggingService } from './interfaces';
import type { ApiError, ErrorContext } from '../../types/error.types';
import type { LogEntry, LogFilter } from './interfaces';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LoggingConfig {
  level: LogLevel;
  maxEntries: number;
  persistToDisk: boolean;
  remoteLogging: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

export class LoggingService implements ILoggingService {
  private logs: LogEntry[] = [];
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimeoutId: number | null = null;
  private readonly levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      level: 'INFO',
      maxEntries: 10000,
      persistToDisk: true,
      remoteLogging: false,
      bufferSize: 100,
      flushInterval: 30000, // 30 seconds
      ...config
    };

    this.initializeStorage();
    this.startPeriodicFlush();
  }

  /**
   * Logs an error with full context
   */
  logError(error: ApiError, context: ErrorContext): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: 'ERROR',
      message: error.message,
      metadata: {
        errorType: error.type,
        severity: error.severity,
        statusCode: error.statusCode,
        endpoint: context.endpoint,
        method: context.method,
        component: context.component,
        retryCount: context.retryCount,
        isRecoverable: error.isRecoverable,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId,
        stack: error.originalError.stack,
        ...error.metadata
      },
      component: context.component,
      userId: context.userId
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Logs an informational message
   */
  logInfo(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('INFO')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: 'INFO',
      message,
      metadata
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Logs a warning message
   */
  logWarning(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('WARN')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: 'WARN',
      message,
      metadata
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Logs a debug message
   */
  logDebug(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('DEBUG')) return;

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level: 'DEBUG',
      message,
      metadata
    };

    this.addLogEntry(logEntry);
  }

  /**
   * Retrieves logs with optional filtering
   */
  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        const minPriority = this.levelPriority[filter.level];
        filteredLogs = filteredLogs.filter(log => 
          this.levelPriority[log.level] >= minPriority
        );
      }

      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => 
          log.component === filter.component
        );
      }

      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => 
          log.userId === filter.userId
        );
      }

      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.startTime!
        );
      }

      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp <= filter.endTime!
        );
      }

      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchTerm) ||
          JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clears logs older than specified date
   */
  async clearLogs(olderThan?: Date): Promise<void> {
    if (olderThan) {
      this.logs = this.logs.filter(log => log.timestamp >= olderThan);
    } else {
      this.logs = [];
    }

    if (this.config.persistToDisk) {
      this.saveToStorage();
    }
  }

  /**
   * Gets logging statistics
   */
  getStatistics(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    oldestLog: Date | null;
    newestLog: Date | null;
    storageSize: number;
  } {
    const logsByLevel: Record<LogLevel, number> = {
      ERROR: 0,
      WARN: 0,
      INFO: 0,
      DEBUG: 0
    };

    this.logs.forEach(log => {
      logsByLevel[log.level]++;
    });

    const timestamps = this.logs.map(log => log.timestamp.getTime());
    const oldestLog = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const newestLog = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      oldestLog,
      newestLog,
      storageSize: this.calculateStorageSize()
    };
  }

  /**
   * Exports logs as JSON
   */
  exportLogs(filter?: LogFilter): Promise<string> {
    return this.getLogs(filter).then(logs => {
      const exportData = {
        exportedAt: new Date().toISOString(),
        filter,
        logs: logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        }))
      };
      
      return JSON.stringify(exportData, null, 2);
    });
  }

  /**
   * Updates logging configuration
   */
  updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart flush timer if interval changed
    if (newConfig.flushInterval) {
      this.stopPeriodicFlush();
      this.startPeriodicFlush();
    }
  }

  /**
   * Forces immediate flush of buffered logs
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    if (this.config.remoteLogging && this.config.remoteEndpoint) {
      try {
        await this.sendLogsToRemote(logsToFlush);
      } catch (error) {
        console.warn('Failed to send logs to remote endpoint:', error);
        // Put logs back in buffer for retry
        this.logBuffer.unshift(...logsToFlush);
      }
    }
  }

  /**
   * Adds a log entry to the system
   */
  private addLogEntry(logEntry: LogEntry): void {
    // Add to main log storage
    this.logs.push(logEntry);

    // Maintain max entries limit
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Add to buffer for remote logging
    if (this.config.remoteLogging) {
      this.logBuffer.push(logEntry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.bufferSize) {
        this.flush().catch(error => {
          console.warn('Failed to flush log buffer:', error);
        });
      }
    }

    // Persist to storage
    if (this.config.persistToDisk) {
      this.saveToStorage();
    }

    // Console output for development
    if (import.meta.env.DEV) {
      this.outputToConsole(logEntry);
    }
  }

  /**
   * Checks if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.config.level];
  }

  /**
   * Generates a unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initializes storage from localStorage
   */
  private initializeStorage(): void {
    if (!this.config.persistToDisk) return;

    try {
      const storedLogs = localStorage.getItem('error_handling_logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  /**
   * Saves logs to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistToDisk) return;

    try {
      const logsToStore = this.logs.slice(-1000); // Store only last 1000 logs
      const serializedLogs = logsToStore.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }));
      
      localStorage.setItem('error_handling_logs', JSON.stringify(serializedLogs));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  /**
   * Calculates approximate storage size
   */
  private calculateStorageSize(): number {
    try {
      const serialized = JSON.stringify(this.logs);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Outputs log entry to console
   */
  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${logEntry.level}]`;
    
    switch (logEntry.level) {
      case 'ERROR':
        console.error(prefix, logEntry.message, logEntry.metadata);
        break;
      case 'WARN':
        console.warn(prefix, logEntry.message, logEntry.metadata);
        break;
      case 'INFO':
        console.info(prefix, logEntry.message, logEntry.metadata);
        break;
      case 'DEBUG':
        console.debug(prefix, logEntry.message, logEntry.metadata);
        break;
    }
  }

  /**
   * Sends logs to remote endpoint
   */
  private async sendLogsToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'frontend-error-handling',
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))
    };

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Starts periodic flush timer
   */
  private startPeriodicFlush(): void {
    if (this.config.remoteLogging) {
      this.flushTimeoutId = setInterval(() => {
        this.flush().catch(error => {
          console.warn('Periodic log flush failed:', error);
        });
      }, this.config.flushInterval);
    }
  }

  /**
   * Stops periodic flush timer
   */
  private stopPeriodicFlush(): void {
    if (this.flushTimeoutId) {
      clearInterval(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopPeriodicFlush();
    
    // Final flush
    if (this.logBuffer.length > 0) {
      this.flush().catch(error => {
        console.warn('Final log flush failed:', error);
      });
    }
  }
}

// Singleton instance
export const loggingService = new LoggingService({
  level: import.meta.env.DEV ? 'DEBUG' : 'INFO',
  maxEntries: 5000,
  persistToDisk: true,
  remoteLogging: import.meta.env.PROD,
  remoteEndpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
  bufferSize: 50,
  flushInterval: 30000
});