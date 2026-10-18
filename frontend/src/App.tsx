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
  useCalculateSavings,
  useCalculateUKDonation,
  useCalculateUKSavings,
  useBunching,
} from "./hooks/useCalculation";
import type {
  CalculateRequest,
  Country,
  FormState,
  Headline,
  UKFormState,
  CalculateResponse,
  UKCalculateResponse,
  UKSavingsResponse,
} from "./lib/types";
import { DEFAULT_FORM_STATE, DEFAULT_UK_FORM_STATE } from "./lib/types";
import { isReadyToCalculate, toCalculateRequest } from "./lib/household";
import {
  applySearchParams,
  isShareable,
  toSearchParams,
} from "./lib/urlState";
import { fetchHeadlineFirst, type FullStatus } from "./lib/headlineFirst";

/**
 * A result together with the inputs that produced it. The headline
 * (/api/savings) arrives first; the curve and marginal rate
 * (/api/calculate) follow, so `result` is null until then.
 */
interface USPublished {
  headline: Headline;
  result: CalculateResponse | null;
  request: CalculateRequest;
  form: FormState;
}
interface UKPublished {
  headline: Headline;
  result: UKCalculateResponse | null;
  form: UKFormState;
}

// Cache for calculation results, with where each form's curve stands.
type CacheEntry = {
  headline?: Headline;
  result?: CalculateResponse;
  curveStatus?: FullStatus;
  ukHeadline?: Headline;
  ukResult?: UKCalculateResponse;
  ukCurveStatus?: FullStatus;
};
type ResultCache = Map<string, CacheEntry>;

function ukHeadlineFrom(savings: UKSavingsResponse): Headline {
  return {
    donation_amount: savings.gift_aid,
    baseline_net_tax: savings.baseline_net_tax,
    net_tax_at_donation: savings.net_tax_at_donation,
    tax_savings: savings.tax_savings,
    baseline_net_income: savings.baseline_net_income,
    net_income_after_donation: savings.net_income_after_donation,
  };
}

// Generate cache key from request parameters
function getCacheKey(formState: FormState): string {
  return JSON.stringify({ country: "us", ...toCalculateRequest(formState) });
}

function getUKCacheKey(formState: UKFormState): string {
  return JSON.stringify({ country: "uk", ...formState });
}

/**
 * Point the address bar at the inputs behind the result on screen, or at no
 * link when a link cannot reproduce them: an older link would reload a
 * different household.
 */
function syncUrl(formState: FormState) {
  window.history.replaceState(
    null,
    "",
    isShareable(formState)
      ? `${window.location.pathname}?${toSearchParams(formState)}`
      : window.location.pathname,
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
  const [published, setPublished] = useState<USPublished | null>(null);
  const [ukPublished, setUKPublished] = useState<UKPublished | null>(null);
  // Where the curve of the form on screen stands.
  const [curveStatus, setCurveStatus] = useState<FullStatus>(null);
  const [ukCurveStatus, setUKCurveStatus] = useState<FullStatus>(null);
  // The latest inputs, read after an await so that a slow response never
  // lands on inputs the user has since changed.
  const formRef = useRef<FormState>(formState);
  const ukFormRef = useRef<UKFormState>(ukFormState);
  // Bumped when a shared link fills the form, so InputForm opens confirmed.
  const [prefillKey, setPrefillKey] = useState(0);
  const [pendingPrefillCalc, setPendingPrefillCalc] = useState(false);
  const cacheRef = useRef<ResultCache>(new Map());
  // The latest request per cache key, so an earlier request for the same
  // inputs (Calculate clicked twice) cannot overwrite the curve's status.
  const latestRequestRef = useRef(new Map<string, number>());
  const startRequest = (key: string) => {
    const id = (latestRequestRef.current.get(key) ?? 0) + 1;
    latestRequestRef.current.set(key, id);
    return () => latestRequestRef.current.get(key) === id;
  };
  const cacheUpdate = (key: string, entry: CacheEntry) => {
    cacheRef.current.set(key, { ...cacheRef.current.get(key), ...entry });
  };

  const {
    data: statesData,
    isLoading: statesLoading,
    isError: statesError,
    error: statesErrorData,
  } = useStates();

  const savingsMutation = useCalculateSavings();
  const calculateMutation = useCalculateDonation();
  const ukSavingsMutation = useCalculateUKSavings();
  const ukCalculateMutation = useCalculateUKDonation();
  // Bunching needs only the headline, so it runs alongside the curve.
  const bunching = useBunching(
    country === "us" && published ? published.request : null,
    published ? published.headline.tax_savings : null,
  );

  const publishUS = useCallback(
    (
      state: FormState,
      headline: Headline,
      result: CalculateResponse | null,
    ) => {
      setPublished({
        headline,
        result,
        request: toCalculateRequest(state),
        form: state,
      });
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
      if (cached?.headline) {
        publishUS(newState, cached.headline, cached.result ?? null);
      } else {
        setPublished(null);
      }
      setCurveStatus(cached?.curveStatus ?? null);
    },
    [publishUS],
  );

  const setUKFormState = useCallback((newState: UKFormState) => {
    ukFormRef.current = newState;
    setUKFormStateInternal(newState);
    const cached = cacheRef.current.get(getUKCacheKey(newState));
    setUKPublished(
      cached?.ukHeadline
        ? {
            headline: cached.ukHeadline,
            result: cached.ukResult ?? null,
            form: newState,
          }
        : null,
    );
    setUKCurveStatus(cached?.ukCurveStatus ?? null);
  }, []);

  const handleCalculate = useCallback(
    async (stateOverride?: FormState) => {
      if (country === "uk") {
        const ukState = ukFormState;
        const cacheKey = getUKCacheKey(ukState);
        const cached = cacheRef.current.get(cacheKey);
        if (cached?.ukHeadline && cached.ukResult) {
          setUKPublished({
            headline: cached.ukHeadline,
            result: cached.ukResult,
            form: ukState,
          });
          setUKCurveStatus(null);
          return;
        }
        const request = {
          income: ukState.income,
          region: ukState.region,
          gift_aid: ukState.gift_aid,
          is_married: ukState.is_married,
          num_children: ukState.num_children,
          year: ukState.year,
        };
        // Publish only while the inputs still match what was calculated,
        // labelled with the current inputs.
        const isShown = () => getUKCacheKey(ukFormRef.current) === cacheKey;
        const isLatest = startRequest(cacheKey);
        const kept = () => cacheRef.current.get(cacheKey)?.ukResult;
        const show = (
          headline: Headline,
          result: UKCalculateResponse | null,
        ) => setUKPublished({ headline, result, form: ukFormRef.current });

        if (!cached?.ukHeadline) setUKPublished(null);
        setUKCurveStatus(null);
        await fetchHeadlineFirst({
          cachedHeadline: cached?.ukHeadline,
          fetchHeadline: async () =>
            ukHeadlineFrom(await ukSavingsMutation.mutateAsync(request)),
          fetchFull: () => ukCalculateMutation.mutateAsync(request),
          storeHeadline: (ukHeadline) => cacheUpdate(cacheKey, { ukHeadline }),
          storeFull: (ukResult) =>
            cacheUpdate(cacheKey, { ukResult, ukCurveStatus: null }),
          storeFullStatus: (status) => {
            if (!isLatest()) return;
            cacheUpdate(cacheKey, {
              ukCurveStatus: status === "failed" && kept() ? null : status,
            });
          },
          showHeadline: (headline) => show(headline, kept() ?? null),
          // Any curve for these inputs shows, even one from an earlier
          // request that finished after a later one failed.
          showFull: (result) => {
            const headline = cacheRef.current.get(cacheKey)?.ukHeadline;
            if (headline) show(headline, result);
            setUKCurveStatus(null);
          },
          showFullStatus: (status) => {
            if (!isLatest()) return;
            setUKCurveStatus(status === "failed" && kept() ? null : status);
          },
          isCurrent: isShown,
        });
        return;
      }

      const state = stateOverride ?? formState;
      const request = toCalculateRequest(state);
      const cacheKey = getCacheKey(state);
      const cached = cacheRef.current.get(cacheKey);
      if (cached?.headline && cached.result) {
        publishUS(state, cached.headline, cached.result);
        setCurveStatus(null);
        return;
      }
      // Publish only while the inputs still match what was calculated. An
      // equivalent edit (10% of $160,000 rewritten as $16,000) keeps the
      // same request, so label the result with the current inputs.
      const isShown = () => getCacheKey(formRef.current) === cacheKey;
      const isLatest = startRequest(cacheKey);
      const kept = () => cacheRef.current.get(cacheKey)?.result;

      if (!cached?.headline) setPublished(null);
      setCurveStatus(null);
      // The headline first, from two simulations; then the curve and the
      // marginal rate, from the donation sweep.
      await fetchHeadlineFirst({
        cachedHeadline: cached?.headline,
        fetchHeadline: () => savingsMutation.mutateAsync(request),
        fetchFull: () => calculateMutation.mutateAsync(request),
        storeHeadline: (headline) => cacheUpdate(cacheKey, { headline }),
        storeFull: (result) =>
          cacheUpdate(cacheKey, { result, curveStatus: null }),
        storeFullStatus: (status) => {
          if (!isLatest()) return;
          cacheUpdate(cacheKey, {
            curveStatus: status === "failed" && kept() ? null : status,
          });
        },
        showHeadline: (headline) =>
          publishUS(formRef.current, headline, kept() ?? null),
        // Any curve for these inputs shows, even one from an earlier
        // request that finished after a later one failed.
        showFull: (result) => {
          const headline = cacheRef.current.get(cacheKey)?.headline;
          if (headline) publishUS(formRef.current, headline, result);
          setCurveStatus(null);
        },
        showFullStatus: (status) => {
          if (!isLatest()) return;
          setCurveStatus(status === "failed" && kept() ? null : status);
        },
        isCurrent: isShown,
      });
    },
    [
      country,
      formState,
      ukFormState,
      savingsMutation,
      calculateMutation,
      ukSavingsMutation,
      ukCalculateMutation,
      publishUS,
    ],
  );

  // Fill the form from a shared link once. A complete link calculates; an
  // incomplete one opens on the first question it leaves unanswered.
  useEffect(() => {
    const prefilled = applySearchParams(
      DEFAULT_FORM_STATE,
      window.location.search,
    );
    if (JSON.stringify(prefilled) === JSON.stringify(DEFAULT_FORM_STATE)) {
      return;
    }
    formRef.current = prefilled;
    setFormStateInternal(prefilled);
    setPrefillKey((k) => k + 1);
    if (isReadyToCalculate(prefilled)) setPendingPrefillCalc(true);
  }, []);

  useEffect(() => {
    if (pendingPrefillCalc) {
      setPendingPrefillCalc(false);
      handleCalculate(formState).catch(() => undefined);
    }
  }, [pendingPrefillCalc, formState, handleCalculate]);

  // Only the headline holds the page; the charts load after it.
  const isCalculating =
    country === "uk" ? ukSavingsMutation.isPending : savingsMutation.isPending;
  const hasError =
    country === "uk" ? ukSavingsMutation.isError : savingsMutation.isError;
  const shownCurveStatus = country === "uk" ? ukCurveStatus : curveStatus;

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
    country === "us" && formState.household.state ? (
      <TaxInfo stateCode={formState.household.state} />
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
            {/* Both forms stay mounted, so switching country and back keeps
                the user's place in each. */}
            <div hidden={country !== "us"}>
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
            </div>
            <div hidden={country !== "uk"}>
              <UKInputForm
                formState={ukFormState}
                setFormState={setUKFormState}
                onCalculate={() => {
                  handleCalculate().catch(() => undefined);
                }}
                isCalculating={isCalculating}
              />
            </div>
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
              headline={
                country === "uk"
                  ? (ukPublished?.headline ?? null)
                  : (published?.headline ?? null)
              }
              result={
                country === "uk" ? ukResultAsUS : (published?.result ?? null)
              }
              isCalculating={isCalculating}
              isLoadingCurve={shownCurveStatus === "loading"}
              curveFailed={shownCurveStatus === "failed"}
              currency={country === "uk" ? "GBP" : "USD"}
              year={
                country === "uk"
                  ? (ukPublished?.form.year ?? ukFormState.year)
                  : (published?.form.household.year ?? formState.household.year)
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
