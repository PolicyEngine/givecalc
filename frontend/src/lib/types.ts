/**
 * TypeScript types for GiveCalc API
 */

import {
  addPerson,
  createBlankDraft,
  type USHouseholdDraft,
  type V1HouseholdSituation,
} from "policyengine-household-wizard/us-household";

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
/** The latest year the API accepts. */
export const MAX_TAX_YEAR = CURRENT_YEAR + 1;

/**
 * The UK tax year in progress on `date`, named by the year it starts
 * (PolicyEngine-UK's convention: 2026 is 2026/27). Tax years start 6 April.
 */
export function ukTaxYear(date: Date): number {
  const beforeSixthApril =
    date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 6);
  return beforeSixthApril ? date.getFullYear() - 1 : date.getFullYear();
}

/**
 * A US calculation request. `household` is the PolicyEngine US situation the
 * shared household wizard builds from the form (`toV1HouseholdSituation`),
 * keyed by `year`; the API adds the donation. The first person is the donor.
 */
export interface CalculateRequest {
  household: V1HouseholdSituation;
  donation_amount: number;
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
  /**
   * The household, as the shared wizard's US draft: state, county, marital
   * status, and each person's age, income and expenses. GiveCalc asks about
   * home costs once and keeps them on the first adult; the tax unit sums them.
   */
  household: USHouseholdDraft;
  /** Whether the household has a mortgage or pays property tax; null until asked. */
  hasHomeCosts: boolean | null;
  /** "pledge" gives pledge_percent of income; "amount" gives donation_amount. */
  mode: "pledge" | "amount";
  pledge_percent: number;
  donation_amount: number;
}

/** A form with one adult and nothing else answered. */
export function blankForm(year: number = CURRENT_YEAR): FormState {
  return {
    household: addPerson(createBlankDraft(year), "adult"),
    hasHomeCosts: null,
    // General audiences think in amounts; a share of income suits pledgers.
    mode: "amount",
    pledge_percent: 10,
    donation_amount: 0,
  };
}

export const DEFAULT_FORM_STATE: FormState = blankForm();

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
