/**
 * Shareable URL state.
 *
 * Invariants:
 * - Round trip: a form a link can describe comes back from its own link
 *   with the same calculation request, and is shareable.
 * - A form with income the link does not carry is not shareable.
 * - Invalid values never change the form.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  addPerson,
  createBlankDraft,
  type USHouseholdDraft,
} from "policyengine-household-wizard/us-household";
import { isReadyToCalculate, toCalculateRequest } from "../household";
import {
  LINK_ADULT_AGE,
  LINK_CHILD_AGE,
  MAX_WAGES,
  applySearchParams,
  isShareable,
  toSearchParams,
} from "../urlState";
import {
  DEFAULT_FORM_STATE,
  TAX_YEAR_OPTIONS,
  blankForm,
  type FormState,
} from "../types";

describe("applySearchParams", () => {
  it("fills and calculates a pledge link from before the wizard", () => {
    const form = applySearchParams(
      DEFAULT_FORM_STATE,
      "?pledge=10&income=150000&state=ny",
    );
    expect(form.mode).toBe("pledge");
    expect(form.pledge_percent).toBe(10);
    expect(form.household.state).toBe("NY");
    expect(form.household.maritalStatus).toBe("single");
    expect(form.household.people).toEqual([
      { id: "adult-1", kind: "adult", age: LINK_ADULT_AGE, employmentIncome: 150_000 },
    ]);
    expect(form.hasHomeCosts).toBe(false);
    expect(isReadyToCalculate(form)).toBe(true);
  });

  it("reads every older parameter", () => {
    const form = applySearchParams(
      DEFAULT_FORM_STATE,
      "?amount=5000&income=90000&state=NY&married=1&nyc=1&children=2&year=" +
        `${TAX_YEAR_OPTIONS[0]}&mortgage=12000&property_tax=8000`,
    );
    expect(form.mode).toBe("amount");
    expect(form.donation_amount).toBe(5000);
    const draft = form.household;
    expect(draft.year).toBe(TAX_YEAR_OPTIONS[0]);
    expect(draft.county).toBe("NEW_YORK_COUNTY_NY");
    expect(draft.maritalStatus).toBe("married");
    expect(draft.people.map((p) => [p.kind, p.age])).toEqual([
      ["adult", LINK_ADULT_AGE],
      ["adult", LINK_ADULT_AGE],
      ["dependent", LINK_CHILD_AGE],
      ["dependent", LINK_CHILD_AGE],
    ]);
    expect(draft.people[0]).toMatchObject({
      employmentIncome: 90_000,
      mortgageInterest: 12_000,
      realEstateTaxes: 8_000,
    });
    expect(form.hasHomeCosts).toBe(true);
    expect(isReadyToCalculate(form)).toBe(true);
  });

  it("ignores invalid values", () => {
    const form = applySearchParams(
      DEFAULT_FORM_STATE,
      "?pledge=-3&amount=abc&income=-1&state=ZZ&married=maybe&year=1999&children=99",
    );
    expect(form).toEqual(DEFAULT_FORM_STATE);
    expect(isReadyToCalculate(form)).toBe(false);
  });

  it("uses nyc only for New York, and a county only in its state", () => {
    const county = (search: string) =>
      applySearchParams(DEFAULT_FORM_STATE, search).household.county;
    expect(county("?state=CA&nyc=1")).toBeNull();
    expect(county("?state=NY&nyc=1")).toBe("NEW_YORK_COUNTY_NY");
    expect(county("?state=NY&nyc=1&county=KINGS_COUNTY_NY")).toBe("KINGS_COUNTY_NY");
    expect(county("?state=CA&county=KINGS_COUNTY_NY")).toBeNull();
  });

  it("ignores an invalid parameter as if the link did not have it", () => {
    const household = (search: string) =>
      applySearchParams(DEFAULT_FORM_STATE, `?state=TX&income=1${search}`).household;
    const ages = (search: string) =>
      household(search)
        .people.filter((p) => p.kind === "dependent")
        .map((p) => p.age);
    expect(ages("&child_ages=4,17")).toEqual([4, 17]);
    expect(ages("&child_ages=4,x")).toEqual([]);
    expect(ages("&child_ages=4,x&children=2")).toEqual([LINK_CHILD_AGE, LINK_CHILD_AGE]);
    expect(ages("&child_ages=4,17&children=5")).toEqual([4, 17]);
    // Older links rounded a fractional count down.
    expect(ages("&children=2.5")).toEqual([LINK_CHILD_AGE, LINK_CHILD_AGE]);
    expect(household("&age=130").people[0].age).toBe(LINK_ADULT_AGE);
    expect(household("&age=41").people[0].age).toBe(41);
  });

  it("ignores wages above the API's cap", () => {
    const wages = (search: string) =>
      applySearchParams(DEFAULT_FORM_STATE, `?amount=1000&state=TX${search}`).household
        .people[0].employmentIncome;
    expect(wages(`&income=${MAX_WAGES}`)).toBe(MAX_WAGES);
    expect(wages(`&income=${MAX_WAGES + 1}`)).toBeUndefined();
  });

  it("shares a Yes to home costs with no amounts, which a link reads as No", () => {
    const form = applySearchParams(blankForm(2026), "?amount=1000&income=50000&state=TX");
    expect(isShareable({ ...form, hasHomeCosts: true })).toBe(true);
  });

  it("does not share a fractional age, which links do not carry", () => {
    const form = applySearchParams(blankForm(2026), "?amount=1000&income=50000&state=TX");
    const person = { ...form.household.people[0], age: 40.5 };
    const fractional = { ...form, household: { ...form.household, people: [person] } };
    expect(isShareable(fractional)).toBe(false);
    expect(
      applySearchParams(blankForm(2026), "?amount=1000&state=TX&age=40.5").household.people[0].age,
    ).toBe(LINK_ADULT_AGE);
  });

  it("fills an incomplete link without calculating it", () => {
    const form = applySearchParams(DEFAULT_FORM_STATE, "?pledge=10&state=MD&income=90000");
    expect(form.household.state).toBe("MD");
    expect(isReadyToCalculate(form)).toBe(false);
  });
});

/** Forms whose answers a link carries: wages, ages, location, children, home costs. */
const linkForm: fc.Arbitrary<FormState> = fc
  .record({
    pledge: fc.boolean(),
    pledge_percent: fc.integer({ min: 1, max: 100 }),
    donation_amount: fc.integer({ min: 1, max: 1_000_000 }),
    wages: fc.integer({ min: 1, max: 5_000_000 }),
    spouseWages: fc.option(fc.integer({ min: 0, max: 500_000 }), { nil: undefined }),
    state: fc.constantFrom("CA", "NY", "TX", "MA", "DC", "MD"),
    nyc: fc.boolean(),
    married: fc.boolean(),
    ages: fc.tuple(fc.integer({ min: 18, max: 99 }), fc.integer({ min: 18, max: 99 })),
    childAges: fc.array(fc.integer({ min: 0, max: 25 }), { maxLength: 4 }),
    year: fc.constantFrom(...TAX_YEAR_OPTIONS),
    mortgage: fc.integer({ min: 0, max: 100_000 }),
    propertyTax: fc.integer({ min: 0, max: 100_000 }),
  })
  .map((r) => {
    let draft: USHouseholdDraft = {
      ...createBlankDraft(r.year),
      state: r.state,
      // Maryland needs a county; New York City is optional.
      county:
        r.state === "MD"
          ? "MONTGOMERY_COUNTY_MD"
          : r.state === "NY" && r.nyc
            ? "KINGS_COUNTY_NY"
            : null,
      maritalStatus: r.married ? "married" : "single",
    };
    draft = addPerson(draft, "adult", {
      age: r.ages[0],
      employmentIncome: r.wages,
      mortgageInterest: r.mortgage || undefined,
      realEstateTaxes: r.propertyTax || undefined,
    });
    if (r.married) {
      draft = addPerson(draft, "adult", {
        age: r.ages[1],
        employmentIncome: r.spouseWages,
      });
    }
    for (const age of r.childAges) draft = addPerson(draft, "dependent", { age });
    if (r.married) {
      // The form keeps adults first even when the spouse is added last.
      draft = { ...draft, people: [draft.people[0], ...draft.people.slice(2), draft.people[1]] };
    }
    return {
      household: draft,
      hasHomeCosts: Boolean(r.mortgage || r.propertyTax),
      mode: r.pledge ? ("pledge" as const) : ("amount" as const),
      pledge_percent: r.pledge ? r.pledge_percent : DEFAULT_FORM_STATE.pledge_percent,
      donation_amount: r.pledge ? DEFAULT_FORM_STATE.donation_amount : r.donation_amount,
    };
  });

describe("toSearchParams", () => {
  it("round-trips every form a link can describe", () => {
    fc.assert(
      fc.property(linkForm, (form) => {
        const back = applySearchParams(blankForm(), `?${toSearchParams(form)}`);
        expect(toCalculateRequest(back)).toEqual(toCalculateRequest(form));
        expect(back.mode).toBe(form.mode);
        expect(back.hasHomeCosts).toBe(form.hasHomeCosts);
        expect(isShareable(form)).toBe(true);
        expect(isReadyToCalculate(back)).toBe(true);
      }),
    );
  });

  it("does not share a form with income the link leaves out", () => {
    fc.assert(
      fc.property(
        linkForm,
        fc.constantFrom(
          "tipIncome",
          "selfEmploymentIncome",
          "taxableInterestIncome",
          "dividendIncome",
          "nonQualifiedDividendIncome",
          "shortTermCapitalGains",
          "longTermCapitalGains",
        ),
        fc.integer({ min: 1, max: 100_000 }),
        (form, field, value) => {
          const people = form.household.people.map((person, index) =>
            index === 0 ? { ...person, [field]: value } : person,
          );
          expect(isShareable({ ...form, household: { ...form.household, people } })).toBe(
            false,
          );
        },
      ),
    );
  });
});
