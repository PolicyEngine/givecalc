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
const STATES: StatesResponse = {
  states: [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
    { code: "DC", name: "District of Columbia" },
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
