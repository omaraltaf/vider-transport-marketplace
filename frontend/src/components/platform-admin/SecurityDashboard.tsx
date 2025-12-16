import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Users, 
  Activity, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  Search,
  Filter
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: Date;
  riskScore: number;
  indicators: string[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: { [key: string]: number };
  eventsByThreatLevel: { [key: string]: number };
  openAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  topThreats: { type: string; count: number; avgRiskScore: number }[];
  riskTrend: { date: string; riskScore: number }[];
  suspiciousUsers: any[];
}

export const SecurityDashboard: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time updates
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch security events
      const eventsResponse = await fetch('/api/security/events');
      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp)
      })));

      // Fetch security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };
  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'INVESTIGATING':
        return 'bg-blue-100 text-blue-800';
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'FALSE_POSITIVE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Shield className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Security Dashboard</h2>
          <p className="text-gray-600">Monitor security events and threat intelligence</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchSecurityData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>
      {/* Security Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalEvents}</p>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Alerts</p>
                <p className="text-2xl font-bold text-red-600">{metrics.openAlerts}</p>
                <p className="text-sm text-gray-500">Require attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-green-600">{metrics.averageResolutionTime.toFixed(1)}h</p>
                <p className="text-sm text-gray-500">Response time</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspicious Users</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.suspiciousUsers.length}</p>
                <p className="text-sm text-gray-500">Under monitoring</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="users">Suspicious Users</TabsTrigger>
          <TabsTrigger value="trends">Risk Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="space-y-4">
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getThreatLevelIcon(event.threatLevel)}
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <Badge className={getThreatLevelColor(event.threatLevel)}>
                        {event.threatLevel}
                      </Badge>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{event.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Type:</span> {event.type}
                      </div>
                      <div>
                        <span className="font-medium">Risk Score:</span> {event.riskScore}/100
                      </div>
                      <div>
                        <span className="font-medium">Time:</span> {event.timestamp.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">User:</span> {event.userEmail || 'N/A'}
                      </div>
                    </div>

                    {event.indicators.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-600">Indicators:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.indicators.map((indicator, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {event.status === 'OPEN' && (
                      <Button size="sm">
                        Investigate
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="threats" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Top Threats</h4>
                <div className="space-y-3">
                  {metrics.topThreats.map((threat, index) => (
                    <div key={threat.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{threat.type}</p>
                          <p className="text-xs text-gray-500">Avg Risk: {threat.avgRiskScore.toFixed(1)}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{threat.count} events</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Events by Threat Level</h4>
                <div className="space-y-3">
                  {Object.entries(metrics.eventsByThreatLevel).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getThreatLevelColor(level)}>
                          {getThreatLevelIcon(level)}
                          <span className="ml-1">{level}</span>
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600">{count} events</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {metrics && metrics.suspiciousUsers.length > 0 ? (
            <div className="space-y-4">
              {metrics.suspiciousUsers.map((user: any) => (
                <Card key={user.userId} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-gray-900">{user.userEmail}</h4>
                        <Badge className="bg-orange-100 text-orange-800">
                          Risk: {user.riskScore.toFixed(0)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{user.activityType}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Events:</span> {user.occurrenceCount}
                        </div>
                        <div>
                          <span className="font-medium">First Seen:</span> {new Date(user.firstSeen).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Last Seen:</span> {new Date(user.lastSeen).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-600">Risk Indicators:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.indicators.slice(0, 3).map((indicator: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                          {user.indicators.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.indicators.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Investigate
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No suspicious users detected</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {metrics && (
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Risk Trend (Last 30 Days)</h4>
              <div className="space-y-2">
                {metrics.riskTrend.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, day.riskScore)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{day.riskScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};