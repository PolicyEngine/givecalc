'use client';

/**
 * GiveCalc - Charitable Donation Tax Calculator
 * Powered by PolicyEngine
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Header from "./components/Header";
import InputForm from "./components/InputForm";
import UKInputForm from "./components/UKInputForm";
import Results from "./components/Results";
import TaxInfo from "./components/TaxInfo";
import {
  useStates,
  useCalculateDonation,
  useCalculateUKDonation,
  useBunching,
} from "./hooks/useCalculation";
import type {
  CalculateRequest,
  Country,
  FormState,
  UKFormState,
  CalculateResponse,
  UKCalculateResponse,
} from "./lib/types";
import { DEFAULT_FORM_STATE, DEFAULT_UK_FORM_STATE } from "./lib/types";
import { pledgeAmount, pledgeBaseIncome } from "./lib/pledge";
import {
  applySearchParams,
  isReadyToCalculate,
  toSearchParams,
} from "./lib/urlState";

// Cache for calculation results
type CacheEntry = {
  result?: CalculateResponse;
  ukResult?: UKCalculateResponse;
};
type ResultCache = Map<string, CacheEntry>;

/** The gift the form describes, in dollars. */
function giftAmount(formState: FormState): number {
  return formState.mode === "pledge"
    ? pledgeAmount(formState.pledge_percent, formState.income)
    : formState.donation_amount;
}

function toRequest(formState: FormState): CalculateRequest {
  return {
    income: formState.income,
    state_code: formState.state_code,
    is_married: formState.is_married,
    num_children: formState.num_children,
    in_nyc: formState.in_nyc,
    donation_amount: giftAmount(formState),
    deductions: formState.deductions,
    year: formState.year,
  };
}

// Generate cache key from request parameters
function getCacheKey(formState: FormState): string {
  return JSON.stringify({ country: "us", ...toRequest(formState) });
}

function getUKCacheKey(formState: UKFormState): string {
  return JSON.stringify({ country: "uk", ...formState });
}

/** A shared link reproduces the result only when wages are the only income. */
function shareable(formState: FormState): boolean {
  return (
    pledgeBaseIncome(formState.income) ===
      formState.income.wages_and_salaries &&
    formState.income.qualified_dividends === 0
  );
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
  const [resultRequest, setResultRequest] = useState<CalculateRequest | null>(
    null,
  );
  const [ukResult, setUKResult] = useState<UKCalculateResponse | null>(null);
  // Bumped when a shared link fills the form, so InputForm opens confirmed.
  const [prefillKey, setPrefillKey] = useState(0);
  const [pendingPrefillCalc, setPendingPrefillCalc] = useState(false);
  const cacheRef = useRef<ResultCache>(new Map());

  const {
    data: statesData,
    isLoading: statesLoading,
    isError: statesError,
    error: statesErrorData,
  } = useStates();

  const calculateMutation = useCalculateDonation();
  const ukCalculateMutation = useCalculateUKDonation();
  const bunching = useBunching(
    country === "us" ? resultRequest : null,
    result ? result.tax_savings : null,
  );

  // Check cache and update results when form state changes
  const setFormState = useCallback((newState: FormState) => {
    setFormStateInternal(newState);
    const cached = cacheRef.current.get(getCacheKey(newState));
    setResult(cached?.result || null);
    setResultRequest(cached?.result ? toRequest(newState) : null);
  }, []);

  const setUKFormState = useCallback((newState: UKFormState) => {
    setUKFormStateInternal(newState);
    const cached = cacheRef.current.get(getUKCacheKey(newState));
    setUKResult(cached?.ukResult || null);
  }, []);

  const handleCalculate = useCallback(
    async (stateOverride?: FormState) => {
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

      const state = stateOverride ?? formState;
      const request = toRequest(state);
      const cacheKey = getCacheKey(state);
      const cached = cacheRef.current.get(cacheKey);
      if (cached?.result) {
        setResult(cached.result);
        setResultRequest(request);
        return;
      }

      setResult(null);
      setResultRequest(null);
      const response = await calculateMutation.mutateAsync(request);
      setResult(response);
      setResultRequest(request);
      cacheRef.current.set(cacheKey, { result: response });

      if (shareable(state)) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?${toSearchParams(state)}`,
        );
      }
    },
    [country, formState, ukFormState, calculateMutation, ukCalculateMutation],
  );

  // Fill the form from a shared link once, then calculate.
  useEffect(() => {
    const prefilled = applySearchParams(
      DEFAULT_FORM_STATE,
      window.location.search,
    );
    if (isReadyToCalculate(prefilled)) {
      setFormStateInternal(prefilled);
      setPrefillKey((k) => k + 1);
      setPendingPrefillCalc(true);
    }
  }, []);

  useEffect(() => {
    if (pendingPrefillCalc) {
      setPendingPrefillCalc(false);
      handleCalculate(formState).catch(() => undefined);
    }
  }, [pendingPrefillCalc, formState, handleCalculate]);

  const isCalculating =
    calculateMutation.isPending || ukCalculateMutation.isPending;
  const hasError = calculateMutation.isError || ukCalculateMutation.isError;

  // Only show loading for US states - UK doesn't need to load regions
  if (country === "us" && statesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (country === "us" && statesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Failed to load states
          </h2>
          <p className="text-red-600 text-sm">
            {statesErrorData instanceof Error
              ? statesErrorData.message
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

  const taxInfo =
    country === "us" && formState.state_code ? (
      <TaxInfo stateCode={formState.state_code} />
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Country Selector - full width of input column */}
            <div
              className="flex rounded-lg border border-gray-300 overflow-hidden"
              role="group"
              aria-label="Country"
            >
              <button
                type="button"
                onClick={() => setCountry("us")}
                aria-pressed={country === "us"}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  country === "us"
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                United States
              </button>
              <button
                type="button"
                onClick={() => setCountry("uk")}
                aria-pressed={country === "uk"}
                className={`flex-1 py-2 px-4 text-sm font-medium border-l border-gray-300 transition-colors ${
                  country === "uk"
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                United Kingdom
              </button>
            </div>
            {country === "us" ? (
              <>
                <InputForm
                  key={prefillKey}
                  formState={formState}
                  setFormState={setFormState}
                  states={states}
                  onCalculate={() => {
                    handleCalculate().catch(() => undefined);
                  }}
                  isCalculating={isCalculating}
                  prefilled={prefillKey > 0}
                />
                {/* On small screens the programs follow the results. */}
                <div className="hidden lg:block">{taxInfo}</div>
              </>
            ) : (
              <UKInputForm
                formState={ukFormState}
                setFormState={setUKFormState}
                onCalculate={() => {
                  handleCalculate().catch(() => undefined);
                }}
                isCalculating={isCalculating}
              />
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {hasError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">
                  The calculation didn&apos;t finish. The server may be busy;
                  please try again in a moment.
                </p>
              </div>
            )}
            <Results
              result={country === "uk" ? ukResultAsUS : result}
              isCalculating={isCalculating}
              currency={country === "uk" ? "GBP" : "USD"}
              year={country === "uk" ? ukFormState.year : formState.year}
              pledgePercent={
                country === "us" && formState.mode === "pledge"
                  ? formState.pledge_percent
                  : null
              }
              bunching={
                country === "us"
                  ? {
                      data: bunching.data ?? null,
                      isLoading: bunching.isLoading && bunching.fetchStatus !== "idle",
                      isError: bunching.isError,
                    }
                  : null
              }
            />
            <div className="lg:hidden">{taxInfo}</div>
          </div>
        </div>
      </main>

      <p className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full text-xs text-gray-500">
        Estimates from PolicyEngine&apos;s open-source tax models. Consult a tax
        professional for your situation.{" "}
        <a
          href="https://github.com/PolicyEngine/givecalc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700"
        >
          View source
        </a>
      </p>
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
