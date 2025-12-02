/**
 * Main input form for GiveCalc
 */

import { useState } from "react";
import type { FormState, StateInfo, Income } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface Props {
  formState: FormState;
  setFormState: (state: FormState) => void;
  states: StateInfo[];
}

export default function InputForm({
  formState,
  setFormState,
  states,
}: Props) {
  const [showDeductions, setShowDeductions] = useState(false);
  const [showOtherIncome, setShowOtherIncome] = useState(false);

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormState({ ...formState, [field]: value });
  };

  const updateIncome = (field: keyof Income, value: number) => {
    setFormState({
      ...formState,
      income: { ...formState.income, [field]: value },
    });
  };

  const updateDeduction = (
    field: keyof FormState["deductions"],
    value: number,
  ) => {
    setFormState({
      ...formState,
      deductions: { ...formState.deductions, [field]: value },
    });
  };

  // Calculate total income for display
  const totalIncome = Object.values(formState.income).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Your information</h2>

      {/* Tax Year Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tax year
        </label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {[2024, 2025, 2026].map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => updateField("year", year)}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                year !== 2024 ? "border-l border-gray-300" : ""
              } ${
                formState.year === year
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter your expected income and donations for this tax year
        </p>
      </div>

      {/* State Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          State
        </label>
        <select
          value={formState.state_code}
          onChange={(e) => updateField("state_code", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="" disabled>
            Select a state...
          </option>
          {states.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        {formState.state_code === "NY" && (
          <label className="flex items-center mt-2 text-sm">
            <input
              type="checkbox"
              checked={formState.in_nyc}
              onChange={(e) => updateField("in_nyc", e.target.checked)}
              className="mr-2 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            I live in New York City
          </label>
        )}
      </div>

      {/* Wages and Salaries */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wages and salaries
        </label>
        <input
          type="number"
          value={formState.income.wages_and_salaries}
          onChange={(e) =>
            updateIncome("wages_and_salaries", Number(e.target.value))
          }
          min={0}
          max={10000000}
          step={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(formState.income.wages_and_salaries)}
        </p>
      </div>

      {/* Other Income Accordion */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowOtherIncome(!showOtherIncome)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">
            Other income (optional)
          </span>
          <span className="text-gray-400">{showOtherIncome ? "−" : "+"}</span>
        </button>

        {showOtherIncome && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tips</label>
              <input
                type="number"
                value={formState.income.tips}
                onChange={(e) => updateIncome("tips", Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Self-employment income
              </label>
              <input
                type="number"
                value={formState.income.self_employment_income}
                onChange={(e) =>
                  updateIncome("self_employment_income", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Interest income
              </label>
              <input
                type="number"
                value={formState.income.interest_income}
                onChange={(e) =>
                  updateIncome("interest_income", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Dividends (ordinary)
              </label>
              <input
                type="number"
                value={formState.income.dividends}
                onChange={(e) =>
                  updateIncome("dividends", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Qualified dividends
              </label>
              <input
                type="number"
                value={formState.income.qualified_dividends}
                onChange={(e) =>
                  updateIncome("qualified_dividends", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Short-term capital gains
              </label>
              <input
                type="number"
                value={formState.income.short_term_capital_gains}
                onChange={(e) =>
                  updateIncome(
                    "short_term_capital_gains",
                    Number(e.target.value),
                  )
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Long-term capital gains
              </label>
              <input
                type="number"
                value={formState.income.long_term_capital_gains}
                onChange={(e) =>
                  updateIncome(
                    "long_term_capital_gains",
                    Number(e.target.value),
                  )
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {totalIncome > formState.income.wages_and_salaries && (
          <p className="text-xs text-gray-500 mt-2">
            Total income: {formatCurrency(totalIncome)}
          </p>
        )}
      </div>

      {/* Marital Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Marital status
        </label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => updateField("is_married", false)}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              !formState.is_married
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => updateField("is_married", true)}
            className={`flex-1 py-2 px-4 text-sm font-medium border-l border-gray-300 transition-colors ${
              formState.is_married
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Married
          </button>
        </div>
      </div>

      {/* Number of Children */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of dependent children
        </label>
        <input
          type="number"
          value={formState.num_children}
          onChange={(e) =>
            updateField(
              "num_children",
              Math.max(0, Math.min(10, Number(e.target.value))),
            )
          }
          min={0}
          max={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Itemized Deductions Accordion */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowDeductions(!showDeductions)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">
            Itemized deductions (optional)
          </span>
          <span className="text-gray-400">{showDeductions ? "−" : "+"}</span>
        </button>

        {showDeductions && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Mortgage interest
              </label>
              <input
                type="number"
                value={formState.deductions.mortgage_interest}
                onChange={(e) =>
                  updateDeduction("mortgage_interest", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Real estate taxes
              </label>
              <input
                type="number"
                value={formState.deductions.real_estate_taxes}
                onChange={(e) =>
                  updateDeduction("real_estate_taxes", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Medical out-of-pocket expenses
              </label>
              <input
                type="number"
                value={formState.deductions.medical_expenses}
                onChange={(e) =>
                  updateDeduction("medical_expenses", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Casualty and theft losses
              </label>
              <input
                type="number"
                value={formState.deductions.casualty_loss}
                onChange={(e) =>
                  updateDeduction("casualty_loss", Number(e.target.value))
                }
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Donation Mode */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Calculation mode
        </label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => updateField("mode", "amount")}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              formState.mode === "amount"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Specific amount
          </button>
          <button
            type="button"
            onClick={() => updateField("mode", "target")}
            className={`flex-1 py-2 px-4 text-sm font-medium border-l border-gray-300 transition-colors ${
              formState.mode === "target"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Target reduction
          </button>
        </div>

        {formState.mode === "amount" ? (
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Donation amount
            </label>
            <input
              type="number"
              value={formState.donation_amount}
              onChange={(e) =>
                updateField("donation_amount", Number(e.target.value))
              }
              min={0}
              max={totalIncome}
              step={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(formState.donation_amount)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => updateField("is_percentage", true)}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  formState.is_percentage
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => updateField("is_percentage", false)}
                className={`flex-1 py-2 px-4 text-sm font-medium border-l border-gray-300 transition-colors ${
                  !formState.is_percentage
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Dollar amount
              </button>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Target net income reduction
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formState.target_reduction}
                  onChange={(e) =>
                    updateField("target_reduction", Number(e.target.value))
                  }
                  min={0}
                  step={formState.is_percentage ? 1 : 100}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-500">
                  {formState.is_percentage ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
