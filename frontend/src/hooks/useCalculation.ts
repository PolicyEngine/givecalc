/**
 * React Query hooks for GiveCalc calculations
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { compareBunching } from "../lib/pledge";
import { MAX_TAX_YEAR } from "../lib/types";
import {
  getStates,
  calculateDonation,
  getUKRegions,
  calculateUKDonation,
  STATES,
} from "../lib/api";
import { getTaxProgramsData } from "../lib/taxPrograms";
import type {
  CalculateRequest,
  UKCalculateRequest,
} from "../lib/types";

export function useStates() {
  return useQuery({
    queryKey: ["states"],
    queryFn: getStates,
    staleTime: Infinity, // States don't change
    initialData: STATES, // Prevents loading state - data available immediately
  });
}

export function useUKRegions() {
  return useQuery({
    queryKey: ["ukRegions"],
    queryFn: getUKRegions,
    staleTime: Infinity, // Regions don't change
  });
}

export function useTaxPrograms(stateCode: string) {
  return useQuery({
    queryKey: ["taxPrograms", stateCode],
    queryFn: () => getTaxProgramsData(stateCode),
    enabled: !!stateCode,
    staleTime: Infinity,
    initialData: stateCode ? getTaxProgramsData(stateCode) : undefined,
  });
}

export function useCalculateDonation() {
  return useMutation({
    mutationFn: (request: CalculateRequest) => calculateDonation(request),
  });
}

export function useCalculateUKDonation() {
  return useMutation({
    mutationFn: (request: UKCalculateRequest) => calculateUKDonation(request),
  });
}

/**
 * Compare giving `request.donation_amount` this year and next with giving
 * twice that this year and nothing next year. Runs two extra simulations,
 * so it starts only after the main result is in.
 */
export function useBunching(
  request: CalculateRequest | null,
  thisYearSavings: number | null,
) {
  const enabled =
    request !== null &&
    thisYearSavings !== null &&
    request.donation_amount > 0 &&
    request.year + 1 <= MAX_TAX_YEAR;
  return useQuery({
    queryKey: ["bunching", request, thisYearSavings],
    enabled,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const req = request as CalculateRequest;
      const [nextYear, bunched] = await Promise.all([
        calculateDonation({ ...req, year: req.year + 1 }),
        calculateDonation({ ...req, donation_amount: 2 * req.donation_amount }),
      ]);
      return compareBunching(
        thisYearSavings as number,
        nextYear.tax_savings,
        bunched.tax_savings,
      );
    },
  });
}
