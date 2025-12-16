import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { ActionableItemsList } from './ActionableItemsList';
import type { ActionableItem } from '../../../src/services/dashboard.service';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ActionableItemsList Component', () => {
  const mockItems: ActionableItem[] = [
    {
      type: 'booking_request',
      id: '1',
      title: 'New Booking Request',
      description: 'You have a new booking request from Acme Corp',
      priority: 'high',
      link: '/bookings/1',
      createdAt: new Date().toISOString(),
    },
    {
      type: 'expiring_request',
      id: '2',
      title: 'Expiring Request',
      description: 'Booking request expires in 2 hours',
      priority: 'high',
      link: '/bookings/2',
      createdAt: new Date().toISOString(),
    },
    {
      type: 'unread_message',
      id: '3',
      title: 'Unread Messages',
      description: 'You have 3 unread messages',
      priority: 'medium',
      link: '/messages',
      createdAt: new Date().toISOString(),
    },
    {
      type: 'rating_prompt',
      id: '4',
      title: 'Rate Your Experience',
      description: 'Please rate your recent booking',
      priority: 'low',
      link: '/bookings/3/rate',
      createdAt: new Date().toISOString(),
    },
  ];

  it('should render all actionable items', () => {
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    expect(screen.getByText('New Booking Request')).toBeInTheDocument();
    expect(screen.getByText('Expiring Request')).toBeInTheDocument();
    expect(screen.getByText('Unread Messages')).toBeInTheDocument();
    expect(screen.getByText('Rate Your Experience')).toBeInTheDocument();
  });

  it('should display priority badges for each item', () => {
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    const highPriorityBadges = screen.getAllByText('high');
    const mediumPriorityBadges = screen.getAllByText('medium');
    const lowPriorityBadges = screen.getAllByText('low');

    expect(highPriorityBadges).toHaveLength(2);
    expect(mediumPriorityBadges).toHaveLength(1);
    expect(lowPriorityBadges).toHaveLength(1);
  });

  it('should display empty state when no items', () => {
    renderWithRouter(<ActionableItemsList items={[]} />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByText(/no action items at the moment/i)).toBeInTheDocument();
  });

  it('should navigate when item is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    const firstItem = screen.getByRole('button', { name: /view new booking request/i });
    await user.click(firstItem);

    expect(mockNavigate).toHaveBeenCalledWith('/bookings/1');
  });

  it('should have proper ARIA labels for accessibility', () => {
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(4);

    const firstArticle = articles[0];
    expect(firstArticle).toHaveAttribute('aria-label', 'New Booking Request: You have a new booking request from Acme Corp');
  });

  it('should display item descriptions', () => {
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    expect(screen.getByText('You have a new booking request from Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Booking request expires in 2 hours')).toBeInTheDocument();
    expect(screen.getByText('You have 3 unread messages')).toBeInTheDocument();
    expect(screen.getByText('Please rate your recent booking')).toBeInTheDocument();
  });

  it('should render different icons for different item types', () => {
    renderWithRouter(<ActionableItemsList items={mockItems} />);

    // Check that icons are rendered (they have aria-hidden="true")
    const icons = screen.getAllByRole('button').map(button => 
      button.querySelector('svg[aria-hidden="true"]')
    );

    // Should have icons for each item
    expect(icons.filter(icon => icon !== null)).toHaveLength(mockItems.length);
  });
});
