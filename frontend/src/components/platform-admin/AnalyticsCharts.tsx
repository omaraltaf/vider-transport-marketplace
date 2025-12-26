/**
 * Analytics Charts Components
 * Interactive data visualization components for platform analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { apiClient } from '../../services/api';
import { getApiUrl } from '../../config/app.config';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  MapPin
} from 'lucide-react';

interface ChartDataPoint {
  date: string;
  users: number;
  bookings: number;
  revenue: number;
  companies: number;
}

interface GrowthTrendData {
  period: string;
  userGrowth: number;
  bookingGrowth: number;
  revenueGrowth: number;
}

interface GeographicData {
  region: string;
  userCount: number;
  bookingCount: number;
  revenue: number;
  percentage: number;
  [key: string]: string | number; // Add index signature for chart compatibility
}

interface FeatureUsageData {
  feature: string;
  adoptionRate: number;
  activeUsers: number;
  totalUsage: number;
}

interface AnalyticsChartsProps {
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    timeRange: {
      startDate: Date;
      endDate: Date;
      label: string;
    };
    regions: string[];
    companyTypes: string[];
    userSegments: string[];
    features: string[];
    searchQuery: string;
  };
  className?: string;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ 
  timeRange, 
  filters,
  className = '' 
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [growthData, setGrowthData] = useState<GrowthTrendData[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [featureData, setFeatureData] = useState<FeatureUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'bookings' | 'revenue'>('users');

  // Color schemes for charts
  const colors = {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    muted: '#6b7280'
  };

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      setLoading(true);

      // Get valid token using TokenManager
      const validToken = await tokenManager.getValidToken();
      
      // Prepare filter parameters
      const filterParams = {
        startDate: timeRange.startDate.toISOString(),
        endDate: timeRange.endDate.toISOString(),
        granularity: 'daily',
        ...(filters && {
          regions: filters.regions,
          companyTypes: filters.companyTypes,
          userSegments: filters.userSegments,
          features: filters.features,
          searchQuery: filters.searchQuery
        })
      };
      
      // Fetch trend data
      const trendData = await apiClient.post('/platform-admin/analytics/trends', filterParams, validToken);
      
      setChartData((trendData as any).dailyMetrics || []);
      setGrowthData((trendData as any).growthTrends || []);

      // Fetch geographic data
      const geoData = await apiClient.post('/platform-admin/analytics/geographic', filterParams, validToken);
      
      setGeographicData((geoData as any).regions || []);

      // Fetch feature usage data
      const featureData = await apiClient.post('/platform-admin/analytics/features', filterParams, validToken);
      
      setFeatureData((featureData as any).features || []);

    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Failed to load analytics data. Please try again.');
      setChartData([]); // Set empty array instead of mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [timeRange, filters]);

  // Add a separate effect to handle filter changes more reliably
  useEffect(() => {
    if (filters) {
      console.log('Chart filters changed, refreshing data:', filters);
      fetchChartData();
    }
  }, [
    filters?.timeRange?.startDate,
    filters?.timeRange?.endDate,
    filters?.regions?.length,
    filters?.companyTypes?.length,
    filters?.userSegments?.length,
    filters?.features?.length,
    filters?.searchQuery
  ]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 animate-pulse" />
          <span>Loading charts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Platform Trends
            </CardTitle>
            <select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value as 'users' | 'bookings' | 'revenue')}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="users">Users</option>
              <option value="bookings">Bookings</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('no-NO', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Rate Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Growth Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: number | undefined) => [`${(value || 0).toFixed(1)}%`, '']}
                  content={<CustomTooltip />}
                />
                <Legend />
                <Bar dataKey="userGrowth" fill={colors.primary} name="User Growth" />
                <Bar dataKey="bookingGrowth" fill={colors.secondary} name="Booking Growth" />
                <Bar dataKey="revenueGrowth" fill={colors.accent} name="Revenue Growth" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Geographic Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={geographicData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => `${name} (${((value / geographicData.reduce((sum, item) => sum + item.userCount, 0)) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="userCount"
                  nameKey="region"
                >
                  {geographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number | undefined) => [(value || 0).toLocaleString(), 'Users']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2" />
            Feature Adoption Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featureData.map((feature, index) => (
              <div key={feature.feature} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{feature.feature}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {feature.adoptionRate.toFixed(1)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {feature.activeUsers.toLocaleString()} users
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${feature.adoptionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multi-metric Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Multi-Metric Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('no-NO', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" tickFormatter={(value) => value.toLocaleString()} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="users"
                stroke={colors.primary}
                strokeWidth={2}
                name="Users"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bookings"
                stroke={colors.secondary}
                strokeWidth={2}
                name="Bookings"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke={colors.accent}
                strokeWidth={2}
                name="Revenue (NOK)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;