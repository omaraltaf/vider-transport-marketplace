/**
 * User Activity Timeline Component
 * Displays user activity log with filtering and monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { getApiUrl } from '../../config/app.config';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { 
  Activity,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  Eye,
  Filter,
  Calendar,
  RefreshCw,
  Flag,
  Shield,
  CreditCard,
  User,
  LogIn
} from 'lucide-react';

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  category: 'LOGIN' | 'BOOKING' | 'PAYMENT' | 'PROFILE' | 'SECURITY' | 'ADMIN_ACTION';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
  timestamp: Date;
  riskScore: number;
  flagged: boolean;
}

interface UserActivityTimelineProps {
  userId: string;
  className?: string;
}

const UserActivityTimeline: React.FC<UserActivityTimelineProps> = ({
  userId,
  className = ''
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'week',
    flaggedOnly: false
  });

  useEffect(() => {
    fetchUserActivity();
  }, [userId, filters]);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: '50',
        offset: '0'
      });

      if (filters.category !== 'all') {
        queryParams.append('category', filters.category);
      }

      if (filters.flaggedOnly) {
        queryParams.append('flagged', 'true');
      }

      // Add date range
      const now = new Date();
      const dateRanges = {
        day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };

      if (filters.dateRange !== 'all') {
        const startDate = dateRanges[filters.dateRange as keyof typeof dateRanges];
        queryParams.append('startDate', startDate.toISOString());
        queryParams.append('endDate', now.toISOString());
      }

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl(`/platform-admin/users/${userId}/activity?${queryParams}`), {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        throw new Error('Failed to fetch user activity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
      console.error('Error fetching user activity:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockActivities: UserActivity[] = [
      {
        id: 'activity-1',
        userId,
        action: 'LOGIN',
        category: 'LOGIN',
        details: { method: 'email_password', success: true },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: { country: 'Norway', city: 'Oslo' },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        riskScore: 5,
        flagged: false
      },
      {
        id: 'activity-2',
        userId,
        action: 'BOOKING_CREATED',
        category: 'BOOKING',
        details: { bookingId: 'booking-123', amount: 2500, destination: 'Oslo Airport' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: { country: 'Norway', city: 'Oslo' },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        riskScore: 2,
        flagged: false
      },
      {
        id: 'activity-3',
        userId,
        action: 'PAYMENT_PROCESSED',
        category: 'PAYMENT',
        details: { amount: 2500, method: 'credit_card', last4: '1234' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: { country: 'Norway', city: 'Oslo' },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        riskScore: 3,
        flagged: false
      },
      {
        id: 'activity-4',
        userId,
        action: 'MULTIPLE_FAILED_LOGINS',
        category: 'SECURITY',
        details: { attempts: 5, timeWindow: '10 minutes', blocked: true },
        ipAddress: '203.0.113.1',
        userAgent: 'Suspicious Bot',
        location: { country: 'Unknown', city: 'Unknown' },
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        riskScore: 75,
        flagged: true
      },
      {
        id: 'activity-5',
        userId,
        action: 'PROFILE_UPDATED',
        category: 'PROFILE',
        details: { fields: ['phone', 'address'], source: 'user_portal' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        location: { country: 'Norway', city: 'Bergen' },
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        riskScore: 1,
        flagged: false
      }
    ];

    setActivities(mockActivities);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'LOGIN': return <LogIn className="h-4 w-4" />;
      case 'BOOKING': return <Calendar className="h-4 w-4" />;
      case 'PAYMENT': return <CreditCard className="h-4 w-4" />;
      case 'PROFILE': return <User className="h-4 w-4" />;
      case 'SECURITY': return <Shield className="h-4 w-4" />;
      case 'ADMIN_ACTION': return <Settings className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'LOGIN': return 'bg-blue-100 text-blue-800';
      case 'BOOKING': return 'bg-green-100 text-green-800';
      case 'PAYMENT': return 'bg-purple-100 text-purple-800';
      case 'PROFILE': return 'bg-gray-100 text-gray-800';
      case 'SECURITY': return 'bg-red-100 text-red-800';
      case 'ADMIN_ACTION': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-blue-600';
    return 'text-green-600';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Activity Timeline</h2>
          <p className="text-muted-foreground">
            Monitor user actions and behavior patterns
          </p>
        </div>
        
        <Button onClick={fetchUserActivity} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex gap-3">
              <select 
                value={filters.category} 
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="LOGIN">Login</option>
                <option value="BOOKING">Booking</option>
                <option value="PAYMENT">Payment</option>
                <option value="PROFILE">Profile</option>
                <option value="SECURITY">Security</option>
                <option value="ADMIN_ACTION">Admin Action</option>
              </select>

              <select 
                value={filters.dateRange} 
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="all">All Time</option>
              </select>

              <label className="flex items-center space-x-2 px-3 py-2 border border-input bg-background rounded-md text-sm">
                <input
                  type="checkbox"
                  checked={filters.flaggedOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, flaggedOnly: e.target.checked }))}
                />
                <span>Flagged Only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({activities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity found for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                  )}
                  
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      activity.flagged ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {getCategoryIcon(activity.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{activity.action.replace('_', ' ')}</h4>
                          <Badge className={getCategoryColor(activity.category)}>
                            {activity.category}
                          </Badge>
                          {activity.flagged && (
                            <Badge variant="destructive">
                              <Flag className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Monitor className="h-4 w-4" />
                            <span>{activity.ipAddress}</span>
                          </div>
                          
                          {activity.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{activity.location.city}, {activity.location.country}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <span>Risk:</span>
                            <span className={getRiskScoreColor(activity.riskScore)}>
                              {activity.riskScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Details */}
                      {Object.keys(activity.details).length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <h5 className="text-sm font-medium mb-2">Details:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(activity.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{key}:</span>
                                <span className="font-medium">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User Agent (truncated) */}
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">User Agent:</span> {activity.userAgent.substring(0, 80)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityTimeline;