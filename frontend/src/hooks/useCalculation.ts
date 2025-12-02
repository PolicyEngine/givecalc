/**
 * React Query hooks for GiveCalc calculations
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getStates,
  getTaxPrograms,
  calculateDonation,
  calculateTargetDonation,
  getUKRegions,
  calculateUKDonation,
} from "../lib/api";
import type {
  CalculateRequest,
  TargetDonationRequest,
  UKCalculateRequest,
} from "../lib/types";

export function useStates() {
  return useQuery({
    queryKey: ["states"],
    queryFn: getStates,
    staleTime: Infinity, // States don't change
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
    queryFn: () => getTaxPrograms(stateCode),
    enabled: !!stateCode,
    staleTime: Infinity,
  });
}

export function useCalculateDonation() {
  return useMutation({
    mutationFn: (request: CalculateRequest) => calculateDonation(request),
  });
}

export function useCalculateTargetDonation() {
  return useMutation({
    mutationFn: (request: TargetDonationRequest) =>
      calculateTargetDonation(request),
  });
}

export function useCalculateUKDonation() {
  return useMutation({
    mutationFn: (request: UKCalculateRequest) => calculateUKDonation(request),
  });
}
