/**
 * Fraud Detection Dashboard Component
 * Interface for managing fraud alerts and investigation workflows
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Shield,
  AlertTriangle,
  Eye,
  Search,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Flag
} from 'lucide-react';

interface FraudAlert {
  id: string;
  type: 'PAYMENT_FRAUD' | 'IDENTITY_FRAUD' | 'BOOKING_FRAUD' | 'ACCOUNT_TAKEOVER' | 'SYNTHETIC_IDENTITY' | 'CHARGEBACK_FRAUD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE' | 'CONFIRMED_FRAUD';
  userId?: string;
  companyId?: string;
  bookingId?: string;
  transactionId?: string;
  description: string;
  riskScore: number;
  detectedAt: Date;
  assignedTo?: string;
  investigatedBy?: string;
  resolvedAt?: Date;
}

interface FraudStats {
  totalAlerts: number;
  openAlerts: number;
  resolvedToday: number;
  confirmedFraudRate: number;
  falsePositiveRate: number;
  avgInvestigationTime: number;
  preventedLosses: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
}

const FraudDetectionDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'OPEN',
    type: 'all',
    severity: 'all',
    assignedTo: 'all'
  });
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFraudData();
  }, [filters]);

  const fetchFraudData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsResponse, statsResponse] = await Promise.all([
        fetch(`/api/platform-admin/moderation/fraud/alerts?${new URLSearchParams({
          ...filters,
          limit: '50',
          offset: '0'
        })}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }),
        fetch('/api/platform-admin/moderation/fraud/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        })
      ]);

      if (alertsResponse.ok && statsResponse.ok) {
        const alertsData = await alertsResponse.json();
        const statsData = await statsResponse.json();
        
        setAlerts(alertsData.data || []);
        setStats(statsData.data);
      } else {
        throw new Error('Failed to fetch fraud data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fraud data');
      console.error('Error fetching fraud data:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockAlerts: FraudAlert[] = [
      {
        id: 'alert-1',
        type: 'PAYMENT_FRAUD',
        severity: 'HIGH',
        status: 'OPEN',
        userId: 'user-123',
        transactionId: 'txn-456',
        description: 'Multiple payment cards used in rapid succession',
        riskScore: 85,
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        assignedTo: 'fraud-analyst-1'
      },
      {
        id: 'alert-2',
        type: 'ACCOUNT_TAKEOVER',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        userId: 'user-789',
        description: 'Login from new country with immediate high-value transactions',
        riskScore: 95,
        detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        assignedTo: 'fraud-team-lead',
        investigatedBy: 'fraud-team-lead'
      },
      {
        id: 'alert-3',
        type: 'BOOKING_FRAUD',
        severity: 'MEDIUM',
        status: 'OPEN',
        userId: 'user-456',
        bookingId: 'booking-789',
        description: 'Unusual booking pattern detected',
        riskScore: 65,
        detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];

    const mockStats: FraudStats = {
      totalAlerts: 456,
      openAlerts: 23,
      resolvedToday: 12,
      confirmedFraudRate: 0.15,
      falsePositiveRate: 0.25,
      avgInvestigationTime: 180,
      preventedLosses: 125000,
      alertsByType: {
        'PAYMENT_FRAUD': 156,
        'IDENTITY_FRAUD': 89,
        'BOOKING_FRAUD': 78,
        'ACCOUNT_TAKEOVER': 67,
        'SYNTHETIC_IDENTITY': 45,
        'CHARGEBACK_FRAUD': 21
      },
      alertsBySeverity: {
        'LOW': 189,
        'MEDIUM': 145,
        'HIGH': 89,
        'CRITICAL': 33
      }
    };

    setAlerts(mockAlerts);
    setStats(mockStats);
  };

  const handleInvestigate = async (alertId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/moderation/fraud/${alertId}/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          notes: 'Investigation started from dashboard'
        })
      });

      if (response.ok) {
        await fetchFraudData();
      } else {
        throw new Error('Failed to start investigation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start investigation');
    }
  };

  const handleResolve = async (alertId: string, resolution: 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE', notes: string) => {
    try {
      const response = await fetch(`/api/platform-admin/moderation/fraud/${alertId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          resolution,
          notes,
          actions: resolution === 'CONFIRMED_FRAUD' ? ['FREEZE_ACCOUNT'] : []
        })
      });

      if (response.ok) {
        await fetchFraudData();
        setSelectedAlert(null);
      } else {
        throw new Error('Failed to resolve alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'INVESTIGATING': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'FALSE_POSITIVE': return 'bg-gray-100 text-gray-800';
      case 'CONFIRMED_FRAUD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_FRAUD': return <DollarSign className="h-4 w-4" />;
      case 'IDENTITY_FRAUD': return <Users className="h-4 w-4" />;
      case 'ACCOUNT_TAKEOVER': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = searchQuery === '' || 
      alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.userId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading fraud detection data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fraud Detection Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and investigate fraud alerts and suspicious activities
          </p>
        </div>
        
        <Button onClick={fetchFraudData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts.toLocaleString()}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Flag className="h-3 w-3" />
                <span>{stats.openAlerts} open</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed Fraud Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.confirmedFraudRate * 100).toFixed(1)}%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{stats.resolvedToday} resolved today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prevented Losses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.preventedLosses / 1000).toFixed(0)}k NOK</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>This month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Investigation Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgInvestigationTime}m</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Average resolution</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts by ID, user, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="all">All Status</option>
              </select>

              <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="PAYMENT_FRAUD">Payment Fraud</option>
                <option value="IDENTITY_FRAUD">Identity Fraud</option>
                <option value="BOOKING_FRAUD">Booking Fraud</option>
                <option value="ACCOUNT_TAKEOVER">Account Takeover</option>
              </select>

              <select 
                value={filters.severity} 
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Severity</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Fraud Alerts ({filteredAlerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fraud alerts found for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{alert.type.replace('_', ' ')}</h4>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge className={getStatusColor(alert.status)}>
                          {alert.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(alert.detectedAt)}</span>
                        </div>
                        <span>Risk Score: <span className="font-medium text-red-600">{alert.riskScore}</span></span>
                        {alert.userId && <span>User: {alert.userId}</span>}
                        {alert.assignedTo && <span>Assigned: {alert.assignedTo}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {alert.status === 'OPEN' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleInvestigate(alert.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Investigate
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fraud Alert Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Alert ID</label>
                  <p className="text-sm text-muted-foreground">{selectedAlert.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedAlert.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Badge className={getSeverityColor(selectedAlert.severity)}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Score</label>
                  <p className="text-sm font-medium text-red-600">{selectedAlert.riskScore}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Detected At</label>
                  <p className="text-sm text-muted-foreground">{selectedAlert.detectedAt.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(selectedAlert.status)}>
                    {selectedAlert.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {selectedAlert.status === 'INVESTIGATING' || selectedAlert.status === 'OPEN' ? (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => handleResolve(selectedAlert.id, 'FALSE_POSITIVE', 'Determined to be false positive after investigation')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    False Positive
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => handleResolve(selectedAlert.id, 'CONFIRMED_FRAUD', 'Confirmed as fraudulent activity')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Fraud
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    This alert has been resolved as: <span className="font-medium">{selectedAlert.status.replace('_', ' ')}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FraudDetectionDashboard;