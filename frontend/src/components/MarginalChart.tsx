/**
 * Marginal Savings Rate chart using Plotly
 */

import Plot from "react-plotly.js";
import type { DonationDataPoint } from "../lib/types";
import { formatCurrency, formatPercent } from "../lib/format";

interface Props {
  curve: DonationDataPoint[];
  currentDonation: number;
  currency?: "USD" | "GBP";
}

export default function MarginalChart({ curve, currentDonation, currency = "USD" }: Props) {
  const isUK = currency === "GBP";
  const currencySymbol = isUK ? "£" : "$";
  const donations = curve.map((d) => d.donation);
  const marginalSavings = curve.map((d) => d.marginal_savings * 100); // Convert to percentage

  // Find current donation point
  const currentIdx = donations.reduce(
    (best, d, i) =>
      Math.abs(d - currentDonation) <
      Math.abs(donations[best] - currentDonation)
        ? i
        : best,
    0,
  );

  // For UK, charity always gets 25% Gift Aid reclaim
  const charityGiftAid = isUK ? 25 : 0;

  // Build chart traces
  const traces: Plotly.Data[] = [];

  if (isUK) {
    // Shaded area for charity's 25% Gift Aid reclaim
    traces.push({
      x: donations,
      y: donations.map(() => charityGiftAid),
      type: "scatter",
      mode: "lines",
      name: "Charity's Gift Aid (25%)",
      fill: "tozeroy",
      fillcolor: "rgba(49, 151, 149, 0.15)",
      line: { color: "rgba(49, 151, 149, 0.3)", width: 1, dash: "dot" },
      hovertemplate: `Charity receives: 25% Gift Aid reclaim<extra></extra>`,
    } as Plotly.Data);

    // Your higher rate relief (stacked on top)
    traces.push({
      x: donations,
      y: marginalSavings.map(s => s + charityGiftAid),
      type: "scatter",
      mode: "lines",
      name: "Total tax relief",
      fill: "tonexty",
      fillcolor: "rgba(49, 151, 149, 0.35)",
      line: { color: "#319795", width: 3 },
      hovertemplate:
        `Donation: ${currencySymbol}%{x:,.0f}<br>Your relief: %{customdata:.1f}%<br>Charity receives: 25%<br>Total: %{y:.1f}%<extra></extra>`,
      customdata: marginalSavings,
    } as Plotly.Data);

    // Current donation marker
    traces.push({
      x: [donations[currentIdx]],
      y: [marginalSavings[currentIdx] + charityGiftAid],
      type: "scatter",
      mode: "markers",
      name: "Your donation",
      marker: { color: "#1D4044", size: 12, symbol: "circle" },
      hovertemplate: `Your donation: ${formatCurrency(currentDonation, currency)}<br>Total relief: ${formatPercent((marginalSavings[currentIdx] + charityGiftAid) / 100)}<extra></extra>`,
    } as Plotly.Data);
  } else {
    // US: simple line chart
    traces.push({
      x: donations,
      y: marginalSavings,
      type: "scatter",
      mode: "lines",
      name: "Marginal savings",
      line: { color: "#319795", width: 3 },
      hovertemplate:
        "Donation: $%{x:,.0f}<br>Marginal rate: %{y:.1f}%<extra></extra>",
    } as Plotly.Data);

    traces.push({
      x: [donations[currentIdx]],
      y: [marginalSavings[currentIdx]],
      type: "scatter",
      mode: "markers",
      name: "Your donation",
      marker: { color: "#1D4044", size: 12, symbol: "circle" },
      hovertemplate: `Your donation: ${formatCurrency(currentDonation)}<br>Marginal rate: ${formatPercent(marginalSavings[currentIdx] / 100)}<extra></extra>`,
    } as Plotly.Data);
  }

  const maxY = isUK
    ? Math.max(...marginalSavings.map(s => s + charityGiftAid)) * 1.1
    : Math.max(...marginalSavings) * 1.1;

  return (
    <Plot
      data={traces}
      layout={{
        autosize: true,
        height: 350,
        margin: { l: 70, r: 30, t: 30, b: 60 },
        font: { family: "Inter, sans-serif" },
        xaxis: {
          title: { text: "Donation amount" },
          tickformat: ",.0f",
          tickprefix: currencySymbol,
          gridcolor: "#E2E8F0",
        },
        yaxis: {
          title: { text: isUK ? "Tax relief per £1 donated (%)" : "Tax savings per $1 donated (%)" },
          ticksuffix: "%",
          gridcolor: "#E2E8F0",
          range: [0, maxY],
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        showlegend: isUK,
        legend: isUK ? {
          orientation: "h",
          yanchor: "bottom",
          y: 1.02,
          xanchor: "center",
          x: 0.5,
          font: { size: 11 },
        } : undefined,
        hovermode: "closest",
      }}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      style={{ width: "100%" }}
    />
  );
}
