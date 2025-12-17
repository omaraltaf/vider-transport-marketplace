/**
 * Blacklist Manager Component
 * Interface for managing blacklist entries and violations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Ban,
  Plus,
  Search,
  Eye,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  Shield
} from 'lucide-react';

interface BlacklistEntry {
  id: string;
  type: 'USER' | 'COMPANY' | 'EMAIL' | 'PHONE' | 'IP_ADDRESS' | 'DEVICE' | 'CONTENT_HASH' | 'PAYMENT_METHOD';
  value: string;
  reason: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'UNDER_REVIEW';
  source: 'MANUAL' | 'AUTOMATED' | 'EXTERNAL' | 'FRAUD_DETECTION' | 'CONTENT_MODERATION';
  addedBy: string;
  addedAt: Date;
  expiresAt?: Date;
  hitCount: number;
}

interface BlacklistViolation {
  id: string;
  blacklistEntryId: string;
  violationType: 'REGISTRATION_ATTEMPT' | 'LOGIN_ATTEMPT' | 'BOOKING_ATTEMPT' | 'PAYMENT_ATTEMPT' | 'CONTENT_SUBMISSION';
  entityId: string;
  entityType: 'USER' | 'COMPANY' | 'BOOKING' | 'TRANSACTION' | 'CONTENT';
  detectedAt: Date;
  blocked: boolean;
  action: 'BLOCKED' | 'FLAGGED' | 'LOGGED_ONLY' | 'MANUAL_REVIEW';
}

interface BlacklistStats {
  totalEntries: number;
  activeEntries: number;
  entriesByType: Record<string, number>;
  entriesBySeverity: Record<string, number>;
  violationsToday: number;
  violationsThisWeek: number;
  blockedAttempts: number;
  hitRate: number;
  recentViolations: BlacklistViolation[];
}

const BlacklistManager: React.FC = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [stats, setStats] = useState<BlacklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('entries');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'ACTIVE',
    severity: 'all',
    source: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'EMAIL',
    value: '',
    reason: '',
    description: '',
    severity: 'MEDIUM',
    expiresAt: ''
  });

  useEffect(() => {
    fetchBlacklistData();
  }, [filters]);

  const fetchBlacklistData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [entriesResponse, statsResponse] = await Promise.all([
        fetch(`/api/platform-admin/moderation/blacklist?${new URLSearchParams({
          ...filters,
          search: searchQuery,
          limit: '50',
          offset: '0'
        })}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/platform-admin/moderation/blacklist/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (entriesResponse.ok && statsResponse.ok) {
        const entriesData = await entriesResponse.json();
        const statsData = await statsResponse.json();
        
        setEntries(entriesData.data || []);
        setStats(statsData.data);
      } else {
        throw new Error('Failed to fetch blacklist data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blacklist data');
      console.error('Error fetching blacklist data:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockEntries: BlacklistEntry[] = [
      {
        id: 'blacklist-1',
        type: 'EMAIL',
        value: 'spam@example.com',
        reason: 'Known spam account',
        description: 'Email address associated with multiple spam reports',
        severity: 'HIGH',
        status: 'ACTIVE',
        source: 'MANUAL',
        addedBy: 'admin-1',
        addedAt: new Date('2024-12-01'),
        hitCount: 15
      },
      {
        id: 'blacklist-2',
        type: 'IP_ADDRESS',
        value: '203.0.113.100',
        reason: 'Fraud attempts',
        description: 'IP address used for multiple fraudulent transactions',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        source: 'FRAUD_DETECTION',
        addedBy: 'SYSTEM',
        addedAt: new Date('2024-12-05'),
        hitCount: 8
      },
      {
        id: 'blacklist-3',
        type: 'PHONE',
        value: '+1234567890',
        reason: 'Harassment reports',
        description: 'Phone number reported for harassment by multiple users',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        source: 'CONTENT_MODERATION',
        addedBy: 'admin-2',
        addedAt: new Date('2024-12-08'),
        hitCount: 3
      }
    ];

    const mockStats: BlacklistStats = {
      totalEntries: 2341,
      activeEntries: 2156,
      entriesByType: {
        'EMAIL': 856,
        'IP_ADDRESS': 634,
        'PHONE': 423,
        'USER': 312,
        'DEVICE': 116
      },
      entriesBySeverity: {
        'LOW': 523,
        'MEDIUM': 1245,
        'HIGH': 456,
        'CRITICAL': 117
      },
      violationsToday: 12,
      violationsThisWeek: 89,
      blockedAttempts: 67,
      hitRate: 0.15,
      recentViolations: []
    };

    setEntries(mockEntries);
    setStats(mockStats);
  };

  const handleAddEntry = async () => {
    try {
      if (!newEntry.value || !newEntry.reason || !newEntry.description) {
        setError('Please fill in all required fields');
        return;
      }

      const response = await fetch('/api/platform-admin/moderation/blacklist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newEntry,
          expiresAt: newEntry.expiresAt ? new Date(newEntry.expiresAt) : undefined
        })
      });

      if (response.ok) {
        await fetchBlacklistData();
        setShowAddForm(false);
        setNewEntry({
          type: 'EMAIL',
          value: '',
          reason: '',
          description: '',
          severity: 'MEDIUM',
          expiresAt: ''
        });
      } else {
        throw new Error('Failed to add blacklist entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/moderation/blacklist/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'Removed from admin panel'
        })
      });

      if (response.ok) {
        await fetchBlacklistData();
      } else {
        throw new Error('Failed to remove blacklist entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entry');
    }
  };

  const handleCheckValue = async (type: string, value: string) => {
    try {
      const response = await fetch('/api/platform-admin/moderation/blacklist/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, value })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Check result: ${result.data.isBlacklisted ? 'BLACKLISTED' : 'NOT BLACKLISTED'}\nRisk Score: ${result.data.riskScore}\nAction: ${result.data.recommendedAction}`);
      } else {
        throw new Error('Failed to check blacklist');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check value');
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

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'MANUAL': return 'bg-blue-100 text-blue-800';
      case 'AUTOMATED': return 'bg-green-100 text-green-800';
      case 'FRAUD_DETECTION': return 'bg-red-100 text-red-800';
      case 'CONTENT_MODERATION': return 'bg-purple-100 text-purple-800';
      case 'EXTERNAL': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return '📧';
      case 'IP_ADDRESS': return '🌐';
      case 'PHONE': return '📞';
      case 'USER': return '👤';
      case 'DEVICE': return '📱';
      default: return '🚫';
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === '' || 
      entry.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading blacklist data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Blacklist Manager</h2>
          <p className="text-muted-foreground">
            Manage blacklisted users, IPs, emails, and other entities
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
          
          <Button onClick={fetchBlacklistData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Blacklist Entries</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="check">Check Value</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by value, reason, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <select 
                    value={filters.type} 
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="EMAIL">Email</option>
                    <option value="IP_ADDRESS">IP Address</option>
                    <option value="PHONE">Phone</option>
                    <option value="USER">User</option>
                    <option value="DEVICE">Device</option>
                  </select>

                  <select 
                    value={filters.status} 
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="all">All Status</option>
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

          {/* Blacklist Entries */}
          <Card>
            <CardHeader>
              <CardTitle>Blacklist Entries ({filteredEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No blacklist entries found for the selected filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 text-2xl">
                          {getTypeIcon(entry.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{entry.value}</h4>
                            <Badge className={getSeverityColor(entry.severity)}>
                              {entry.severity}
                            </Badge>
                            <Badge className={getSourceColor(entry.source)}>
                              {entry.source}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {entry.reason}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Type: {entry.type.replace('_', ' ')}</span>
                            <span>Added: {entry.addedAt.toLocaleDateString()}</span>
                            <span>By: {entry.addedBy}</span>
                            <span>Hits: {entry.hitCount}</span>
                            {entry.expiresAt && (
                              <span>Expires: {entry.expiresAt.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCheckValue(entry.type, entry.value)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Check
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                    <Ban className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      <span>{stats.activeEntries} active</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Violations Today</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.violationsToday}</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>{stats.blockedAttempts} blocked</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(stats.hitRate * 100).toFixed(1)}%</div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>This week: {stats.violationsThisWeek}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Effectiveness</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((stats.blockedAttempts / Math.max(stats.violationsToday, 1)) * 100).toFixed(0)}%
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Block rate</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Entries by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.entriesByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm flex items-center">
                            <span className="mr-2">{getTypeIcon(type)}</span>
                            {type.replace('_', ' ')}
                          </span>
                          <span className="font-medium">{count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Entries by Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.entriesBySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between items-center">
                          <Badge className={getSeverityColor(severity)}>
                            {severity}
                          </Badge>
                          <span className="font-medium">{count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="check" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Check Blacklist Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkType">Type</Label>
                  <select 
                    id="checkType"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="IP_ADDRESS">IP Address</option>
                    <option value="PHONE">Phone</option>
                    <option value="USER">User</option>
                    <option value="DEVICE">Device</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="checkValue">Value</Label>
                  <Input
                    id="checkValue"
                    placeholder="Enter value to check..."
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  const type = (document.getElementById('checkType') as HTMLSelectElement).value;
                  const value = (document.getElementById('checkValue') as HTMLInputElement).value;
                  if (value) handleCheckValue(type, value);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Check Blacklist
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Blacklist Entry</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <select 
                    id="type"
                    value={newEntry.type}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="EMAIL">Email</option>
                    <option value="IP_ADDRESS">IP Address</option>
                    <option value="PHONE">Phone</option>
                    <option value="USER">User</option>
                    <option value="DEVICE">Device</option>
                    <option value="PAYMENT_METHOD">Payment Method</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="severity">Severity *</Label>
                  <select 
                    id="severity"
                    value={newEntry.severity}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  value={newEntry.value}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter the value to blacklist..."
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Input
                  id="reason"
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Brief reason for blacklisting..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description..."
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newEntry.expiresAt}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                
                <Button onClick={handleAddEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BlacklistManager;