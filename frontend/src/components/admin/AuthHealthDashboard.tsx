/**
 * Authentication Health Dashboard
 * Provides real-time monitoring of authentication system health and performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Users,
  Shield,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { productionErrorTracker, type AuthenticationMetrics } from '../../services/error-handling/ProductionErrorTracker';
import { errorMonitor, type ErrorMetrics, type ErrorTrend } from '../../services/error-handling/ErrorMonitor';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: Date;
}

export function AuthHealthDashboard() {
  const [authMetrics, setAuthMetrics] = useState<AuthenticationMetrics | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics | null>(null);
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'healthy',
    message: 'All systems operational',
    lastCheck: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh data
  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      const [authData, errorData, trends] = await Promise.all([
        Promise.resolve(productionErrorTracker.getAuthMetrics()),
        Promise.resolve(errorMonitor.getMetrics()),
        Promise.resolve(errorMonitor.getErrorTrends(60))
      ]);

      setAuthMetrics(authData);
      setErrorMetrics(errorData);
      setErrorTrends(trends);

      // Calculate health status
      const dashboardData = productionErrorTracker.getAuthDashboardData();
      setHealthStatus({
        status: dashboardData.healthStatus,
        message: getHealthMessage(dashboardData.healthStatus),
        lastCheck: new Date()
      });
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthMessage = (status: 'healthy' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'healthy':
        return 'All authentication systems are operating normally';
      case 'warning':
        return 'Some authentication issues detected, monitoring closely';
      case 'critical':
        return 'Critical authentication issues require immediate attention';
      default:
        return 'Status unknown';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const calculateSuccessRate = (successes: number, total: number): number => {
    return total > 0 ? (successes / total) * 100 : 0;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  if (isLoading && !authMetrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading authentication health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Authentication Health Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of authentication system performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon(healthStatus.status)}
            <span>System Health</span>
            <Badge className={getStatusColor(healthStatus.status)}>
              {healthStatus.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-2">{healthStatus.message}</p>
          <p className="text-sm text-gray-500">
            Last checked: {healthStatus.lastCheck.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      {/* Metrics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Login Attempts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(authMetrics?.loginAttempts || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Login Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {calculateSuccessRate(
                        authMetrics?.loginSuccesses || 0,
                        authMetrics?.loginAttempts || 0
                      ).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Token Refresh Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {calculateSuccessRate(
                        authMetrics?.tokenRefreshSuccesses || 0,
                        authMetrics?.tokenRefreshAttempts || 0
                      ).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Errors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(errorMetrics?.totalErrors || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Login Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Average Login Time</span>
                  <span className="text-lg font-semibold">
                    {formatDuration(authMetrics?.averageLoginTime || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Successful Logins</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatNumber(authMetrics?.loginSuccesses || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Failed Logins</span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatNumber(authMetrics?.loginFailures || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Average Refresh Time</span>
                  <span className="text-lg font-semibold">
                    {formatDuration(authMetrics?.averageTokenRefreshTime || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Successful Refreshes</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatNumber(authMetrics?.tokenRefreshSuccesses || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Failed Refreshes</span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatNumber(authMetrics?.tokenRefreshFailures || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorMetrics && Object.entries(errorMetrics.errorsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {type.replace('_', ' ').toLowerCase()}
                      </span>
                      <Badge variant="outline">{formatNumber(count)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorTrends.slice(0, 5).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {trend.trend === 'increasing' ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : trend.trend === 'decreasing' ? (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <Activity className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          {new Date(trend.timeWindow.split('-')[0]).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{trend.errorCount} errors</Badge>
                        <Badge 
                          className={
                            trend.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            trend.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            trend.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {trend.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Response Times</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {formatDuration(authMetrics?.averageLoginTime || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Average Login Time</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {formatDuration(authMetrics?.averageTokenRefreshTime || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Average Token Refresh</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Load</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {formatNumber((authMetrics?.loginAttempts || 0) + (authMetrics?.tokenRefreshAttempts || 0))}
                  </p>
                  <p className="text-sm text-gray-600">Total Operations</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {errorMetrics?.escalationCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Escalations</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${
                    healthStatus.status === 'healthy' ? 'text-green-500' :
                    healthStatus.status === 'warning' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {healthStatus.status === 'healthy' ? '98' :
                     healthStatus.status === 'warning' ? '75' : '45'}%
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Overall Health</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}