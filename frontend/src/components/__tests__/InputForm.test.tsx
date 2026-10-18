/**
 * The US form on policyengine-household-wizard: one question per step, a
 * review, and validation that routes to the step with the problem.
 */

import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TIPPED_OCCUPATIONS } from "policyengine-household-wizard/us-household";
import InputForm from "../InputForm";
import { STATES } from "../../lib/api";
import { applySearchParams } from "../../lib/urlState";
import { toCalculateRequest } from "../../lib/household";
import { blankForm, type FormState } from "../../lib/types";

/** A blank form with a $5,000 gift, so tests can move past the first step. */
function withGift(form: FormState = blankForm(2026)): FormState {
  return { ...form, donation_amount: 5000 };
}

function Harness({
  initial = withGift(),
  onCalculate = vi.fn(),
  prefilled = false,
  onChange,
}: {
  initial?: FormState;
  onCalculate?: () => void;
  prefilled?: boolean;
  onChange?: (form: FormState) => void;
}) {
  const [form, setForm] = useState(initial);
  return (
    <InputForm
      formState={form}
      setFormState={(next) => {
        setForm(next);
        onChange?.(next);
      }}
      states={STATES.states}
      onCalculate={onCalculate}
      isCalculating={false}
      prefilled={prefilled}
    />
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const choose = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("radio", { name }));
const SHARE_OF_INCOME = /^Share of income/;

/** Answer every step for a single New Yorker giving 10% of $150,000. */
function fillSingleNewYorker() {
  choose(SHARE_OF_INCOME); // 10% unless changed
  next();
  type("State", "NY");
  choose("Single");
  type("Your age", "40");
  next();
  type("Wages and salaries, not counting tips", "150000");
  next();
  choose("No");
  next();
}

describe("InputForm", () => {
  it("asks for a specific amount first, as step 1 of 5", () => {
    render(<Harness initial={blankForm(2026)} />);
    expect(screen.getByRole("radio", { name: "Specific amount" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("How much do you plan to give?")).toBeInTheDocument();
    expect(screen.getByTestId("pe-wizard-progress-step")).toHaveTextContent("Step 1 of 5");
    expect(screen.getByRole("heading", { name: "Your gift" })).toBeInTheDocument();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter how much you plan to give.");
  });

  it("offers a share of income as the second option, at 10% unless changed", () => {
    render(<Harness initial={blankForm(2026)} />);
    const [first, second] = screen.getAllByRole("radio");
    expect(first).toHaveAccessibleName("Specific amount");
    expect(second).toHaveAccessibleName(/Share of income/);
    choose(SHARE_OF_INCOME);
    expect(screen.getByLabelText("What share of your income do you give?")).toHaveValue(10);
    expect(screen.queryByText(/pledge/i)).not.toBeInTheDocument();
  });

  it("lists every state and stays on the step until it is answered", () => {
    render(<Harness />);
    next();
    const select = screen.getByLabelText("State");
    expect(select.querySelectorAll("option")).toHaveLength(STATES.states.length + 1);
    next();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Choose your state.");
    expect(alert).toHaveTextContent("Choose your marital status.");
    expect(alert).toHaveTextContent("Enter your age.");
    expect(screen.getByRole("heading", { name: "Your household" })).toBeInTheDocument();
    // Each problem is tied to its field.
    const state = screen.getByLabelText("State");
    expect(state).toHaveAttribute("aria-invalid", "true");
    expect(state).toHaveAccessibleDescription("Choose your state.");
    expect(screen.getByRole("radiogroup", { name: "Marital status" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("asks marital status, not filing status, and the spouse's age when married", () => {
    render(<Harness />);
    next();
    expect(screen.queryByText(/filing status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Your spouse's age")).not.toBeInTheDocument();
    choose("Married");
    expect(screen.getByLabelText("Your spouse's age")).toBeInTheDocument();
    choose("Single");
    expect(screen.queryByLabelText("Your spouse's age")).not.toBeInTheDocument();
  });

  it("asks each dependent's age, and keeps the others' when one is removed", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    next();
    const add = screen.getByRole("button", { name: "Add a dependent" });
    fireEvent.click(add);
    fireEvent.click(add);
    type("Age of dependent 1", "4");
    type("Age of dependent 2", "12");
    const ages = () =>
      (onChange.mock.calls.at(-1)?.[0] as FormState).household.people
        .filter((p) => p.kind === "dependent")
        .map((p) => p.age);
    expect(ages()).toEqual([4, 12]);
    fireEvent.click(screen.getByRole("button", { name: "Remove a dependent" }));
    expect(ages()).toEqual([4]);
    expect(screen.queryByLabelText("Age of dependent 2")).not.toBeInTheDocument();
  });

  it("keeps adults first when a spouse is added after the children", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Add a dependent" }));
    choose("Married");
    const people = (onChange.mock.calls.at(-1)?.[0] as FormState).household.people;
    expect(people.map((p) => p.kind)).toEqual(["adult", "adult", "dependent"]);
  });

  it("offers counties for the state, with the New York City hint", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    next();
    type("State", "NY");
    expect(screen.getByLabelText("County (optional)")).toBeInTheDocument();
    expect(screen.getByText(/Brooklyn is Kings County/)).toBeInTheDocument();
    type("County (optional)", "KINGS_COUNTY_NY");
    type("State", "NJ");
    expect((onChange.mock.calls.at(-1)?.[0] as FormState).household.county).toBeNull();
  });

  it("asks the tipped occupation only for tips, from the Treasury list", () => {
    render(<Harness />);
    next();
    next(); // errors keep us on the household step
    type("State", "NV");
    choose("Single");
    type("Your age", "30");
    next();
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    expect(screen.queryByLabelText("Occupation you received tips in")).not.toBeInTheDocument();
    type("Tips", "12000");
    const select = screen.getByLabelText("Occupation you received tips in");
    // A prompt, "Not on the list", and every listed occupation.
    expect(select.querySelectorAll("option")).toHaveLength(TIPPED_OCCUPATIONS.length + 2);
    expect(within(select).getByRole("option", { name: "Wait staff" })).toHaveValue("102");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent(
      'Choose the occupation for your tips, or "Not on the list".',
    );
    type("Occupation you received tips in", "0");
    next();
    expect(screen.getByRole("heading", { name: "Your home" })).toBeInTheDocument();
  });

  it("reveals home costs only with Yes, and keeps them through a No", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    next();
    type("State", "TX");
    choose("Single");
    type("Your age", "50");
    next();
    type("Wages and salaries, not counting tips", "90000");
    next();
    expect(screen.queryByLabelText("Mortgage interest paid in 2026")).not.toBeInTheDocument();
    choose("Yes");
    type("Mortgage interest paid in 2026", "18000");
    type("Property tax paid in 2026", "7000");
    expect((onChange.mock.calls.at(-1)?.[0] as FormState).household.people[0]).toMatchObject({
      mortgageInterest: 18000,
      realEstateTaxes: 7000,
    });
    choose("No");
    const no = onChange.mock.calls.at(-1)?.[0] as FormState;
    // Kept in the draft, left out of the request.
    expect(no.household.people[0].mortgageInterest).toBe(18000);
    expect(toCalculateRequest(no).household.people["adult-1"]).not.toHaveProperty(
      "home_mortgage_interest",
    );
    choose("Yes");
    expect(screen.getByLabelText("Mortgage interest paid in 2026")).toHaveValue(18000);
  });

  it("brings back the spouse's answers after Married, Single, Married", () => {
    render(<Harness />);
    next();
    const married = screen.getByRole("radio", { name: "Married" });
    fireEvent.click(married);
    type("Your spouse's age", "38");
    // Arrow keys pass over Single on the way back.
    married.focus();
    fireEvent.keyDown(married, { key: "ArrowRight" });
    expect(screen.queryByLabelText("Your spouse's age")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("radio", { name: "Single" }), { key: "ArrowRight" });
    expect(screen.getByLabelText("Your spouse's age")).toHaveValue(38);
  });

  it("reviews every answer and calculates", () => {
    const onCalculate = vi.fn();
    render(<Harness onCalculate={onCalculate} />);
    fillSingleNewYorker();
    expect(screen.getByRole("heading", { name: "Review and calculate" })).toBeInTheDocument();
    expect(screen.getByText("10% of income ($15,000)")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("$150,000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calculate tax impact" }));
    expect(onCalculate).toHaveBeenCalledTimes(1);
  });

  it("goes back to a question from the review", () => {
    render(<Harness />);
    fillSingleNewYorker();
    fireEvent.click(screen.getByRole("button", { name: /Edit Where you live/ }));
    expect(screen.getByRole("heading", { name: "Your household" })).toBeInTheDocument();
  });

  it("opens a shared link on the review and calculates from there", () => {
    const onCalculate = vi.fn();
    const form = applySearchParams(blankForm(2026), "?pledge=10&income=150000&state=NY");
    render(<Harness initial={form} prefilled onCalculate={onCalculate} />);
    expect(screen.getByRole("heading", { name: "Review and calculate" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Calculate tax impact" }));
    expect(onCalculate).toHaveBeenCalledTimes(1);
  });

  it("opens an incomplete shared link on the first question it leaves unanswered", () => {
    const onCalculate = vi.fn();
    const form = applySearchParams(blankForm(2026), "?pledge=10&state=NY");
    render(<Harness initial={form} prefilled onCalculate={onCalculate} />);
    expect(screen.getByRole("heading", { name: "Your income" })).toBeInTheDocument();
    next();
    expect(onCalculate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your household's income.");
  });

  it("stops on the household step when an answer is removed", () => {
    const onCalculate = vi.fn();
    const form = applySearchParams(blankForm(2026), "?pledge=10&income=150000&state=NY");
    render(<Harness initial={form} prefilled onCalculate={onCalculate} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit Age/ }));
    type("Your age", "");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onCalculate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your age.");
  });

  it("keeps focus in a field when a fixed answer is cleared to retype", () => {
    render(<Harness />);
    next();
    next(); // shows the household errors
    type("State", "NY");
    choose("Single");
    type("Your age", "40");
    // Every error is fixed, so the summary goes away.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const age = screen.getByLabelText("Your age");
    age.focus();
    type("Your age", "");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(age);
  });

  it("rejects negative interest and dividends, and allows a self-employment loss", () => {
    render(<Harness />);
    next();
    type("State", "TX");
    choose("Single");
    type("Your age", "40");
    next();
    type("Wages and salaries, not counting tips", "50000");
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    type("Self-employment income (negative for a loss)", "-2000");
    type("Taxable interest", "-500");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Taxable interest cannot be negative.");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/Self-employment/);
    type("Taxable interest", "500");
    next();
    expect(screen.getByRole("heading", { name: "Your home" })).toBeInTheDocument();
  });

  it("opens the extra incomes when one of them has a problem", () => {
    render(<Harness />);
    next();
    type("State", "NV");
    choose("Single");
    type("Your age", "30");
    next();
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    type("Tips", "500");
    // Close the section, then try to continue without the occupation.
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    next();
    expect(screen.getByLabelText("Occupation you received tips in")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("advances and calculates with Enter in any field", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(<Harness onCalculate={onCalculate} />);
    await user.clear(screen.getByLabelText("How much do you plan to give?"));
    await user.type(screen.getByLabelText("How much do you plan to give?"), "5000{Enter}");
    expect(screen.getByRole("heading", { name: "Your household" })).toBeInTheDocument();
    // Two number fields on this step: implicit submission needs a submit button.
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "NY" } });
    choose("Single");
    await user.type(screen.getByLabelText("Your age"), "40{Enter}");
    expect(screen.getByRole("heading", { name: "Your income" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Wages and salaries, not counting tips"), "90000{Enter}");
    choose("Yes");
    await user.type(screen.getByLabelText("Mortgage interest paid in 2026"), "9000{Enter}");
    expect(screen.getByRole("heading", { name: "Review and calculate" })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(onCalculate).toHaveBeenCalledTimes(1);
  });

  it("does not move focus when the page loads, only between steps", () => {
    render(<Harness />);
    expect(document.activeElement).toBe(document.body);
    next();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your household" }));
  });

  it("moves between and chooses cards with the arrow keys", () => {
    render(<Harness />);
    next();
    const single = screen.getByRole("radio", { name: "Single" });
    const married = screen.getByRole("radio", { name: "Married" });
    // One tab stop for the group.
    expect(single).toHaveAttribute("tabindex", "0");
    expect(married).toHaveAttribute("tabindex", "-1");
    single.focus();
    fireEvent.keyDown(single, { key: "ArrowRight" });
    expect(married).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(married);
    expect(married).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(married, { key: "ArrowRight" });
    expect(single).toHaveAttribute("aria-checked", "true");
  });

  it("requires a county in Maryland, where a blank one would mean a particular county", () => {
    render(<Harness />);
    next();
    type("State", "MD");
    choose("Single");
    type("Your age", "40");
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose your county.");
    expect(screen.getByLabelText("County")).toHaveAccessibleDescription(
      "Choose your county. Maryland's local income tax rate depends on your county.",
    );
    type("County", "MONTGOMERY_COUNTY_MD");
    next();
    expect(screen.getByRole("heading", { name: "Your income" })).toBeInTheDocument();
  });

  it("clears the occupation when tips are cleared", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    next();
    type("State", "NV");
    choose("Single");
    type("Your age", "30");
    next();
    fireEvent.click(
      screen.getByRole("button", { name: /Tips, self-employment and investment income/ }),
    );
    type("Tips", "500");
    type("Occupation you received tips in", "102");
    type("Tips", "");
    const person = (onChange.mock.calls.at(-1)?.[0] as FormState).household.people[0];
    expect(person.tipIncome).toBeUndefined();
    expect(person.tippedOccupationCode).toBeUndefined();
  });
});
