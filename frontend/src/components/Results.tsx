/**
 * Results display component
 */

import type { CalculateResponse, TargetDonationResponse } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/format';
import TaxChart from './TaxChart';
import MarginalChart from './MarginalChart';

interface Props {
  result: CalculateResponse | null;
  targetResult: TargetDonationResponse | null;
  mode: 'amount' | 'target';
  isCalculating?: boolean;
}

export default function Results({ result, targetResult, mode, isCalculating }: Props) {
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

  const data = mode === 'target' && targetResult ? targetResult : result;
  if (!data) return null;

  const isTarget = mode === 'target' && targetResult;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isTarget ? 'Required donation' : 'Tax impact summary'}
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
                value={formatCurrency(result.donation_amount - result.tax_savings)}
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
            currentDonation={isTarget && targetResult
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
            currentDonation={isTarget && targetResult
              ? targetResult.required_donation
              : result?.donation_amount || 0
            }
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
              <span className="text-gray-600">Baseline net tax (no donation)</span>
              <span className="font-medium">{formatCurrency(result.baseline_net_tax)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Net tax at {formatCurrency(result.donation_amount)}</span>
              <span className="font-medium">{formatCurrency(result.net_tax_at_donation)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Baseline net income</span>
              <span className="font-medium">{formatCurrency(result.baseline_net_income)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Net income after donation</span>
              <span className="font-medium">{formatCurrency(result.net_income_after_donation)}</span>
            </div>
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
    <div className={`rounded-lg p-4 ${highlight ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'}`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary-600' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
