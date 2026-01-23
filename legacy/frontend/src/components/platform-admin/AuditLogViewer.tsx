import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { apiClient } from '../../services/api';
import { 
  Search, 
  Download, 
  Filter, 
  Calendar as CalendarIcon,
  User, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Eye,
  FileText,
  Activity,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  userEmail?: string;
  targetId?: string;
  targetType?: string;
  description: string;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  resourcesAccessed?: string[];
  companyId?: string;
}

interface AuditLogSummary {
  totalEntries: number;
  entriesByAction: { [key: string]: number };
  entriesBySeverity: { [key: string]: number };
  entriesByUser: { userId: string; userEmail: string; count: number }[];
  successRate: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface DashboardStats {
  totalEvents: number;
  securityEvents: number;
  failedActions: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    severity: '',
    targetType: '',
    success: '',
    companyId: '',
    ipAddress: '',
    startDate: null as Date | null,
    endDate: null as Date | null
  });

  // Pagination states
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  });

  // Metadata for filters
  const [metadata, setMetadata] = useState({
    actions: [] as string[],
    severities: [] as string[],
    targetTypes: [] as string[]
  });

  useEffect(() => {
    fetchMetadata();
    fetchLogs();
    fetchSummary();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page, pagination.pageSize]);

  const fetchMetadata = async () => {
    try {
      const validToken = await tokenManager.getValidToken();
      const data = await apiClient.get('/audit-logs/metadata', validToken);
      setMetadata(data);
    } catch (error) {
      console.error('Error fetching audit log metadata:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      });

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }

      const validToken = await tokenManager.getValidToken();
      const data = await apiClient.get(`/audit-logs?${params}`, validToken);
      
      setLogs(data.logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      })));
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasMore: data.pagination.hasMore
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.companyId) params.append('companyId', filters.companyId);

      const validToken = await tokenManager.getValidToken();
      const data = await apiClient.get(`/audit-logs/summary?${params}`, validToken);
      setSummary({
        ...data,
        timeRange: {
          start: new Date(data.timeRange.start),
          end: new Date(data.timeRange.end)
        }
      });
    } catch (error) {
      console.error('Error fetching audit log summary:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const validToken = await tokenManager.getValidToken();
      const data = await apiClient.get('/audit-logs/dashboard-stats?days=30', validToken);
      setDashboardStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== null)
        )
      );

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(`/api/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('SECURITY') || action.includes('LOGIN')) {
      return <Shield className="h-4 w-4" />;
    }
    if (action.includes('USER') || action.includes('COMPANY')) {
      return <User className="h-4 w-4" />;
    }
    if (action.includes('SYSTEM') || action.includes('CONFIG')) {
      return <Activity className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const resetFilters = () => {
    setFilters({
      userId: '',
      action: '',
      severity: '',
      targetType: '',
      success: '',
      companyId: '',
      ipAddress: '',
      startDate: null,
      endDate: null
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && logs.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">Audit Log Viewer</h2>
          <p className="text-gray-600">Monitor and analyze all platform administrative actions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    {metadata.actions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    {metadata.severities.map((severity) => (
                      <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="targetType">Target Type</Label>
                <Select value={filters.targetType} onValueChange={(value) => setFilters(prev => ({ ...prev, targetType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {metadata.targetTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="success">Status</Label>
                <Select value={filters.success} onValueChange={(value) => setFilters(prev => ({ ...prev, success: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="userEmail">User Email</Label>
                <Input
                  id="userEmail"
                  placeholder="Filter by user email..."
                  value={filters.userId}
                  onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  placeholder="Filter by IP address..."
                  value={filters.ipAddress}
                  onChange={(e) => setFilters(prev => ({ ...prev, ipAddress: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="companyId">Company ID</Label>
                <Input
                  id="companyId"
                  placeholder="Filter by company ID..."
                  value={filters.companyId}
                  onChange={(e) => setFilters(prev => ({ ...prev, companyId: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.startDate ? filters.startDate.toLocaleDateString() : 'Select start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.endDate ? filters.endDate.toLocaleDateString() : 'Select end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex space-x-2 mt-6">
                <Button onClick={fetchLogs} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Card className="p-6">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getActionIcon(log.action)}
                        <span className="font-semibold text-gray-900">{log.action}</span>
                        <Badge className={getSeverityColor(log.severity)}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1">{log.severity}</span>
                        </Badge>
                        {log.success ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{log.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">User:</span> {log.userEmail || 'System'}
                        </div>
                        <div>
                          <span className="font-medium">Time:</span> {log.timestamp.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ipAddress || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {log.duration ? `${log.duration}ms` : 'N/A'}
                        </div>
                      </div>

                      {log.targetType && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Target:</span> {log.targetType}
                          {log.targetId && ` (${log.targetId})`}
                        </div>
                      )}

                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <span className="font-medium">Error:</span> {log.errorMessage}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} entries
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          {dashboardStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalEvents.toLocaleString()}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Security Events</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.securityEvents.toLocaleString()}</p>
                  </div>
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Failed Actions</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.failedActions.toLocaleString()}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardStats.uniqueUsers.toLocaleString()}</p>
                  </div>
                  <User className="h-8 w-8 text-green-600" />
                </div>
              </Card>
            </div>
          )}

          {dashboardStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Top Actions (Last 30 Days)</h4>
                <div className="space-y-3">
                  {dashboardStats.topActions.map((action, index) => (
                    <div key={action.action} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm text-gray-900">{action.action}</span>
                      </div>
                      <span className="text-sm text-gray-600">{action.count} events</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Daily Activity</h4>
                <div className="space-y-2">
                  {dashboardStats.dailyActivity.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{new Date(day.date).toLocaleDateString()}</span>
                      <span className="text-sm text-gray-600">{day.count} events</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Total Entries</h4>
                  <p className="text-3xl font-bold text-blue-600">{summary.totalEntries.toLocaleString()}</p>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Success Rate</h4>
                  <p className="text-3xl font-bold text-green-600">{summary.successRate.toFixed(1)}%</p>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Time Range</h4>
                  <p className="text-sm text-gray-600">
                    {summary.timeRange.start.toLocaleDateString()} - {summary.timeRange.end.toLocaleDateString()}
                  </p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Entries by Severity</h4>
                  <div className="space-y-3">
                    {Object.entries(summary.entriesBySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(severity)}>
                            {getSeverityIcon(severity)}
                            <span className="ml-1">{severity}</span>
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-600">{count} entries</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Top Users</h4>
                  <div className="space-y-3">
                    {summary.entriesByUser.slice(0, 5).map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="text-sm text-gray-900">{user.userEmail}</span>
                        </div>
                        <span className="text-sm text-gray-600">{user.count} actions</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Audit Log Details</h3>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Action</Label>
                    <p className="font-medium">{selectedLog.action}</p>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Badge className={getSeverityColor(selectedLog.severity)}>
                      {selectedLog.severity}
                    </Badge>
                  </div>
                  <div>
                    <Label>User</Label>
                    <p>{selectedLog.userEmail || 'System'}</p>
                  </div>
                  <div>
                    <Label>Timestamp</Label>
                    <p>{selectedLog.timestamp.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>IP Address</Label>
                    <p>{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <p>{selectedLog.duration ? `${selectedLog.duration}ms` : 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p>{selectedLog.description}</p>
                </div>

                {selectedLog.errorMessage && (
                  <div>
                    <Label>Error Message</Label>
                    <p className="text-red-600">{selectedLog.errorMessage}</p>
                  </div>
                )}

                <div>
                  <Label>Metadata</Label>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};