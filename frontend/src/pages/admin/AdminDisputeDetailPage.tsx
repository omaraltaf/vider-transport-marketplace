import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdminPanelPage from '../AdminPanelPage';

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
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: dispute, isLoading: disputeLoading } = useQuery<Dispute>({
    queryKey: ['admin-dispute', id],
    queryFn: async () => {
      return apiClient.get<Dispute>(`/admin/disputes/${id}`, token!);
    },
    enabled: !!id && !!token,
  });

  const { data: booking, isLoading: bookingLoading } = useQuery<Booking>({
    queryKey: ['booking', dispute?.bookingId],
    queryFn: async () => {
      return apiClient.get<Booking>(`/bookings/${dispute?.bookingId}`, token!);
    },
    enabled: !!dispute?.bookingId && !!token,
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: { resolution: string; refundAmount?: number; notes?: string }) => {
      return apiClient.post<Dispute>(`/admin/disputes/${id}/resolve`, data, token!);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Dispute not found</p>
      </div>
    );
  }

  const isResolved = dispute.status === 'RESOLVED' || dispute.status === 'CLOSED';

  return (
    <AdminPanelPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/disputes')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Dispute Details</h1>
          </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            dispute.status === 'OPEN'
              ? 'bg-yellow-100 text-yellow-800'
              : dispute.status === 'RESOLVED'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {dispute.status}
        </span>
      </div>

      {/* Dispute Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dispute Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dispute ID</label>
            <p className="text-sm text-gray-900">{dispute.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
            <p className="text-sm text-gray-900">
              {new Date(dispute.createdAt).toLocaleString('nb-NO')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raised By</label>
            <p className="text-sm text-gray-900">{dispute.raisedBy}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <p className="text-sm text-gray-900">{dispute.reason}</p>
          </div>
          {dispute.description && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Information */}
      {booking && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Booking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Number</label>
              <p className="text-sm text-gray-900">{booking.bookingNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <p className="text-sm text-gray-900">{booking.status}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renter Company</label>
              <p className="text-sm text-gray-900">{booking.renterCompany?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider Company</label>
              <p className="text-sm text-gray-900">{booking.providerCompany?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rental Period</label>
              <p className="text-sm text-gray-900">
                {new Date(booking.startDate).toLocaleDateString('nb-NO')} -{' '}
                {new Date(booking.endDate).toLocaleDateString('nb-NO')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <p className="text-sm text-gray-900">
                {booking.costs.total.toLocaleString('nb-NO', {
                  style: 'currency',
                  currency: booking.costs.currency,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Information (if resolved) */}
      {isResolved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4">Resolution</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Resolution</label>
              <p className="text-sm text-green-900 whitespace-pre-wrap">{dispute.resolution}</p>
            </div>
            {dispute.refundAmount && (
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Refund Amount</label>
                <p className="text-sm text-green-900">
                  {dispute.refundAmount.toLocaleString('nb-NO', {
                    style: 'currency',
                    currency: booking?.costs.currency || 'NOK',
                  })}
                </p>
              </div>
            )}
            {dispute.notes && (
              <div>
                <label className="block text-sm font-medium text-green-700 mb-1">Notes</label>
                <p className="text-sm text-green-900 whitespace-pre-wrap">{dispute.notes}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Resolved At</label>
              <p className="text-sm text-green-900">
                {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString('nb-NO') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Form (if not resolved) */}
      {!isResolved && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolve Dispute</h2>
          <form onSubmit={handleResolve} className="space-y-4">
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-1">
                Resolution <span className="text-red-500">*</span>
              </label>
              <textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the resolution..."
                required
              />
            </div>

            <div>
              <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Refund Amount (optional)
              </label>
              <input
                type="number"
                id="refundAmount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if no refund is issued
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any internal notes..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/admin/disputes')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolveMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </AdminPanelPage>
  );
}
