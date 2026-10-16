/**
 * TypeScript types for GiveCalc API
 */

export type Country = "us" | "uk";

// US-specific types
// Gifts count in the year they are made, so offer last year (for filing),
// this year and next year. The API accepts up to next year.
export const CURRENT_YEAR = new Date().getFullYear();
export const TAX_YEAR_OPTIONS = [
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
];

/**
 * The UK tax year in progress on `date`, named by the year it starts
 * (PolicyEngine-UK's convention: 2026 is 2026/27). Tax years start 6 April.
 */
export function ukTaxYear(date: Date): number {
  const beforeSixthApril =
    date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 6);
  return beforeSixthApril ? date.getFullYear() - 1 : date.getFullYear();
}

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

/**
 * The headline figures: net tax and net income at $0 and at the gift, each
 * from its own simulation. /api/savings returns these without the
 * donation curve, so they arrive before the charts.
 */
export interface Headline {
  donation_amount: number;
  baseline_net_tax: number;
  net_tax_at_donation: number;
  tax_savings: number;
  baseline_net_income: number;
  net_income_after_donation: number;
}

export interface SavingsRequest extends CalculateRequest {
  /** Also compare giving twice the gift this year and none next year. */
  bunching?: boolean;
}

export interface BunchingResult {
  next_year: number;
  next_year_baseline_net_tax: number;
  next_year_net_tax_at_donation: number;
  next_year_tax_savings: number;
  bunched_donation_amount: number;
  bunched_net_tax: number;
  bunched_tax_savings: number;
  /** This year's tax_savings plus next_year_tax_savings. */
  every_year_tax_savings: number;
  /** bunched_tax_savings minus every_year_tax_savings. */
  bunching_gain: number;
}

export interface SavingsResponse extends Headline {
  year: number;
  bunching: BunchingResult | null;
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
  mode: "amount" | "target";
  target_reduction: number;
  is_percentage: boolean;
  year: number;
}

export const DEFAULT_INCOME: Income = {
  wages_and_salaries: 0,
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
  state_code: "",  // No default state
  is_married: false,
  num_children: 0,
  in_nyc: false,
  donation_amount: 0,  // No default donation
  deductions: {
    mortgage_interest: 0,
    real_estate_taxes: 0,
    casualty_loss: 0,
  },
  mode: "amount",
  target_reduction: 10,
  is_percentage: true,
  year: CURRENT_YEAR,
};

// UK-specific types
export interface UKIncome {
  employment_income: number;
  self_employment_income: number;
}

export interface UKRegionInfo {
  code: string;
  name: string;
  nation: string;
}

export interface UKRegionsResponse {
  regions: UKRegionInfo[];
}

export interface UKDonationDataPoint {
  donation: number;
  net_tax: number;
  marginal_savings: number;
  net_income: number;
}

export interface UKCalculateRequest {
  income: UKIncome;
  region: string;
  gift_aid: number;
  is_married: boolean;
  num_children: number;
  year: number;
}

export interface UKCalculateResponse {
  gift_aid: number;
  baseline_net_tax: number;
  net_tax_at_donation: number;
  tax_savings: number;
  marginal_savings_rate: number;
  baseline_net_income: number;
  net_income_after_donation: number;
  curve: UKDonationDataPoint[];
}

export interface UKSavingsResponse {
  year: number;
  gift_aid: number;
  baseline_net_tax: number;
  net_tax_at_donation: number;
  tax_savings: number;
  baseline_net_income: number;
  net_income_after_donation: number;
}

export interface UKFormState {
  income: UKIncome;
  region: string;
  is_married: boolean;
  num_children: number;
  gift_aid: number;
  year: number;
}

export const DEFAULT_UK_INCOME: UKIncome = {
  employment_income: 0,
  self_employment_income: 0,
};

export const DEFAULT_UK_FORM_STATE: UKFormState = {
  income: DEFAULT_UK_INCOME,
  region: "ENGLAND",  // Default to Rest of UK (England, Wales, NI share same tax rates)
  is_married: false,
  num_children: 0,
  gift_aid: 0,  // No default donation
  year: ukTaxYear(new Date()),
};
