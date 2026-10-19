/**
 * The households behind the FAQ's examples.
 *
 * `bun run faq-numbers` sends each case to the GiveCalc API, as the
 * calculator sends it, and writes the answers to `faqNumbers.json`, which
 * the FAQ reads. `tests/test_faq_numbers.py` sends the same requests to the
 * API code at the model versions uv.lock pins, so a model update that moves
 * an answer fails CI until the file is written again.
 *
 * Every US case is a household a link can open: one 30-year-old (the age
 * links assume), single, with wages and no children or home costs.
 */

import {
  addPerson,
  createBlankDraft,
} from "policyengine-household-wizard/us-household";
import { blankForm, type FormState, type UKCalculateRequest } from "./types";
import { LINK_ADULT_AGE } from "./urlState";

function single(
  state: string,
  wages: number,
  gift: number,
  year: number,
): FormState {
  const household = addPerson(
    { ...createBlankDraft(year), state, maritalStatus: "single" },
    "adult",
    { age: LINK_ADULT_AGE, employmentIncome: wages },
  );
  return {
    ...blankForm(year),
    household,
    hasHomeCosts: false,
    donation_amount: gift,
  };
}

export const US_FAQ_CASES = {
  /** A gift within the 2026 deduction for filers who don't itemize. */
  california: single("CA", 75_000, 1_000, 2026),
  /** The same household giving more than that deduction allows. */
  californiaLarger: single("CA", 75_000, 5_000, 2026),
  /** The first gift a year earlier, before the deduction began. */
  california2025: single("CA", 75_000, 1_000, 2025),
  /** Giving each year, compared with giving two years' gifts at once. */
  newYork: single("NY", 150_000, 15_000, 2026),
  /** A top-bracket itemizer, and the same donor giving $10,000 more. */
  texas: single("TX", 1_000_000, 100_000, 2026),
  texasMore: single("TX", 1_000_000, 110_000, 2026),
} satisfies Record<string, FormState>;

export type USFaqCase = keyof typeof US_FAQ_CASES;

/** Cases whose request also runs the bunching check. */
export const US_BUNCHING_CASES: ReadonlySet<USFaqCase> = new Set(["newYork"]);

function ukDonor(employmentIncome: number): UKCalculateRequest {
  return {
    income: { employment_income: employmentIncome, self_employment_income: 0 },
    // The form's "England, Wales, NI".
    region: "ENGLAND",
    gift_aid: 1_000,
    is_married: false,
    num_children: 0,
    year: 2026,
  };
}

export const UK_FAQ_CASES = {
  /** A higher-rate taxpayer. */
  higherRate: ukDonor(70_000),
  /** A basic-rate taxpayer. */
  basicRate: ukDonor(35_000),
} satisfies Record<string, UKCalculateRequest>;

export type UKFaqCase = keyof typeof UK_FAQ_CASES;
