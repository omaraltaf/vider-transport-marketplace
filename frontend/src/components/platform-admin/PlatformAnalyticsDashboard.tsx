/**
 * Platform Analytics Dashboard
 * Main dashboard component for platform-wide analytics and metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Calendar, 
  DollarSign,
  Globe,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface PlatformKPIs {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  userGrowthRate: number;
  bookingGrowthRate: number;
  revenueGrowthRate: number;
  platformUtilization: number;
  lastUpdated: Date;
}

interface TimeRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface PlatformAnalyticsDashboardProps {
  className?: string;
  initialSubSection?: string;
}

const PlatformAnalyticsDashboard: React.FC<PlatformAnalyticsDashboardProps> = ({ 
  className = '',
  initialSubSection = 'dashboard'
}) => {
  const { token } = useAuth();
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Note: Sub-section handling will be implemented when actual tabs are added
  // For now, we just accept the initialSubSection prop for consistency
  useEffect(() => {
    // This will be used when we implement actual sub-section tabs
    console.log('Analytics sub-section:', initialSubSection);
  }, [initialSubSection]);

  // Predefined time ranges
  const timeRanges: Record<string, TimeRange> = {
    '7d': {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last 7 days'
    },
    '30d': {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last 30 days'
    },
    '90d': {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last 90 days'
    },
    '1y': {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last year'
    }
  };

  // Fetch platform KPIs
  const fetchKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const result = await apiClient.get('/platform-admin/analytics/kpis?useCache=true', token);
      if (result.success) {
        setKpis(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch KPIs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      
      // Check for authentication errors
      if (errorMessage.includes('Authentication') || errorMessage.includes('token') || errorMessage.includes('401')) {
        setError('Authentication expired. Please refresh the page and log in again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(errorMessage);
      }
      
      console.error('Error fetching KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchKPIs();
    setRefreshing(false);
  };

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
    // Trigger immediate data refresh when time range changes
    setTimeout(() => fetchKPIs(), 100);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'excel' | 'json') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/platform-admin/analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportType: 'kpis',
          format,
          dateRange: {
            start: timeRanges[selectedTimeRange].startDate.toISOString(),
            end: timeRanges[selectedTimeRange].endDate.toISOString()
          },
          filters: {},
          delivery: {
            method: 'download'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `platform-analytics-${selectedTimeRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Load initial data and refresh when time range changes
  useEffect(() => {
    fetchKPIs();
  }, [selectedTimeRange]);



  if (loading && !kpis) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => fetchKPIs()}>
              Try Again
            </Button>
            {error.includes('Authentication') && (
              <p className="text-sm text-gray-600">
                If the problem persists, try refreshing the page and logging in again.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive platform performance and growth metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="w-40 px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.entries(timeRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <select 
            onChange={(e) => e.target.value && handleExport(e.target.value as 'csv' | 'excel' | 'json')}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md"
            defaultValue=""
          >
            <option value="" disabled>Export</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis.totalUsers)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Active:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(kpis.activeUsers)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Companies */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis.totalCompanies)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Active:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(kpis.activeCompanies)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis.totalBookings)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Completed:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(kpis.completedBookings)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Avg booking:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(kpis.averageBookingValue)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* User Growth Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Growth</CardTitle>
              {kpis.userGrowthRate >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                kpis.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(kpis.userGrowthRate)}
              </div>
              <p className="text-xs text-muted-foreground">
                vs previous period
              </p>
            </CardContent>
          </Card>

          {/* Platform Utilization */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.platformUtilization.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Active user ratio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
              Overview
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Growth Trends
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Geographic
            </button>
            <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              Feature Usage
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Platform Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Detailed analytics charts will be implemented in the next phase.
                  This includes interactive charts for bookings, revenue, and user activity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Interactive map and regional analytics will be displayed here.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalyticsDashboard;