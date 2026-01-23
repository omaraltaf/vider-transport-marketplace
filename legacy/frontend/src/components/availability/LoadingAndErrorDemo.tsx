/**
 * Demo component to showcase loading and error states
 * This is for development/testing purposes only
 */

import React, { useState } from 'react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { CalendarView } from './CalendarView';
import { BlockForm } from './BlockForm';
import { RecurringBlockForm } from './RecurringBlockForm';
import { ErrorBoundary } from './ErrorBoundary';

export const LoadingAndErrorDemo: React.FC = () => {
  const [calendarState, setCalendarState] = useState<'loading' | 'error' | 'success'>('success');
  const [blockFormState, setBlockFormState] = useState<'loading' | 'success'>('success');
  const [recurringFormState, setRecurringFormState] = useState<'loading' | 'success'>('success');

  const mockCalendarData = [
    {
      date: new Date(2025, 11, 15),
      status: 'available' as const,
    },
    {
      date: new Date(2025, 11, 16),
      status: 'blocked' as const,
      blockReason: 'Maintenance',
    },
    {
      date: new Date(2025, 11, 17),
      status: 'booked' as const,
      bookingNumber: 'BK-12345',
    },
  ];

  const handleRetry = () => {
    setCalendarState('loading');
    setTimeout(() => setCalendarState('success'), 2000);
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-8">
        <Card padding="lg">
          <h1 className="text-2xl font-bold mb-4">Loading and Error States Demo</h1>
          <p className="text-gray-600 mb-6">
            This demo showcases the loading and error states for availability calendar components.
          </p>

          <div className="flex gap-4 mb-6">
            <Button
              variant={calendarState === 'loading' ? 'primary' : 'outline'}
              onClick={() => setCalendarState('loading')}
            >
              Loading State
            </Button>
            <Button
              variant={calendarState === 'error' ? 'primary' : 'outline'}
              onClick={() => setCalendarState('error')}
            >
              Error State
            </Button>
            <Button
              variant={calendarState === 'success' ? 'primary' : 'outline'}
              onClick={() => setCalendarState('success')}
            >
              Success State
            </Button>
          </div>
        </Card>

        {/* Calendar View Demo */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold mb-4">Calendar View</h2>
          <CalendarView
            listingId="demo-listing"
            listingType="vehicle"
            mode="view"
            loading={calendarState === 'loading'}
            error={calendarState === 'error' ? 'Failed to load calendar data. Please check your connection.' : null}
            onRetry={handleRetry}
            calendarData={calendarState === 'success' ? mockCalendarData : []}
            showExport={true}
          />
        </Card>

        {/* Block Form Demo */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold mb-4">Block Form</h2>
          <div className="flex gap-4 mb-4">
            <Button
              variant={blockFormState === 'loading' ? 'primary' : 'outline'}
              onClick={() => setBlockFormState('loading')}
            >
              Loading
            </Button>
            <Button
              variant={blockFormState === 'success' ? 'primary' : 'outline'}
              onClick={() => setBlockFormState('success')}
            >
              Normal
            </Button>
          </div>
          <BlockForm
            listingId="demo-listing"
            listingType="vehicle"
            loading={blockFormState === 'loading'}
            onBlockCreated={() => console.log('Block created')}
            onCancel={() => console.log('Cancelled')}
          />
        </Card>

        {/* Recurring Block Form Demo */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold mb-4">Recurring Block Form</h2>
          <div className="flex gap-4 mb-4">
            <Button
              variant={recurringFormState === 'loading' ? 'primary' : 'outline'}
              onClick={() => setRecurringFormState('loading')}
            >
              Loading
            </Button>
            <Button
              variant={recurringFormState === 'success' ? 'primary' : 'outline'}
              onClick={() => setRecurringFormState('success')}
            >
              Normal
            </Button>
          </div>
          <RecurringBlockForm
            listingId="demo-listing"
            listingType="vehicle"
            loading={recurringFormState === 'loading'}
            onBlockCreated={() => console.log('Recurring block created')}
            onCancel={() => console.log('Cancelled')}
          />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

LoadingAndErrorDemo.displayName = 'LoadingAndErrorDemo';