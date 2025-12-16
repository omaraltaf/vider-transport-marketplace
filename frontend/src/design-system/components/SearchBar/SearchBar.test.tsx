import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Search items..." />);
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar value="test query" onChange={() => {}} />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
  });

  it('shows clear button when value is not empty', () => {
    render(<SearchBar value="test" onChange={() => {}} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('clears value when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBar value="test" onChange={handleChange} />);
    
    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);
    
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('calls onClear callback when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();
    render(<SearchBar value="test" onChange={() => {}} onClear={handleClear} />);
    
    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);
    
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading is true', () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} loading />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('hides clear button when loading', () => {
    render(<SearchBar value="test" onChange={() => {}} loading />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<SearchBar value="" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
