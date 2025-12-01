/**
 * Marginal Savings Rate chart using Plotly
 */

import Plot from "react-plotly.js";
import type { DonationDataPoint } from "../lib/types";
import { formatCurrency, formatPercent } from "../lib/format";

interface Props {
  curve: DonationDataPoint[];
  currentDonation: number;
}

export default function MarginalChart({ curve, currentDonation }: Props) {
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

  return (
    <Plot
      data={[
        {
          x: donations,
          y: marginalSavings,
          type: "scatter",
          mode: "lines",
          name: "Marginal savings",
          line: { color: "#319795", width: 3 },
          hovertemplate:
            "Donation: %{x:$,.0f}<br>Marginal rate: %{y:.1f}%<extra></extra>",
        },
        {
          x: [donations[currentIdx]],
          y: [marginalSavings[currentIdx]],
          type: "scatter",
          mode: "markers",
          name: "Your donation",
          marker: { color: "#1D4044", size: 12, symbol: "circle" },
          hovertemplate: `Your donation: ${formatCurrency(currentDonation)}<br>Marginal rate: ${formatPercent(marginalSavings[currentIdx] / 100)}<extra></extra>`,
        },
      ]}
      layout={{
        autosize: true,
        height: 350,
        margin: { l: 70, r: 30, t: 30, b: 60 },
        font: { family: "Inter, sans-serif" },
        xaxis: {
          title: { text: "Donation amount" },
          tickformat: "$,.0f",
          gridcolor: "#E2E8F0",
        },
        yaxis: {
          title: { text: "Tax savings per $1 donated (%)" },
          ticksuffix: "%",
          gridcolor: "#E2E8F0",
          range: [0, Math.max(...marginalSavings) * 1.1],
        },
        plot_bgcolor: "white",
        paper_bgcolor: "white",
        showlegend: false,
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
