/**
 * Dispute Management Component
 * Interface for managing disputes and processing refunds
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  FileText,
  RefreshCw,
  Eye,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { Label } from '../ui/label';

interface Dispute {
  id: string;
  bookingId: string;
  disputeType: 'PAYMENT' | 'SERVICE' | 'CANCELLATION' | 'DAMAGE' | 'OTHER';
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reportedBy: 'CUSTOMER' | 'COMPANY' | 'DRIVER' | 'SYSTEM';
  reporterId: string;
  subject: string;
  description: string;
  evidence: DisputeEvidence[];
  financialImpact: {
    disputedAmount: number;
    potentialRefund: number;
    commissionImpact: number;
  };
  timeline: DisputeTimelineEntry[];
  assignedTo?: string;
  resolution?: DisputeResolution;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
}

interface DisputeEvidence {
  id: string;
  type: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'SYSTEM_LOG';
  title: string;
  description?: string;
  fileUrl?: string;
  content?: string;
  uploadedBy: string;
  uploadedAt: Date;
  verified: boolean;
}

interface DisputeTimelineEntry {
  id: string;
  action: 'CREATED' | 'UPDATED' | 'EVIDENCE_ADDED' | 'ASSIGNED' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  description: string;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, any>;
}

interface DisputeResolution {
  outcome: 'CUSTOMER_FAVOR' | 'COMPANY_FAVOR' | 'PARTIAL_REFUND' | 'NO_ACTION' | 'ESCALATED';
  refundAmount: number;
  commissionAdjustment: number;
  reasoning: string;
  resolvedBy: string;
  resolvedAt: Date;
  customerNotified: boolean;
  companyNotified: boolean;
}

interface Refund {
  id: string;
  bookingId: string;
  disputeId?: string;
  refundType: 'FULL' | 'PARTIAL' | 'COMMISSION_ONLY' | 'PROCESSING_FEE';
  reason: 'DISPUTE_RESOLUTION' | 'CANCELLATION' | 'SERVICE_FAILURE' | 'SYSTEM_ERROR' | 'GOODWILL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  originalAmount: number;
  refundAmount: number;
  commissionRefund: number;
  processingFee: number;
  netRefund: number;
  paymentMethod: string;
  paymentReference?: string;
  requestedBy: string;
  approvedBy?: string;
  processedBy?: string;
  customerNotified: boolean;
  timeline: RefundTimelineEntry[];
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

interface RefundTimelineEntry {
  id: string;
  action: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  description: string;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, any>;
}

interface DisputeStatistics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  resolutionRate: number;
  customerFavorRate: number;
  companyFavorRate: number;
  totalFinancialImpact: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

interface RefundStatistics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  refundRate: number;
  processingTime: number;
  successRate: number;
  byReason: Record<string, { count: number; amount: number }>;
  byType: Record<string, { count: number; amount: number }>;
}

interface DisputeManagementProps {
  className?: string;
}

const DisputeManagement: React.FC<DisputeManagementProps> = ({ className = '' }) => {
  const { token } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputeStats, setDisputeStats] = useState<DisputeStatistics | null>(null);
  const [refundStats, setRefundStats] = useState<RefundStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('disputes');

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'INVESTIGATING': return 'bg-yellow-100 text-yellow-800';
      case 'ESCALATED': return 'bg-red-100 text-red-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch disputes
  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        console.warn('No authentication token available for disputes');
        // Use mock data when not authenticated
        setMockDisputeData();
        setMockRefundData();
        setMockStatistics();
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/platform-admin/financial/disputes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDisputes(data.data || []);
      } else {
        throw new Error('Failed to fetch disputes');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load disputes';
      
      // Check for authentication errors
      if (errorMessage.includes('Authentication') || errorMessage.includes('token') || errorMessage.includes('401')) {
        setError('Authentication expired. Please refresh the page and log in again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(errorMessage);
      }
      
      console.error('Error fetching disputes:', err);
      
      // Set mock data for development
      setMockDisputeData();
    } finally {
      setLoading(false);
    }
  };

  // Fetch refunds
  const fetchRefunds = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/platform-admin/financial/refunds/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRefunds(data.data.refunds || []);
      }
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setMockRefundData();
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Fetch dispute statistics
      const disputeStatsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/platform-admin/financial/disputes/statistics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (disputeStatsResponse.ok) {
        const disputeStatsData = await disputeStatsResponse.json();
        setDisputeStats(disputeStatsData.data);
      }

      // Fetch refund statistics
      const refundStatsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/platform-admin/financial/refunds/statistics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (refundStatsResponse.ok) {
        const refundStatsData = await refundStatsResponse.json();
        setRefundStats(refundStatsData.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setMockStatistics();
    }
  };

  // Set mock dispute data
  const setMockDisputeData = () => {
    const mockDisputes: Dispute[] = [
      {
        id: 'dispute-1',
        bookingId: 'booking-123',
        disputeType: 'PAYMENT',
        status: 'INVESTIGATING',
        priority: 'HIGH',
        reportedBy: 'CUSTOMER',
        reporterId: 'user-456',
        subject: 'Payment not processed correctly',
        description: 'Customer claims payment was charged twice for the same booking',
        evidence: [
          {
            id: 'evidence-1',
            type: 'DOCUMENT',
            title: 'Bank Statement',
            description: 'Shows duplicate charges',
            fileUrl: '/uploads/evidence/bank-statement.pdf',
            uploadedBy: 'user-456',
            uploadedAt: new Date('2024-12-01'),
            verified: false
          }
        ],
        financialImpact: {
          disputedAmount: 2500,
          potentialRefund: 2500,
          commissionImpact: 375
        },
        timeline: [
          {
            id: 'timeline-1',
            action: 'CREATED',
            description: 'Dispute created by customer',
            performedBy: 'user-456',
            performedAt: new Date('2024-12-01')
          },
          {
            id: 'timeline-2',
            action: 'ASSIGNED',
            description: 'Assigned to support agent',
            performedBy: 'admin-1',
            performedAt: new Date('2024-12-01')
          }
        ],
        assignedTo: 'admin-1',
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-01')
      },
      {
        id: 'dispute-2',
        bookingId: 'booking-789',
        disputeType: 'SERVICE',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        reportedBy: 'COMPANY',
        reporterId: 'company-123',
        subject: 'Vehicle damage during transport',
        description: 'Customer vehicle was damaged during transport service',
        evidence: [
          {
            id: 'evidence-2',
            type: 'IMAGE',
            title: 'Damage Photos',
            description: 'Photos of vehicle damage',
            fileUrl: '/uploads/evidence/damage-photos.jpg',
            uploadedBy: 'company-123',
            uploadedAt: new Date('2024-11-28'),
            verified: true
          }
        ],
        financialImpact: {
          disputedAmount: 1800,
          potentialRefund: 900,
          commissionImpact: 135
        },
        timeline: [
          {
            id: 'timeline-3',
            action: 'CREATED',
            description: 'Dispute created by company',
            performedBy: 'company-123',
            performedAt: new Date('2024-11-28')
          },
          {
            id: 'timeline-4',
            action: 'RESOLVED',
            description: 'Resolved with partial refund',
            performedBy: 'admin-2',
            performedAt: new Date('2024-11-30')
          }
        ],
        assignedTo: 'admin-2',
        resolution: {
          outcome: 'PARTIAL_REFUND',
          refundAmount: 900,
          commissionAdjustment: 135,
          reasoning: 'Partial responsibility determined based on evidence',
          resolvedBy: 'admin-2',
          resolvedAt: new Date('2024-11-30'),
          customerNotified: true,
          companyNotified: true
        },
        createdAt: new Date('2024-11-28'),
        updatedAt: new Date('2024-11-30'),
        resolvedAt: new Date('2024-11-30')
      }
    ];

    setDisputes(mockDisputes);
  };

  // Set mock refund data
  const setMockRefundData = () => {
    const mockRefunds: Refund[] = [
      {
        id: 'refund-1',
        bookingId: 'booking-123',
        disputeId: 'dispute-1',
        refundType: 'FULL',
        reason: 'DISPUTE_RESOLUTION',
        status: 'COMPLETED',
        originalAmount: 2500,
        refundAmount: 2500,
        commissionRefund: 375,
        processingFee: 25,
        netRefund: 2475,
        paymentMethod: 'CREDIT_CARD',
        paymentReference: 'ref-123456',
        requestedBy: 'admin-1',
        approvedBy: 'admin-2',
        processedBy: 'system',
        customerNotified: true,
        timeline: [
          {
            id: 'refund-timeline-1',
            action: 'REQUESTED',
            description: 'Refund requested due to dispute resolution',
            performedBy: 'admin-1',
            performedAt: new Date('2024-12-01')
          },
          {
            id: 'refund-timeline-2',
            action: 'APPROVED',
            description: 'Refund approved by supervisor',
            performedBy: 'admin-2',
            performedAt: new Date('2024-12-01')
          },
          {
            id: 'refund-timeline-3',
            action: 'COMPLETED',
            description: 'Refund processed successfully',
            performedBy: 'system',
            performedAt: new Date('2024-12-02')
          }
        ],
        createdAt: new Date('2024-12-01'),
        processedAt: new Date('2024-12-01'),
        completedAt: new Date('2024-12-02')
      }
    ];

    setRefunds(mockRefunds);
  };

  // Set mock statistics
  const setMockStatistics = () => {
    setDisputeStats({
      totalDisputes: 45,
      openDisputes: 12,
      resolvedDisputes: 33,
      averageResolutionTime: 48,
      resolutionRate: 73.3,
      customerFavorRate: 45.5,
      companyFavorRate: 27.3,
      totalFinancialImpact: 125000,
      byType: {
        'PAYMENT': 18,
        'SERVICE': 15,
        'CANCELLATION': 8,
        'DAMAGE': 3,
        'OTHER': 1
      },
      byPriority: {
        'LOW': 15,
        'MEDIUM': 20,
        'HIGH': 8,
        'URGENT': 2
      },
      byStatus: {
        'OPEN': 5,
        'INVESTIGATING': 7,
        'ESCALATED': 0,
        'RESOLVED': 30,
        'CLOSED': 3
      }
    });

    setRefundStats({
      totalRefunds: 28,
      totalRefundAmount: 67500,
      averageRefundAmount: 2410,
      refundRate: 2.8,
      processingTime: 24,
      successRate: 96.4,
      byReason: {
        'DISPUTE_RESOLUTION': { count: 15, amount: 35000 },
        'CANCELLATION': { count: 8, amount: 18000 },
        'SERVICE_FAILURE': { count: 3, amount: 9500 },
        'SYSTEM_ERROR': { count: 1, amount: 2500 },
        'GOODWILL': { count: 1, amount: 2500 }
      },
      byType: {
        'FULL': { count: 12, amount: 45000 },
        'PARTIAL': { count: 14, amount: 20000 },
        'COMMISSION_ONLY': { count: 2, amount: 2500 },
        'PROCESSING_FEE': { count: 0, amount: 0 }
      }
    });
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  useEffect(() => {
    fetchDisputes();
    fetchRefunds();
    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading dispute data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">
            Manage disputes and process refunds across the platform
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchDisputes}>
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

      {/* Statistics Cards */}
      {disputeStats && refundStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Disputes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{disputeStats.totalDisputes}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Open:</span>
                <Badge variant="secondary" className="text-xs">
                  {disputeStats.openDisputes}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(disputeStats.resolutionRate)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Avg time:</span>
                <Badge variant="secondary" className="text-xs">
                  {disputeStats.averageResolutionTime}h
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Total Refunds */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{refundStats.totalRefunds}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Success rate:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatPercentage(refundStats.successRate)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Financial Impact */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financial Impact</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(disputeStats.totalFinancialImpact)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="mr-1">Refund amount:</span>
                <Badge variant="secondary" className="text-xs">
                  {formatCurrency(refundStats.totalRefundAmount)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disputes.map(dispute => (
                  <div key={dispute.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{dispute.subject}</h4>
                          <Badge className={getPriorityColor(dispute.priority)}>
                            {dispute.priority}
                          </Badge>
                          <Badge className={getStatusColor(dispute.status)}>
                            {dispute.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {dispute.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                          <span>Booking: {dispute.bookingId}</span>
                          <span>Type: {dispute.disputeType}</span>
                          <span>Reported by: {dispute.reportedBy}</span>
                          <span>Amount: {formatCurrency(dispute.financialImpact.disputedAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Refunds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refunds.map(refund => (
                  <div key={refund.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">Refund #{refund.id}</h4>
                          <Badge className={getStatusColor(refund.status)}>
                            {refund.status}
                          </Badge>
                          <Badge variant="outline">
                            {refund.refundType}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                          <span>Booking: {refund.bookingId}</span>
                          <span>Reason: {refund.reason}</span>
                          <span>Amount: {formatCurrency(refund.refundAmount)}</span>
                          <span>Method: {refund.paymentMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dispute Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Dispute Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">By Type</Label>
                    <div className="space-y-2 mt-2">
                      {disputeStats && Object.entries(disputeStats.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm">{type}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">By Priority</Label>
                    <div className="space-y-2 mt-2">
                      {disputeStats && Object.entries(disputeStats.byPriority).map(([priority, count]) => (
                        <div key={priority} className="flex justify-between items-center">
                          <span className="text-sm">{priority}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Refund Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Refund Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">By Reason</Label>
                    <div className="space-y-2 mt-2">
                      {refundStats && Object.entries(refundStats.byReason).map(([reason, data]) => (
                        <div key={reason} className="flex justify-between items-center">
                          <span className="text-sm">{reason}</span>
                          <div className="text-right">
                            <Badge variant="secondary">{data.count}</Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(data.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DisputeManagement;