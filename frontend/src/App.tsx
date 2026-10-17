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

/** A result together with the inputs that produced it. */
interface USPublished {
  result: CalculateResponse;
  request: CalculateRequest;
  form: FormState;
}
interface UKPublished {
  result: UKCalculateResponse;
  form: UKFormState;
}

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

/** Point the address bar at the inputs behind the result on screen. */
function syncUrl(formState: FormState) {
  if (shareable(formState)) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${toSearchParams(formState)}`,
    );
  }
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
  const [published, setPublished] = useState<USPublished | null>(null);
  const [ukPublished, setUKPublished] = useState<UKPublished | null>(null);
  // The latest inputs, read after an await so that a slow response never
  // lands on inputs the user has since changed.
  const formRef = useRef<FormState>(formState);
  const ukFormRef = useRef<UKFormState>(ukFormState);
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
    country === "us" && published ? published.request : null,
    published ? published.result.tax_savings : null,
  );

  const publishUS = useCallback(
    (state: FormState, result: CalculateResponse) => {
      setPublished({ result, request: toRequest(state), form: state });
      syncUrl(state);
    },
    [],
  );

  // Check cache and update results when form state changes
  const setFormState = useCallback(
    (newState: FormState) => {
      formRef.current = newState;
      setFormStateInternal(newState);
      const cached = cacheRef.current.get(getCacheKey(newState));
      if (cached?.result) {
        publishUS(newState, cached.result);
      } else {
        setPublished(null);
      }
    },
    [publishUS],
  );

  const setUKFormState = useCallback((newState: UKFormState) => {
    ukFormRef.current = newState;
    setUKFormStateInternal(newState);
    const cached = cacheRef.current.get(getUKCacheKey(newState));
    setUKPublished(
      cached?.ukResult ? { result: cached.ukResult, form: newState } : null,
    );
  }, []);

  const handleCalculate = useCallback(
    async (stateOverride?: FormState) => {
      if (country === "uk") {
        const ukState = ukFormState;
        const cacheKey = getUKCacheKey(ukState);
        const cached = cacheRef.current.get(cacheKey);
        if (cached?.ukResult) {
          setUKPublished({ result: cached.ukResult, form: ukState });
          return;
        }

        setUKPublished(null);
        const response = await ukCalculateMutation.mutateAsync({
          income: ukState.income,
          region: ukState.region,
          gift_aid: ukState.gift_aid,
          is_married: ukState.is_married,
          num_children: ukState.num_children,
          year: ukState.year,
        });
        cacheRef.current.set(cacheKey, { ukResult: response });
        // Publish only if the inputs still match what was calculated.
        if (getUKCacheKey(ukFormRef.current) === cacheKey) {
          setUKPublished({ result: response, form: ukState });
        }
        return;
      }

      const state = stateOverride ?? formState;
      const request = toRequest(state);
      const cacheKey = getCacheKey(state);
      const cached = cacheRef.current.get(cacheKey);
      if (cached?.result) {
        publishUS(state, cached.result);
        return;
      }

      setPublished(null);
      const response = await calculateMutation.mutateAsync(request);
      cacheRef.current.set(cacheKey, { result: response });
      // Publish only if the inputs still match what was calculated.
      if (getCacheKey(formRef.current) === cacheKey) {
        publishUS(state, response);
      }
    },
    [
      country,
      formState,
      ukFormState,
      calculateMutation,
      ukCalculateMutation,
      publishUS,
    ],
  );

  // Fill the form from a shared link once, then calculate.
  useEffect(() => {
    const prefilled = applySearchParams(
      DEFAULT_FORM_STATE,
      window.location.search,
    );
    if (isReadyToCalculate(prefilled)) {
      formRef.current = prefilled;
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
  const ukResult = ukPublished?.result ?? null;
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
              result={
                country === "uk" ? ukResultAsUS : (published?.result ?? null)
              }
              isCalculating={isCalculating}
              currency={country === "uk" ? "GBP" : "USD"}
              year={
                country === "uk"
                  ? (ukPublished?.form.year ?? ukFormState.year)
                  : (published?.form.year ?? formState.year)
              }
              pledgePercent={
                country === "us" && published?.form.mode === "pledge"
                  ? published.form.pledge_percent
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
