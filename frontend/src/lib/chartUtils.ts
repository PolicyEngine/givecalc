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

export const CHART_COLORS = {
  TEAL_PRIMARY: "#319795",
  TEAL_LIGHT: "rgba(49, 151, 149, 0.15)",
  TEAL_MEDIUM: "rgba(49, 151, 149, 0.35)",
  TEAL_BORDER: "rgba(49, 151, 149, 0.3)",
  DARK_TEAL: "#1D4044",
  GRID: "#E2E8F0",
} as const;
