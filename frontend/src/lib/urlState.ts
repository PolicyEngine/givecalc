/**
 * Shareable URL state for the US calculator.
 *
 * `?amount=5000&income=150000&state=NY` opens GiveCalc giving $5,000 on
 * $150,000 of wages in New York and calculates straight away;
 * `?pledge=10&income=150000&state=NY` gives 10% of that income instead (the
 * share-of-income option, which pledge organisations can link to). A link
 * that leaves a question unanswered opens on that question instead.
 *
 * One rule for bad values: an invalid parameter is ignored, as if the link
 * did not have it. So `age=130` gives the default age, `child_ages=4,x` falls
 * back to `children`, and `state=ZZ` describes no household.
 *
 * Parameters:
 * - `amount` (dollars) or `pledge` (percent of income): the gift.
 * - `year`: the tax year, one the form offers.
 * - `state`: two-letter code. A link without a valid state describes no
 *   household, so the household parameters below need it.
 * - `county`: a PolicyEngine US county code in that state.
 *   `nyc=1` is shorthand for New York County when no county is given; every
 *   borough gives the same result, because PolicyEngine US applies New York
 *   City's income tax by whether the county is one of the five boroughs.
 * - `married=1`, else single.
 * - `income` and `spouse_income`: wages, up to `MAX_WAGES`.
 * - `age` and `spouse_age`. A link without them uses `LINK_ADULT_AGE`.
 * - `child_ages=4,10`: one dependent per age, each from 0 to 30.
 *   `children=2` is shorthand for that many dependents aged
 *   `LINK_CHILD_AGE` (a fraction is rounded down, as GiveCalc always has).
 * - `mortgage` and `property_tax`: mortgage interest and property tax paid.
 *
 * The defaults are the ages GiveCalc's API assumed for every household
 * before the form asked, so links made then keep their results, with two
 * exceptions: a Maryland or Indiana link now stops at the county question,
 * because a blank county there means a particular county's tax; and a link
 * without a valid state no longer fills wages, marital status or children.
 */

import {
  addPerson,
  createBlankDraft,
  getCountiesByState,
  isUSStateCode,
  type USHouseholdDraft,
  type USPersonDraft,
} from "policyengine-household-wizard/us-household";
import { toCalculateRequest } from "./household";
import { TAX_YEAR_OPTIONS, type FormState } from "./types";

/** The API caps wages and salaries at $10 million (api/schemas.py). */
export const MAX_WAGES = 10_000_000;

export const LINK_ADULT_AGE = 30;
export const LINK_CHILD_AGE = 10;
export const MAX_LINK_CHILDREN = 10;
const NYC_COUNTY = "NEW_YORK_COUNTY_NY";

function nonNegative(value: string | null, max = 100_000_000): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

function age(value: string | null, max = 120): number | null {
  const n = nonNegative(value, max);
  return n !== null && Number.isInteger(n) ? n : null;
}

function flag(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

function childAges(params: URLSearchParams): number[] {
  const list = params.get("child_ages");
  if (list !== null) {
    const ages = list.split(",").map((part) => age(part, 30));
    if (
      ages.length <= MAX_LINK_CHILDREN &&
      ages.every((value): value is number => value !== null)
    ) {
      return ages;
    }
  }
  const count = nonNegative(params.get("children"), MAX_LINK_CHILDREN);
  return count === null
    ? []
    : Array<number>(Math.floor(count)).fill(LINK_CHILD_AGE);
}

function linkHousehold(params: URLSearchParams, state: string, year: number) {
  let draft: USHouseholdDraft = { ...createBlankDraft(year), state };
  const county = params.get("county")?.toUpperCase();
  if (county && getCountiesByState(state).some((c) => c.code === county)) {
    draft.county = county;
  } else if (state === "NY" && flag(params.get("nyc"))) {
    draft.county = NYC_COUNTY;
  }

  const married = flag(params.get("married")) === true;
  draft.maritalStatus = married ? "married" : "single";

  const mortgage = nonNegative(params.get("mortgage"));
  const propertyTax = nonNegative(params.get("property_tax"));
  const head: Partial<USPersonDraft> = {
    age: age(params.get("age")) ?? LINK_ADULT_AGE,
  };
  const income = nonNegative(params.get("income"), MAX_WAGES);
  if (income !== null) head.employmentIncome = income;
  if (mortgage) head.mortgageInterest = mortgage;
  if (propertyTax) head.realEstateTaxes = propertyTax;
  draft = addPerson(draft, "adult", head);

  if (married) {
    const spouse: Partial<USPersonDraft> = {
      age: age(params.get("spouse_age")) ?? LINK_ADULT_AGE,
    };
    const spouseIncome = nonNegative(params.get("spouse_income"), MAX_WAGES);
    if (spouseIncome !== null) spouse.employmentIncome = spouseIncome;
    draft = addPerson(draft, "adult", spouse);
  }
  for (const childAge of childAges(params)) {
    draft = addPerson(draft, "dependent", { age: childAge });
  }
  return { draft, hasHomeCosts: Boolean(mortgage || propertyTax) };
}

/** Apply the URL's inputs to a form. Returns an equal form if none apply. */
export function applySearchParams(form: FormState, search: string): FormState {
  const params = new URLSearchParams(search);
  const next: FormState = { ...form };

  const pledge = nonNegative(params.get("pledge"), 100);
  const amount = nonNegative(params.get("amount"));
  if (pledge !== null && pledge > 0) {
    next.mode = "pledge";
    next.pledge_percent = pledge;
  } else if (amount !== null && amount > 0) {
    next.mode = "amount";
    next.donation_amount = amount;
  }

  const yearParam = nonNegative(params.get("year"), 3000);
  const year =
    yearParam !== null && TAX_YEAR_OPTIONS.includes(yearParam)
      ? yearParam
      : form.household.year;

  const state = params.get("state")?.toUpperCase();
  if (state && isUSStateCode(state)) {
    const { draft, hasHomeCosts } = linkHousehold(params, state, year);
    next.household = draft;
    next.hasHomeCosts = hasHomeCosts;
  } else if (year !== form.household.year) {
    next.household = { ...form.household, year };
  }
  return next;
}

/** Serialize the form's link. `isShareable` says whether it is complete. */
export function toSearchParams(form: FormState): string {
  const params = new URLSearchParams();
  if (form.mode === "pledge") {
    params.set("pledge", String(form.pledge_percent));
  } else {
    params.set("amount", String(form.donation_amount));
  }
  const draft = form.household;
  const [head, spouse] = draft.people.filter((p) => p.kind === "adult");
  const dependents = draft.people.filter((p) => p.kind === "dependent");
  if (head?.employmentIncome !== undefined) {
    params.set("income", String(head.employmentIncome));
  }
  if (draft.state) params.set("state", draft.state);
  if (draft.county) params.set("county", draft.county);
  if (draft.maritalStatus === "married") params.set("married", "1");
  if (head?.age !== null && head?.age !== undefined) {
    params.set("age", String(head.age));
  }
  if (spouse?.employmentIncome !== undefined) {
    params.set("spouse_income", String(spouse.employmentIncome));
  }
  if (spouse?.age !== null && spouse?.age !== undefined) {
    params.set("spouse_age", String(spouse.age));
  }
  if (dependents.length > 0) {
    params.set("child_ages", dependents.map((d) => String(d.age)).join(","));
  }
  params.set("year", String(draft.year));
  if (form.hasHomeCosts !== false) {
    if (head?.mortgageInterest) {
      params.set("mortgage", String(head.mortgageInterest));
    }
    if (head?.realEstateTaxes) {
      params.set("property_tax", String(head.realEstateTaxes));
    }
  }
  return params.toString();
}

/**
 * The request with zero amounts dropped. PolicyEngine US reads a missing
 * amount as 0, so the two give the same result.
 */
function canonical(form: FormState): string {
  const request = toCalculateRequest(form);
  const people = Object.fromEntries(
    Object.entries(request.household.people).map(([id, record]) => [
      id,
      Object.fromEntries(
        Object.entries(record).filter(
          ([, byYear]) => byYear?.[String(request.year)] !== 0,
        ),
      ),
    ]),
  );
  return JSON.stringify({ ...request, household: { ...request.household, people } });
}

/**
 * True when the form's link reproduces its calculation. The link carries
 * only wages, ages, location, children and home costs, so a household with
 * other income is not shared.
 */
export function isShareable(form: FormState): boolean {
  const back = applySearchParams(
    { ...form, household: createBlankDraft(form.household.year) },
    `?${toSearchParams(form)}`,
  );
  return canonical(back) === canonical(form);
}
