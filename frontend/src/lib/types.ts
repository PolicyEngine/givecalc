/**
 * TypeScript types for GiveCalc API
 */

export interface Income {
  wages_and_salaries: number;
  tips: number;
  dividends: number;
  qualified_dividends: number;
  short_term_capital_gains: number;
  long_term_capital_gains: number;
  interest_income: number;
  self_employment_income: number;
}

export interface Deductions {
  mortgage_interest: number;
  real_estate_taxes: number;
  medical_expenses: number;
  casualty_loss: number;
}

export interface CalculateRequest {
  income: Income;
  state_code: string;
  is_married: boolean;
  num_children: number;
  in_nyc: boolean;
  donation_amount: number;
  deductions: Deductions;
  year: number;
}

export interface DonationDataPoint {
  donation: number;
  net_tax: number;
  marginal_savings: number;
  net_income: number;
}

export interface CalculateResponse {
  donation_amount: number;
  baseline_net_tax: number;
  net_tax_at_donation: number;
  tax_savings: number;
  marginal_savings_rate: number;
  baseline_net_income: number;
  net_income_after_donation: number;
  curve: DonationDataPoint[];
}

export interface TargetDonationRequest {
  income: Income;
  state_code: string;
  is_married: boolean;
  num_children: number;
  in_nyc: boolean;
  deductions: Deductions;
  target_reduction: number;
  is_percentage: boolean;
  year: number;
}

export interface TargetDonationResponse {
  required_donation: number;
  actual_reduction: number;
  actual_percentage: number;
  baseline_net_income: number;
  net_income_after_donation: number;
  curve: DonationDataPoint[];
}

export interface StateInfo {
  code: string;
  name: string;
  has_special_programs: boolean;
}

export interface StatesResponse {
  states: StateInfo[];
}

export interface TaxProgram {
  title: string;
  description: string;
}

export interface TaxProgramsResponse {
  federal: TaxProgram;
  state: TaxProgram | null;
}

// Form state type
export interface FormState {
  income: Income;
  state_code: string;
  is_married: boolean;
  num_children: number;
  in_nyc: boolean;
  donation_amount: number;
  deductions: Deductions;
  mode: 'amount' | 'target';
  target_reduction: number;
  is_percentage: boolean;
  year: number;
}

export const DEFAULT_INCOME: Income = {
  wages_and_salaries: 100000,
  tips: 0,
  dividends: 0,
  qualified_dividends: 0,
  short_term_capital_gains: 0,
  long_term_capital_gains: 0,
  interest_income: 0,
  self_employment_income: 0,
};

export const DEFAULT_FORM_STATE: FormState = {
  income: DEFAULT_INCOME,
  state_code: 'CA',
  is_married: false,
  num_children: 0,
  in_nyc: false,
  donation_amount: 5000,
  deductions: {
    mortgage_interest: 0,
    real_estate_taxes: 0,
    medical_expenses: 0,
    casualty_loss: 0,
  },
  mode: 'amount',
  target_reduction: 10,
  is_percentage: true,
  year: 2025,
};
