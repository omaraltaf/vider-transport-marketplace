import { getDatabaseClient } from '../config/database';
import { logger } from '../config/logger';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
  };
}

export interface DependencyStatus {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

export class HealthService {
  /**
   * Check the health of all critical dependencies
   */
  async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const dependencies = {
      database: await this.checkDatabase(),
    };

    const allHealthy = Object.values(dependencies).every(
      (dep) => dep.status === 'up'
    );

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      dependencies,
    };

    if (!allHealthy) {
      logger.warn('Health check failed', { status });
    }

    return status;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    const startTime = Date.now();
    try {
      const prisma = getDatabaseClient();
      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      });

      return {
        status: 'down',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
