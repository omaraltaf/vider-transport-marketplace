import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SystemHealthMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  redis: {
    connections: number;
    memory: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'security' | 'system' | 'business';
  title: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: Date;
}

interface SystemHealthDashboardProps {
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({
  onRefresh,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<SystemHealthMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<SystemHealthMetrics[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setCurrentMetrics(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchMetricsHistory = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/health/history?hours=24', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics history');
      }

      const data = await response.json();
      setMetricsHistory(data.data);
    } catch (err) {
      console.error('Error fetching metrics history:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/alerts?acknowledged=false', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.data || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/system/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/system/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSystemHealth(),
        fetchMetricsHistory(),
        fetchAlerts()
      ]);
      setLoading(false);
    };

    loadData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth();
        fetchAlerts();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100) / 100}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading system health: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </Card>
    );
  }

  if (!currentMetrics) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">No system health data available</p>
      </Card>
    );
  }

  const chartData = metricsHistory.map(metric => ({
    time: new Date(metric.timestamp).toLocaleTimeString(),
    cpu: metric.cpu.usage,
    memory: metric.memory.percentage,
    responseTime: metric.api.averageResponseTime,
    errorRate: metric.api.errorRate
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Health Dashboard</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              fetchSystemHealth();
              fetchMetricsHistory();
              fetchAlerts();
              onRefresh?.();
            }}
          >
            Refresh
          </Button>
          <Badge variant="outline">
            Last updated: {new Date(currentMetrics.timestamp).toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Active Alerts ({alerts.length})</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg ${getAlertColor(alert.type)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold">{formatPercentage(currentMetrics.cpu.usage)}</p>
              <p className="text-xs text-gray-500">
                {currentMetrics.cpu.cores} cores
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              currentMetrics.cpu.usage > 90 ? 'bg-red-500' :
              currentMetrics.cpu.usage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold">{formatPercentage(currentMetrics.memory.percentage)}</p>
              <p className="text-xs text-gray-500">
                {formatBytes(currentMetrics.memory.used)} / {formatBytes(currentMetrics.memory.total)}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              currentMetrics.memory.percentage > 85 ? 'bg-red-500' :
              currentMetrics.memory.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Database</p>
              <p className="text-2xl font-bold">{currentMetrics.database.connections}</p>
              <p className="text-xs text-gray-500">
                connections ({currentMetrics.database.queryTime}ms avg)
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentMetrics.database.status)}`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Performance</p>
              <p className="text-2xl font-bold">{currentMetrics.api.requestsPerMinute}</p>
              <p className="text-xs text-gray-500">
                req/min ({formatPercentage(currentMetrics.api.errorRate)} errors)
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentMetrics.api.status)}`}></div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics (24h)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">API Response Time & Error Rate</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="responseTime" stackId="1" stroke="#ffc658" fill="#ffc658" name="Response Time (ms)" />
                  <Area type="monotone" dataKey="errorRate" stackId="2" stroke="#ff7300" fill="#ff7300" name="Error Rate %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">CPU Load Average</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>1 minute:</span>
                  <span className="font-mono">{currentMetrics.cpu.loadAverage[0]?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>5 minutes:</span>
                  <span className="font-mono">{currentMetrics.cpu.loadAverage[1]?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>15 minutes:</span>
                  <span className="font-mono">{currentMetrics.cpu.loadAverage[2]?.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Memory Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className="font-mono">{formatBytes(currentMetrics.memory.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-mono">{formatBytes(currentMetrics.memory.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className="font-mono">{formatPercentage(currentMetrics.memory.percentage)}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Database Connections</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Active:</span>
                  <span className="font-mono">{currentMetrics.database.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max:</span>
                  <span className="font-mono">{currentMetrics.database.maxConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Query Time:</span>
                  <span className="font-mono">{currentMetrics.database.queryTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge className={getStatusColor(currentMetrics.database.status)}>
                    {currentMetrics.database.status}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Redis Cache</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Connections:</span>
                  <span className="font-mono">{currentMetrics.redis.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span className="font-mono">{formatBytes(currentMetrics.redis.memory)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge className={getStatusColor(currentMetrics.redis.status)}>
                    {currentMetrics.redis.status}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Storage Usage</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Disk Usage:</span>
                <span className="font-mono">
                  {formatBytes(currentMetrics.storage.used)} / {formatBytes(currentMetrics.storage.total)}
                  ({formatPercentage(currentMetrics.storage.percentage)})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    currentMetrics.storage.percentage > 90 ? 'bg-red-500' :
                    currentMetrics.storage.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(currentMetrics.storage.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthDashboard;