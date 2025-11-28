/**
 * Tax program information component
 */

import { useState } from "react";
import { useTaxPrograms } from "../hooks/useCalculation";

interface Props {
  stateCode: string;
}

// All charitable tax policies modeled by PolicyEngine-US
const FEDERAL_POLICIES = [
  {
    name: "Charitable Deduction",
    type: "Itemized deduction",
    details: "60% of AGI cap; non-cash limited to 50% of AGI",
    citation: "26 U.S.C. § 170",
  },
  {
    name: "Non-Itemizer Deduction",
    type: "Above-the-line",
    details: "Cash only; $0 in 2024-25, expanding in 2026+",
    citation: "Tax Relief for American Families Act",
  },
];

const STATE_POLICIES = [
  {
    state: "AZ",
    name: "Charitable Contributions Credit",
    type: "Tax credit",
    details:
      "Up to $938 (single) / $1,173 (joint) for qualifying AZ organizations",
  },
  {
    state: "AZ",
    name: "Foster Care Contributions Credit",
    type: "Tax credit",
    details: "Separate credit for foster care organization donations",
  },
  {
    state: "AZ",
    name: "Increased Standard Deduction",
    type: "Deduction boost",
    details: "33% of federal charitable deduction added to standard deduction",
  },
  {
    state: "CO",
    name: "Charitable Contribution Subtraction",
    type: "Subtraction",
    details: "For non-itemizers; donations over $500 threshold",
  },
  {
    state: "MN",
    name: "Charity Subtraction",
    type: "Subtraction",
    details: "For non-itemizers; 50% of donations over $500 threshold",
  },
  {
    state: "MS",
    name: "Foster Care Credit",
    type: "Tax credit",
    details: "$1,500 (single) / $3,000 (joint) for foster care organizations",
  },
  {
    state: "NH",
    name: "Education Tax Credit",
    type: "Tax credit",
    details: "85% of donations to educational organizations (up to $600k)",
  },
  {
    state: "NY",
    name: "High-Income Deduction Reduction",
    type: "Reduction",
    details: "Reduces itemized deductions for AGI >$1M",
  },
  {
    state: "VT",
    name: "Charitable Contribution Credit",
    type: "Tax credit",
    details: "5% of donations between $20k-$1M",
  },
  {
    state: "WA",
    name: "Capital Gains Charitable Deduction",
    type: "CG deduction",
    details: "$270k exemption + $108k cap (for capital gains tax only)",
  },
  {
    state: "PR",
    name: "Charitable Deduction",
    type: "Deduction",
    details: "Capped at 50% of AGI",
  },
];

export default function TaxInfo({ stateCode }: Props) {
  const { data: programs, isLoading, isError } = useTaxPrograms(stateCode);
  const [showAllPolicies, setShowAllPolicies] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  if (isError || !programs || !programs.federal) {
    return null;
  }

  // Get policies for the selected state
  const stateSpecificPolicies = STATE_POLICIES.filter(
    (p) => p.state === stateCode,
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Tax program information
      </h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-primary-600">
            {programs.federal.title}
          </h4>
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
            {programs.federal.description}
          </p>
        </div>

        {programs.state && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-primary-600">
              {programs.state.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
              {programs.state.description}
            </p>
          </div>
        )}
      </div>

      {/* Expandable All Policies Section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowAllPolicies(!showAllPolicies)}
          className="flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllPolicies ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          View all modeled charitable tax policies
        </button>

        {showAllPolicies && (
          <div className="mt-4 space-y-4">
            {/* Federal Policies */}
            <div>
              <h5 className="text-sm font-semibold text-gray-800 mb-2">
                Federal Provisions
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Policy
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Type
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FEDERAL_POLICIES.map((policy, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 font-medium text-gray-800">
                          {policy.name}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {policy.type}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {policy.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* State Policies */}
            <div>
              <h5 className="text-sm font-semibold text-gray-800 mb-2">
                State-Specific Provisions
              </h5>
              {stateSpecificPolicies.length > 0 && (
                <div className="mb-2 p-2 bg-primary-50 rounded text-xs text-primary-700">
                  Your state ({stateCode}) has {stateSpecificPolicies.length}{" "}
                  special charitable tax provision
                  {stateSpecificPolicies.length > 1 ? "s" : ""} modeled below.
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        State
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Policy
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Type
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {STATE_POLICIES.map((policy, i) => (
                      <tr
                        key={i}
                        className={
                          policy.state === stateCode ? "bg-primary-50" : ""
                        }
                      >
                        <td className="px-2 py-1.5 font-medium text-gray-800">
                          {policy.state}
                        </td>
                        <td className="px-2 py-1.5 font-medium text-gray-800">
                          {policy.name}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {policy.type}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">
                          {policy.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Calculations powered by{" "}
              <a
                href="https://github.com/PolicyEngine/policyengine-us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                PolicyEngine-US
              </a>
              , an open-source tax-benefit microsimulation model.
            </p>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        <a
          href="https://www.irs.gov/charities-non-profits/tax-exempt-organization-search"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-500 hover:text-primary-600"
        >
          Search for tax-exempt organizations (IRS)
        </a>
      </div>
    </div>
  );
}
