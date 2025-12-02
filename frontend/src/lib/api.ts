/**
 * GiveCalc API client
 */

import axios from "axios";
import type {
  CalculateRequest,
  CalculateResponse,
  TargetDonationRequest,
  TargetDonationResponse,
  StatesResponse,
  TaxProgramsResponse,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Hardcoded states list for instant UI load (avoids Cloud Run cold start)
// Exported so it can be used as initialData in React Query
export const STATES: StatesResponse = {
  states: [
    { code: "AL", name: "Alabama", has_special_programs: false },
    { code: "AK", name: "Alaska", has_special_programs: false },
    { code: "AZ", name: "Arizona", has_special_programs: true },
    { code: "AR", name: "Arkansas", has_special_programs: false },
    { code: "CA", name: "California", has_special_programs: false },
    { code: "CO", name: "Colorado", has_special_programs: true },
    { code: "CT", name: "Connecticut", has_special_programs: false },
    { code: "DE", name: "Delaware", has_special_programs: false },
    { code: "FL", name: "Florida", has_special_programs: false },
    { code: "GA", name: "Georgia", has_special_programs: false },
    { code: "HI", name: "Hawaii", has_special_programs: false },
    { code: "ID", name: "Idaho", has_special_programs: false },
    { code: "IL", name: "Illinois", has_special_programs: false },
    { code: "IN", name: "Indiana", has_special_programs: false },
    { code: "IA", name: "Iowa", has_special_programs: false },
    { code: "KS", name: "Kansas", has_special_programs: false },
    { code: "KY", name: "Kentucky", has_special_programs: false },
    { code: "LA", name: "Louisiana", has_special_programs: false },
    { code: "ME", name: "Maine", has_special_programs: false },
    { code: "MD", name: "Maryland", has_special_programs: false },
    { code: "MA", name: "Massachusetts", has_special_programs: false },
    { code: "MI", name: "Michigan", has_special_programs: false },
    { code: "MN", name: "Minnesota", has_special_programs: false },
    { code: "MS", name: "Mississippi", has_special_programs: true },
    { code: "MO", name: "Missouri", has_special_programs: false },
    { code: "MT", name: "Montana", has_special_programs: false },
    { code: "NE", name: "Nebraska", has_special_programs: false },
    { code: "NV", name: "Nevada", has_special_programs: false },
    { code: "NH", name: "New Hampshire", has_special_programs: true },
    { code: "NJ", name: "New Jersey", has_special_programs: false },
    { code: "NM", name: "New Mexico", has_special_programs: false },
    { code: "NY", name: "New York", has_special_programs: false },
    { code: "NC", name: "North Carolina", has_special_programs: false },
    { code: "ND", name: "North Dakota", has_special_programs: false },
    { code: "OH", name: "Ohio", has_special_programs: false },
    { code: "OK", name: "Oklahoma", has_special_programs: false },
    { code: "OR", name: "Oregon", has_special_programs: false },
    { code: "PA", name: "Pennsylvania", has_special_programs: false },
    { code: "RI", name: "Rhode Island", has_special_programs: false },
    { code: "SC", name: "South Carolina", has_special_programs: false },
    { code: "SD", name: "South Dakota", has_special_programs: false },
    { code: "TN", name: "Tennessee", has_special_programs: false },
    { code: "TX", name: "Texas", has_special_programs: false },
    { code: "UT", name: "Utah", has_special_programs: false },
    { code: "VT", name: "Vermont", has_special_programs: true },
    { code: "VA", name: "Virginia", has_special_programs: false },
    { code: "WA", name: "Washington", has_special_programs: false },
    { code: "WV", name: "West Virginia", has_special_programs: false },
    { code: "WI", name: "Wisconsin", has_special_programs: false },
    { code: "WY", name: "Wyoming", has_special_programs: false },
    { code: "DC", name: "District of Columbia", has_special_programs: false },
  ],
};

export async function getStates(): Promise<StatesResponse> {
  // Return hardcoded states instantly - no API call needed
  return STATES;
}

export async function getTaxPrograms(
  stateCode: string,
): Promise<TaxProgramsResponse> {
  const response = await api.get<TaxProgramsResponse>(
    `/api/tax-programs/${stateCode}`,
  );
  return response.data;
}

export async function calculateDonation(
  request: CalculateRequest,
): Promise<CalculateResponse> {
  const response = await api.post<CalculateResponse>("/api/calculate", request);
  return response.data;
}

export async function calculateTargetDonation(
  request: TargetDonationRequest,
): Promise<TargetDonationResponse> {
  const response = await api.post<TargetDonationResponse>(
    "/api/target-donation",
    request,
  );
  return response.data;
}

export async function healthCheck(): Promise<{
  status: string;
  tax_year: number;
}> {
  const response = await api.get("/api/health");
  return response.data;
}
