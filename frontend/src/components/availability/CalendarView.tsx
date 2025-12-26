import React, { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Card, Button, Badge, Modal, Input } from '../../design-system/components';
import { Toast } from '../../design-system/components/Toast';
import { CalendarSkeleton } from './CalendarSkeleton';
import { ErrorState } from './ErrorState';
import { ErrorBoundary } from './ErrorBoundary';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import styles from './CalendarView.module.css';

export interface CalendarDay {
  date: Date;
  status: 'available' | 'blocked' | 'booked';
  blockReason?: string;
  bookingId?: string;
  bookingNumber?: string;
}

export interface CalendarViewProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  mode: 'view' | 'manage'; // view for renters, manage for providers
  calendarData?: CalendarDay[];
  onDateSelect?: (startDate: Date, endDate: Date) => void;
  onMonthChange?: (year: number, month: number) => void;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
  showExport?: boolean; // Show export button (only for providers)
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CalendarViewComponent: React.FC<CalendarViewProps> = ({
  listingId,
  listingType,
  mode,
  calendarData = [],
  onDateSelect,
  onMonthChange,
  loading = false,
  error = null,
  onRetry,
  className = '',
  showExport = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  
  // Calendar data fetching state
  const [internalCalendarData, setInternalCalendarData] = useState<CalendarDay[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Touch/swipe handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const minSwipeDistance = 50; // Minimum distance for a swipe

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextMonth();
    } else if (isRightSwipe) {
      handlePreviousMonth();
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // State for keyboard navigation within calendar grid
  const [focusedDateIndex, setFocusedDateIndex] = useState<number | null>(null);
  const [announceMessage, setAnnounceMessage] = useState<string>('');

  // Announce message for screen readers
  const announce = (message: string) => {
    setAnnounceMessage(message);
    // Clear after a short delay to allow re-announcement of same message
    setTimeout(() => setAnnounceMessage(''), 100);
  };

  // Fetch calendar data when component mounts or month changes
  const fetchCalendarData = useCallback(async () => {
    if (!listingId || !listingType) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const validToken = await tokenManager.getValidToken();

      // Calculate date range for current month
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);

      const response = await apiClient.get<{
        listingId: string;
        listingType: string;
        startDate: string;
        endDate: string;
        days: Array<{
          date: string;
          status: 'available' | 'blocked' | 'booked';
          blockId?: string;
          reason?: string;
          bookingId?: string;
          bookingNumber?: string;
          isRecurring?: boolean;
        }>;
      }>(
        `/availability/calendar/${listingId}?listingType=${listingType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        validToken
      );

      // Transform API response to CalendarDay format
      const calendarDays: CalendarDay[] = response.days.map(day => ({
        date: new Date(day.date),
        status: day.status,
        blockReason: day.reason,
        bookingId: day.bookingId,
        bookingNumber: day.bookingNumber,
      }));

      setInternalCalendarData(calendarDays);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar data';
      setInternalError(errorMessage);
    } finally {
      setInternalLoading(false);
    }
  }, [listingId, listingType, currentYear, currentMonth]);

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Use provided calendarData or internal data
  const effectiveCalendarData = calendarData.length > 0 ? calendarData : internalCalendarData;
  const effectiveLoading = loading || internalLoading;
  const effectiveError = error || internalError;

  // Generate calendar grid for current month (must be before keyboard navigation useEffect)
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const grid: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      grid.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(new Date(currentYear, currentMonth, day));
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Keyboard navigation (must be after calendarGrid definition)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (!calendarRef.current?.contains(activeElement)) return;

      // Check if we're on a day cell
      const isDayCell = activeElement?.getAttribute('role') === 'gridcell';
      
      if (!isDayCell) {
        // Handle month navigation when focus is on navigation buttons
        switch (e.key) {
          case 'ArrowLeft':
            if (activeElement?.getAttribute('aria-label')?.includes('Previous month')) {
              e.preventDefault();
              handlePreviousMonth();
            }
            break;
          case 'ArrowRight':
            if (activeElement?.getAttribute('aria-label')?.includes('Next month')) {
              e.preventDefault();
              handleNextMonth();
            }
            break;
        }
        return;
      }

      // Get current focused date index
      const currentIndex = focusedDateIndex ?? 0;
      const validDates = calendarGrid.filter(d => d !== null);
      const currentDate = validDates[currentIndex];

      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(validDates.length - 1, currentIndex + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(0, currentIndex - 7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(validDates.length - 1, currentIndex + 7);
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = validDates.length - 1;
          break;
        case 'PageUp':
          e.preventDefault();
          handlePreviousMonth();
          announce(`Moved to ${MONTHS[currentMonth - 1 < 0 ? 11 : currentMonth - 1]}`);
          return;
        case 'PageDown':
          e.preventDefault();
          handleNextMonth();
          announce(`Moved to ${MONTHS[currentMonth + 1 > 11 ? 0 : currentMonth + 1]}`);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentDate) {
            handleDateClick(currentDate);
            const dayStatus = getDateStatus(currentDate);
            const status = dayStatus?.status || 'available';
            announce(`Selected ${currentDate.toLocaleDateString()}, ${status}`);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setSelectedStartDate(null);
          setSelectedEndDate(null);
          announce('Selection cleared');
          return;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        setFocusedDateIndex(newIndex);
        const newDate = validDates[newIndex];
        if (newDate) {
          const dayStatus = getDateStatus(newDate);
          const status = dayStatus?.status || 'available';
          announce(`${newDate.toLocaleDateString()}, ${status}`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentDate, focusedDateIndex, calendarGrid]);

  // Get status for a specific date - memoized for performance
  const getDateStatus = useCallback((date: Date): CalendarDay | undefined => {
    return effectiveCalendarData.find(
      (day) =>
        day.date.getFullYear() === date.getFullYear() &&
        day.date.getMonth() === date.getMonth() &&
        day.date.getDate() === date.getDate()
    );
  }, [effectiveCalendarData]);

  // Check if date is in selected range - memoized for performance
  const isInSelectedRange = useCallback((date: Date): boolean => {
    if (!selectedStartDate) return false;
    
    const endDate = hoveredDate || selectedEndDate;
    if (!endDate) return false;

    const start = selectedStartDate < endDate ? selectedStartDate : endDate;
    const end = selectedStartDate < endDate ? endDate : selectedStartDate;

    return date >= start && date <= end;
  }, [selectedStartDate, selectedEndDate, hoveredDate]);

  // Check if date is selected - memoized for performance
  const isSelected = useCallback((date: Date): boolean => {
    if (!selectedStartDate) return false;
    
    if (selectedStartDate.getTime() === date.getTime()) return true;
    if (selectedEndDate && selectedEndDate.getTime() === date.getTime()) return true;
    
    return false;
  }, [selectedStartDate, selectedEndDate]);

  // Handle date click - memoized for performance
  const handleDateClick = useCallback((date: Date) => {
    if (mode === 'view' && onDateSelect) {
      const dayStatus = getDateStatus(date);
      
      // Don't allow selection of blocked or booked dates
      if (dayStatus && (dayStatus.status === 'blocked' || dayStatus.status === 'booked')) {
        return;
      }

      if (!selectedStartDate) {
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      } else if (!selectedEndDate) {
        const start = selectedStartDate < date ? selectedStartDate : date;
        const end = selectedStartDate < date ? date : selectedStartDate;
        
        // Check if any dates in range are blocked/booked
        const hasConflict = calendarData.some((day) => {
          const dayDate = day.date;
          return (
            dayDate >= start &&
            dayDate <= end &&
            (day.status === 'blocked' || day.status === 'booked')
          );
        });

        if (!hasConflict) {
          setSelectedEndDate(date);
          onDateSelect(start, end);
        }
      } else {
        // Reset selection
        setSelectedStartDate(date);
        setSelectedEndDate(null);
      }
    }
  }, [mode, onDateSelect, selectedStartDate, selectedEndDate, calendarData, getDateStatus]);

  // Handle month navigation - memoized for performance
  const handlePreviousMonth = useCallback(() => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth());
    }
  }, [currentYear, currentMonth, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentDate(newDate);
    if (onMonthChange) {
      onMonthChange(newDate.getFullYear(), newDate.getMonth());
    }
  }, [currentYear, currentMonth, onMonthChange]);

  // Get tooltip content for a date - memoized for performance
  const getTooltipContent = useCallback((date: Date): string | null => {
    const dayStatus = getDateStatus(date);
    if (!dayStatus) return null;

    switch (dayStatus.status) {
      case 'blocked':
        return dayStatus.blockReason || 'Unavailable';
      case 'booked':
        return `Booked${dayStatus.bookingNumber ? ` - ${dayStatus.bookingNumber}` : ''}`;
      case 'available':
        return 'Available';
      default:
        return null;
    }
  }, [getDateStatus]);

  // Handle export
  const handleExport = () => {
    // Set default date range (current month to 3 months ahead)
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    setExportStartDate(today.toISOString().split('T')[0]);
    setExportEndDate(threeMonthsLater.toISOString().split('T')[0]);
    setExportError(null);
    setExportSuccess(false);
    setShowExportModal(true);
  };

  // Handle export confirmation
  const handleExportConfirm = async () => {
    setExportError(null);
    setExportSuccess(false);

    // Validate dates
    if (!exportStartDate || !exportEndDate) {
      setExportError('Please select both start and end dates');
      return;
    }

    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);

    if (start > end) {
      setExportError('Start date must be before or equal to end date');
      return;
    }

    setIsExporting(true);

    try {
      // Get auth token from tokenManager
      const validToken = await tokenManager.getValidToken();

      // Build export URL with query parameters
      const params = new URLSearchParams({
        listingType,
        startDate: exportStartDate,
        endDate: exportEndDate,
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/availability/export/${listingId}?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${validToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: { message: 'Export failed' },
        }));
        throw new Error(error.error?.message || 'Export failed');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${listingType}-${listingId}-availability.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => {
        setShowExportModal(false);
        setExportSuccess(false);
      }, 2000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Focus management - focus the appropriate date cell when focusedDateIndex changes
  useEffect(() => {
    if (focusedDateIndex !== null && calendarRef.current) {
      const validDates = calendarGrid.filter(d => d !== null);
      const targetDate = validDates[focusedDateIndex];
      if (targetDate) {
        const dateString = targetDate.toISOString();
        const cellElement = calendarRef.current.querySelector(
          `[data-date="${dateString}"]`
        ) as HTMLElement;
        if (cellElement) {
          cellElement.focus();
        }
      }
    }
  }, [focusedDateIndex, calendarGrid]);

  // Show loading skeleton
  if (effectiveLoading) {
    return (
      <ErrorBoundary>
        <CalendarSkeleton className={className} />
      </ErrorBoundary>
    );
  }

  // Show error state
  if (effectiveError) {
    const errorVariant = effectiveError.toString().toLowerCase().includes('network') || 
                        effectiveError.toString().toLowerCase().includes('fetch') ? 'network' :
                        effectiveError.toString().toLowerCase().includes('permission') || 
                        effectiveError.toString().toLowerCase().includes('unauthorized') ? 'permission' :
                        effectiveError.toString().toLowerCase().includes('not found') ? 'notFound' : 'default';

    return (
      <ErrorBoundary>
        <ErrorState
          error={effectiveError}
          onRetry={onRetry || fetchCalendarData}
          variant={errorVariant}
          className={className}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {announceMessage}
      </div>

      <Card 
        className={`${styles.calendarContainer} ${className}`} 
        padding="lg"
        ref={calendarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Keyboard instructions for screen readers */}
        <div className={styles.srOnly} id="calendar-instructions">
          Use arrow keys to navigate between dates. Press Enter or Space to select a date. 
          Press Escape to clear selection. Use Page Up and Page Down to change months. 
          Press Home to go to the first day, End to go to the last day of the month.
        </div>

        {/* Calendar Header */}
        <div className={styles.calendarHeader}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
            aria-label={`Previous month, go to ${MONTHS[currentMonth - 1 < 0 ? 11 : currentMonth - 1]}`}
            leftIcon={<ChevronLeft size={20} />}
          >
            Previous
          </Button>
          
          <h2 
            className={styles.monthTitle}
            id="calendar-month-year"
            aria-live="polite"
          >
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          
          <div className={styles.headerActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              aria-label={`Next month, go to ${MONTHS[currentMonth + 1 > 11 ? 0 : currentMonth + 1]}`}
              rightIcon={<ChevronRight size={20} />}
            >
              Next
            </Button>
            
            {showExport && mode === 'manage' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                leftIcon={<Download size={16} />}
                aria-label="Export calendar to iCalendar format"
              >
                Export
              </Button>
            )}
          </div>
        </div>

      {/* Legend */}
      <div className={styles.legend} id="calendar-legend" role="group" aria-label="Calendar legend">
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.available}`} aria-hidden="true" />
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.blocked}`} aria-hidden="true" />
          <span>Blocked</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.booked}`} aria-hidden="true" />
          <span>Booked</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className={styles.calendar}
        role="grid"
        aria-label={`Availability calendar for ${MONTHS[currentMonth]} ${currentYear}`}
        aria-describedby="calendar-instructions calendar-legend"
        aria-labelledby="calendar-month-year"
      >
        {/* Day headers */}
        <div className={styles.dayHeaders} role="row">
          {DAYS_OF_WEEK.map((day, index) => (
            <div
              key={day}
              className={styles.dayHeader}
              role="columnheader"
              aria-label={`${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}`}
            >
              <span aria-hidden="true">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className={styles.daysGrid} role="rowgroup">
          {calendarGrid.map((date, index) => (
            <CalendarDayCell
              key={date ? date.toISOString() : `empty-${index}`}
              date={date}
              index={index}
              dayStatus={date ? getDateStatus(date) : undefined}
              isToday={date ? (
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()
              ) : false}
              inRange={date ? isInSelectedRange(date) : false}
              selected={date ? isSelected(date) : false}
              tooltipContent={date ? getTooltipContent(date) : null}
              calendarGrid={calendarGrid}
              onDateClick={handleDateClick}
              onMouseEnter={setHoveredDate}
              onMouseLeave={() => setHoveredDate(null)}
              onFocus={setFocusedDateIndex}
              announce={announce}
            />
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite">
          <div className={styles.spinner} aria-label="Loading calendar data" />
          <span className={styles.srOnly}>Loading calendar data</span>
        </div>
      )}
    </Card>

    {/* Export Modal */}
    {showExportModal && (
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Calendar"
        size="md"
      >
        <div className={styles.exportModal}>
          <p className={styles.exportDescription}>
            Export your availability calendar in iCalendar format (.ics) to import into other calendar applications.
          </p>

          <div className={styles.exportForm}>
            <Input
              label="Start Date"
              type="date"
              value={exportStartDate}
              onChange={(value) => setExportStartDate(value)}
              required
              disabled={isExporting}
            />

            <Input
              label="End Date"
              type="date"
              value={exportEndDate}
              onChange={(value) => setExportEndDate(value)}
              required
              disabled={isExporting}
            />
          </div>

          {exportError && (
            <div className={styles.exportError} role="alert">
              {exportError}
            </div>
          )}

          {exportSuccess && (
            <div className={styles.exportSuccess} role="status">
              Calendar exported successfully!
            </div>
          )}

          <div className={styles.exportActions}>
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExportConfirm}
              disabled={isExporting}
              loading={isExporting}
              leftIcon={isExporting ? undefined : <Download size={16} />}
            >
              {isExporting ? 'Exporting...' : 'Export Calendar'}
            </Button>
          </div>
        </div>
      </Modal>
    )}

    {/* Toast notifications */}
    {exportSuccess && (
      <Toast
        id="export-success"
        message="Calendar exported successfully!"
        variant="success"
        onDismiss={() => setExportSuccess(false)}
      />
    )}
    </ErrorBoundary>
  );
};

// Memoized calendar day cell component for performance
interface CalendarDayCellProps {
  date: Date | null;
  index: number;
  dayStatus?: CalendarDay;
  isToday: boolean;
  inRange: boolean;
  selected: boolean;
  tooltipContent: string | null;
  calendarGrid: (Date | null)[];
  onDateClick: (date: Date) => void;
  onMouseEnter: (date: Date | null) => void;
  onMouseLeave: () => void;
  onFocus: (index: number) => void;
  announce: (message: string) => void;
}

const CalendarDayCell = memo<CalendarDayCellProps>(({
  date,
  index,
  dayStatus,
  isToday,
  inRange,
  selected,
  tooltipContent,
  calendarGrid,
  onDateClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  announce,
}) => {
  if (!date) {
    return (
      <div 
        className={styles.emptyCell}
        role="gridcell"
        aria-hidden="true"
      />
    );
  }

  const status = dayStatus?.status || 'available';
  
  // Build comprehensive aria-label
  let ariaLabel = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  if (isToday) {
    ariaLabel += ', today';
  }
  
  ariaLabel += `, ${status}`;
  
  if (dayStatus?.blockReason) {
    ariaLabel += `, reason: ${dayStatus.blockReason}`;
  }
  
  if (dayStatus?.bookingNumber) {
    ariaLabel += `, booking ${dayStatus.bookingNumber}`;
  }
  
  if (selected) {
    ariaLabel += ', selected';
  }
  
  if (status === 'blocked' || status === 'booked') {
    ariaLabel += ', not selectable';
  }

  // Calculate valid date index for keyboard navigation
  const validDates = calendarGrid.filter(d => d !== null);
  const validDateIndex = validDates.findIndex(
    d => d && d.getTime() === date.getTime()
  );

  return (
    <div
      data-date={date.toISOString()}
      className={`${styles.dayCell} ${styles[status]} ${
        isToday ? styles.today : ''
      } ${inRange ? styles.inRange : ''} ${selected ? styles.selected : ''}`}
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={selected}
      aria-disabled={status === 'blocked' || status === 'booked'}
      tabIndex={validDateIndex === 0 ? 0 : -1}
      onClick={() => onDateClick(date)}
      onMouseEnter={() => onMouseEnter(date)}
      onMouseLeave={onMouseLeave}
      onFocus={() => onFocus(validDateIndex)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDateClick(date);
          announce(`Selected ${date.toLocaleDateString()}, ${status}`);
        }
      }}
      title={tooltipContent || undefined}
    >
      <span className={styles.dayNumber} aria-hidden="true">
        {date.getDate()}
      </span>
      {dayStatus && dayStatus.status !== 'available' && (
        <Badge
          variant={dayStatus.status === 'blocked' ? 'warning' : 'info'}
          size="sm"
          className={styles.statusBadge}
          aria-hidden="true"
        >
          {dayStatus.status === 'blocked' ? 'B' : 'R'}
        </Badge>
      )}
    </div>
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

// Memoized CalendarView component for performance
export const CalendarView = memo(CalendarViewComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.listingId === nextProps.listingId &&
    prevProps.listingType === nextProps.listingType &&
    prevProps.mode === nextProps.mode &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.className === nextProps.className &&
    prevProps.showExport === nextProps.showExport &&
    JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
  );
});

CalendarView.displayName = 'CalendarView';
