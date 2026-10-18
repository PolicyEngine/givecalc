/**
 * GiveCalc's household on the shared wizard draft.
 *
 * Invariants:
 * - Pledge income is the sum of the asked incomes over everyone, capital
 *   losses included, and never negative.
 * - A pledge is never negative, is zero at 0%, never exceeds income at
 *   100%, and never falls as the percentage rises.
 * - The request is the wizard's situation for the draft (adults first), at
 *   the request's year with everyone that many years older, and never sets
 *   the donation (the API's) or `mortgage_interest` (a computed total the
 *   federal deduction ignores).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  addPerson,
  createBlankDraft,
  toV1HouseholdSituation,
  type USHouseholdDraft,
} from "policyengine-household-wizard/us-household";
import {
  PLEDGE_INCOME_FIELDS,
  firstIncompleteStep,
  giftAmount,
  householdIncome,
  isReadyToCalculate,
  issuesByStep,
  orderPeople,
  toCalculateRequest,
} from "../household";
import { blankForm, type FormState } from "../types";

const money = fc.integer({ min: 0, max: 2_000_000 });
const gain = fc.integer({ min: -200_000, max: 2_000_000 });

const personArb = fc.record({
  age: fc.integer({ min: 18, max: 90 }),
  employmentIncome: fc.option(money, { nil: undefined }),
  tipIncome: fc.option(money, { nil: undefined }),
  selfEmploymentIncome: fc.option(money, { nil: undefined }),
  taxableInterestIncome: fc.option(money, { nil: undefined }),
  dividendIncome: fc.option(money, { nil: undefined }),
  nonQualifiedDividendIncome: fc.option(money, { nil: undefined }),
  shortTermCapitalGains: fc.option(gain, { nil: undefined }),
  longTermCapitalGains: fc.option(gain, { nil: undefined }),
  mortgageInterest: fc.option(money, { nil: undefined }),
  realEstateTaxes: fc.option(money, { nil: undefined }),
  tippedOccupationCode: fc.option(fc.constantFrom(0, 101, 102, 810), {
    nil: undefined,
  }),
  // The form never sets this, but a draft from elsewhere could.
  charitableCashDonations: fc.option(money, { nil: undefined }),
});

const draftArb: fc.Arbitrary<USHouseholdDraft> = fc
  .record({
    state: fc.constantFrom("CA", "NY", "TX", "MD", "NV"),
    year: fc.constantFrom(2025, 2026, 2027),
    adults: fc.array(personArb, { minLength: 1, maxLength: 2 }),
    childAges: fc.array(fc.integer({ min: 0, max: 17 }), { maxLength: 3 }),
    // A spouse added after the children comes after them in the draft.
    spouseLast: fc.boolean(),
  })
  .map(({ state, year, adults, childAges, spouseLast }) => {
    let draft: USHouseholdDraft = {
      ...createBlankDraft(year),
      state,
      maritalStatus: adults.length > 1 ? "married" : "single",
    };
    const [head, spouse] = adults;
    draft = addPerson(draft, "adult", head);
    if (spouse && !spouseLast) draft = addPerson(draft, "adult", spouse);
    for (const age of childAges) draft = addPerson(draft, "dependent", { age });
    if (spouse && spouseLast) draft = addPerson(draft, "adult", spouse);
    return draft;
  });

const formArb: fc.Arbitrary<FormState> = fc
  .record({
    draft: draftArb,
    pledge: fc.boolean(),
    percent: fc.integer({ min: 1, max: 100 }),
    gift: fc.integer({ min: 1, max: 500_000 }),
    homeCosts: fc.constantFrom(true, false, null),
  })
  .map(({ draft, pledge, percent, gift, homeCosts }) => ({
    household: draft,
    hasHomeCosts: homeCosts,
    mode: pledge ? ("pledge" as const) : ("amount" as const),
    pledge_percent: percent,
    donation_amount: gift,
  }));

/** A single New Yorker giving 10% of income. */
function single(people: Parameters<typeof addPerson>[2]): FormState {
  const form = blankForm(2026);
  return {
    ...form,
    mode: "pledge",
    household: {
      ...addPerson({ ...form.household, people: [] }, "adult", { age: 40, ...people }),
      state: "NY",
      maritalStatus: "single",
    },
    hasHomeCosts: false,
  };
}

describe("householdIncome", () => {
  it("adds every asked income, with qualified and other dividends separate", () => {
    const form = single({
      employmentIncome: 100_000,
      tipIncome: 5_000,
      dividendIncome: 8_000,
      nonQualifiedDividendIncome: 2_000,
      shortTermCapitalGains: -1_000,
    });
    expect(householdIncome(form.household)).toBe(114_000);
  });

  it("is the sum over people and fields, floored at zero", () => {
    fc.assert(
      fc.property(draftArb, (draft) => {
        const sum = draft.people.reduce(
          (total, person) =>
            total +
            PLEDGE_INCOME_FIELDS.reduce(
              (subtotal, field) => subtotal + (person[field] ?? 0),
              0,
            ),
          0,
        );
        expect(householdIncome(draft)).toBe(Math.max(0, sum));
      }),
    );
  });
});

describe("giftAmount", () => {
  it("gives 10% of $150,000 as $15,000", () => {
    expect(giftAmount(single({ employmentIncome: 150_000 }))).toBe(15_000);
  });

  it("returns 0 for non-positive or non-finite percentages", () => {
    const form = single({ employmentIncome: 50_000 });
    for (const pledge_percent of [0, -5, Number.NaN]) {
      expect(giftAmount({ ...form, pledge_percent })).toBe(0);
    }
  });

  it("stays between zero and income, and rises with the percentage", () => {
    fc.assert(
      fc.property(
        formArb,
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (form, a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          const pledge = { ...form, mode: "pledge" as const };
          const small = giftAmount({ ...pledge, pledge_percent: lo });
          const large = giftAmount({ ...pledge, pledge_percent: hi });
          expect(small).toBeGreaterThanOrEqual(0);
          expect(large).toBeLessThanOrEqual(Math.round(householdIncome(form.household)));
          expect(large).toBeGreaterThanOrEqual(small);
        },
      ),
    );
  });
});

describe("toCalculateRequest", () => {
  it("sends the wizard's situation for the draft, adults first, without donations", () => {
    fc.assert(
      fc.property(formArb, (form) => {
        const request = toCalculateRequest(form);
        expect(request.year).toBe(form.household.year);
        expect(request.donation_amount).toBe(giftAmount(form));
        const ordered = orderPeople(form.household);
        const people = ordered.people.map(({ charitableCashDonations: _, ...p }) =>
          form.hasHomeCosts === false
            ? { ...p, mortgageInterest: undefined, realEstateTaxes: undefined }
            : p,
        );
        expect(request.household).toEqual(
          toV1HouseholdSituation(
            { ...ordered, people },
            { includeMaritalUnit: form.household.maritalStatus === "married" },
          ),
        );
        // The donor, the first adult, comes first.
        expect(Object.keys(request.household.people)[0]).toBe(
          form.household.people.find((p) => p.kind === "adult")?.id,
        );
      }),
    );
  });

  it("ages everyone by the years it moves the household", () => {
    fc.assert(
      fc.property(formArb, fc.integer({ min: -1, max: 2 }), (form, shift) => {
        const year = form.household.year + shift;
        const moved = toCalculateRequest(form, { year }).household.people;
        for (const person of form.household.people) {
          expect(moved[person.id].age).toEqual({ [String(year)]: (person.age ?? 0) + shift });
        }
      }),
    );
  });

  it("gives the same request whatever order the people were added in", () => {
    fc.assert(
      fc.property(formArb, (form) => {
        const ordered = { ...form, household: orderPeople(form.household) };
        expect(toCalculateRequest(form)).toEqual(toCalculateRequest(ordered));
      }),
    );
  });

  it("never sets the donation or the mortgage_interest total", () => {
    fc.assert(
      fc.property(formArb, (form) => {
        for (const record of Object.values(toCalculateRequest(form).household.people)) {
          expect(record).not.toHaveProperty("charitable_cash_donations");
          expect(record).not.toHaveProperty("mortgage_interest");
        }
      }),
    );
  });

  it("keys every value by the request's year, including a moved year", () => {
    fc.assert(
      fc.property(formArb, fc.constantFrom(2025, 2026, 2027, 2028), (form, year) => {
        const request = toCalculateRequest(form, { year });
        expect(request.year).toBe(year);
        const { people, households } = request.household;
        for (const record of [...Object.values(people), ...Object.values(households ?? {})]) {
          for (const [key, value] of Object.entries(record)) {
            if (key !== "members") expect(Object.keys(value as object)).toEqual([String(year)]);
          }
        }
      }),
    );
  });

  it("puts a married couple in one marital unit", () => {
    let draft: USHouseholdDraft = {
      ...createBlankDraft(2026),
      state: "TX",
      maritalStatus: "married",
    };
    draft = addPerson(draft, "adult", { age: 40 });
    draft = addPerson(draft, "dependent", { age: 5 });
    draft = addPerson(draft, "adult", { age: 38 });
    const form = { ...blankForm(2026), household: draft };
    expect(toCalculateRequest(form).household.marital_units).toEqual({
      marital_unit: { members: ["adult-1", "adult-2"] },
    });
  });
});

describe("issuesByStep", () => {
  it("routes each wizard issue to the step that asks it", () => {
    const form = single({ employmentIncome: 50_000, tippedOccupationCode: 999 });
    form.household = { ...form.household, state: null };
    form.household.people[0] = { ...form.household.people[0], mortgageInterest: -5 };
    const issues = issuesByStep(form);
    expect(issues.household.errors).toEqual([
      { path: "state", message: "Choose your state." },
    ]);
    expect(issues.income.errors).toEqual([
      {
        path: "people[0].tippedOccupationCode",
        message: "Choose an occupation from the list for your tips.",
      },
    ]);
    expect(issues.home.errors).toEqual([
      { path: "people[0].mortgageInterest", message: "Mortgage interest cannot be negative." },
    ]);
  });

  it("asks only to confirm a dependent older than 23", () => {
    const form = single({ employmentIncome: 50_000 });
    form.household = addPerson(form.household, "dependent", { age: 25 });
    expect(issuesByStep(form).household.errors).toEqual([]);
    expect(issuesByStep(form).household.warnings).toHaveLength(1);
    expect(isReadyToCalculate(form)).toBe(true);
  });

  it("needs a gift, income, ages and a home costs answer", () => {
    const blank = blankForm(2026);
    const issues = issuesByStep({ ...blank, mode: "amount" });
    expect(issues.gift.errors).toHaveLength(1);
    expect(issues.household.errors.map((issue) => issue.message)).toEqual([
      "Choose your state.",
      "Choose your marital status.",
      "Enter your age.",
    ]);
    expect(issues.income.errors.map((issue) => issue.message)).toEqual([
      "Enter your household's income.",
    ]);
    expect(issues.home.errors).toHaveLength(1);
    expect(firstIncompleteStep({ ...blank, mode: "amount" })).toBe("gift");
    expect(isReadyToCalculate(single({ employmentIncome: 1 }))).toBe(true);
    expect(firstIncompleteStep(single({ employmentIncome: 1 }))).toBeNull();
  });

  it("names whose answer is missing in the form's words", () => {
    let draft: USHouseholdDraft = {
      ...createBlankDraft(2026),
      state: "TX",
      maritalStatus: "married",
    };
    draft = addPerson(draft, "adult", { age: 40, employmentIncome: 1 });
    draft = addPerson(draft, "adult", { tipIncome: 500 });
    draft = addPerson(draft, "dependent");
    const issues = issuesByStep({ ...blankForm(2026), household: draft, hasHomeCosts: false });
    expect(issues.household.errors.map((issue) => issue.message)).toEqual([
      "Enter your spouse's age.",
      "Enter dependent 1's age.",
    ]);
    expect(issues.income.errors.map((issue) => issue.message)).toEqual([
      'Choose the occupation for your spouse\'s tips, or "Not on the list".',
    ]);
  });

  it("needs a county where a blank one would mean a particular county", () => {
    for (const [state, needed] of [["MD", true], ["IN", true], ["NY", false], ["TX", false]] as const) {
      const form = single({ employmentIncome: 50_000 });
      form.household = { ...form.household, state };
      const errors = issuesByStep(form).household.errors;
      expect(errors.some((issue) => issue.path === "county")).toBe(needed);
    }
    const maryland = single({ employmentIncome: 50_000 });
    maryland.household = { ...maryland.household, state: "MD", county: "MONTGOMERY_COUNTY_MD" };
    expect(isReadyToCalculate(maryland)).toBe(true);
  });
});
