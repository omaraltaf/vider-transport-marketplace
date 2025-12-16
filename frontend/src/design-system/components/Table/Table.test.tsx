import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from './Table';

interface TestData {
  id: number;
  name: string;
  email: string;
}

describe('Table', () => {
  const mockData: TestData[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  const mockColumns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
  ];

  describe('rendering', () => {
    it('renders table with data', () => {
      render(<Table columns={mockColumns} data={mockData} />);

      // Table renders both desktop and mobile views, so we expect multiple instances
      const nameHeaders = screen.getAllByText('Name');
      expect(nameHeaders.length).toBeGreaterThan(0);
      
      expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    });

    it('renders empty state when no data', () => {
      render(<Table columns={mockColumns} data={[]} emptyMessage="No users found" />);

      // Both desktop and mobile views show empty state
      const emptyStates = screen.getAllByText('No users found');
      expect(emptyStates.length).toBeGreaterThan(0);
    });

    it('renders loading skeleton', () => {
      const { container } = render(<Table columns={mockColumns} data={mockData} loading />);

      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('sorting', () => {
    it('calls onSort when sortable column header is clicked', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();

      render(<Table columns={mockColumns} data={mockData} onSort={handleSort} />);

      const nameHeader = screen.getByRole('button', { name: /sort by name/i });
      await user.click(nameHeader);

      expect(handleSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('toggles sort direction on repeated clicks', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();

      render(<Table columns={mockColumns} data={mockData} onSort={handleSort} />);

      const nameHeader = screen.getByRole('button', { name: /sort by name/i });
      
      await user.click(nameHeader);
      expect(handleSort).toHaveBeenCalledWith('name', 'asc');

      await user.click(nameHeader);
      expect(handleSort).toHaveBeenCalledWith('name', 'desc');
    });
  });

  describe('pagination', () => {
    it('renders pagination controls', () => {
      const handlePageChange = vi.fn();

      render(
        <Table
          columns={mockColumns}
          data={mockData}
          pagination={{
            currentPage: 2,
            totalPages: 5,
            onPageChange: handlePageChange,
          }}
        />
      );

      expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /page 2/i })).toBeInTheDocument();
    });

    it('calls onPageChange when page button is clicked', async () => {
      const handlePageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Table
          columns={mockColumns}
          data={mockData}
          pagination={{
            currentPage: 1,
            totalPages: 3,
            onPageChange: handlePageChange,
          }}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next page/i });
      await user.click(nextButton);

      expect(handlePageChange).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          pagination={{
            currentPage: 1,
            totalPages: 3,
            onPageChange: vi.fn(),
          }}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous page/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          pagination={{
            currentPage: 3,
            totalPages: 3,
            onPageChange: vi.fn(),
          }}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next page/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('custom rendering', () => {
    it('uses custom render function for column', () => {
      const columns = [
        {
          key: 'name',
          header: 'Name',
          render: (row: TestData) => <strong data-testid="custom-name">{row.name}</strong>,
        },
      ];

      render(<Table columns={columns} data={[mockData[0]]} />);

      // Both desktop and mobile views render the custom element
      const customElements = screen.getAllByTestId('custom-name');
      expect(customElements.length).toBeGreaterThan(0);
      expect(customElements[0].tagName).toBe('STRONG');
    });
  });

  describe('row keys', () => {
    it('uses custom rowKey function', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          rowKey={(row) => `user-${row.id}`}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });
  });
});
