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
  UKRegionsResponse,
  UKCalculateRequest,
  UKCalculateResponse,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getStates(): Promise<StatesResponse> {
  console.log("Fetching states from:", API_URL + "/api/states");
  try {
    const response = await api.get<StatesResponse>("/api/states");
    console.log("States response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch states:", error);
    throw error;
  }
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

// UK API functions
export async function getUKRegions(): Promise<UKRegionsResponse> {
  console.log("Fetching UK regions from:", API_URL + "/api/uk/regions");
  try {
    const response = await api.get<UKRegionsResponse>("/api/uk/regions");
    console.log("UK regions response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch UK regions:", error);
    throw error;
  }
}

export async function calculateUKDonation(
  request: UKCalculateRequest,
): Promise<UKCalculateResponse> {
  const response = await api.post<UKCalculateResponse>(
    "/api/uk/calculate",
    request,
  );
  return response.data;
}
