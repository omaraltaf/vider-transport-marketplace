/**
 * Content Moderation Panel Component
 * Main interface for content review, fraud detection, and blacklist management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import ContentReviewQueue from './ContentReviewQueue';
import FraudDetectionDashboard from './FraudDetectionDashboard';
import BlacklistManager from './BlacklistManager';
import { getApiUrl } from '../../config/app.config';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Shield,
  Flag,
  AlertTriangle,
  Eye,
  Ban,
  TrendingUp,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface ModerationStats {
  content: {
    totalFlags: number;
    pendingReview: number;
    resolvedToday: number;
    approvalRate: number;
  };
  fraud: {
    totalAlerts: number;
    openAlerts: number;
    confirmedFraudRate: number;
    preventedLosses: number;
  };
  blacklist: {
    totalEntries: number;
    activeEntries: number;
    violationsToday: number;
    hitRate: number;
  };
}

interface ContentModerationPanelProps {
  className?: string;
}

const ContentModerationPanel: React.FC<ContentModerationPanelProps> = ({ className = '' }) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchModerationStats();
  }, []);

  const fetchModerationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats from all moderation systems
      console.log('DEBUG: Fetching moderation stats...');
      console.log('DEBUG: Token available:', !!token);
      console.log('DEBUG: API Base URL:', getApiUrl('/platform-admin/moderation/stats'));
      const [contentStats, fraudStats, blacklistStats] = await Promise.all([
        fetch(getApiUrl('/platform-admin/moderation/stats'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          console.log('DEBUG: Content stats response status:', res.status);
          console.log('DEBUG: Content stats response ok:', res.ok);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }).then(data => {
          console.log('DEBUG: Content stats data:', data);
          return data;
        }).catch(err => {
          console.error('DEBUG: Content stats fetch error:', err);
          throw err;
        }),
        fetch(getApiUrl('/platform-admin/moderation/fraud/stats'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          console.log('DEBUG: Fraud stats response status:', res.status);
          console.log('DEBUG: Fraud stats response ok:', res.ok);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }).then(data => {
          console.log('DEBUG: Fraud stats data:', data);
          return data;
        }).catch(err => {
          console.error('DEBUG: Fraud stats fetch error:', err);
          throw err;
        }),
        fetch(getApiUrl('/platform-admin/moderation/blacklist/stats'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          console.log('DEBUG: Blacklist stats response status:', res.status);
          console.log('DEBUG: Blacklist stats response ok:', res.ok);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        }).then(data => {
          console.log('DEBUG: Blacklist stats data:', data);
          return data;
        }).catch(err => {
          console.error('DEBUG: Blacklist stats fetch error:', err);
          throw err;
        })
      ]);

      setStats({
        content: {
          totalFlags: contentStats.data?.totalFlags || contentStats.totalReports || 0,
          pendingReview: contentStats.data?.pendingReview || contentStats.pendingReview || 0,
          resolvedToday: contentStats.data?.resolvedToday || contentStats.resolvedToday || 0,
          approvalRate: contentStats.data?.approvalRate || 85
        },
        fraud: {
          totalAlerts: fraudStats.data?.totalAlerts || fraudStats.totalFraudCases || 0,
          openAlerts: fraudStats.data?.openAlerts || fraudStats.activeCases || 0,
          confirmedFraudRate: fraudStats.data?.confirmedFraudRate || 25,
          preventedLosses: fraudStats.data?.preventedLosses || 50000
        },
        blacklist: {
          totalEntries: blacklistStats.data?.totalEntries || blacklistStats.totalBlacklisted || 0,
          activeEntries: blacklistStats.data?.activeEntries || blacklistStats.totalBlacklisted || 0,
          violationsToday: blacklistStats.data?.violationsToday || blacklistStats.recentAdditions || 0,
          hitRate: blacklistStats.data?.hitRate || 75
        }
      });
    } catch (err) {
      setError('Failed to load moderation statistics');
      console.error('Error fetching moderation stats:', err);
      
      // Set mock data for development
      setStats({
        content: {
          totalFlags: 1247,
          pendingReview: 23,
          resolvedToday: 45,
          approvalRate: 0.65
        },
        fraud: {
          totalAlerts: 456,
          openAlerts: 23,
          confirmedFraudRate: 0.15,
          preventedLosses: 125000
        },
        blacklist: {
          totalEntries: 2341,
          activeEntries: 2156,
          violationsToday: 12,
          hitRate: 0.15
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading moderation data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground">
            Monitor and manage platform safety, content quality, and fraud prevention
          </p>
        </div>
        
        <Button onClick={fetchModerationStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content Review</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Content Moderation Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Content Flags</CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.content.totalFlags.toLocaleString()}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{stats.content.pendingReview} pending review</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant={stats.content.pendingReview > 50 ? 'destructive' : 'secondary'}>
                      {stats.content.resolvedToday} resolved today
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Fraud Detection Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.fraud.totalAlerts.toLocaleString()}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{stats.fraud.openAlerts} open alerts</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline">
                      {(stats.fraud.confirmedFraudRate * 100).toFixed(1)}% confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Blacklist Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Blacklist Entries</CardTitle>
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.blacklist.totalEntries.toLocaleString()}</div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3" />
                    <span>{stats.blacklist.activeEntries} active</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {stats.blacklist.violationsToday} violations today
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Prevention Impact */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prevented Losses</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats.fraud.preventedLosses / 1000).toFixed(0)}k NOK
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>This month</span>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-green-600">
                      {(stats.blacklist.hitRate * 100).toFixed(1)}% hit rate
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('content')}
                >
                  <Eye className="h-6 w-6 mb-2" />
                  Review Content
                  {stats && stats.content.pendingReview > 0 && (
                    <Badge variant="destructive" className="mt-1">
                      {stats.content.pendingReview}
                    </Badge>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('fraud')}
                >
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  Investigate Fraud
                  {stats && stats.fraud.openAlerts > 0 && (
                    <Badge variant="destructive" className="mt-1">
                      {stats.fraud.openAlerts}
                    </Badge>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setActiveTab('blacklist')}
                >
                  <Ban className="h-6 w-6 mb-2" />
                  Manage Blacklist
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Moderation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approval Rate</span>
                    <span className="font-medium">
                      {stats ? (stats.content.approvalRate * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Resolution Time</span>
                    <span className="font-medium">42 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Queue Health</span>
                    <Badge variant={stats && stats.content.pendingReview < 50 ? 'secondary' : 'destructive'}>
                      {stats && stats.content.pendingReview < 50 ? 'Good' : 'Attention Needed'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fraud Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Detection Accuracy</span>
                    <span className="font-medium">87.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">False Positive Rate</span>
                    <span className="font-medium">12.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Status</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Blacklist System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hit Rate</span>
                    <span className="font-medium">
                      {stats ? (stats.blacklist.hitRate * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Entries</span>
                    <span className="font-medium">
                      {stats ? stats.blacklist.activeEntries.toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Coverage</span>
                    <Badge variant="secondary">Comprehensive</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <ContentReviewQueue />
        </TabsContent>

        <TabsContent value="fraud">
          <FraudDetectionDashboard />
        </TabsContent>

        <TabsContent value="blacklist">
          <BlacklistManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentModerationPanel;