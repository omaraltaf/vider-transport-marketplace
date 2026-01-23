/**
 * Billing Page
 * Displays all invoices, receipts, and transaction history for the company
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { Transaction, Booking } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, Badge, Spinner } from '../design-system/components';
import { Download, FileText, Receipt, CreditCard, Calendar, DollarSign } from 'lucide-react';

interface TransactionWithBooking extends Transaction {
  booking: Booking & {
    renterCompany: { name: string };
    providerCompany: { name: string };
  };
}

export default function BillingPage() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'transactions'>('invoices');

  // Fetch all bookings to get invoice/receipt information
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<Booking[]>('/bookings', validToken);
    },
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<TransactionWithBooking[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<TransactionWithBooking[]>('/payments/transactions', validToken);
    },
    enabled: !!user,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Using centralized currency utility
  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const downloadInvoice = async (bookingId: string, bookingNumber: string) => {
    try {
      const validToken = await tokenManager.getValidToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/payments/invoices/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice');
    }
  };

  const downloadReceipt = async (bookingId: string, bookingNumber: string) => {
    try {
      const validToken = await tokenManager.getValidToken();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/payments/receipts/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${bookingNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'COMPLETED':
      case 'CLOSED':
        return 'success';
      case 'PENDING':
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'warning';
      case 'FAILED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'BOOKING_PAYMENT':
        return 'Booking Payment';
      case 'REFUND':
        return 'Refund';
      case 'COMMISSION':
        return 'Commission';
      default:
        return type;
    }
  };

  // Filter bookings that have invoices (ACCEPTED or later status)
  const bookingsWithInvoices = bookings?.filter(
    (booking) => ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CLOSED'].includes(booking.status)
  ) || [];

  // Filter bookings that have receipts (COMPLETED or CLOSED status)
  const bookingsWithReceipts = bookings?.filter(
    (booking) => ['COMPLETED', 'CLOSED'].includes(booking.status)
  ) || [];

  const isLoading = bookingsLoading || transactionsLoading;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-page)' }}>
      <Navbar />
      
      <Container>
        <div style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>
              Billing & Invoices
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
              View and download your invoices, receipts, and transaction history
            </p>
          </div>

          {/* Tabs */}
          <Card padding="sm" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                variant={activeTab === 'invoices' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('invoices')}
                leftIcon={<FileText size={16} />}
              >
                Invoices ({bookingsWithInvoices.length})
              </Button>
              <Button
                variant={activeTab === 'receipts' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('receipts')}
                leftIcon={<Receipt size={16} />}
              >
                Receipts ({bookingsWithReceipts.length})
              </Button>
              <Button
                variant={activeTab === 'transactions' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('transactions')}
                leftIcon={<CreditCard size={16} />}
              >
                Transactions ({transactions?.length || 0})
              </Button>
            </div>
          </Card>

        {isLoading && (
          <Card padding="lg">
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <Spinner size="lg" />
              <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                Loading billing information...
              </p>
            </div>
          </Card>
        )}

        {/* Invoices Tab */}
        {!isLoading && activeTab === 'invoices' && (
          <Card>
            {bookingsWithInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <FileText size={48} style={{ margin: '0 auto', color: 'var(--color-gray-400)' }} />
                <h3 style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-900)' }}>
                  No invoices
                </h3>
                <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                  Invoices will appear here when bookings are confirmed.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {bookingsWithInvoices.map((booking, index) => (
                  <div
                    key={booking.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderTop: index > 0 ? '1px solid var(--color-gray-200)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-primary-600)' }}>
                            Invoice for {booking.bookingNumber}
                          </p>
                          <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                            {booking.status}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <Calendar size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>Issued: {formatDate(booking.respondedAt || booking.createdAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <DollarSign size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>{formatCurrency(booking.costs.total, booking.costs.currency)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(booking.id, booking.bookingNumber)}
                        leftIcon={<Download size={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Receipts Tab */}
        {!isLoading && activeTab === 'receipts' && (
          <Card>
            {bookingsWithReceipts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Receipt size={48} style={{ margin: '0 auto', color: 'var(--color-gray-400)' }} />
                <h3 style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-900)' }}>
                  No receipts
                </h3>
                <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                  Receipts will appear here when bookings are completed.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {bookingsWithReceipts.map((booking, index) => (
                  <div
                    key={booking.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderTop: index > 0 ? '1px solid var(--color-gray-200)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-primary-600)' }}>
                            Receipt for {booking.bookingNumber}
                          </p>
                          <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                            {booking.status}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <Calendar size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>Completed: {formatDate(booking.completedAt || booking.createdAt)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <DollarSign size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>{formatCurrency(booking.costs.total, booking.costs.currency)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(booking.id, booking.bookingNumber)}
                        leftIcon={<Download size={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Transactions Tab */}
        {!isLoading && activeTab === 'transactions' && (
          <Card>
            {!transactions || transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <CreditCard size={48} style={{ margin: '0 auto', color: 'var(--color-gray-400)' }} />
                <h3 style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-900)' }}>
                  No transactions
                </h3>
                <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                  Transaction history will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderTop: index > 0 ? '1px solid var(--color-gray-200)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-900)' }}>
                            {getTransactionTypeLabel(transaction.type)}
                          </p>
                          <Badge variant={getStatusBadgeVariant(transaction.status)} size="sm">
                            {transaction.status}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <FileText size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>{transaction.booking?.bookingNumber || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
                            <Calendar size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <span>{formatDate(transaction.createdAt)}</span>
                          </div>
                          {transaction.booking && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)' }}>
                              {user?.companyId === transaction.booking.renterCompanyId
                                ? `Provider: ${transaction.booking.providerCompany.name}`
                                : `Renter: ${transaction.booking.renterCompany.name}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-gray-900)' }}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        </div>
      </Container>
    </div>
  );
}
