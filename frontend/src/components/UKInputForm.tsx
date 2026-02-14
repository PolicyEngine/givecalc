/**
 * UK input form with wizard-style progressive disclosure
 */

import { useState, useEffect } from "react";
import type { UKFormState, UKIncome } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface Props {
  formState: UKFormState;
  setFormState: (state: UKFormState) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

// Section states
type SectionState = "active" | "complete" | "locked";

// Collapsible section wrapper
function Section({
  title,
  state,
  summary,
  onEdit,
  children,
}: {
  title: string;
  state: SectionState;
  summary?: React.ReactNode;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  if (state === "locked") {
    return (
      <div className="opacity-50 pointer-events-none">
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-400">{title}</span>
          <span className="text-xs text-gray-400">
            Complete previous section first
          </span>
        </div>
      </div>
    );
  }

  if (state === "complete" && summary) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 text-right">{summary}</div>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-primary-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-primary-50 border-b border-primary-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function UKInputForm({
  formState,
  setFormState,
  onCalculate,
  isCalculating,
}: Props) {
  // Track which sections are confirmed (user clicked Continue)
  const [donationConfirmed, setDonationConfirmed] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [editingDonation, setEditingDonation] = useState(true);
  const [editingDetails, setEditingDetails] = useState(false);
  const [showOtherIncome, setShowOtherIncome] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);

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

  // For tax purposes, only Scotland differs from rest of UK
  const isScotland = formState.region === "SCOTLAND";

  // Section completion checks
  const donationComplete = formState.gift_aid > 0;
  const detailsComplete = totalIncome > 0;

  // Section states - details only unlocks after user clicks Continue on donation
  const donationState: SectionState = editingDonation
    ? "active"
    : donationConfirmed
      ? "complete"
      : "active";
  const detailsState: SectionState = !donationConfirmed
    ? "locked"
    : editingDetails
      ? "active"
      : detailsConfirmed
        ? "complete"
        : "active";

  // Can calculate when both sections confirmed
  const canCalculate =
    donationConfirmed &&
    detailsConfirmed &&
    !editingDonation &&
    !editingDetails;

  // Global Enter key handler to trigger calculate when ready
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && canCalculate && !isCalculating) {
        e.preventDefault();
        onCalculate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canCalculate, isCalculating, onCalculate]);

  const handleDonationContinue = () => {
    if (donationComplete) {
      setDonationConfirmed(true);
      setEditingDonation(false);
      // Only open details for editing if not already confirmed
      if (!detailsConfirmed) {
        setEditingDetails(true);
      }
    }
  };

  const handleDetailsContinueAndCalculate = () => {
    if (detailsComplete) {
      setDetailsConfirmed(true);
      setEditingDetails(false);
      onCalculate();
    }
  };

  const taxYearDisplay = `${formState.year}/${formState.year + 1 - 2000}`;

  return (
    <div className="space-y-4">
      {/* Section 1: Gift Aid Donation */}
      <Section
        title="Your Gift Aid donation"
        state={donationState}
        summary={
          donationComplete ? (
            <span>
              {formatCurrency(formState.gift_aid, "GBP")}
              <span className="text-primary-600 ml-1">
                → {formatCurrency(formState.gift_aid * 1.25, "GBP")} to charity
              </span>
            </span>
          ) : undefined
        }
        onEdit={() => {
          setEditingDonation(true);
          setEditingDetails(false);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How much are you planning to donate?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <input
                type="number"
                value={formState.gift_aid || ""}
                onChange={(e) =>
                  updateField("gift_aid", Number(e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && donationComplete) {
                    e.preventDefault();
                    handleDonationContinue();
                  }
                }}
                min={0}
                step={100}
                placeholder="Enter amount"
                className="w-full pl-7 pr-3 py-3 text-lg border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {formState.gift_aid > 0 && (
              <div className="mt-2 p-3 bg-primary-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  With Gift Aid, the charity receives{" "}
                  <span className="font-semibold text-primary-700">
                    {formatCurrency(formState.gift_aid * 1.25, "GBP")}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  HMRC adds 25% to your donation at no extra cost to you
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleDonationContinue}
            disabled={!donationComplete}
            className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
              donationComplete
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Enter household info
          </button>
        </div>
      </Section>

      {/* Section 2: Personal Details */}
      <Section
        title="Your details"
        state={detailsState}
        summary={
          detailsComplete
            ? `${formatCurrency(totalIncome, "GBP")} income${isScotland ? ", Scotland" : ""}`
            : undefined
        }
        onEdit={() => {
          setEditingDetails(true);
          setEditingDonation(false);
        }}
      >
        <div className="space-y-5">
          {/* Employment Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employment income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <input
                type="number"
                value={formState.income.employment_income || ""}
                onChange={(e) =>
                  updateIncome("employment_income", Number(e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && detailsComplete) {
                    e.preventDefault();
                    handleDetailsContinueAndCalculate();
                  }
                }}
                min={0}
                step={1000}
                placeholder="Enter annual income"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {formState.income.employment_income > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(formState.income.employment_income, "GBP")}
              </p>
            )}
          </div>

          {/* Other Income Accordion */}
          <div>
            <button
              onClick={() => setShowOtherIncome(!showOtherIncome)}
              className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900"
            >
              <span>Other income (optional)</span>
              <span className="text-gray-400">
                {showOtherIncome ? "−" : "+"}
              </span>
            </button>

            {showOtherIncome && (
              <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Self-employment income
                  </label>
                  <input
                    type="number"
                    value={formState.income.self_employment_income || ""}
                    onChange={(e) =>
                      updateIncome(
                        "self_employment_income",
                        Number(e.target.value),
                      )
                    }
                    min={0}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
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

          {/* Nation Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nation
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => updateField("region", "ENGLAND")}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  !isScotland
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                England, Wales, NI
              </button>
              <button
                type="button"
                onClick={() => updateField("region", "SCOTLAND")}
                className={`flex-1 py-2 px-3 text-sm font-medium border-l border-gray-300 transition-colors ${
                  isScotland
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Scotland
              </button>
            </div>
            {isScotland && (
              <p className="text-xs text-amber-600 mt-1">
                Scottish income tax rates apply (19%-48%)
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
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  !formState.is_married
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => updateField("is_married", true)}
                className={`flex-1 py-2 px-3 text-sm font-medium border-l border-gray-300 transition-colors ${
                  formState.is_married
                    ? "bg-primary-600 text-white"
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
              Dependent children
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

          {/* Tax Year - Expandable */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowYearOptions(!showYearOptions)}
              className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900"
            >
              <span>Tax year: {taxYearDisplay}</span>
              <span className="text-gray-400">
                {showYearOptions ? "−" : "+"}
              </span>
            </button>

            {showYearOptions && (
              <div className="mt-3">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {[2024, 2025, 2026].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => updateField("year", year)}
                      className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                        year !== 2024 ? "border-l border-gray-300" : ""
                      } ${
                        formState.year === year
                          ? "bg-primary-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {year}/{year + 1 - 2000}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDetailsContinueAndCalculate}
            disabled={!detailsComplete || isCalculating}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
              !detailsComplete || isCalculating
                ? "bg-gray-400 cursor-not-allowed shadow-gray-400/25"
                : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/30 hover:shadow-primary-500/40 hover:shadow-xl active:scale-[0.98]"
            }`}
          >
            {isCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Calculating...
              </span>
            ) : (
              "Calculate Gift Aid impact"
            )}
          </button>
        </div>
      </Section>

      {/* Re-calculate button when both sections are confirmed but user edits and re-confirms */}
      {canCalculate && (
        <button
          onClick={onCalculate}
          disabled={isCalculating}
          className={`w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg ${
            isCalculating
              ? "bg-gray-400 cursor-not-allowed shadow-gray-400/25"
              : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/30 hover:shadow-primary-500/40 hover:shadow-xl active:scale-[0.98]"
          }`}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Calculating...
            </span>
          ) : (
            "Calculate Gift Aid impact"
          )}
        </button>
      )}
    </div>
  );
}
