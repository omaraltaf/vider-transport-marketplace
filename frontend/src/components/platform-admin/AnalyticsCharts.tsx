/**
 * Analytics Charts Components
 * Interactive data visualization components for platform analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../config/app.config';
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
  className?: string;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ 
  timeRange, 
  className = '' 
}) => {
  const { token } = useAuth();
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

      // Fetch trend data
      const trendResponse = await fetch(getApiUrl('/platform-admin/analytics/trends'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString(),
          granularity: 'daily'
        })
      });

      if (trendResponse.ok) {
        const trendData = await trendResponse.json();
        setChartData(trendData.dailyMetrics || []);
        setGrowthData(trendData.growthTrends || []);
      }

      // Fetch geographic data
      const geoResponse = await fetch(getApiUrl('/platform-admin/analytics/geographic'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString()
        })
      });

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        setGeographicData(geoData.regions || []);
      }

      // Fetch feature usage data
      const featureResponse = await fetch(getApiUrl('/platform-admin/analytics/features'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: timeRange.startDate.toISOString(),
          endDate: timeRange.endDate.toISOString()
        })
      });

      if (featureResponse.ok) {
        const featureData = await featureResponse.json();
        setFeatureData(featureData.features || []);
      }

    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Set mock data for development/testing
  const setMockData = () => {
    const mockChartData: ChartDataPoint[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 1000) + 5000,
        bookings: Math.floor(Math.random() * 500) + 1000,
        revenue: Math.floor(Math.random() * 50000) + 100000,
        companies: Math.floor(Math.random() * 50) + 200
      };
    });

    const mockGrowthData: GrowthTrendData[] = [
      { period: 'Week 1', userGrowth: 12.5, bookingGrowth: 8.3, revenueGrowth: 15.2 },
      { period: 'Week 2', userGrowth: 15.8, bookingGrowth: 12.1, revenueGrowth: 18.7 },
      { period: 'Week 3', userGrowth: 9.2, bookingGrowth: 6.8, revenueGrowth: 11.4 },
      { period: 'Week 4', userGrowth: 18.6, bookingGrowth: 22.3, revenueGrowth: 25.1 }
    ];

    const mockGeographicData: GeographicData[] = [
      { region: 'Oslo', userCount: 2500, bookingCount: 1200, revenue: 450000, percentage: 35 },
      { region: 'Bergen', userCount: 1800, bookingCount: 850, revenue: 320000, percentage: 25 },
      { region: 'Trondheim', userCount: 1200, bookingCount: 580, revenue: 210000, percentage: 17 },
      { region: 'Stavanger', userCount: 900, bookingCount: 420, revenue: 160000, percentage: 13 },
      { region: 'Other', userCount: 600, bookingCount: 280, revenue: 110000, percentage: 10 }
    ];

    const mockFeatureData: FeatureUsageData[] = [
      { feature: 'Instant Booking', adoptionRate: 78.5, activeUsers: 3920, totalUsage: 15680 },
      { feature: 'Recurring Bookings', adoptionRate: 45.2, activeUsers: 2260, totalUsage: 6780 },
      { feature: 'Without Driver', adoptionRate: 62.8, activeUsers: 3140, totalUsage: 9420 },
      { feature: 'Hourly Bookings', adoptionRate: 34.6, activeUsers: 1730, totalUsage: 5190 }
    ];

    setChartData(mockChartData);
    setGrowthData(mockGrowthData);
    setGeographicData(mockGeographicData);
    setFeatureData(mockFeatureData);
  };

  useEffect(() => {
    fetchChartData();
  }, [timeRange]);

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
            <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>
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
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
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
                  label={({ region, percentage }) => `${region} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="userCount"
                >
                  {geographicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Users']}
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