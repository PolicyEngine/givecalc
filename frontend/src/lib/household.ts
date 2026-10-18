/**
 * GiveCalc's household, built on the shared policyengine-household-wizard
 * US draft.
 *
 * The wizard's `toV1HouseholdSituation` maps every answer to a PolicyEngine
 * US variable. GiveCalc sends that situation as is (`toCalculateRequest`), so
 * the mapping lives in one place, where property tests check it against the
 * PolicyEngine US variable graph. The API adds only the donation.
 */

import {
  getAdults,
  getDependents,
  toV1HouseholdSituation,
  validate,
  type USHouseholdDraft,
  type USPersonDraft,
  type ValidationIssue,
} from "policyengine-household-wizard/us-household";
import type { CalculateRequest, FormState } from "./types";

/**
 * Per-person incomes a pledge is a share of, and the form asks for. Each is
 * a separate amount in the draft (qualified and other dividends do not
 * overlap), so they add up.
 */
export const PLEDGE_INCOME_FIELDS = [
  "employmentIncome",
  "tipIncome",
  "selfEmploymentIncome",
  "taxableInterestIncome",
  "dividendIncome",
  "nonQualifiedDividendIncome",
  "shortTermCapitalGains",
  "longTermCapitalGains",
] as const satisfies ReadonlyArray<keyof USPersonDraft>;

export type PledgeIncomeField = (typeof PLEDGE_INCOME_FIELDS)[number];

function amount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** One person's pledge income; capital losses count against it. */
export function personIncome(person: USPersonDraft): number {
  return PLEDGE_INCOME_FIELDS.reduce(
    (sum, field) => sum + amount(person[field]),
    0,
  );
}

/**
 * The household's income for a pledge: everyone's wages, tips,
 * self-employment income, interest, dividends and capital gains, net of
 * capital losses, and never below zero.
 */
export function householdIncome(draft: USHouseholdDraft): number {
  return Math.max(
    0,
    draft.people.reduce((sum, person) => sum + personIncome(person), 0),
  );
}

/** The adult GiveCalc treats as the donor and holder of home costs. */
export function firstAdult(draft: USHouseholdDraft): USPersonDraft | undefined {
  return getAdults(draft)[0];
}

/**
 * Adults before dependents, each in their own order. The wizard appends a
 * spouse added after the dependents; ordering keeps the donor first and
 * makes the same household give the same request.
 */
export function orderPeople(draft: USHouseholdDraft): USHouseholdDraft {
  const people = [...getAdults(draft), ...getDependents(draft)];
  return people.every((person, index) => person === draft.people[index])
    ? draft
    : { ...draft, people };
}

/** The gift the form describes, in dollars. */
export function giftAmount(form: FormState): number {
  if (form.mode === "amount") return form.donation_amount;
  const percent = form.pledge_percent;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.round((percent / 100) * householdIncome(form.household));
}

/**
 * The API request for the form. `year` moves the household to another tax
 * year, everyone a year older per year moved (the bunching check runs next
 * year at the same gift). The gift is the API's to set, so no one carries
 * `charitableCashDonations`, and home costs go only with a "Yes".
 */
export function toCalculateRequest(
  form: FormState,
  overrides: { year?: number; donation_amount?: number } = {},
): CalculateRequest {
  const year = overrides.year ?? form.household.year;
  const shift = year - form.household.year;
  const draft: USHouseholdDraft = {
    ...orderPeople(form.household),
    year,
  };
  draft.people = draft.people.map(({ charitableCashDonations: _, ...person }) => {
    const aged =
      shift !== 0 && typeof person.age === "number"
        ? { ...person, age: person.age + shift }
        : person;
    if (form.hasHomeCosts !== false) return aged;
    // "No" to home costs leaves out amounts entered before the answer.
    const { mortgageInterest: _m, realEstateTaxes: _r, ...rest } = aged;
    return rest;
  });
  return {
    household: toV1HouseholdSituation(draft, {
      // Puts a couple in one marital unit, as PolicyEngine US expects.
      includeMaritalUnit: draft.maritalStatus === "married",
    }),
    donation_amount: overrides.donation_amount ?? giftAmount(form),
    year,
  };
}

/** The questions, in order. */
export const STEP_IDS = ["gift", "household", "income", "home", "review"] as const;
export type StepId = (typeof STEP_IDS)[number];

/**
 * States where PolicyEngine US taxes income by county and a blank county
 * would mean a particular one (the state's first), not "none".
 */
export const COUNTY_REQUIRED_STATES: ReadonlySet<string> = new Set(["MD", "IN"]);

/**
 * Wizard validation codes that only ask the user to confirm. A dependent
 * aged 24 or over can still qualify (for example, if permanently disabled).
 */
const WARNING_CODES = new Set(["person.age.dependentTooOld"]);

/** "your", "your spouse's" or "dependent 2's": whose answer an issue is about. */
function whose(draft: USHouseholdDraft, path: string): string {
  const match = /^people\[(\d+)\]/.exec(path);
  const person = match ? draft.people[Number(match[1])] : undefined;
  if (!person) return "your";
  if (person.kind === "dependent") {
    return `dependent ${getDependents(draft).indexOf(person) + 1}'s`;
  }
  return getAdults(draft).indexOf(person) === 0 ? "your" : "your spouse's";
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** GiveCalc's wording for the wizard's issues, matched to its labels. */
function message(draft: USHouseholdDraft, issue: ValidationIssue): string {
  const owner = whose(draft, issue.path);
  const subject = owner === "your" ? "you" : owner.replace(/'s$/, "");
  switch (issue.code) {
    case "state.required":
      return "Choose your state.";
    case "county.required":
      // The field's hint says why.
      return "Choose your county.";
    case "maritalStatus.required":
      return "Choose your marital status.";
    case "person.age.required":
      return `Enter ${owner} age.`;
    case "person.age.outOfRange":
      return `${capitalize(owner)} age must be from 0 to 120.`;
    case "person.age.adultTooYoung":
      return `${capitalize(owner)} age must be at least 14.`;
    case "person.age.dependentTooOld":
      return `${capitalize(subject)} is older than 23. Check that they qualify as your dependent.`;
    case "person.tippedOccupationCode.requiredWithTips":
      return `Choose the occupation for ${owner} tips, or "Not on the list".`;
    case "person.tippedOccupationCode.invalid":
      return `Choose an occupation from the list for ${owner} tips.`;
    case "person.tipIncome.negative":
      return "Tips cannot be negative.";
    case "person.employmentIncome.negative":
      return "Wages cannot be negative.";
    case "person.mortgageInterest.negative":
      return "Mortgage interest cannot be negative.";
    case "person.realEstateTaxes.negative":
      return "Property tax cannot be negative.";
    default:
      return issue.message;
  }
}

/** Which step asks for the field an issue is about. */
export function stepForIssue(issue: ValidationIssue): StepId {
  const { path } = issue;
  if (path === "year") return "gift";
  if (/^people\[\d+\]\.(mortgageInterest|realEstateTaxes)$/.test(path)) {
    return "home";
  }
  if (/^people\[\d+\]\.age$/.test(path) || !path.includes(".")) {
    return "household";
  }
  return "income";
}

/**
 * A problem with an answer. `path` names the field: a wizard draft path
 * ("state", "people[1].age") or one of GiveCalc's ("gift", "income",
 * "hasHomeCosts").
 */
export interface Issue {
  message: string;
  path: string;
}

export interface StepIssues {
  errors: Issue[];
  warnings: Issue[];
}

/** What blocks, or should be confirmed on, each step of the form. */
export function issuesByStep(form: FormState): Record<StepId, StepIssues> {
  const result = Object.fromEntries(
    STEP_IDS.map((id) => [id, { errors: [], warnings: [] }]),
  ) as unknown as Record<StepId, StepIssues>;
  if (form.mode === "pledge") {
    if (!(form.pledge_percent > 0 && form.pledge_percent <= 100)) {
      result.gift.errors.push({
        path: "gift",
        message: "Enter a share of income above 0% and up to 100%.",
      });
    }
  } else if (!(form.donation_amount > 0)) {
    result.gift.errors.push({ path: "gift", message: "Enter how much you plan to give." });
  }

  const draft = form.household;
  const validation = validate(draft, {
    requireCounty: COUNTY_REQUIRED_STATES.has(draft.state ?? ""),
  });
  for (const issue of validation.ok ? [] : validation.issues) {
    const bucket = result[stepForIssue(issue)];
    (WARNING_CODES.has(issue.code) ? bucket.warnings : bucket.errors).push({
      path: issue.path,
      message: message(draft, issue),
    });
  }

  // Incomes that cannot be negative; the wizard checks wages and tips, and
  // capital gains and self-employment income can be losses.
  draft.people.forEach((person, index) => {
    for (const [field, label] of NON_NEGATIVE_INCOMES) {
      const value = person[field];
      if (typeof value === "number" && value < 0) {
        result.income.errors.push({
          path: `people[${index}].${field}`,
          message: `${label} cannot be negative.`,
        });
      }
    }
  });

  if (householdIncome(draft) <= 0) {
    result.income.errors.push({ path: "income", message: "Enter your household's income." });
  }
  if (form.hasHomeCosts === null) {
    result.home.errors.push({
      path: "hasHomeCosts",
      message: "Answer whether you have a mortgage or pay property tax.",
    });
  }
  return result;
}

/** Incomes GiveCalc asks for that cannot be below zero, with their labels. */
const NON_NEGATIVE_INCOMES: ReadonlyArray<[PledgeIncomeField, string]> = [
  ["taxableInterestIncome", "Taxable interest"],
  ["dividendIncome", "Qualified dividends"],
  ["nonQualifiedDividendIncome", "Other ordinary dividends"],
];

/** The first step with a blocking problem, if any. */
export function firstIncompleteStep(form: FormState): StepId | null {
  const issues = issuesByStep(form);
  return STEP_IDS.find((id) => issues[id].errors.length > 0) ?? null;
}

/** True when the form has everything a calculation needs. */
export function isReadyToCalculate(form: FormState): boolean {
  return firstIncompleteStep(form) === null;
}
