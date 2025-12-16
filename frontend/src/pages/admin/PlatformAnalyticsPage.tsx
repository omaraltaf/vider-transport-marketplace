/**
 * Platform Analytics Page
 * Main page for platform-wide analytics and reporting
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Globe, 
  Settings, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Import our analytics components
import PlatformAnalyticsDashboard from '../../components/platform-admin/PlatformAnalyticsDashboard';
import AnalyticsCharts from '../../components/platform-admin/AnalyticsCharts';
import AnalyticsFilters from '../../components/platform-admin/AnalyticsFilters';

interface ActiveFilters {
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
}

const PlatformAnalyticsPage: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    timeRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last 30 days'
    },
    regions: [],
    companyTypes: [],
    userSegments: [],
    features: [],
    searchQuery: ''
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle filter changes
  const handleFiltersChange = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    // Trigger data refresh when filters change
    handleRefresh();
  };

  // Handle data refresh
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Trigger refresh in child components by updating a key or state
      // This would typically involve re-fetching data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk export
  const handleBulkExport = async (format: 'csv' | 'excel' | 'json') => {
    try {
      const response = await fetch('/api/platform-admin/analytics/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          format,
          filters: activeFilters,
          includeCharts: true,
          includeRawData: true
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
      a.download = `platform-analytics-complete-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Bulk export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    return (
      activeFilters.regions.length +
      activeFilters.companyTypes.length +
      activeFilters.userSegments.length +
      activeFilters.features.length +
      (activeFilters.searchQuery ? 1 : 0)
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with Filters */}
      {sidebarOpen && (
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analytics Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <AnalyticsFilters 
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!sidebarOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Filters
                    {getActiveFilterCount() > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {getActiveFilterCount()}
                      </Badge>
                    )}
                  </Button>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold">Platform Analytics</h1>
                  <p className="text-muted-foreground">
                    {activeFilters.timeRange.label} • 
                    {getActiveFilterCount() > 0 && ` ${getActiveFilterCount()} filters applied`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkExport('excel')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="ml-auto"
                >
                  ×
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="trends" className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trends
                </TabsTrigger>
                <TabsTrigger value="geographic" className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Geographic
                </TabsTrigger>
                <TabsTrigger value="detailed" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Detailed
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <PlatformAnalyticsDashboard />
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Trends & Forecasting</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AnalyticsCharts timeRange={activeFilters.timeRange} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Geographic Tab */}
              <TabsContent value="geographic" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Regional Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Interactive regional performance maps and heat maps will be displayed here.
                        This includes usage patterns by region, growth rates, and market penetration.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Market Expansion Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Analysis of potential expansion markets based on demographic data,
                        competition analysis, and market demand indicators.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Detailed Tab */}
              <TabsContent value="detailed" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">User Cohort Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              Detailed user retention and behavior analysis by cohort.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Revenue Attribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              Revenue breakdown by source, feature, and user segment.
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Feature Impact Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">
                              Impact of feature toggles on user behavior and revenue.
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Applied Filters Summary</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Time Range:</strong> {activeFilters.timeRange.label}
                            </div>
                            <div>
                              <strong>Regions:</strong> {activeFilters.regions.length > 0 ? activeFilters.regions.join(', ') : 'All'}
                            </div>
                            <div>
                              <strong>Company Types:</strong> {activeFilters.companyTypes.length > 0 ? activeFilters.companyTypes.join(', ') : 'All'}
                            </div>
                            <div>
                              <strong>User Segments:</strong> {activeFilters.userSegments.length > 0 ? activeFilters.userSegments.join(', ') : 'All'}
                            </div>
                          </div>
                          {activeFilters.searchQuery && (
                            <div className="mt-2 text-sm">
                              <strong>Search:</strong> "{activeFilters.searchQuery}"
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalyticsPage;