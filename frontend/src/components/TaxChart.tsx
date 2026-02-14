/**
 * Net Tax vs Donation Amount chart using Recharts
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
  Label,
} from "recharts";
import type { DonationDataPoint } from "../lib/types";
import { formatCurrency } from "../lib/format";
import {
  TOOLTIP_STYLE,
  RECHARTS_FONT_STYLE,
  CHART_COLORS,
  niceTicks,
} from "../lib/chartUtils";

interface Props {
  curve: DonationDataPoint[];
  currentDonation: number;
  currency?: "USD" | "GBP";
}

export default function TaxChart({
  curve,
  currentDonation,
  currency = "USD",
}: Props) {
  const currencySymbol = currency === "GBP" ? "\u00a3" : "$";

  // Find the data point closest to the current donation
  const currentPoint = curve.reduce(
    (best, d) =>
      Math.abs(d.donation - currentDonation) <
      Math.abs(best.donation - currentDonation)
        ? d
        : best,
    curve[0] ?? { donation: 0, net_tax: 0, marginal_savings: 0, net_income: 0 },
  );

  const tickFormatter = (value: number) =>
    `${currencySymbol}${value.toLocaleString()}`;

  // Compute nice round ticks
  const xMax = curve.length > 0 ? Math.max(...curve.map((d) => d.donation)) : 0;
  const yMax = curve.length > 0 ? Math.max(...curve.map((d) => d.net_tax)) : 0;
  const xTicks = niceTicks(xMax);
  const yTicks = niceTicks(yMax);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={curve}
        margin={{ left: 20, right: 30, top: 10, bottom: 20 }}
      >
        <CartesianGrid stroke={CHART_COLORS.GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="donation"
          type="number"
          domain={[0, xTicks[xTicks.length - 1]]}
          ticks={xTicks}
          tickFormatter={tickFormatter}
          tick={RECHARTS_FONT_STYLE}
        >
          <Label
            value="Donation amount"
            position="bottom"
            offset={0}
            style={RECHARTS_FONT_STYLE}
          />
        </XAxis>
        <YAxis
          domain={[0, yTicks[yTicks.length - 1]]}
          ticks={yTicks}
          tickFormatter={tickFormatter}
          tick={RECHARTS_FONT_STYLE}
        >
          <Label
            value="Net taxes"
            angle={-90}
            position="insideLeft"
            offset={-5}
            style={{ ...RECHARTS_FONT_STYLE, textAnchor: "middle" }}
          />
        </YAxis>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          separator=": "
          formatter={(value: number) => [
            formatCurrency(value, currency),
            "Net tax",
          ]}
          labelFormatter={(label: number) =>
            `Donation: ${formatCurrency(label, currency)}`
          }
        />
        <Line
          type="monotone"
          dataKey="net_tax"
          stroke={CHART_COLORS.TEAL_PRIMARY}
          strokeWidth={3}
          dot={false}
          name="Net taxes"
        />
        {curve.length > 0 && (
          <ReferenceDot
            x={currentPoint.donation}
            y={currentPoint.net_tax}
            r={6}
            fill={CHART_COLORS.DARK_TEAL}
            stroke={CHART_COLORS.DARK_TEAL}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
