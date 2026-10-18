/**
 * Households the frontend and API tests share.
 *
 * `bun run fixtures` writes each form's API request to
 * `tests/fixtures/wizard_households.json` at the repository root. The
 * frontend test checks the file still matches what the wizard builds, and
 * the Python tests run the API on it. Where the old request shape could
 * describe the same household, `legacy` gives it, and the Python tests check
 * both shapes give the same taxes.
 */

import {
  addPerson,
  createBlankDraft,
  type USHouseholdDraft,
  type USPersonDraft,
} from "policyengine-household-wizard/us-household";
import type { FormState } from "../types";

export const FIXTURE_YEAR = 2026;

/** The old `/api/calculate` fields, for households both shapes describe. */
export interface LegacyRequest {
  income: Partial<{
    wages_and_salaries: number;
    tips: number;
    dividends: number;
    qualified_dividends: number;
    short_term_capital_gains: number;
    long_term_capital_gains: number;
    interest_income: number;
    self_employment_income: number;
  }>;
  state_code: string;
  is_married?: boolean;
  num_children?: number;
  in_nyc?: boolean;
  deductions?: Partial<{ mortgage_interest: number; real_estate_taxes: number }>;
}

export interface FixtureForm {
  name: string;
  form: FormState;
  legacy?: LegacyRequest;
}

type Person = Partial<USPersonDraft>;

function household(
  state: string,
  adults: Person[],
  childAges: number[] = [],
  county: string | null = null,
): USHouseholdDraft {
  let draft: USHouseholdDraft = {
    ...createBlankDraft(FIXTURE_YEAR),
    state,
    county,
    maritalStatus: adults.length > 1 ? "married" : "single",
  };
  for (const adult of adults) draft = addPerson(draft, "adult", adult);
  for (const age of childAges) draft = addPerson(draft, "dependent", { age });
  return draft;
}

function pledge(draft: USHouseholdDraft, percent = 10): FormState {
  const holder = draft.people[0];
  return {
    household: draft,
    hasHomeCosts: Boolean(holder.mortgageInterest || holder.realEstateTaxes),
    mode: "pledge",
    pledge_percent: percent,
    donation_amount: 0,
  };
}

function amount(draft: USHouseholdDraft, gift: number): FormState {
  return { ...pledge(draft), mode: "amount", donation_amount: gift };
}

// Adults are 30 and children 10, the ages the old API assumed.
export const FIXTURE_FORMS: FixtureForm[] = [
  {
    name: "single New Yorker, $150,000, 10% pledge",
    form: pledge(household("NY", [{ age: 30, employmentIncome: 150_000 }])),
    legacy: { income: { wages_and_salaries: 150_000 }, state_code: "NY" },
  },
  {
    name: "single New York City resident, $150,000, 10% pledge",
    form: pledge(
      household("NY", [{ age: 30, employmentIncome: 150_000 }], [], "NEW_YORK_COUNTY_NY"),
    ),
    legacy: { income: { wages_and_salaries: 150_000 }, state_code: "NY", in_nyc: true },
  },
  {
    name: "married itemizers in Texas with a mortgage, $10,000 gift",
    form: amount(
      household("TX", [
        {
          age: 30,
          employmentIncome: 200_000,
          mortgageInterest: 30_000,
          realEstateTaxes: 12_000,
        },
        { age: 30 },
      ]),
      10_000,
    ),
    legacy: {
      income: { wages_and_salaries: 200_000 },
      state_code: "TX",
      is_married: true,
      deductions: { mortgage_interest: 30_000, real_estate_taxes: 12_000 },
    },
  },
  {
    name: "married Californians with two children and investment income",
    form: pledge(
      household(
        "CA",
        [
          {
            age: 30,
            employmentIncome: 120_000,
            selfEmploymentIncome: 20_000,
            taxableInterestIncome: 2_000,
            dividendIncome: 3_000,
            nonQualifiedDividendIncome: 1_000,
            shortTermCapitalGains: 5_000,
            longTermCapitalGains: 10_000,
          },
          { age: 30 },
        ],
        [10, 10],
      ),
      5,
    ),
    legacy: {
      income: {
        wages_and_salaries: 120_000,
        self_employment_income: 20_000,
        interest_income: 2_000,
        dividends: 4_000,
        qualified_dividends: 3_000,
        short_term_capital_gains: 5_000,
        long_term_capital_gains: 10_000,
      },
      state_code: "CA",
      is_married: true,
      num_children: 2,
    },
  },
  {
    name: "server in Nevada with tips outside a listed occupation",
    form: amount(
      household("NV", [
        { age: 30, employmentIncome: 30_000, tipIncome: 12_000, tippedOccupationCode: 0 },
      ]),
      2_000,
    ),
    legacy: { income: { wages_and_salaries: 30_000, tips: 12_000 }, state_code: "NV" },
  },
  {
    name: "server in Nevada with tips as wait staff",
    form: amount(
      household("NV", [
        { age: 30, employmentIncome: 30_000, tipIncome: 12_000, tippedOccupationCode: 102 },
      ]),
      2_000,
    ),
  },
  {
    name: "single filer with a short-term capital loss",
    form: amount(
      household("IL", [
        { age: 45, employmentIncome: 80_000, shortTermCapitalGains: -3_000 },
      ]),
      5_000,
    ),
  },
  {
    name: "married Marylanders in Montgomery County, both earning",
    form: pledge(
      household(
        "MD",
        [
          { age: 52, employmentIncome: 90_000 },
          { age: 49, employmentIncome: 60_000 },
        ],
        [15],
        "MONTGOMERY_COUNTY_MD",
      ),
    ),
  },
  {
    name: "retired couple over 65 in Florida",
    form: amount(
      household("FL", [
        { age: 70, taxableInterestIncome: 40_000, longTermCapitalGains: 60_000 },
        { age: 67, dividendIncome: 20_000 },
      ]),
      15_000,
    ),
  },
];
