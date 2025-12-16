import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './Table.module.css';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  mobileLabel?: string; // Label to show in mobile card view
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  pagination,
  onSort,
  className = '',
  rowKey = (_row: T, index: number) => index,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    const newDirection =
      sortConfig?.key === columnKey && sortConfig.direction === 'asc'
        ? 'desc'
        : 'asc';

    setSortConfig({ key: columnKey, direction: newDirection });
    onSort(columnKey, newDirection);
  };

  const renderCellContent = (column: Column<T>, row: T) => {
    if (column.render) {
      return column.render(row);
    }
    return row[column.key];
  };

  const renderLoadingSkeleton = () => (
    <>
      {[...Array(5)].map((_, index) => (
        <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
          {columns.map((column) => (
            <td key={column.key}>
              <div className={styles.skeleton} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  const renderEmptyState = () => (
    <tr>
      <td colSpan={columns.length} className={styles.emptyState}>
        {emptyMessage}
      </td>
    </tr>
  );

  const renderDesktopTable = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={styles.th}>
                {column.sortable && onSort ? (
                  <button
                    className={styles.sortButton}
                    onClick={() => handleSort(column.key)}
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    <span className={styles.sortIcon}>
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )
                      ) : (
                        <ChevronUp size={16} className={styles.sortIconInactive} />
                      )}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? renderLoadingSkeleton()
            : data.length === 0
            ? renderEmptyState()
            : data.map((row, index) => (
                <tr key={rowKey(row, index)} className={styles.tr}>
                  {columns.map((column) => (
                    <td key={column.key} className={styles.td}>
                      {renderCellContent(column, row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileCards = () => (
    <div className={styles.mobileCards}>
      {loading ? (
        [...Array(3)].map((_, index) => (
          <div key={`skeleton-${index}`} className={styles.mobileCard}>
            <div className={styles.skeleton} style={{ height: '80px' }} />
          </div>
        ))
      ) : data.length === 0 ? (
        <div className={styles.emptyState}>{emptyMessage}</div>
      ) : (
        data.map((row, index) => (
          <div key={rowKey(row, index)} className={styles.mobileCard}>
            {columns.map((column) => (
              <div key={column.key} className={styles.mobileCardRow}>
                <div className={styles.mobileCardLabel}>
                  {column.mobileLabel || column.header}
                </div>
                <div className={styles.mobileCardValue}>
                  {renderCellContent(column, row)}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  const renderPagination = () => {
    if (!pagination) return null;

    const { currentPage, totalPages, onPageChange } = pagination;
    const pages = [];

    // Always show first page
    pages.push(1);

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    // Remove duplicates and sort
    const uniquePages = [...new Set(pages)].sort((a, b) => a - b);

    return (
      <div className={styles.pagination}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          Previous
        </Button>

        <div className={styles.pageNumbers}>
          {uniquePages.map((page, index) => {
            // Add ellipsis if there's a gap
            const showEllipsis =
              index > 0 && uniquePages[index - 1] !== page - 1;

            return (
              <React.Fragment key={page}>
                {showEllipsis && <span className={styles.ellipsis}>...</span>}
                <Button
                  variant={currentPage === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </Button>
              </React.Fragment>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    );
  };

  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.desktopView}>{renderDesktopTable()}</div>
      <div className={styles.mobileView}>{renderMobileCards()}</div>
      {renderPagination()}
    </div>
  );
}

Table.displayName = 'Table';
