/**
 * Results display component
 */

import { useState, useEffect } from "react";
import type { CalculateResponse, TargetDonationResponse } from "../lib/types";
import { formatCurrency, formatPercent } from "../lib/format";
import TaxChart from "./TaxChart";
import MarginalChart from "./MarginalChart";

interface Props {
  result: CalculateResponse | null;
  targetResult: TargetDonationResponse | null;
  mode: "amount" | "target";
  isCalculating?: boolean;
  currency?: "USD" | "GBP";
}

// Progress bar with elapsed time for calculating state
function CalculatingProgress({ isUK }: { isUK: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show different messages based on elapsed time and country
  const getMessage = () => {
    if (elapsed < 5) {
      return "Running tax simulations across donation amounts...";
    } else if (elapsed < 15) {
      return isUK
        ? "Calculating Gift Aid relief and tax impacts..."
        : "Calculating federal and state tax impacts...";
    } else if (elapsed < 30) {
      return "Server is warming up. This happens after periods of inactivity.";
    } else {
      return "Almost there. First calculation takes longer while the model loads.";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Calculating...
        </h2>
        <p className="text-gray-600 text-center mb-4">{getMessage()}</p>
        <p className="text-sm text-gray-400">{elapsed}s</p>
      </div>
    </div>
  );
}

export default function Results({
  result,
  targetResult,
  mode,
  isCalculating,
  currency = "USD",
}: Props) {
  const fmt = (value: number) => formatCurrency(value, currency);
  const currencySymbol = currency === "GBP" ? "£" : "$";
  if (isCalculating) {
    return <CalculatingProgress isUK={currency === "GBP"} />;
  }

  if (!result && !targetResult) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg shadow-gray-200/50 p-10 text-center border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Calculate your tax impact
        </h2>
        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
          Enter your information and click{" "}
          <span className="font-semibold text-primary-600">"Calculate tax impact"</span>{" "}
          to see how charitable giving affects your taxes.
        </p>
      </div>
    );
  }

  const data = mode === "target" && targetResult ? targetResult : result;
  if (!data) return null;

  const isTarget = mode === "target" && targetResult;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isTarget ? "Required donation" : "Tax impact summary"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isTarget && targetResult ? (
            <>
              <MetricCard
                label="Required donation"
                value={fmt(targetResult.required_donation)}
                description="To achieve your target reduction"
                highlight
              />
              <MetricCard
                label="Net income reduction"
                value={fmt(targetResult.actual_reduction)}
                description={`${formatPercent(targetResult.actual_percentage / 100)} of net income`}
              />
              <MetricCard
                label="Net income after"
                value={fmt(targetResult.net_income_after_donation)}
                description="Your take-home after donation"
              />
            </>
          ) : result ? (
            currency === "GBP" ? (
              // UK-specific metrics showing Gift Aid breakdown
              <>
                <MetricCard
                  label="Charity receives"
                  value={fmt(result.donation_amount * 1.25)}
                  description="Your donation + 25% Gift Aid reclaim"
                  highlight
                />
                <MetricCard
                  label="Your tax relief"
                  value={fmt(result.tax_savings)}
                  description={result.tax_savings > 0 ? "Higher/additional rate relief" : "Basic rate taxpayers: no personal relief"}
                />
                <MetricCard
                  label="Your net cost"
                  value={fmt(result.donation_amount - result.tax_savings)}
                  description="What you pay after claiming relief"
                />
              </>
            ) : (
              // US metrics
              <>
                <MetricCard
                  label="Tax savings"
                  value={fmt(result.tax_savings)}
                  description="Your total tax reduction"
                  highlight
                />
                <MetricCard
                  label="Marginal savings rate"
                  value={formatPercent(result.marginal_savings_rate)}
                  description={`Tax saved per ${currencySymbol}1 donated`}
                />
                <MetricCard
                  label="Net cost of donation"
                  value={fmt(result.donation_amount - result.tax_savings)}
                  description="Donation minus tax savings"
                />
              </>
            )
          ) : null}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            Net taxes vs. donation amount
          </h3>
          <TaxChart
            curve={data.curve}
            currentDonation={
              isTarget && targetResult
                ? targetResult.required_donation
                : result?.donation_amount || 0
            }
            currency={currency}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg shadow-gray-200/50 p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500" />
            {currency === "GBP" ? "Tax relief breakdown" : "Marginal savings rate"}
          </h3>
          <MarginalChart
            curve={data.curve}
            currentDonation={
              isTarget && targetResult
                ? targetResult.required_donation
                : result?.donation_amount || 0
            }
            currency={currency}
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      {result && !isTarget && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detailed breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">
                Baseline net tax (no donation)
              </span>
              <span className="font-medium">{fmt(result.baseline_net_tax)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">
                Net tax at {fmt(result.donation_amount)}
              </span>
              <span className="font-medium">
                {fmt(result.net_tax_at_donation)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Baseline net income</span>
              <span className="font-medium">
                {fmt(result.baseline_net_income)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Net income after donation</span>
              <span className="font-medium">
                {fmt(result.net_income_after_donation)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Methodology Explanation */}
      <MethodologyExplainer currency={currency} />
    </div>
  );
}

function MethodologyExplainer({ currency }: { currency: "USD" | "GBP" }) {
  const [isOpen, setIsOpen] = useState(false);
  const isUK = currency === "GBP";

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          {isUK ? "How Gift Aid works" : "Why GiveCalc is more accurate"}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 text-sm text-gray-600">
          {isUK ? (
            // UK-specific Gift Aid explanation
            <>
              <p>
                Gift Aid is a UK tax relief that benefits both charities and higher-rate taxpayers:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Charity's Gift Aid reclaim (25%)
                    </p>
                    <p className="text-gray-600">
                      For every £1 you donate, the charity claims an extra 25p from HMRC.
                      This is automatic—the charity handles the paperwork.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Higher rate relief (for 40%+ taxpayers)
                    </p>
                    <p className="text-gray-600">
                      If you pay 40% or 45% tax, you can claim the difference between
                      your rate and the basic rate (20%) on your Self Assessment.
                      For a £1,000 donation, a 40% taxpayer claims back £200.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Scottish income tax rates
                    </p>
                    <p className="text-gray-600">
                      Scotland has different tax bands (19%-48%). GiveCalc calculates
                      relief based on your actual Scottish rates, which may differ from
                      the rest of the UK.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Personal Allowance tapering
                    </p>
                    <p className="text-gray-600">
                      Above £100,000 income, your Personal Allowance reduces by £1 for
                      every £2 earned. Gift Aid can reduce your taxable income and
                      restore some of your allowance.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Child Benefit tapering
                    </p>
                    <p className="text-gray-600">
                      If you or your partner earns over £60,000, you lose some or all
                      Child Benefit through the High Income Child Benefit Charge.
                      Gift Aid donations can help preserve this benefit.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // US explanation
            <>
              <p>
                Many donation calculators simply multiply your donation by your
                marginal tax rate (e.g., "You're in the 24% bracket, so you save 24¢
                per dollar donated"). This approach misses several important
                factors:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Standard vs. itemized deduction threshold
                    </p>
                    <p className="text-gray-600">
                      You only benefit from charitable deductions if your total
                      itemized deductions exceed the standard deduction. GiveCalc
                      calculates exactly when you cross this threshold.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      Bracket changes from large donations
                    </p>
                    <p className="text-gray-600">
                      Large donations can push you into lower tax brackets. A
                      $50,000 donation might save at 32% for the first portion and
                      24% for the rest.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      State and local tax interactions
                    </p>
                    <p className="text-gray-600">
                      State income taxes, the SALT cap, and state-specific
                      charitable credits all interact with federal taxes. GiveCalc
                      models all 50 states plus DC.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Benefit phase-outs</p>
                    <p className="text-gray-600">
                      Credits like the Child Tax Credit and EITC phase out based on
                      income. Reducing AGI through donations can restore some of
                      these benefits.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      AGI-based deduction limits
                    </p>
                    <p className="text-gray-600">
                      Charitable deductions are capped at 60% of AGI (for cash).
                      Very large donations may not be fully deductible in the
                      current year.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              GiveCalc uses{" "}
              <a
                href="https://policyengine.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                PolicyEngine
              </a>
              's microsimulation model, which implements the full {isUK ? "UK" : "U.S."} tax and
              benefit system—the same model used by {isUK ? "government departments" : "congressional offices"} and
              think tanks to analyze policy impacts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  highlight?: boolean;
}

function MetricCard({ label, value, description, highlight }: MetricCardProps) {
  return (
    <div
      className={`relative rounded-xl p-5 transition-all duration-200 ${
        highlight
          ? "bg-gradient-to-br from-primary-50 to-primary-100/50 border-2 border-primary-200 shadow-lg shadow-primary-500/10"
          : "bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md"
      }`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-2 right-[-20px] w-[70px] bg-primary-500 text-white text-[10px] font-bold text-center py-0.5 rotate-45 shadow-sm">
            KEY
          </div>
        </div>
      )}
      <p className={`text-sm font-medium mb-1 ${highlight ? "text-primary-700" : "text-gray-600"}`}>
        {label}
      </p>
      <p
        className={`text-3xl font-bold tracking-tight ${
          highlight ? "text-primary-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      <p className={`text-xs mt-2 ${highlight ? "text-primary-600/70" : "text-gray-500"}`}>
        {description}
      </p>
    </div>
  );
}
