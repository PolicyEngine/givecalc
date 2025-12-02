/**
 * UK-specific input form for GiveCalc
 */

import { useState } from "react";
import type { UKFormState, UKRegionInfo, UKIncome } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface Props {
  formState: UKFormState;
  setFormState: (state: UKFormState) => void;
  regions: UKRegionInfo[];
}

export default function UKInputForm({
  formState,
  setFormState,
  regions,
}: Props) {
  const [showOtherIncome, setShowOtherIncome] = useState(false);

  const updateField = <K extends keyof UKFormState>(
    field: K,
    value: UKFormState[K],
  ) => {
    setFormState({ ...formState, [field]: value });
  };

  const updateIncome = (field: keyof UKIncome, value: number) => {
    setFormState({
      ...formState,
      income: { ...formState.income, [field]: value },
    });
  };

  // Calculate total income for display
  const totalIncome = Object.values(formState.income).reduce(
    (a, b) => a + b,
    0,
  );

  // Group regions by nation
  const regionsByNation = regions.reduce(
    (acc, region) => {
      if (!acc[region.nation]) acc[region.nation] = [];
      acc[region.nation].push(region);
      return acc;
    },
    {} as Record<string, UKRegionInfo[]>,
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
              {year}/{year + 1 - 2000}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter your expected income and Gift Aid donations for this tax year
        </p>
      </div>

      {/* Region Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Region
        </label>
        <select
          value={formState.region}
          onChange={(e) => updateField("region", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          {Object.entries(regionsByNation).map(([nation, nationRegions]) => (
            <optgroup key={nation} label={nation}>
              {nationRegions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {formState.region === "SCOTLAND" && (
          <p className="text-xs text-amber-600 mt-1">
            Scottish income tax rates apply (19%-48%)
          </p>
        )}
      </div>

      {/* Employment Income */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employment income
        </label>
        <input
          type="number"
          value={formState.income.employment_income}
          onChange={(e) =>
            updateIncome("employment_income", Number(e.target.value))
          }
          min={0}
          max={10000000}
          step={1000}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(formState.income.employment_income, "GBP")}
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
          <span className="text-gray-400">{showOtherIncome ? "-" : "+"}</span>
        </button>

        {showOtherIncome && (
          <div className="mt-4 space-y-4">
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
          </div>
        )}

        {totalIncome > formState.income.employment_income && (
          <p className="text-xs text-gray-500 mt-2">
            Total income: {formatCurrency(totalIncome, "GBP")}
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
            Married/Civil partner
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

      {/* Gift Aid Donation */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gift Aid donation amount
        </label>
        <input
          type="number"
          value={formState.gift_aid}
          onChange={(e) => updateField("gift_aid", Number(e.target.value))}
          min={0}
          max={totalIncome}
          step={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(formState.gift_aid, "GBP")}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Charity receives:{" "}
          {formatCurrency(formState.gift_aid * 1.25, "GBP")} (with Gift Aid
          top-up)
        </p>
      </div>
    </div>
  );
}
