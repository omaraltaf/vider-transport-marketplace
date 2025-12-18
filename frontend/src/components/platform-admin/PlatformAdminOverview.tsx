import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { formatCurrency, formatNumber } from '../../utils/currency';
import { getApiUrl } from '../../config/app.config';
import { 
  Users, 
  Building, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Server,
  MessageSquare,
  Shield,
  Activity,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Eye
} from 'lucide-react';

interface OverviewMetrics {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  companies: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    commission: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'company_signup' | 'payment' | 'support_ticket' | 'system_event';
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: any;
}



export const PlatformAdminOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    fetchOverviewData();
    
    // Set up real-time updates
    const interval = setInterval(fetchOverviewData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOverviewData = async (range?: string) => {
    const currentRange = range || dateRange;
    console.log('Fetching data for range:', currentRange);
    
    try {
      setRefreshing(true);
      
      // Get valid token using TokenManager
      const validToken = await tokenManager.getValidToken();
      
      const headers = {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      };

      // Fetch metrics with date range parameter
      const metricsResponse = await fetch(getApiUrl(`/platform-admin/overview/metrics?range=${currentRange}`), { headers });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      } else {
        console.error('Failed to fetch metrics:', metricsResponse.status);
        setMockData();
      }

      // Fetch alerts
      const alertsResponse = await fetch(getApiUrl('/platform-admin/system/alerts'), { headers });
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      } else {
        console.error('Failed to fetch alerts:', alertsResponse.status);
      }

      // Fetch recent activity with date range
      const activityResponse = await fetch(getApiUrl(`/platform-admin/overview/activity?range=${currentRange}`), { headers });
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      } else {
        console.error('Failed to fetch activity:', activityResponse.status);
      }

    } catch (error) {
      console.error('Error fetching overview data:', error);
      setMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setMockData = () => {
    // Mock data with realistic values matching actual seeded data
    // Adjust values slightly based on date range for visual feedback
    const baseMultiplier = dateRange === '7d' ? 0.3 : dateRange === '30d' ? 1.0 : 2.8;
    
    setMetrics({
      users: { 
        total: 22, 
        active: 18, 
        new: Math.round(4 * baseMultiplier), 
        growth: 12.5 
      },
      companies: { 
        total: 6, 
        active: 4, 
        new: Math.round(2 * baseMultiplier), 
        growth: 8.2 
      },
      revenue: { 
        total: 315789,    // ~316K NOK (matches actual seeded transaction data)
        monthly: Math.round(27507 * baseMultiplier),   // Adjust monthly based on range
        growth: 15.3, 
        commission: Math.round(15789 * baseMultiplier)  // Adjust commission based on range
      },
      system: { uptime: 99.8, responseTime: 145, errorRate: 0.02, activeConnections: 1240 }
    });
    
    setAlerts([
      {
        id: '1',
        type: 'info',
        title: 'Using Mock Data',
        message: `Platform is displaying fallback data for ${dateRange === '7d' ? 'last 7 days' : dateRange === '30d' ? 'last 30 days' : 'last 90 days'}`,
        timestamp: new Date(),
        resolved: false
      }
    ]);
    
    const activityCount = dateRange === '7d' ? 1 : dateRange === '30d' ? 3 : 5;
    const activities = [
      {
        id: '1',
        type: 'user_registration' as const,
        description: 'New user registered from Oslo',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        user: 'System'
      },
      {
        id: '2',
        type: 'company_signup' as const,
        description: 'Bergen Logistics completed verification',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        user: 'Platform Admin'
      },
      {
        id: '3',
        type: 'payment' as const,
        description: 'Payment processed: 2,450 kr',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      },
      {
        id: '4',
        type: 'user_registration' as const,
        description: 'New driver registered from Bergen',
        timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        user: 'System'
      },
      {
        id: '5',
        type: 'payment' as const,
        description: 'Payment processed: 1,850 kr',
        timestamp: new Date(Date.now() - 1500000), // 25 minutes ago
      }
    ];
    
    setRecentActivity(activities.slice(0, activityCount));
  };



  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'company_signup':
        return <Building className="h-4 w-4 text-blue-500" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'support_ticket':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      case 'system_event':
        return <Server className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Using centralized currency utilities - no local formatting functions needed

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-gray-600">
            Monitor your platform's key metrics and system health 
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </span>
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchOverviewData()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant={dateRange === '7d' ? 'default' : dateRange === '30d' ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => {
              // Toggle between different date ranges
              const ranges = ['7d', '30d', '90d'];
              const currentIndex = ranges.indexOf(dateRange);
              const nextRange = ranges[(currentIndex + 1) % ranges.length];
              console.log('Date range changing from', dateRange, 'to', nextRange);
              setDateRange(nextRange);
              fetchOverviewData(nextRange); // Refresh data with new range
            }}
            disabled={refreshing}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Last {dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.users.total)}</p>
                <div className="flex items-center mt-2">
                  {metrics.users.growth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ml-1 ${metrics.users.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.users.growth)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Companies</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.companies.total)}</p>
                <div className="flex items-center mt-2">
                  {metrics.companies.growth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ml-1 ${metrics.companies.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.companies.growth)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.revenue.monthly)}</p>
                <div className="flex items-center mt-2">
                  {metrics.revenue.growth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ml-1 ${metrics.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.revenue.growth)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.system.uptime}%</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 ml-1">Healthy</span>
                  <span className="text-sm text-gray-500 ml-1">• {metrics.system.responseTime}ms avg</span>
                </div>
              </div>
              <Server className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Alerts */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
              <Badge variant="outline">{alerts.filter(a => !a.resolved).length} active</Badge>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${
                  alert.resolved ? 'border-gray-200 bg-gray-50' : 
                  alert.type === 'error' ? 'border-red-200 bg-red-50' :
                  alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-start space-x-2">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {alert.resolved && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500">No active alerts</p>
                </div>
              )}
            </div>
            {alerts.length > 5 && (
              <Button variant="outline" className="w-full mt-3" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All Alerts
              </Button>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    {activity.user && (
                      <p className="text-xs text-gray-600">by {activity.user}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {activity.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
            {recentActivity.length > 8 && (
              <Button variant="outline" className="w-full mt-3" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All Activity
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* System Status Summary */}
      {metrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Globe className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Global Status</p>
              <p className="text-lg font-bold text-green-600">Operational</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(metrics.system.activeConnections)}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-lg font-bold text-gray-900">{metrics.system.responseTime}ms</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-lg font-bold text-gray-900">{metrics.system.errorRate}%</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};