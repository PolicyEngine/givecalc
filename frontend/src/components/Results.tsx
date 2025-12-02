/**
 * Results display component
 */

import { useState } from "react";
import type { CalculateResponse, TargetDonationResponse } from "../lib/types";
import { formatCurrency, formatPercent } from "../lib/format";
import TaxChart from "./TaxChart";
import MarginalChart from "./MarginalChart";

interface Props {
  result: CalculateResponse | null;
  targetResult: TargetDonationResponse | null;
  mode: "amount" | "target";
  isCalculating?: boolean;
}

export default function Results({
  result,
  targetResult,
  mode,
  isCalculating,
}: Props) {
  if (isCalculating) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Calculating...
          </h2>
          <p className="text-gray-600 text-center">
            Running tax simulations across donation amounts.
            <br />
            This may take a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (!result && !targetResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Calculate your tax impact
        </h2>
        <p className="text-gray-600">
          Enter your information and click "Calculate tax impact" to see how
          charitable giving affects your taxes.
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isTarget ? "Required donation" : "Tax impact summary"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isTarget && targetResult ? (
            <>
              <MetricCard
                label="Required donation"
                value={formatCurrency(targetResult.required_donation)}
                description="To achieve your target reduction"
                highlight
              />
              <MetricCard
                label="Net income reduction"
                value={formatCurrency(targetResult.actual_reduction)}
                description={`${formatPercent(targetResult.actual_percentage / 100)} of net income`}
              />
              <MetricCard
                label="Net income after"
                value={formatCurrency(targetResult.net_income_after_donation)}
                description="Your take-home after donation"
              />
            </>
          ) : result ? (
            <>
              <MetricCard
                label="Tax savings"
                value={formatCurrency(result.tax_savings)}
                description="Your total tax reduction"
                highlight
              />
              <MetricCard
                label="Marginal savings rate"
                value={formatPercent(result.marginal_savings_rate)}
                description="Tax saved per $1 donated"
              />
              <MetricCard
                label="Net cost of donation"
                value={formatCurrency(
                  result.donation_amount - result.tax_savings,
                )}
                description="Donation minus tax savings"
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Net taxes vs. donation amount
          </h3>
          <TaxChart
            curve={data.curve}
            currentDonation={
              isTarget && targetResult
                ? targetResult.required_donation
                : result?.donation_amount || 0
            }
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Marginal savings rate
          </h3>
          <MarginalChart
            curve={data.curve}
            currentDonation={
              isTarget && targetResult
                ? targetResult.required_donation
                : result?.donation_amount || 0
            }
          />
        </div>
      </div>

      {/* Tax Breakdown Table */}
      {result && !isTarget && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tax breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700"></th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Without donation
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    With {formatCurrency(result.donation_amount)}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-primary-700">
                    Savings
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    Federal income tax
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {formatCurrency(result.baseline_tax_breakdown.federal)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {formatCurrency(result.donation_tax_breakdown.federal)}
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-primary-600">
                    {formatCurrency(
                      result.baseline_tax_breakdown.federal -
                        result.donation_tax_breakdown.federal,
                    )}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    State income tax
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {formatCurrency(result.baseline_tax_breakdown.state)}
                  </td>
                  <td className="text-right py-3 px-4 text-gray-600">
                    {formatCurrency(result.donation_tax_breakdown.state)}
                  </td>
                  <td className="text-right py-3 px-4 font-medium text-primary-600">
                    {formatCurrency(
                      result.baseline_tax_breakdown.state -
                        result.donation_tax_breakdown.state,
                    )}
                  </td>
                </tr>
                <tr className="bg-primary-50">
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-gray-900">
                    {formatCurrency(result.baseline_tax_breakdown.total)}
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-gray-900">
                    {formatCurrency(result.donation_tax_breakdown.total)}
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-primary-600">
                    {formatCurrency(
                      result.baseline_tax_breakdown.total -
                        result.donation_tax_breakdown.total,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Methodology Explanation */}
      <MethodologyExplainer />
    </div>
  );
}

function MethodologyExplainer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Why GiveCalc is more accurate
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
              's microsimulation model, which implements the full U.S. tax and
              benefit system—the same model used by congressional offices and
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
      className={`rounded-lg p-4 ${highlight ? "bg-primary-50 border border-primary-200" : "bg-gray-50"}`}
    >
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${highlight ? "text-primary-600" : "text-gray-900"}`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
