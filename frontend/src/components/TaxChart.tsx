/**
 * Net Tax vs Donation Amount chart using Plotly
 */

import Plot from "react-plotly.js";
import type { DonationDataPoint } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface Props {
  curve: DonationDataPoint[];
  currentDonation: number;
}

export default function TaxChart({ curve, currentDonation }: Props) {
  const donations = curve.map((d) => d.donation);
  const netTaxes = curve.map((d) => d.net_tax);

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
          y: netTaxes,
          type: "scatter",
          mode: "lines",
          name: "Net taxes",
          line: { color: "#319795", width: 3 },
          hovertemplate:
            "Donation: %{x:$,.0f}<br>Net tax: %{y:$,.0f}<extra></extra>",
        },
        {
          x: [donations[currentIdx]],
          y: [netTaxes[currentIdx]],
          type: "scatter",
          mode: "markers",
          name: "Your donation",
          marker: { color: "#1D4044", size: 12, symbol: "circle" },
          hovertemplate: `Your donation: ${formatCurrency(currentDonation)}<br>Net tax: ${formatCurrency(netTaxes[currentIdx])}<extra></extra>`,
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
          title: { text: "Net taxes" },
          tickformat: "$,.0f",
          gridcolor: "#E2E8F0",
          rangemode: "tozero",
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
