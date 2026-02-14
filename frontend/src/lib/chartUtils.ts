/**
 * Shared chart utilities for Recharts-based components
 */

import type { CSSProperties } from "react";

export const TOOLTIP_STYLE: CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 6,
  padding: "8px 12px",
};

export const RECHARTS_FONT_STYLE = {
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 12,
} as const;

/**
 * Compute nice round tick values for a chart axis starting at 0.
 * Returns an array like [0, 5000, 10000, 15000, 20000, 25000].
 */
export function niceTicks(
  dataMax: number,
  targetCount: number = 5,
): number[] {
  if (dataMax <= 0) return [0];

  const rawStep = dataMax / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil(dataMax / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax; v += niceStep) {
    ticks.push(Math.round(v * 1e10) / 1e10); // avoid float drift
  }
  return ticks;
}

export const CHART_COLORS = {
  TEAL_PRIMARY: "#319795",
  TEAL_LIGHT: "rgba(49, 151, 149, 0.15)",
  TEAL_MEDIUM: "rgba(49, 151, 149, 0.35)",
  TEAL_BORDER: "rgba(49, 151, 149, 0.3)",
  DARK_TEAL: "#1D4044",
  GRID: "#E2E8F0",
} as const;
