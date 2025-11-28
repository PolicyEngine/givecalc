/**
 * Tests for App component - State fetching and data flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import * as api from '../../lib/api';

// Mock the API module
vi.mock('../../lib/api', () => ({
  getStates: vi.fn(),
  getTaxPrograms: vi.fn(),
  calculateDonation: vi.fn(),
  calculateTargetDonation: vi.fn(),
}));

const mockStates = {
  states: [
    { code: 'AL', name: 'Alabama', has_special_programs: false },
    { code: 'CA', name: 'California', has_special_programs: false },
  ],
};

describe('App - State Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while fetching states', async () => {
    // Make getStates return a promise that never resolves
    vi.mocked(api.getStates).mockImplementation(() => new Promise(() => {}));

    render(<App />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders states in dropdown after loading', async () => {
    vi.mocked(api.getStates).mockResolvedValue(mockStates);
    vi.mocked(api.getTaxPrograms).mockResolvedValue({
      federal: { title: 'Federal', description: 'test' },
      state: null,
    });

    render(<App />);

    // Wait for states to load
    await waitFor(() => {
      expect(screen.queryByText('Your information')).toBeInTheDocument();
    });

    // Check that states are in the dropdown
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check specific states are rendered
    expect(screen.getByText('Alabama')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
  });

  it('calls getStates API on mount', async () => {
    vi.mocked(api.getStates).mockResolvedValue(mockStates);
    vi.mocked(api.getTaxPrograms).mockResolvedValue({
      federal: { title: 'Federal', description: 'test' },
      state: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(api.getStates).toHaveBeenCalledTimes(1);
    });
  });
});
