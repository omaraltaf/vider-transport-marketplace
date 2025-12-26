import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import AdminPanelPage from '../AdminPanelPage';
import { Container, Card, Badge, Button, Stack, FormField, Textarea, Input, Spinner } from '../../design-system/components';

interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: string;
  reason: string;
  description?: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolution?: string;
  refundAmount?: number;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Booking {
  id: string;
  bookingNumber: string;
  renterCompanyId: string;
  providerCompanyId: string;
  status: string;
  startDate: string;
  endDate: string;
  costs: {
    total: number;
    currency: string;
  };
  renterCompany?: {
    id: string;
    name: string;
  };
  providerCompany?: {
    id: string;
    name: string;
  };
}

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: dispute, isLoading: disputeLoading } = useQuery<Dispute>({
    queryKey: ['admin-dispute', id],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<Dispute>(`/admin/disputes/${id}`, validToken);
    },
    enabled: !!id && !!user,
  });

  const { data: booking, isLoading: bookingLoading } = useQuery<Booking>({
    queryKey: ['booking', dispute?.bookingId],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<Booking>(`/bookings/${dispute?.bookingId}`, validToken);
    },
    enabled: !!dispute?.bookingId && !!user,
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: { resolution: string; refundAmount?: number; notes?: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post<Dispute>(`/admin/disputes/${id}/resolve`, data, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      alert('Dispute resolved successfully');
      navigate('/admin/disputes');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error?.message || 'Failed to resolve dispute');
    },
  });

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolution.trim()) {
      alert('Please provide a resolution');
      return;
    }

    const data: any = {
      resolution: resolution.trim(),
      notes: notes.trim() || undefined,
    };

    if (refundAmount && parseFloat(refundAmount) > 0) {
      data.refundAmount = parseFloat(refundAmount);
    }

    resolveMutation.mutate(data);
  };

  if (disputeLoading || bookingLoading) {
    return (
      <AdminPanelPage>
        <Container >
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </Container>
      </AdminPanelPage>
    );
  }

  if (!dispute) {
    return (
      <AdminPanelPage>
        <Container >
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Dispute not found</p>
          </div>
        </Container>
      </AdminPanelPage>
    );
  }

  const isResolved = dispute.status === 'RESOLVED' || dispute.status === 'CLOSED';

  return (
    <AdminPanelPage>
      <Container >
        <Stack spacing="lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/disputes')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <h1 className="text-2xl font-bold text-neutral-900">Dispute Details</h1>
            </div>
            <Badge
              variant={
                dispute.status === 'OPEN'
                  ? 'warning'
                  : dispute.status === 'RESOLVED'
                  ? 'success'
                  : 'default'
              }
            >
              {dispute.status}
            </Badge>
          </div>

          {/* Dispute Information */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Dispute Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium ds-text-gray-700 mb-1">Dispute ID</label>
                <p className="text-sm text-neutral-900">{dispute.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium ds-text-gray-700 mb-1">Created At</label>
                <p className="text-sm text-neutral-900">
                  {new Date(dispute.createdAt).toLocaleString('nb-NO')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium ds-text-gray-700 mb-1">Raised By</label>
                <p className="text-sm text-neutral-900">{dispute.raisedBy}</p>
              </div>
              <div>
                <label className="block text-sm font-medium ds-text-gray-700 mb-1">Reason</label>
                <p className="text-sm text-neutral-900">{dispute.reason}</p>
              </div>
              {dispute.description && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-neutral-900 whitespace-pre-wrap">{dispute.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Booking Information */}
          {booking && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Related Booking</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Booking Number</label>
                  <p className="text-sm text-neutral-900">{booking.bookingNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Status</label>
                  <p className="text-sm text-neutral-900">{booking.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Renter Company</label>
                  <p className="text-sm text-neutral-900">{booking.renterCompany?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Provider Company</label>
                  <p className="text-sm text-neutral-900">{booking.providerCompany?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Rental Period</label>
                  <p className="text-sm text-neutral-900">
                    {new Date(booking.startDate).toLocaleDateString('nb-NO')} -{' '}
                    {new Date(booking.endDate).toLocaleDateString('nb-NO')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-1">Total Amount</label>
                  <p className="text-sm text-neutral-900">
                    {booking.costs.total.toLocaleString('nb-NO', {
                      style: 'currency',
                      currency: booking.costs.currency,
                    })}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Resolution Information (if resolved) */}
          {isResolved && (
            <Card padding="lg" className="bg-success-50 border border-success-200">
              <h2 className="text-lg font-semibold text-success-900 mb-4">Resolution</h2>
              <Stack spacing="md">
                <div>
                  <label className="block text-sm font-medium text-success-700 mb-1">Resolution</label>
                  <p className="text-sm text-success-900 whitespace-pre-wrap">{dispute.resolution}</p>
                </div>
                {dispute.refundAmount && (
                  <div>
                    <label className="block text-sm font-medium text-success-700 mb-1">Refund Amount</label>
                    <p className="text-sm text-success-900">
                      {dispute.refundAmount.toLocaleString('nb-NO', {
                        style: 'currency',
                        currency: booking?.costs.currency || 'NOK',
                      })}
                    </p>
                  </div>
                )}
                {dispute.notes && (
                  <div>
                    <label className="block text-sm font-medium text-success-700 mb-1">Notes</label>
                    <p className="text-sm text-success-900 whitespace-pre-wrap">{dispute.notes}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-success-700 mb-1">Resolved At</label>
                  <p className="text-sm text-success-900">
                    {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString('nb-NO') : 'N/A'}
                  </p>
                </div>
              </Stack>
            </Card>
          )}

          {/* Resolution Form (if not resolved) */}
          {!isResolved && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Resolve Dispute</h2>
              <form onSubmit={handleResolve}>
                <Stack spacing="md">
                  <FormField
                    label="Resolution"
                    required
                    helperText="Describe the resolution"
                  >
                    <Textarea
                      value={resolution}
                      onChange={setResolution}
                      rows={4}
                      placeholder="Describe the resolution..."
                    />
                  </FormField>

                  <FormField
                    label="Refund Amount (optional)"
                    helperText="Leave empty if no refund is issued"
                  >
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={setRefundAmount}
                      placeholder="0.00"
                    />
                  </FormField>

                  <FormField
                    label="Internal Notes (optional)"
                  >
                    <Textarea
                      value={notes}
                      onChange={setNotes}
                      rows={3}
                      placeholder="Add any internal notes..."
                    />
                  </FormField>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => navigate('/admin/disputes')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={resolveMutation.isPending}
                    >
                      Resolve Dispute
                    </Button>
                  </div>
                </Stack>
              </form>
            </Card>
          )}
        </Stack>
      </Container>
    </AdminPanelPage>
  );
}
