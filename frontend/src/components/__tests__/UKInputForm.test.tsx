/**
 * The UK form's window-wide Enter key calculates once both sections are
 * confirmed, but only while the UK form is the one on screen.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UKInputForm from "../UKInputForm";
import { DEFAULT_UK_FORM_STATE, type UKFormState } from "../../lib/types";

const FORM: UKFormState = {
  ...DEFAULT_UK_FORM_STATE,
  gift_aid: 1000,
  income: { ...DEFAULT_UK_FORM_STATE.income, employment_income: 50_000 },
};

function confirmBothSections() {
  fireEvent.click(screen.getByRole("button", { name: "Enter household info" }));
  fireEvent.keyDown(screen.getByPlaceholderText("Enter annual income"), { key: "Enter" });
}

describe("UKInputForm", () => {
  it("calculates on Enter anywhere while it is on screen", () => {
    const onCalculate = vi.fn();
    render(
      <UKInputForm
        formState={FORM}
        setFormState={() => {}}
        onCalculate={onCalculate}
        isCalculating={false}
      />,
    );
    confirmBothSections();
    expect(onCalculate).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onCalculate).toHaveBeenCalledTimes(2);
  });

  it("ignores Enter while hidden behind the US form", () => {
    const onCalculate = vi.fn();
    const props = {
      formState: FORM,
      setFormState: () => {},
      onCalculate,
      isCalculating: false,
    };
    const { rerender } = render(<UKInputForm {...props} />);
    confirmBothSections();
    rerender(<UKInputForm {...props} active={false} />);
    const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    window.dispatchEvent(event);
    expect(onCalculate).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });
});
