/**
 * Every figure the FAQ quotes.
 *
 * Results come from the API answers in faqNumbers.json, for the households
 * in faqCases.ts. Rules come from faqRules.json, which
 * tests/test_faq_numbers.py checks against the PolicyEngine parameters.
 */

import numbers from "./faqNumbers.json";
import rules from "./faqRules.json";
import { UK_FAQ_CASES, US_FAQ_CASES } from "./faqCases";
import { compareBunching } from "./pledge";

const { us, uk } = numbers;
const bunching = us.newYork.response.bunching;

function wages(form: (typeof US_FAQ_CASES)[keyof typeof US_FAQ_CASES]): number {
  return form.household.people[0].employmentIncome ?? 0;
}

export const FAQ_RULES = rules;

export const FAQ_FIGURES = {
  california: {
    wages: wages(US_FAQ_CASES.california),
    gift: US_FAQ_CASES.california.donation_amount,
    largerGift: US_FAQ_CASES.californiaLarger.donation_amount,
    year: US_FAQ_CASES.california.household.year,
    earlierYear: US_FAQ_CASES.california2025.household.year,
    savings: us.california.response.tax_savings,
    largerGiftSavings: us.californiaLarger.response.tax_savings,
    earlierYearSavings: us.california2025.response.tax_savings,
  },
  newYork: {
    wages: wages(US_FAQ_CASES.newYork),
    gift: US_FAQ_CASES.newYork.donation_amount,
    year: US_FAQ_CASES.newYork.household.year,
    bunching: compareBunching(
      us.newYork.response.tax_savings,
      bunching.next_year_tax_savings,
      bunching.bunched_tax_savings,
    ),
  },
  texas: {
    wages: wages(US_FAQ_CASES.texas),
    gift: US_FAQ_CASES.texas.donation_amount,
    largerGift: US_FAQ_CASES.texasMore.donation_amount,
    year: US_FAQ_CASES.texas.household.year,
    extraSavings:
      us.texasMore.response.tax_savings - us.texas.response.tax_savings,
  },
  giftAid: {
    gift: UK_FAQ_CASES.higherRate.gift_aid,
    year: UK_FAQ_CASES.higherRate.year,
    higherRateIncome: UK_FAQ_CASES.higherRate.income.employment_income,
    higherRateSavings: uk.higherRate.response.tax_savings,
    basicRateIncome: UK_FAQ_CASES.basicRate.income.employment_income,
    basicRateSavings: uk.basicRate.response.tax_savings,
  },
};
