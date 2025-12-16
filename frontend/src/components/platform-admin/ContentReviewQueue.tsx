/**
 * Content Review Queue Component
 * Interface for reviewing and moderating flagged content
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Flag,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  FileText,
  RefreshCw
} from 'lucide-react';

interface ContentFlag {
  id: string;
  contentId: string;
  contentType: 'USER_PROFILE' | 'BOOKING_DESCRIPTION' | 'REVIEW' | 'MESSAGE' | 'COMPANY_INFO' | 'DRIVER_PROFILE';
  flagType: 'INAPPROPRIATE_CONTENT' | 'SPAM' | 'HARASSMENT' | 'FRAUD' | 'VIOLENCE' | 'HATE_SPEECH' | 'COPYRIGHT' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  flaggedBy: string;
  flaggedAt: Date;
  reason: string;
  description: string;
  evidence?: {
    screenshots?: string[];
    metadata?: Record<string, any>;
    automatedScores?: Record<string, number>;
  };
}

const ContentReviewQueue: React.FC = () => {
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'PENDING',
    severity: 'all',
    flagType: 'all',
    contentType: 'all'
  });
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);

  useEffect(() => {
    fetchFlags();
  }, [filters]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: '50',
        offset: '0'
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/platform-admin/moderation/content/flagged?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFlags(data.data || []);
      } else {
        throw new Error('Failed to fetch flagged content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content flags');
      console.error('Error fetching flags:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    const mockFlags: ContentFlag[] = [
      {
        id: 'flag-1',
        contentId: 'content-1',
        contentType: 'REVIEW',
        flagType: 'INAPPROPRIATE_CONTENT',
        severity: 'HIGH',
        status: 'PENDING',
        flaggedBy: 'SYSTEM',
        flaggedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        reason: 'Automated scan detected inappropriate language',
        description: 'Content contains potentially offensive language and negative sentiment',
        evidence: {
          automatedScores: { toxicity: 0.85, spam: 0.2, harassment: 0.3 }
        }
      },
      {
        id: 'flag-2',
        contentId: 'content-2',
        contentType: 'USER_PROFILE',
        flagType: 'SPAM',
        severity: 'MEDIUM',
        status: 'PENDING',
        flaggedBy: 'admin-1',
        flaggedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        reason: 'Profile contains promotional content',
        description: 'User profile description contains multiple promotional links and spam keywords'
      },
      {
        id: 'flag-3',
        contentId: 'content-3',
        contentType: 'MESSAGE',
        flagType: 'HARASSMENT',
        severity: 'CRITICAL',
        status: 'PENDING',
        flaggedBy: 'user-456',
        flaggedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        reason: 'Threatening message received',
        description: 'Message contains threats and harassment directed at another user',
        evidence: {
          screenshots: ['screenshot1.png', 'screenshot2.png']
        }
      }
    ];

    setFlags(mockFlags);
  };

  const handleReview = async (flagId: string, decision: 'APPROVE' | 'REJECT' | 'ESCALATE', notes?: string) => {
    try {
      const response = await fetch(`/api/platform-admin/moderation/content/${flagId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          decision,
          notes,
          actions: decision === 'REJECT' ? ['HIDE_CONTENT'] : []
        })
      });

      if (response.ok) {
        await fetchFlags(); // Refresh the list
        setSelectedFlag(null);
      } else {
        throw new Error('Failed to review content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review content');
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'USER_PROFILE': return <User className="h-4 w-4" />;
      case 'REVIEW': return <MessageSquare className="h-4 w-4" />;
      case 'MESSAGE': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
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

  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case 'INAPPROPRIATE_CONTENT': return 'bg-red-100 text-red-800';
      case 'HARASSMENT': return 'bg-red-100 text-red-800';
      case 'SPAM': return 'bg-yellow-100 text-yellow-800';
      case 'FRAUD': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading content flags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Content Review Queue</h2>
          <p className="text-muted-foreground">
            Review and moderate flagged content items
          </p>
        </div>
        
        <Button onClick={fetchFlags} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <select 
              value={filters.status} 
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
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

            <select 
              value={filters.flagType} 
              onChange={(e) => setFilters(prev => ({ ...prev, flagType: e.target.value }))}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
              <option value="SPAM">Spam</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="FRAUD">Fraud</option>
              <option value="HATE_SPEECH">Hate Speech</option>
            </select>

            <select 
              value={filters.contentType} 
              onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Content Types</option>
              <option value="USER_PROFILE">User Profile</option>
              <option value="REVIEW">Review</option>
              <option value="MESSAGE">Message</option>
              <option value="BOOKING_DESCRIPTION">Booking</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content Flags List */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Content ({flags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No flagged content found for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map(flag => (
                <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getContentTypeIcon(flag.contentType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{flag.reason}</h4>
                        <Badge className={getSeverityColor(flag.severity)}>
                          {flag.severity}
                        </Badge>
                        <Badge className={getFlagTypeColor(flag.flagType)}>
                          {flag.flagType.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {flag.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(flag.flaggedAt)}</span>
                        </div>
                        <span>Flagged by: {flag.flaggedBy}</span>
                        <span>Content: {flag.contentType.replace('_', ' ')}</span>
                      </div>

                      {flag.evidence?.automatedScores && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Scores:</span>
                          {Object.entries(flag.evidence.automatedScores).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {(value * 100).toFixed(0)}%
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedFlag(flag)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Review Content Flag</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFlag(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <p className="text-sm text-muted-foreground">{selectedFlag.contentType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Flag Type</label>
                  <p className="text-sm text-muted-foreground">{selectedFlag.flagType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Badge className={getSeverityColor(selectedFlag.severity)}>
                    {selectedFlag.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Flagged By</label>
                  <p className="text-sm text-muted-foreground">{selectedFlag.flaggedBy}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Reason</label>
                <p className="text-sm text-muted-foreground">{selectedFlag.reason}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{selectedFlag.description}</p>
              </div>

              {selectedFlag.evidence?.automatedScores && (
                <div>
                  <label className="text-sm font-medium">Automated Scores</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(selectedFlag.evidence.automatedScores).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{key}</span>
                        <span className="text-sm font-medium">{(value * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => handleReview(selectedFlag.id, 'APPROVE')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleReview(selectedFlag.id, 'REJECT', 'Content violates platform guidelines')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => handleReview(selectedFlag.id, 'ESCALATE', 'Requires senior review')}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ContentReviewQueue;