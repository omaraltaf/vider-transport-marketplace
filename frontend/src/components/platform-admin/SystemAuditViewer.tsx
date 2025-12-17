import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: 'company' | 'user' | 'feature' | 'system' | 'backup' | 'rate_limit';
  entityId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  admin?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface RateLimitRule {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  limit: number;
  windowMs: number;
  enabled: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AccessControlRule {
  id: string;
  name: string;
  description: string;
  type: 'whitelist' | 'blacklist';
  target: 'ip' | 'user' | 'api_key' | 'user_agent' | 'country';
  values: string[];
  endpoints: string[];
  methods: string[];
  enabled: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiUsageMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  uniqueUsers: number;
  topUsers: Array<{
    userId: string;
    requests: number;
    lastRequest: Date;
  }>;
  hourlyBreakdown: Array<{
    hour: string;
    requests: number;
    errors: number;
  }>;
  statusCodeBreakdown: Record<string, number>;
}

interface RateLimitViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  key: string;
  endpoint: string;
  method: string;
  limit: number;
  attempts: number;
  windowStart: Date;
  windowEnd: Date;
  userAgent?: string;
  ipAddress: string;
  userId?: string;
  blocked: boolean;
  timestamp: Date;
}

interface SystemAuditViewerProps {
  onExport?: (data: any[]) => void;
}

const SystemAuditViewer: React.FC<SystemAuditViewerProps> = ({ onExport }) => {
  const { token } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rateLimitRules, setRateLimitRules] = useState<RateLimitRule[]>([]);
  const [accessControlRules, setAccessControlRules] = useState<AccessControlRule[]>([]);
  const [apiUsageMetrics, setApiUsageMetrics] = useState<ApiUsageMetrics[]>([]);
  const [rateLimitViolations, setRateLimitViolations] = useState<RateLimitViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    entityType: '',
    adminId: '',
    startDate: '',
    endDate: '',
    limit: 100,
    offset: 0
  });

  const [newRateLimitRule, setNewRateLimitRule] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'GET',
    limit: 100,
    windowMs: 60000,
    enabled: true,
    priority: 1
  });

  const [newAccessControlRule, setNewAccessControlRule] = useState({
    name: '',
    description: '',
    type: 'whitelist' as 'whitelist' | 'blacklist',
    target: 'ip' as AccessControlRule['target'],
    values: [''],
    endpoints: [''],
    methods: ['GET'],
    enabled: true
  });

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilters.action) params.append('action', auditFilters.action);
      if (auditFilters.entityType) params.append('entityType', auditFilters.entityType);
      if (auditFilters.adminId) params.append('adminId', auditFilters.adminId);
      if (auditFilters.startDate) params.append('start', auditFilters.startDate);
      if (auditFilters.endDate) params.append('end', auditFilters.endDate);
      params.append('limit', auditFilters.limit.toString());
      params.append('offset', auditFilters.offset.toString());

      const response = await fetch(`/api/platform-admin/system/audit/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchRateLimitRules = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/rate-limits/rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rate limit rules');
      }

      const data = await response.json();
      setRateLimitRules(data.data);
    } catch (err) {
      console.error('Error fetching rate limit rules:', err);
    }
  };

  const fetchAccessControlRules = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/access-control/rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch access control rules');
      }

      const data = await response.json();
      setAccessControlRules(data.data);
    } catch (err) {
      console.error('Error fetching access control rules:', err);
    }
  };

  const fetchApiUsageMetrics = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/api-usage/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API usage metrics');
      }

      const data = await response.json();
      setApiUsageMetrics(data.data);
    } catch (err) {
      console.error('Error fetching API usage metrics:', err);
    }
  };

  const fetchRateLimitViolations = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/api-usage/violations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rate limit violations');
      }

      const data = await response.json();
      setRateLimitViolations(data.data);
    } catch (err) {
      console.error('Error fetching rate limit violations:', err);
    }
  };

  const createRateLimitRule = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/rate-limits/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newRateLimitRule,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          keyGenerator: 'ip'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create rate limit rule');
      }

      const data = await response.json();
      setRateLimitRules(prev => [data.data, ...prev]);
      
      // Reset form
      setNewRateLimitRule({
        name: '',
        description: '',
        endpoint: '',
        method: 'GET',
        limit: 100,
        windowMs: 60000,
        enabled: true,
        priority: 1
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const createAccessControlRule = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/access-control/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newAccessControlRule,
          values: newAccessControlRule.values.filter(v => v.trim()),
          endpoints: newAccessControlRule.endpoints.filter(e => e.trim()),
          methods: newAccessControlRule.methods
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create access control rule');
      }

      const data = await response.json();
      setAccessControlRules(prev => [data.data, ...prev]);
      
      // Reset form
      setNewAccessControlRule({
        name: '',
        description: '',
        type: 'whitelist',
        target: 'ip',
        values: [''],
        endpoints: [''],
        methods: ['GET'],
        enabled: true
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const toggleRateLimitRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/platform-admin/system/rate-limits/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setRateLimitRules(prev => 
          prev.map(rule => 
            rule.id === ruleId ? { ...rule, enabled } : rule
          )
        );
      }
    } catch (err) {
      console.error('Error toggling rate limit rule:', err);
    }
  };

  const toggleAccessControlRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/platform-admin/system/access-control/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setAccessControlRules(prev => 
          prev.map(rule => 
            rule.id === ruleId ? { ...rule, enabled } : rule
          )
        );
      }
    } catch (err) {
      console.error('Error toggling access control rule:', err);
    }
  };

  const deleteRateLimitRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rate limit rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/platform-admin/system/rate-limits/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRateLimitRules(prev => prev.filter(rule => rule.id !== ruleId));
      }
    } catch (err) {
      console.error('Error deleting rate limit rule:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAuditLogs(),
        fetchRateLimitRules(),
        fetchAccessControlRules(),
        fetchApiUsageMetrics(),
        fetchRateLimitViolations()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [auditFilters]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('FAILED') || action.includes('ERROR')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Audit & Access Control</h2>
        <Button onClick={() => {
          fetchAuditLogs();
          fetchRateLimitRules();
          fetchAccessControlRules();
          fetchApiUsageMetrics();
          fetchRateLimitViolations();
        }}>
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </Card>
      )}

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
          <TabsTrigger value="api-usage">API Usage</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Filter Audit Logs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="action-filter">Action</Label>
                <Input
                  id="action-filter"
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
                  placeholder="e.g., CREATE, UPDATE"
                />
              </div>
              <div>
                <Label htmlFor="entity-filter">Entity Type</Label>
                <Select 
                  value={auditFilters.entityType} 
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, entityType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="backup">Backup</SelectItem>
                    <SelectItem value="rate_limit">Rate Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin-filter">Admin ID</Label>
                <Input
                  id="admin-filter"
                  value={auditFilters.adminId}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, adminId: e.target.value }))}
                  placeholder="Admin user ID"
                />
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={auditFilters.startDate}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={auditFilters.endDate}
                  onChange={(e) => setAuditFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="limit">Limit</Label>
                <Select 
                  value={auditFilters.limit.toString()} 
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, limit: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Audit Log Entries</h3>
              <Button 
                variant="outline"
                onClick={() => onExport?.(auditLogs)}
              >
                Export
              </Button>
            </div>
            
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No audit logs found</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="text-sm text-gray-600">{log.entityType}</span>
                          <span className="text-sm font-mono text-gray-500">{log.entityId}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {log.admin ? `${log.admin.firstName} ${log.admin.lastName} (${log.admin.email})` : log.adminId}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(log.timestamp).toLocaleString()}</p>
                        <p>{log.ipAddress}</p>
                      </div>
                    </div>
                    
                    {Object.keys(log.changes).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Changes:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create Rate Limit Rule</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={newRateLimitRule.name}
                    onChange={(e) => setNewRateLimitRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="API Rate Limit"
                  />
                </div>

                <div>
                  <Label htmlFor="rule-description">Description</Label>
                  <Input
                    id="rule-description"
                    value={newRateLimitRule.description}
                    onChange={(e) => setNewRateLimitRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Limit API requests per minute"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endpoint">Endpoint Pattern</Label>
                    <Input
                      id="endpoint"
                      value={newRateLimitRule.endpoint}
                      onChange={(e) => setNewRateLimitRule(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="/api/* or specific endpoint"
                    />
                  </div>
                  <div>
                    <Label htmlFor="method">HTTP Method</Label>
                    <Select 
                      value={newRateLimitRule.method} 
                      onValueChange={(value) => setNewRateLimitRule(prev => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="*">All Methods</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="limit">Request Limit</Label>
                    <Input
                      id="limit"
                      type="number"
                      min="1"
                      value={newRateLimitRule.limit}
                      onChange={(e) => setNewRateLimitRule(prev => ({ 
                        ...prev, 
                        limit: parseInt(e.target.value) || 100 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="window">Time Window (ms)</Label>
                    <Select 
                      value={newRateLimitRule.windowMs.toString()} 
                      onValueChange={(value) => setNewRateLimitRule(prev => ({ 
                        ...prev, 
                        windowMs: parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                        <SelectItem value="900000">15 minutes</SelectItem>
                        <SelectItem value="3600000">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="100"
                      value={newRateLimitRule.priority}
                      onChange={(e) => setNewRateLimitRule(prev => ({ 
                        ...prev, 
                        priority: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Checkbox
                      id="enabled"
                      checked={newRateLimitRule.enabled}
                      onCheckedChange={(checked) => 
                        setNewRateLimitRule(prev => ({ ...prev, enabled: checked as boolean }))
                      }
                    />
                    <Label htmlFor="enabled">Enabled</Label>
                  </div>
                </div>

                <Button 
                  onClick={createRateLimitRule}
                  disabled={!newRateLimitRule.name || !newRateLimitRule.endpoint}
                  className="w-full"
                >
                  Create Rule
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rate Limit Rules</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {rateLimitRules.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No rate limit rules configured</p>
                ) : (
                  rateLimitRules.map(rule => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Endpoint:</span>
                          <span className="ml-1 font-mono">{rule.endpoint}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Method:</span>
                          <span className="ml-1">{rule.method}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Limit:</span>
                          <span className="ml-1">{rule.limit} / {formatDuration(rule.windowMs)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Priority:</span>
                          <span className="ml-1">{rule.priority}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRateLimitRule(rule.id, !rule.enabled)}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteRateLimitRule(rule.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="access-control" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create Access Control Rule</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ac-name">Rule Name</Label>
                  <Input
                    id="ac-name"
                    value={newAccessControlRule.name}
                    onChange={(e) => setNewAccessControlRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="IP Whitelist"
                  />
                </div>

                <div>
                  <Label htmlFor="ac-description">Description</Label>
                  <Input
                    id="ac-description"
                    value={newAccessControlRule.description}
                    onChange={(e) => setNewAccessControlRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Allow only specific IP addresses"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ac-type">Rule Type</Label>
                    <Select 
                      value={newAccessControlRule.type} 
                      onValueChange={(value) => setNewAccessControlRule(prev => ({ 
                        ...prev, 
                        type: value as 'whitelist' | 'blacklist' 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whitelist">Whitelist (Allow)</SelectItem>
                        <SelectItem value="blacklist">Blacklist (Block)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ac-target">Target</Label>
                    <Select 
                      value={newAccessControlRule.target} 
                      onValueChange={(value) => setNewAccessControlRule(prev => ({ 
                        ...prev, 
                        target: value as AccessControlRule['target'] 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip">IP Address</SelectItem>
                        <SelectItem value="user">User ID</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="user_agent">User Agent</SelectItem>
                        <SelectItem value="country">Country</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Values (one per line)</Label>
                  <div className="space-y-2">
                    {newAccessControlRule.values.map((value, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={value}
                          onChange={(e) => {
                            const newValues = [...newAccessControlRule.values];
                            newValues[index] = e.target.value;
                            setNewAccessControlRule(prev => ({ ...prev, values: newValues }));
                          }}
                          placeholder={
                            newAccessControlRule.target === 'ip' ? '192.168.1.1' :
                            newAccessControlRule.target === 'user' ? 'user_123' :
                            newAccessControlRule.target === 'country' ? 'US' :
                            'value'
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newValues = newAccessControlRule.values.filter((_, i) => i !== index);
                            setNewAccessControlRule(prev => ({ ...prev, values: newValues }));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewAccessControlRule(prev => ({ 
                          ...prev, 
                          values: [...prev.values, ''] 
                        }));
                      }}
                    >
                      Add Value
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={createAccessControlRule}
                  disabled={!newAccessControlRule.name || newAccessControlRule.values.every(v => !v.trim())}
                  className="w-full"
                >
                  Create Rule
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Access Control Rules</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {accessControlRules.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No access control rules configured</p>
                ) : (
                  accessControlRules.map(rule => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={rule.type === 'whitelist' ? "default" : "destructive"}>
                            {rule.type}
                          </Badge>
                          <Badge variant={rule.enabled ? "default" : "secondary"}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="text-gray-600">Target:</span>
                          <span className="ml-1">{rule.target}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-gray-600">Values:</span>
                          <div className="ml-1 font-mono text-xs">
                            {rule.values.slice(0, 3).join(', ')}
                            {rule.values.length > 3 && ` (+${rule.values.length - 3} more)`}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAccessControlRule(rule.id, !rule.enabled)}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiUsageMetrics.map(metric => (
              <Card key={`${metric.endpoint}-${metric.method}`} className="p-4">
                <h4 className="font-medium mb-2">{metric.method} {metric.endpoint}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span className="font-mono">{metric.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-mono">
                      {((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response:</span>
                    <span className="font-mono">{metric.averageResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate Limit Hits:</span>
                    <span className="font-mono">{metric.rateLimitHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Users:</span>
                    <span className="font-mono">{metric.uniqueUsers}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Rate Limit Violations</h3>
            <div className="space-y-4">
              {rateLimitViolations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No rate limit violations found</p>
              ) : (
                rateLimitViolations.map(violation => (
                  <div key={violation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{violation.ruleName}</h4>
                        <p className="text-sm text-gray-600">
                          {violation.method} {violation.endpoint}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Blocked
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">IP Address:</span>
                        <span className="ml-1 font-mono">{violation.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Attempts:</span>
                        <span className="ml-1">{violation.attempts} / {violation.limit}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">User ID:</span>
                        <span className="ml-1 font-mono">{violation.userId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time:</span>
                        <span className="ml-1">{new Date(violation.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {violation.userAgent && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="text-gray-600">User Agent:</span>
                        <span className="ml-1">{violation.userAgent}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAuditViewer;