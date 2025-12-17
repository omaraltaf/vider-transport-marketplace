/**
 * Analytics Filters Component
 * Time range selection and filtering capabilities for analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  Calendar as CalendarIcon,
  Filter,
  X,
  Search,
  MapPin,
  Building2,
  Users,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface TimeRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface FilterOptions {
  regions: string[];
  companyTypes: string[];
  userSegments: string[];
  featureFlags: string[];
}

interface ActiveFilters {
  timeRange: TimeRange;
  regions: string[];
  companyTypes: string[];
  userSegments: string[];
  features: string[];
  searchQuery: string;
}

interface AnalyticsFiltersProps {
  onFiltersChange: (filters: ActiveFilters) => void;
  className?: string;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  onFiltersChange,
  className = ''
}) => {
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

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    regions: [],
    companyTypes: [],
    userSegments: [],
    featureFlags: []
  });

  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  const [showCustomDate, setShowCustomDate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Predefined time ranges
  const presetTimeRanges: Record<string, TimeRange> = {
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
    '6m': {
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last 6 months'
    },
    '1y': {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      label: 'Last year'
    },
    'custom': {
      startDate: new Date(),
      endDate: new Date(),
      label: 'Custom range'
    }
  };

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/platform-admin/analytics/filter-options', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      } else {
        // Set mock data for development
        setFilterOptions({
          regions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand'],
          companyTypes: ['Logistics', 'Transport', 'Delivery', 'Moving', 'Freight'],
          userSegments: ['Enterprise', 'SMB', 'Individual', 'Government'],
          featureFlags: ['instant-booking', 'recurring-bookings', 'without-driver', 'hourly-bookings']
        });
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Set mock data on error
      setFilterOptions({
        regions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand'],
        companyTypes: ['Logistics', 'Transport', 'Delivery', 'Moving', 'Freight'],
        userSegments: ['Enterprise', 'SMB', 'Individual', 'Government'],
        featureFlags: ['instant-booking', 'recurring-bookings', 'without-driver', 'hourly-bookings']
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (rangeKey: string) => {
    if (rangeKey === 'custom') {
      setShowCustomDate(true);
      return;
    }

    const newTimeRange = presetTimeRanges[rangeKey];
    const updatedFilters = {
      ...activeFilters,
      timeRange: newTimeRange
    };
    
    setActiveFilters(updatedFilters);
    // Ensure the callback is called with properly formatted dates
    onFiltersChange({
      ...updatedFilters,
      timeRange: {
        ...newTimeRange,
        startDate: new Date(newTimeRange.startDate),
        endDate: new Date(newTimeRange.endDate)
      }
    });
    setShowCustomDate(false);
  };

  // Handle custom date range
  const handleCustomDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      const newTimeRange: TimeRange = {
        startDate: customDateRange.from,
        endDate: customDateRange.to,
        label: `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd')}`
      };

      const updatedFilters = {
        ...activeFilters,
        timeRange: newTimeRange
      };

      setActiveFilters(updatedFilters);
      // Ensure dates are properly formatted for API calls
      onFiltersChange({
        ...updatedFilters,
        timeRange: {
          ...newTimeRange,
          startDate: new Date(customDateRange.from),
          endDate: new Date(customDateRange.to)
        }
      });
      setShowCustomDate(false);
    }
  };

  // Handle filter toggle
  const handleFilterToggle = (
    filterType: 'regions' | 'companyTypes' | 'userSegments' | 'features',
    value: string
  ) => {
    const currentValues = activeFilters[filterType];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    const updatedFilters = {
      ...activeFilters,
      [filterType]: newValues
    };

    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // Handle search query change
  const handleSearchChange = (query: string) => {
    const updatedFilters = {
      ...activeFilters,
      searchQuery: query
    };

    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters: ActiveFilters = {
      timeRange: presetTimeRanges['30d'],
      regions: [],
      companyTypes: [],
      userSegments: [],
      features: [],
      searchQuery: ''
    };

    setActiveFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setShowCustomDate(false);
  };

  // Remove specific filter
  const removeFilter = (filterType: keyof ActiveFilters, value?: string) => {
    if (filterType === 'searchQuery') {
      handleSearchChange('');
    } else if (filterType === 'timeRange') {
      handleTimeRangeChange('30d');
    } else if (value && Array.isArray(activeFilters[filterType])) {
      handleFilterToggle(filterType as any, value);
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

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    onFiltersChange(activeFilters);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        
        {getActiveFilterCount() > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies, users, or bookings..."
              value={activeFilters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Time Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Time Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(presetTimeRanges).filter(([key]) => key !== 'custom').map(([key, range]) => (
              <Button
                key={key}
                variant={activeFilters.timeRange.label === range.label ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(key)}
                className="justify-start"
              >
                {range.label}
              </Button>
            ))}
          </div>

          <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Select Date Range</Label>
                  <Calendar
                    mode="range"
                    selected={{
                      from: customDateRange.from,
                      to: customDateRange.to
                    }}
                    onSelect={(range) => setCustomDateRange({
                      from: range?.from,
                      to: range?.to
                    })}
                    numberOfMonths={2}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={handleCustomDateRange}
                    disabled={!customDateRange.from || !customDateRange.to}
                  >
                    Apply
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCustomDate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Geographic Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Regions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterOptions.regions.map((region) => (
              <div key={region} className="flex items-center space-x-2">
                <Checkbox
                  id={`region-${region}`}
                  checked={activeFilters.regions.includes(region)}
                  onCheckedChange={() => handleFilterToggle('regions', region)}
                />
                <Label htmlFor={`region-${region}`} className="text-sm">
                  {region}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Type Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            Company Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterOptions.companyTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`company-${type}`}
                  checked={activeFilters.companyTypes.includes(type)}
                  onCheckedChange={() => handleFilterToggle('companyTypes', type)}
                />
                <Label htmlFor={`company-${type}`} className="text-sm">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Segment Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Users className="h-4 w-4 mr-2" />
            User Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterOptions.userSegments.map((segment) => (
              <div key={segment} className="flex items-center space-x-2">
                <Checkbox
                  id={`segment-${segment}`}
                  checked={activeFilters.userSegments.includes(segment)}
                  onCheckedChange={() => handleFilterToggle('userSegments', segment)}
                />
                <Label htmlFor={`segment-${segment}`} className="text-sm">
                  {segment}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* Time Range Badge */}
              {activeFilters.timeRange.label !== 'Last 30 days' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {activeFilters.timeRange.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('timeRange')}
                  />
                </Badge>
              )}

              {/* Search Query Badge */}
              {activeFilters.searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {activeFilters.searchQuery}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('searchQuery')}
                  />
                </Badge>
              )}

              {/* Region Badges */}
              {activeFilters.regions.map((region) => (
                <Badge key={region} variant="secondary" className="flex items-center gap-1">
                  {region}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('regions', region)}
                  />
                </Badge>
              ))}

              {/* Company Type Badges */}
              {activeFilters.companyTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('companyTypes', type)}
                  />
                </Badge>
              ))}

              {/* User Segment Badges */}
              {activeFilters.userSegments.map((segment) => (
                <Badge key={segment} variant="secondary" className="flex items-center gap-1">
                  {segment}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('userSegments', segment)}
                  />
                </Badge>
              ))}

              {/* Feature Badges */}
              {activeFilters.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFilter('features', feature)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsFilters;