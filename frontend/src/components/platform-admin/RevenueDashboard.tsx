/**
 * Revenue Dashboard Component
 * Main dashboard for financial analytics and revenue management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
// Using native select elements for simplicity
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Download,
  Calculator
} from 'lucide-react';
// Temporarily disabled Recharts due to React hooks conflict
// import {
//   AreaChart,
//   Area,
//   BarChart,
//   Bar,
//   PieChart as RechartsPieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer
// } from 'recharts';

interface RevenueSummary {
  totalRevenue: number;
  totalCommissions: number;
  netRevenue: number;
  averageBookingValue: number;
  totalBookings: number;
  revenueGrowthRate: number;
  commissionRate: number;
  profitMargin: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

interface RevenueTrend {
  date: string;
  revenue: number;
  commissions: number;
  netRevenue: number;
  bookingCount: number;
  averageBookingValue: number;
}

interface RevenueForecast {
  period: string;
  forecastedRevenue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  growthRate: number;
}

interface ProfitMarginAnalysis {
  segment: string;
  revenue: number;
  costs: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  bookingCount: number;
}

interface RevenueBreakdown {
  byRegion: Array<{
    region: string;
    revenue: number;
    percentage: number;
    bookingCount: number;
  }>;
  byCompanyType: Array<{
    companyType: string;
    revenue: number;
    percentage: number;
    bookingCount: number;
  }>;
  byBookingType: Array<{
    bookingType: string;
    revenue: number;
    percentage: number;
    bookingCount: number;
  }>;
}

interface RevenueDashboardProps {
  className?: string;
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ className = '' }) => {
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revenueForecasts, setRevenueForecasts] = useState<RevenueForecast[]>([]);
  const [profitMargins, setProfitMargins] = useState<ProfitMarginAnalysis[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedSegment, setSelectedSegment] = useState('region');
  const [activeTab, setActiveTab] = useState('trends');

  // Time range options
  const timeRanges = {
    '7d': { days: 7, label: 'Last 7 days' },
    '30d': { days: 30, label: 'Last 30 days' },
    '90d': { days: 90, label: 'Last 90 days' },
    '1y': { days: 365, label: 'Last year' }
  };

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Fetch revenue data
  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRanges[selectedTimeRange as keyof typeof timeRanges].days);

      // Fetch revenue summary
      const summaryResponse = await fetch(
        `/api/platform-admin/financial/revenue/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setRevenueSummary(summaryData.data);
      }

      // Revenue trends data is handled by mock data for now

      // Fetch forecasts
      const forecastsResponse = await fetch(
        `/api/platform-admin/financial/revenue/forecasts?historicalMonths=6&forecastMonths=3`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (forecastsResponse.ok) {
        const forecastsData = await forecastsResponse.json();
        setRevenueForecasts(forecastsData.data || []);
      }

      // Fetch profit margins
      const marginsResponse = await fetch(
        `/api/platform-admin/financial/profit-margins?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&segmentBy=${selectedSegment}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (marginsResponse.ok) {
        const marginsData = await marginsResponse.json();
        setProfitMargins(marginsData.data || []);
      }

      // Fetch revenue breakdown
      const breakdownResponse = await fetch(
        `/api/platform-admin/financial/revenue/breakdown?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (breakdownResponse.ok) {
        const breakdownData = await breakdownResponse.json();
        setRevenueBreakdown(breakdownData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      console.error('Error fetching revenue data:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Set mock data for development with consistent commission rate
  const setMockData = () => {
    const totalRevenue = 2500000;
    const totalCommissions = totalRevenue * 0.05; // 5% commission rate (consistent)
    const netRevenue = totalRevenue - totalCommissions;
    
    setRevenueSummary({
      totalRevenue,
      totalCommissions,
      netRevenue,
      averageBookingValue: 2500,
      totalBookings: 1000,
      revenueGrowthRate: 15.2,
      commissionRate: 5.0, // Consistent 5% commission rate
      profitMargin: (netRevenue / totalRevenue) * 100,
      period: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      }
    });

    // Revenue trends mock data removed for now

    setRevenueForecasts([
      { period: '2024-01', forecastedRevenue: 2650000, confidenceInterval: { lower: 2400000, upper: 2900000 }, growthRate: 6.0 },
      { period: '2024-02', forecastedRevenue: 2800000, confidenceInterval: { lower: 2550000, upper: 3050000 }, growthRate: 5.7 },
      { period: '2024-03', forecastedRevenue: 2950000, confidenceInterval: { lower: 2700000, upper: 3200000 }, growthRate: 5.4 }
    ]);

    setProfitMargins([
      { segment: 'Oslo', revenue: 875000, costs: 525000, grossProfit: 350000, grossMargin: 40.0, netProfit: 280000, netMargin: 32.0, bookingCount: 350 },
      { segment: 'Bergen', revenue: 625000, costs: 400000, grossProfit: 225000, grossMargin: 36.0, netProfit: 180000, netMargin: 28.8, bookingCount: 250 },
      { segment: 'Trondheim', revenue: 425000, costs: 280000, grossProfit: 145000, grossMargin: 34.1, netProfit: 116000, netMargin: 27.3, bookingCount: 170 },
      { segment: 'Stavanger', revenue: 325000, costs: 215000, grossProfit: 110000, grossMargin: 33.8, netProfit: 88000, netMargin: 27.1, bookingCount: 130 }
    ]);

    setRevenueBreakdown({
      byRegion: [
        { region: 'Oslo', revenue: 875000, percentage: 35, bookingCount: 350 },
        { region: 'Bergen', revenue: 625000, percentage: 25, bookingCount: 250 },
        { region: 'Trondheim', revenue: 425000, percentage: 17, bookingCount: 170 },
        { region: 'Stavanger', revenue: 325000, percentage: 13, bookingCount: 130 },
        { region: 'Other', revenue: 250000, percentage: 10, bookingCount: 100 }
      ],
      byCompanyType: [
        { companyType: 'Logistics', revenue: 1000000, percentage: 40, bookingCount: 400 },
        { companyType: 'Transport', revenue: 750000, percentage: 30, bookingCount: 300 },
        { companyType: 'Delivery', revenue: 500000, percentage: 20, bookingCount: 200 },
        { companyType: 'Moving', revenue: 250000, percentage: 10, bookingCount: 100 }
      ],
      byBookingType: [
        { bookingType: 'Standard', revenue: 1250000, percentage: 50, bookingCount: 500 },
        { bookingType: 'Express', revenue: 625000, percentage: 25, bookingCount: 250 },
        { bookingType: 'Recurring', revenue: 375000, percentage: 15, bookingCount: 150 },
        { bookingType: 'Without Driver', revenue: 250000, percentage: 10, bookingCount: 100 }
      ]
    });
  };

  // Handle time range change
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
  };

  // Handle segment change
  const handleSegmentChange = (value: string) => {
    setSelectedSegment(value);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Format number with suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Custom tooltip for charts (temporarily disabled)
  // const CustomTooltip = ({ active, payload, label }: any) => {
  //   if (active && payload && payload.length) {
  //     return (
  //       <div className="bg-white p-3 border rounded-lg shadow-lg">
  //         <p className="font-medium">{label}</p>
  //         {payload.map((entry: any, index: number) => (
  //           <p key={index} style={{ color: entry.color }}>
  //             {entry.name}: {formatCurrency(entry.value)}
  //           </p>
  //         ))}
  //       </div>
  //     );
  //   }
  //   return null;
  // };

  useEffect(() => {
    fetchRevenueData();
  }, [selectedTimeRange, selectedSegment]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading revenue data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchRevenueData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground">
            Financial performance and revenue analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="w-40 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            {Object.entries(timeRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={fetchRevenueData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {revenueSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueSummary.totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {revenueSummary.revenueGrowthRate >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={revenueSummary.revenueGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(revenueSummary.revenueGrowthRate)}
                </span>
                <span className="ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          {/* Net Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueSummary.netRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Profit margin:</span>
                <Badge variant="secondary" className="text-xs">
                  {revenueSummary.profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Commissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commissions</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueSummary.totalCommissions)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Rate:</span>
                <Badge variant="secondary" className="text-xs">
                  {revenueSummary.commissionRate.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Average Booking Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Booking</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueSummary.averageBookingValue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Total bookings:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatNumber(revenueSummary.totalBookings)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="margins">Profit Margins</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        {/* Revenue Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Revenue Trends Chart</h3>
                  <p className="text-muted-foreground mb-4">
                    Interactive revenue trends visualization
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                    <div className="p-3 bg-blue-50 rounded">
                      <div className="font-medium text-blue-900">Total Revenue</div>
                      <div className="text-blue-600">{formatCurrency(2500000)}</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded">
                      <div className="font-medium text-amber-900">Commissions</div>
                      <div className="text-amber-600">{formatCurrency(375000)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Forecasts */}
        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecasts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueForecasts.map((forecast) => (
                  <div key={forecast.period} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{forecast.period}</h4>
                      <p className="text-sm text-muted-foreground">
                        Growth: {formatPercentage(forecast.growthRate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(forecast.forecastedRevenue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(forecast.confidenceInterval.lower)} - {formatCurrency(forecast.confidenceInterval.upper)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Margins */}
        <TabsContent value="margins" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Profit Margin Analysis</h3>
            <select 
              value={selectedSegment} 
              onChange={(e) => handleSegmentChange(e.target.value)}
              className="w-40 h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="region">By Region</option>
              <option value="companyType">By Company Type</option>
              <option value="bookingType">By Booking Type</option>
            </select>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Profit Margin Chart</h3>
                  <p className="text-muted-foreground mb-4">
                    Profit margin analysis by {selectedSegment}
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto text-sm">
                    {profitMargins.slice(0, 3).map((margin) => (
                      <div key={margin.segment} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{margin.segment}</span>
                        <div className="text-right">
                          <div className="text-blue-600">{margin.grossMargin.toFixed(1)}% gross</div>
                          <div className="text-green-600">{margin.netMargin.toFixed(1)}% net</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Breakdown */}
        <TabsContent value="breakdown" className="space-y-4">
          {revenueBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Region */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Revenue by Region</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueBreakdown.byRegion.map((item, index) => (
                      <div key={item.region} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm font-medium">{item.region}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatCurrency(item.revenue)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Company Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Revenue by Company Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueBreakdown.byCompanyType.map((item, index) => (
                      <div key={item.companyType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm font-medium">{item.companyType}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatCurrency(item.revenue)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* By Booking Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Revenue by Booking Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueBreakdown.byBookingType.map((item, index) => (
                      <div key={item.bookingType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm font-medium">{item.bookingType}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatCurrency(item.revenue)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevenueDashboard;