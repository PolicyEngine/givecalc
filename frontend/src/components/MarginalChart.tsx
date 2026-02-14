/**
 * Marginal Savings Rate chart using Recharts
 */

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface ChartDataPoint {
  donation: number;
  marginal_pct: number;
  charity_gift_aid?: number;
  total_relief?: number;
}

export default function MarginalChart({
  curve,
  currentDonation,
  currency = "USD",
}: Props) {
  const isUK = currency === "GBP";
  const currencySymbol = isUK ? "\u00a3" : "$";
  const charityGiftAid = isUK ? 25 : 0;

  // Transform data for Recharts format
  const data: ChartDataPoint[] = curve.map((d) => {
    const marginal_pct = d.marginal_savings * 100;
    if (isUK) {
      return {
        donation: d.donation,
        marginal_pct,
        charity_gift_aid: charityGiftAid,
        total_relief: marginal_pct + charityGiftAid,
      };
    }
    return { donation: d.donation, marginal_pct };
  });

  // Find current donation point
  const currentIdx = curve.reduce(
    (best, d, i) =>
      Math.abs(d.donation - currentDonation) <
      Math.abs(curve[best].donation - currentDonation)
        ? i
        : best,
    0,
  );
  const currentData = data[currentIdx];
  const currentMarkerY = isUK
    ? (currentData?.total_relief ?? 0)
    : (currentData?.marginal_pct ?? 0);

  const tickFormatterX = (value: number) =>
    `${currencySymbol}${value.toLocaleString()}`;
  const tickFormatterY = (value: number) => `${value}%`;

  const yAxisLabel = isUK
    ? `Tax relief per \u00a31 donated (%)`
    : `Tax savings per $1 donated (%)`;

  // Compute nice round ticks
  const xMax = data.length > 0 ? Math.max(...data.map((d) => d.donation)) : 0;
  const yMax =
    data.length > 0
      ? Math.max(...data.map((d) =>
          isUK ? (d.total_relief ?? 0) : d.marginal_pct))
      : 0;
  const xTicks = niceTicks(xMax);
  const yTicks = niceTicks(yMax);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart
        data={data}
        margin={{ left: 20, right: 30, top: 10, bottom: 20 }}
      >
        <CartesianGrid stroke={CHART_COLORS.GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="donation"
          type="number"
          domain={[0, xTicks[xTicks.length - 1]]}
          ticks={xTicks}
          tickFormatter={tickFormatterX}
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
          tickFormatter={tickFormatterY}
          tick={RECHARTS_FONT_STYLE}
        >
          <Label
            value={yAxisLabel}
            angle={-90}
            position="insideLeft"
            offset={-5}
            style={{ ...RECHARTS_FONT_STYLE, textAnchor: "middle" }}
          />
        </YAxis>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          separator=": "
          formatter={(value: number, name: string) => {
            if (name === "charity_gift_aid")
              return [`${value.toFixed(1)}%`, "Charity's Gift Aid (25%)"];
            if (name === "total_relief")
              return [`${value.toFixed(1)}%`, "Total tax relief"];
            return [`${value.toFixed(1)}%`, "Marginal savings"];
          }}
          labelFormatter={(label: number) =>
            `Donation: ${formatCurrency(label, currency)}`
          }
        />
        {isUK ? (
          <>
            <Area
              type="monotone"
              dataKey="charity_gift_aid"
              fill={CHART_COLORS.TEAL_LIGHT}
              stroke={CHART_COLORS.TEAL_BORDER}
              strokeWidth={1}
              strokeDasharray="4 4"
              fillOpacity={1}
              name="charity_gift_aid"
            />
            <Area
              type="monotone"
              dataKey="total_relief"
              fill={CHART_COLORS.TEAL_MEDIUM}
              stroke={CHART_COLORS.TEAL_PRIMARY}
              strokeWidth={3}
              fillOpacity={1}
              name="total_relief"
            />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ ...RECHARTS_FONT_STYLE, paddingBottom: 10 }}
              formatter={(value: string) => {
                if (value === "charity_gift_aid")
                  return "Charity's Gift Aid (25%)";
                if (value === "total_relief") return "Total tax relief";
                return value;
              }}
            />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="marginal_pct"
            stroke={CHART_COLORS.TEAL_PRIMARY}
            strokeWidth={3}
            dot={false}
            name="Marginal savings"
          />
        )}
        {data.length > 0 && currentData && (
          <ReferenceDot
            x={currentData.donation}
            y={currentMarkerY}
            r={6}
            fill={CHART_COLORS.DARK_TEAL}
            stroke={CHART_COLORS.DARK_TEAL}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
