/**
 * GiveCalc - Charitable Donation Tax Calculator
 * Powered by PolicyEngine
 */

import { useState, useRef, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Header from "./components/Header";
import InputForm from "./components/InputForm";
import UKInputForm from "./components/UKInputForm";
import Results from "./components/Results";
import TaxInfo from "./components/TaxInfo";
import {
  useStates,
  useUKRegions,
  useCalculateDonation,
  useCalculateTargetDonation,
  useCalculateUKDonation,
} from "./hooks/useCalculation";
import type {
  Country,
  FormState,
  UKFormState,
  CalculateResponse,
  TargetDonationResponse,
  UKCalculateResponse,
} from "./lib/types";
import { DEFAULT_FORM_STATE, DEFAULT_UK_FORM_STATE } from "./lib/types";

// Cache for calculation results
type CacheEntry = {
  result?: CalculateResponse;
  targetResult?: TargetDonationResponse;
  ukResult?: UKCalculateResponse;
};
type ResultCache = Map<string, CacheEntry>;

// Generate cache key from request parameters
function getCacheKey(formState: FormState, country: Country): string {
  const key = {
    country,
    income: formState.income,
    state_code: formState.state_code,
    is_married: formState.is_married,
    num_children: formState.num_children,
    in_nyc: formState.in_nyc,
    deductions: formState.deductions,
    year: formState.year,
    mode: formState.mode,
    // Mode-specific fields
    ...(formState.mode === "amount"
      ? { donation_amount: formState.donation_amount }
      : {
          target_reduction: formState.target_reduction,
          is_percentage: formState.is_percentage,
        }),
  };
  return JSON.stringify(key);
}

function getUKCacheKey(formState: UKFormState): string {
  return JSON.stringify({ country: "uk", ...formState });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function Calculator() {
  const [country, setCountry] = useState<Country>("us");
  const [formState, setFormStateInternal] =
    useState<FormState>(DEFAULT_FORM_STATE);
  const [ukFormState, setUKFormStateInternal] =
    useState<UKFormState>(DEFAULT_UK_FORM_STATE);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [targetResult, setTargetResult] =
    useState<TargetDonationResponse | null>(null);
  const [ukResult, setUKResult] = useState<UKCalculateResponse | null>(null);
  const cacheRef = useRef<ResultCache>(new Map());

  const {
    data: statesData,
    isLoading: statesLoading,
    isError: statesError,
    error: statesErrorData,
  } = useStates();

  const {
    data: ukRegionsData,
    isLoading: ukRegionsLoading,
    isError: ukRegionsError,
    error: ukRegionsErrorData,
  } = useUKRegions();

  const calculateMutation = useCalculateDonation();
  const targetMutation = useCalculateTargetDonation();
  const ukCalculateMutation = useCalculateUKDonation();

  // Check cache and update results when form state changes
  const setFormState = useCallback((newState: FormState) => {
    setFormStateInternal(newState);

    // Check if we have cached results for this state
    const cacheKey = getCacheKey(newState, "us");
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      // Restore cached results
      setResult(cached.result || null);
      setTargetResult(cached.targetResult || null);
    } else {
      // Clear results - need to recalculate
      setResult(null);
      setTargetResult(null);
    }
  }, []);

  const setUKFormState = useCallback((newState: UKFormState) => {
    setUKFormStateInternal(newState);

    // Check if we have cached results for this state
    const cacheKey = getUKCacheKey(newState);
    const cached = cacheRef.current.get(cacheKey);

    if (cached) {
      setUKResult(cached.ukResult || null);
    } else {
      setUKResult(null);
    }
  }, []);

  const handleCalculate = async () => {
    if (country === "uk") {
      const cacheKey = getUKCacheKey(ukFormState);
      const cached = cacheRef.current.get(cacheKey);
      if (cached?.ukResult) {
        setUKResult(cached.ukResult);
        return;
      }

      setUKResult(null);
      const response = await ukCalculateMutation.mutateAsync({
        income: ukFormState.income,
        region: ukFormState.region,
        gift_aid: ukFormState.gift_aid,
        is_married: ukFormState.is_married,
        num_children: ukFormState.num_children,
        year: ukFormState.year,
      });
      setUKResult(response);
      cacheRef.current.set(cacheKey, { ukResult: response });
      return;
    }

    const cacheKey = getCacheKey(formState, "us");

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResult(cached.result || null);
      setTargetResult(cached.targetResult || null);
      return;
    }

    setResult(null);
    setTargetResult(null);

    if (formState.mode === "amount") {
      const response = await calculateMutation.mutateAsync({
        income: formState.income,
        state_code: formState.state_code,
        is_married: formState.is_married,
        num_children: formState.num_children,
        in_nyc: formState.in_nyc,
        donation_amount: formState.donation_amount,
        deductions: formState.deductions,
        year: formState.year,
      });
      setResult(response);
      // Cache the result
      cacheRef.current.set(cacheKey, { result: response });
    } else {
      const response = await targetMutation.mutateAsync({
        income: formState.income,
        state_code: formState.state_code,
        is_married: formState.is_married,
        num_children: formState.num_children,
        in_nyc: formState.in_nyc,
        deductions: formState.deductions,
        target_reduction: formState.target_reduction,
        is_percentage: formState.is_percentage,
        year: formState.year,
      });
      setTargetResult(response);
      // Cache the result
      cacheRef.current.set(cacheKey, { targetResult: response });
    }
  };

  const isCalculating =
    calculateMutation.isPending ||
    targetMutation.isPending ||
    ukCalculateMutation.isPending;
  const hasError =
    calculateMutation.isError ||
    targetMutation.isError ||
    ukCalculateMutation.isError;
  const error =
    calculateMutation.error || targetMutation.error || ukCalculateMutation.error;

  const isLoading = country === "us" ? statesLoading : ukRegionsLoading;
  const hasLoadError = country === "us" ? statesError : ukRegionsError;
  const loadErrorData = country === "us" ? statesErrorData : ukRegionsErrorData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Failed to load {country === "us" ? "states" : "regions"}
          </h2>
          <p className="text-red-600 text-sm">
            {loadErrorData instanceof Error
              ? loadErrorData.message
              : "Could not connect to API"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const states = statesData?.states || [];
  const ukRegions = ukRegionsData?.regions || [];

  // Convert UK result to US-compatible format for Results component
  const ukResultAsUS: CalculateResponse | null = ukResult
    ? {
        donation_amount: ukResult.gift_aid,
        baseline_net_tax: ukResult.baseline_net_tax,
        net_tax_at_donation: ukResult.net_tax_at_donation,
        tax_savings: ukResult.tax_savings,
        marginal_savings_rate: ukResult.marginal_savings_rate,
        baseline_net_income: ukResult.baseline_net_income,
        net_income_after_donation: ukResult.net_income_after_donation,
        curve: ukResult.curve,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Country Selector */}
        <div className="mb-6">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setCountry("us")}
              className={`py-2 px-6 text-sm font-medium transition-colors flex items-center gap-2 ${
                country === "us"
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>🇺🇸</span> United States
            </button>
            <button
              type="button"
              onClick={() => setCountry("uk")}
              className={`py-2 px-6 text-sm font-medium border-l border-gray-300 transition-colors flex items-center gap-2 ${
                country === "uk"
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>🇬🇧</span> United Kingdom
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-1 space-y-6">
            {country === "us" ? (
              <>
                <InputForm
                  formState={formState}
                  setFormState={setFormState}
                  states={states}
                />
                <TaxInfo stateCode={formState.state_code} />
              </>
            ) : (
              <UKInputForm
                formState={ukFormState}
                setFormState={setUKFormState}
                regions={ukRegions}
              />
            )}
            {/* Sticky Calculate Button - attached to left panel */}
            <div className="sticky bottom-4">
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors shadow-lg ${
                  isCalculating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-primary-500 hover:bg-primary-600"
                }`}
              >
                {isCalculating ? "Calculating..." : "Calculate tax impact"}
              </button>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">
                  {error instanceof Error
                    ? error.message
                    : "An error occurred. Please try again."}
                </p>
              </div>
            )}
            <Results
              result={country === "uk" ? ukResultAsUS : result}
              targetResult={country === "us" ? targetResult : null}
              mode={country === "uk" ? "amount" : formState.mode}
              isCalculating={isCalculating}
              currency={country === "uk" ? "GBP" : "USD"}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-sm text-gray-500">
                Tax calculations powered by{" "}
                <a
                  href="https://policyengine.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600"
                >
                  PolicyEngine
                </a>
              </p>
              <span className="hidden sm:inline text-gray-300">|</span>
              <a
                href="https://www.policyengine.org/us/donate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Support PolicyEngine (tax-deductible)
              </a>
              <span className="hidden sm:inline text-gray-300">|</span>
              <a
                href="https://github.com/PolicyEngine/givecalc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="View source on GitHub"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
            <p className="text-xs text-gray-400 text-center sm:text-right">
              This calculator provides estimates and should not be considered
              tax advice. Please consult a tax professional for your specific
              situation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Calculator />
    </QueryClientProvider>
  );
}
