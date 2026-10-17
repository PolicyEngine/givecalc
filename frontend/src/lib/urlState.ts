/**
 * Shareable URL state for the US calculator.
 *
 * `?pledge=10&income=150000&state=NY` opens GiveCalc giving 10% of a
 * $150,000 income in New York and calculates straight away. `pledge` selects
 * the share-of-income option; `amount` selects a specific amount. Unknown or invalid
 * values are ignored, so a bad link falls back to the empty form.
 */

import type { FormState } from "./types";
import { TAX_YEAR_OPTIONS } from "./types";

const STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

/** The API caps wages and salaries at $10 million (api/schemas.py). */
export const MAX_WAGES = 10_000_000;

function nonNegative(value: string | null, max = 100_000_000): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

function flag(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

/** Apply the URL's inputs to a form. Returns an equal form if none apply. */
export function applySearchParams(form: FormState, search: string): FormState {
  const params = new URLSearchParams(search);
  const next: FormState = {
    ...form,
    income: { ...form.income },
    deductions: { ...form.deductions },
  };

  const pledge = nonNegative(params.get("pledge"), 100);
  const amount = nonNegative(params.get("amount"));
  if (pledge !== null && pledge > 0) {
    next.mode = "pledge";
    next.pledge_percent = pledge;
  } else if (amount !== null && amount > 0) {
    next.mode = "amount";
    next.donation_amount = amount;
  }

  const income = nonNegative(params.get("income"), MAX_WAGES);
  if (income !== null) next.income.wages_and_salaries = income;

  const state = params.get("state")?.toUpperCase();
  if (state && STATE_CODES.has(state)) next.state_code = state;

  const married = flag(params.get("married"));
  if (married !== null) next.is_married = married;

  const nyc = flag(params.get("nyc"));
  if (nyc !== null) next.in_nyc = nyc && next.state_code === "NY";

  const children = nonNegative(params.get("children"), 10);
  if (children !== null) next.num_children = Math.floor(children);

  const year = nonNegative(params.get("year"), 3000);
  if (year !== null && TAX_YEAR_OPTIONS.includes(year)) next.year = year;

  const mortgage = nonNegative(params.get("mortgage"));
  if (mortgage !== null) next.deductions.mortgage_interest = mortgage;

  const propertyTax = nonNegative(params.get("property_tax"));
  if (propertyTax !== null) next.deductions.real_estate_taxes = propertyTax;

  return next;
}

/** True when the form has everything a calculation needs. */
export function isReadyToCalculate(form: FormState): boolean {
  const hasGift =
    form.mode === "pledge" ? form.pledge_percent > 0 : form.donation_amount > 0;
  return (
    hasGift && form.income.wages_and_salaries > 0 && form.state_code !== ""
  );
}

/** Serialize the shareable inputs. Only wages are shared, not other income. */
export function toSearchParams(form: FormState): string {
  const params = new URLSearchParams();
  if (form.mode === "pledge") {
    params.set("pledge", String(form.pledge_percent));
  } else {
    params.set("amount", String(form.donation_amount));
  }
  params.set("income", String(form.income.wages_and_salaries));
  params.set("state", form.state_code);
  if (form.is_married) params.set("married", "1");
  if (form.in_nyc) params.set("nyc", "1");
  if (form.num_children > 0) params.set("children", String(form.num_children));
  params.set("year", String(form.year));
  if (form.deductions.mortgage_interest > 0) {
    params.set("mortgage", String(form.deductions.mortgage_interest));
  }
  if (form.deductions.real_estate_taxes > 0) {
    params.set("property_tax", String(form.deductions.real_estate_taxes));
  }
  return params.toString();
}
