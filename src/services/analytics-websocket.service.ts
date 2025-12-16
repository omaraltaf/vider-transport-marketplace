/**
 * Analytics WebSocket Service
 * Handles real-time data streaming for live metrics
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { analyticsService } from './analytics.service';
import { growthAnalyticsService } from './growth-analytics.service';
import { geographicAnalyticsService } from './geographic-analytics.service';
import { logger } from '../config/logger';
import { authenticateSocket } from '../middleware/socket-auth.middleware';
import { requirePlatformAdminSocket } from '../middleware/platform-admin-socket.middleware';

export interface AnalyticsSocketData {
  kpis?: any;
  metrics?: any;
  geographic?: any;
  alerts?: any;
}

export interface MetricSubscription {
  socketId: string;
  userId: string;
  metrics: string[];
  lastUpdate: Date;
}

export class AnalyticsWebSocketService {
  private io: SocketIOServer;
  private subscriptions: Map<string, MetricSubscription> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/analytics'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication and authorization middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(authenticateSocket);
    
    // Platform admin authorization middleware
    this.io.use(requirePlatformAdminSocket);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('Analytics WebSocket client connected', { 
        socketId: socket.id, 
        userId: socket.data.user?.id 
      });

      // Handle metric subscription
      socket.on('subscribe_metrics', (data: { metrics: string[] }) => {
        this.handleMetricSubscription(socket, data.metrics);
      });

      // Handle unsubscribe
      socket.on('unsubscribe_metrics', (data: { metrics: string[] }) => {
        this.handleMetricUnsubscription(socket, data.metrics);
      });

      // Handle real-time KPI request
      socket.on('request_kpis', async () => {
        await this.sendKPIs(socket);
      });

      // Handle real-time geographic data request
      socket.on('request_geographic', async () => {
        await this.sendGeographicData(socket);
      });

      // Handle custom metric request
      socket.on('request_metric', async (data: { 
        metric: string; 
        timeRange?: { start: Date; end: Date; granularity: string } 
      }) => {
        await this.sendCustomMetric(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Analytics WebSocket client disconnected', { 
          socketId: socket.id, 
          userId: socket.data.user?.id,
          reason 
        });
        this.handleDisconnection(socket);
      });

      // Send initial data
      this.sendInitialData(socket);
    });
  }

  /**
   * Start the WebSocket service
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startPeriodicUpdates();
    
    logger.info('Analytics WebSocket service started');
  }

  /**
   * Stop the WebSocket service
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopPeriodicUpdates();
    this.io.close();
    
    logger.info('Analytics WebSocket service stopped');
  }

  /**
   * Handle metric subscription
   */
  private handleMetricSubscription(socket: any, metrics: string[]): void {
    const subscription: MetricSubscription = {
      socketId: socket.id,
      userId: socket.data.user.id,
      metrics,
      lastUpdate: new Date()
    };

    this.subscriptions.set(socket.id, subscription);

    logger.info('Client subscribed to metrics', { 
      socketId: socket.id, 
      userId: socket.data.user.id,
      metrics 
    });

    // Send immediate update for subscribed metrics
    this.sendSubscribedMetrics(socket, metrics);

    // Acknowledge subscription
    socket.emit('subscription_confirmed', { metrics });
  }

  /**
   * Handle metric unsubscription
   */
  private handleMetricUnsubscription(socket: any, metrics: string[]): void {
    const subscription = this.subscriptions.get(socket.id);
    if (!subscription) return;

    // Remove metrics from subscription
    subscription.metrics = subscription.metrics.filter(m => !metrics.includes(m));

    if (subscription.metrics.length === 0) {
      this.subscriptions.delete(socket.id);
    } else {
      this.subscriptions.set(socket.id, subscription);
    }

    logger.info('Client unsubscribed from metrics', { 
      socketId: socket.id, 
      userId: socket.data.user.id,
      unsubscribedMetrics: metrics,
      remainingMetrics: subscription.metrics 
    });

    socket.emit('unsubscription_confirmed', { metrics });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: any): void {
    this.subscriptions.delete(socket.id);
    
    // Clear any socket-specific intervals
    const intervalKey = `socket_${socket.id}`;
    const interval = this.updateIntervals.get(intervalKey);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(intervalKey);
    }
  }

  /**
   * Send initial data to newly connected client
   */
  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Send current KPIs
      await this.sendKPIs(socket);

      // Send basic geographic data
      await this.sendGeographicData(socket);

      // Send connection confirmation
      socket.emit('analytics_connected', {
        timestamp: new Date().toISOString(),
        availableMetrics: [
          'kpis',
          'users',
          'bookings',
          'revenue',
          'geographic',
          'growth_trends',
          'cohorts'
        ]
      });
    } catch (error) {
      logger.error('Error sending initial data:', error);
      socket.emit('analytics_error', {
        message: 'Failed to load initial analytics data',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send KPIs to client
   */
  private async sendKPIs(socket: any): Promise<void> {
    try {
      const kpis = await analyticsService.getPlatformKPIs(true);
      
      socket.emit('kpis_update', {
        data: kpis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending KPIs:', error);
      socket.emit('analytics_error', {
        message: 'Failed to load KPIs',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send geographic data to client
   */
  private async sendGeographicData(socket: any): Promise<void> {
    try {
      const geographicData = await geographicAnalyticsService.getGeographicUsageData(true);
      
      socket.emit('geographic_update', {
        data: {
          regions: geographicData.regions,
          heatMapData: geographicData.heatMapData,
          marketPenetration: geographicData.marketPenetration
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending geographic data:', error);
      socket.emit('analytics_error', {
        message: 'Failed to load geographic data',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send custom metric data to client
   */
  private async sendCustomMetric(socket: any, data: { 
    metric: string; 
    timeRange?: { start: Date; end: Date; granularity: string } 
  }): Promise<void> {
    try {
      const { metric, timeRange } = data;

      let result: any;

      if (timeRange) {
        // Time series data
        result = await analyticsService.getTimeSeriesData(
          metric,
          {
            start: new Date(timeRange.start),
            end: new Date(timeRange.end),
            granularity: timeRange.granularity as any
          },
          true
        );
      } else {
        // Current metric value
        switch (metric) {
          case 'kpis':
            result = await analyticsService.getPlatformKPIs(true);
            break;
          case 'geographic':
            result = await geographicAnalyticsService.getGeographicUsageData(true);
            break;
          default:
            throw new Error(`Unknown metric: ${metric}`);
        }
      }

      socket.emit('metric_update', {
        metric,
        data: result,
        timeRange,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending custom metric:', error);
      socket.emit('analytics_error', {
        message: `Failed to load metric: ${data.metric}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send subscribed metrics to client
   */
  private async sendSubscribedMetrics(socket: any, metrics: string[]): Promise<void> {
    for (const metric of metrics) {
      try {
        switch (metric) {
          case 'kpis':
            await this.sendKPIs(socket);
            break;
          case 'geographic':
            await this.sendGeographicData(socket);
            break;
          default:
            // Handle time series metrics
            if (['users', 'bookings', 'revenue'].includes(metric)) {
              const now = new Date();
              const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              
              await this.sendCustomMetric(socket, {
                metric,
                timeRange: {
                  start: yesterday,
                  end: now,
                  granularity: 'hour'
                }
              });
            }
            break;
        }
      } catch (error) {
        logger.error(`Error sending subscribed metric ${metric}:`, error);
      }
    }
  }

  /**
   * Start periodic updates for all connected clients
   */
  private startPeriodicUpdates(): void {
    // Update KPIs every 30 seconds
    const kpiInterval = setInterval(async () => {
      await this.broadcastKPIUpdates();
    }, 30000);
    this.updateIntervals.set('kpis', kpiInterval);

    // Update geographic data every 5 minutes
    const geoInterval = setInterval(async () => {
      await this.broadcastGeographicUpdates();
    }, 300000);
    this.updateIntervals.set('geographic', geoInterval);

    // Update subscribed metrics every minute
    const metricsInterval = setInterval(async () => {
      await this.broadcastSubscribedUpdates();
    }, 60000);
    this.updateIntervals.set('subscribed_metrics', metricsInterval);
  }

  /**
   * Stop periodic updates
   */
  private stopPeriodicUpdates(): void {
    this.updateIntervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.updateIntervals.clear();
  }

  /**
   * Broadcast KPI updates to all connected clients
   */
  private async broadcastKPIUpdates(): Promise<void> {
    try {
      const kpis = await analyticsService.getPlatformKPIs(true);
      
      this.io.emit('kpis_update', {
        data: kpis,
        timestamp: new Date().toISOString()
      });

      logger.debug('Broadcasted KPI updates to all clients');
    } catch (error) {
      logger.error('Error broadcasting KPI updates:', error);
    }
  }

  /**
   * Broadcast geographic updates to subscribed clients
   */
  private async broadcastGeographicUpdates(): Promise<void> {
    try {
      const geographicData = await geographicAnalyticsService.getGeographicUsageData(true);
      
      // Only send to clients subscribed to geographic data
      this.subscriptions.forEach((subscription, socketId) => {
        if (subscription.metrics.includes('geographic')) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('geographic_update', {
              data: {
                regions: geographicData.regions,
                heatMapData: geographicData.heatMapData,
                marketPenetration: geographicData.marketPenetration
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      logger.debug('Broadcasted geographic updates to subscribed clients');
    } catch (error) {
      logger.error('Error broadcasting geographic updates:', error);
    }
  }

  /**
   * Broadcast updates for subscribed metrics
   */
  private async broadcastSubscribedUpdates(): Promise<void> {
    const now = new Date();
    
    this.subscriptions.forEach(async (subscription, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        this.subscriptions.delete(socketId);
        return;
      }

      // Only update if it's been more than 30 seconds since last update
      if (now.getTime() - subscription.lastUpdate.getTime() < 30000) {
        return;
      }

      try {
        await this.sendSubscribedMetrics(socket, subscription.metrics);
        subscription.lastUpdate = now;
        this.subscriptions.set(socketId, subscription);
      } catch (error) {
        logger.error('Error sending subscribed updates:', error);
      }
    });
  }

  /**
   * Broadcast alert to all connected clients
   */
  broadcastAlert(alert: {
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    data?: any;
  }): void {
    this.io.emit('analytics_alert', {
      ...alert,
      timestamp: new Date().toISOString()
    });

    logger.info('Broadcasted analytics alert', { alert });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeSubscriptions: number;
    subscriptionsByMetric: Record<string, number>;
  } {
    const subscriptionsByMetric: Record<string, number> = {};
    
    this.subscriptions.forEach(subscription => {
      subscription.metrics.forEach(metric => {
        subscriptionsByMetric[metric] = (subscriptionsByMetric[metric] || 0) + 1;
      });
    });

    return {
      totalConnections: this.io.sockets.sockets.size,
      activeSubscriptions: this.subscriptions.size,
      subscriptionsByMetric
    };
  }
}

export let analyticsWebSocketService: AnalyticsWebSocketService;