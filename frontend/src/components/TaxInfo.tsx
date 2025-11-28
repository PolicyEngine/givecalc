/**
 * Tax program information component
 */

import { useTaxPrograms } from '../hooks/useCalculation';

interface Props {
  stateCode: string;
}

export default function TaxInfo({ stateCode }: Props) {
  const { data: programs, isLoading, isError } = useTaxPrograms(stateCode);

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />;
  }

  if (isError || !programs || !programs.federal) {
    return null;
  }

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
