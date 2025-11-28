/**
 * Tests for InputForm component - State dropdown functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InputForm from '../InputForm';
import type { StateInfo } from '../../lib/types';
import { DEFAULT_FORM_STATE } from '../../lib/types';

// Mock states data
const mockStates: StateInfo[] = [
  { code: 'AL', name: 'Alabama', has_special_programs: false },
  { code: 'CA', name: 'California', has_special_programs: false },
  { code: 'NY', name: 'New York', has_special_programs: false },
  { code: 'AZ', name: 'Arizona', has_special_programs: true },
];

describe('InputForm - State Dropdown', () => {
  const defaultProps = {
    formState: DEFAULT_FORM_STATE,
    setFormState: vi.fn(),
    states: mockStates,
    onCalculate: vi.fn(),
    isCalculating: false,
  };

  it('renders the state dropdown with label', () => {
    render(<InputForm {...defaultProps} />);

    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all state options in the dropdown', () => {
    render(<InputForm {...defaultProps} />);

    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');

    // Should have placeholder + 4 states
    expect(options.length).toBe(5);

    // Check each state is rendered
    expect(screen.getByText('Alabama')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Arizona')).toBeInTheDocument();
  });

  it('selects the state from formState', () => {
    const propsWithCA = {
      ...defaultProps,
      formState: { ...DEFAULT_FORM_STATE, state_code: 'CA' },
    };

    render(<InputForm {...propsWithCA} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('CA');
  });

  it('renders with empty states array without crashing', () => {
    const propsWithNoStates = {
      ...defaultProps,
      states: [],
    };

    render(<InputForm {...propsWithNoStates} />);

    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');

    // Should only have the placeholder
    expect(options.length).toBe(1);
    expect(screen.getByText('Select a state...')).toBeInTheDocument();
  });
});
