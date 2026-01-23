/**
 * Circuit Breaker Utility
 * Advanced circuit breaker implementation with configurable thresholds and recovery strategies
 */

import type { CircuitBreakerState } from '../../../types/error.types';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  successThreshold: number;
}

export interface CircuitBreakerMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rejectedCalls: number;
  averageResponseTime: number;
  lastFailureTime: Date | null;
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private metrics: CircuitBreakerMetrics;
  private config: CircuitBreakerConfig;
  private callTimes: number[] = [];

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      halfOpenMaxCalls: 3,
      successThreshold: 3,
      ...config
    };

    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      successCount: 0
    };

    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      averageResponseTime: 0,
      lastFailureTime: null
    };
  }

  /**
   * Executes a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      this.metrics.rejectedCalls++;
      throw new Error(`Circuit breaker '${this.name}' is OPEN`);
    }

    const startTime = Date.now();
    this.metrics.totalCalls++;

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Checks if the circuit breaker allows execution
   */
  private canExecute(): boolean {
    const now = new Date();

    switch (this.state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (this.state.nextAttemptTime && now >= this.state.nextAttemptTime) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited calls in half-open state
        return this.state.successCount < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Handles successful execution
   */
  private onSuccess(responseTime: number): void {
    this.metrics.successfulCalls++;
    this.updateResponseTime(responseTime);

    if (this.state.state === 'HALF_OPEN') {
      this.state.successCount++;
      if (this.state.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state.state === 'CLOSED') {
      // Gradually reduce failure count on success
      this.state.failureCount = Math.max(0, this.state.failureCount - 1);
    }
  }

  /**
   * Handles failed execution
   */
  private onFailure(responseTime: number): void {
    const now = new Date();
    this.metrics.failedCalls++;
    this.metrics.lastFailureTime = now;
    this.updateResponseTime(responseTime);

    this.state.failureCount++;
    this.state.lastFailureTime = now;

    if (this.state.state === 'CLOSED' || this.state.state === 'HALF_OPEN') {
      if (this.state.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transitions to CLOSED state
   */
  private transitionToClosed(): void {
    this.state.state = 'CLOSED';
    this.state.failureCount = 0;
    this.state.successCount = 0;
    this.state.nextAttemptTime = null;
  }

  /**
   * Transitions to OPEN state
   */
  private transitionToOpen(): void {
    this.state.state = 'OPEN';
    this.state.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.state.successCount = 0;
  }

  /**
   * Transitions to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.successCount = 0;
    this.state.nextAttemptTime = null;
  }

  /**
   * Updates average response time
   */
  private updateResponseTime(responseTime: number): void {
    this.callTimes.push(responseTime);
    
    // Keep only recent calls for average calculation
    const maxSamples = 100;
    if (this.callTimes.length > maxSamples) {
      this.callTimes = this.callTimes.slice(-maxSamples);
    }
    
    this.metrics.averageResponseTime = 
      this.callTimes.reduce((sum, time) => sum + time, 0) / this.callTimes.length;
  }

  /**
   * Gets current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Gets current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets failure rate as percentage
   */
  getFailureRate(): number {
    if (this.metrics.totalCalls === 0) return 0;
    return (this.metrics.failedCalls / this.metrics.totalCalls) * 100;
  }

  /**
   * Resets the circuit breaker to initial state
   */
  reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      successCount: 0
    };

    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      averageResponseTime: 0,
      lastFailureTime: null
    };

    this.callTimes = [];
  }

  /**
   * Forces circuit breaker to specific state (for testing)
   */
  forceState(state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.state.state = state;
    if (state === 'OPEN') {
      this.state.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    } else {
      this.state.nextAttemptTime = null;
    }
  }

  /**
   * Creates a wrapped function with circuit breaker protection
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return ((...args: Parameters<T>) => {
      return this.execute(() => fn(...args));
    }) as T;
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Gets or creates a circuit breaker for a given name
   */
  getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      this.circuitBreakers.set(name, new CircuitBreaker(name, mergedConfig));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Gets all circuit breaker states
   */
  getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      states[name] = breaker.getState();
    }
    return states;
  }

  /**
   * Gets all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Resets all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Removes a circuit breaker
   */
  remove(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();