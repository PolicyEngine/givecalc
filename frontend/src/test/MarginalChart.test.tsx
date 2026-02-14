import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MarginalChart from "../components/MarginalChart";
import type { DonationDataPoint } from "../lib/types";

// Mock recharts to render testable output in jsdom
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({
    children,
  }: {
    children: React.ReactElement;
  }) => <div data-testid="responsive-container">{children}</div>;

  const MockComposedChart = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: unknown[];
  }) => (
    <div data-testid="composed-chart" data-points={data.length}>
      {children}
    </div>
  );

  const MockLine = ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  );

  const MockArea = ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`area-${dataKey}`} data-name={name} />
  );

  const MockXAxis = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div data-testid="x-axis">{children}</div>;

  const MockYAxis = ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div data-testid="y-axis">{children}</div>;

  const MockLabel = ({ value }: { value: string }) => (
    <span data-testid="label">{value}</span>
  );

  const MockReferenceDot = ({ x, y }: { x: number; y: number }) => (
    <div data-testid="reference-dot" data-x={x} data-y={y} />
  );

  const MockLegend = () => <div data-testid="legend" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    ComposedChart: MockComposedChart,
    Line: MockLine,
    Area: MockArea,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    ReferenceDot: MockReferenceDot,
    Legend: MockLegend,
    Label: MockLabel,
  };
});

const mockCurve: DonationDataPoint[] = [
  { donation: 0, net_tax: 10000, marginal_savings: 0.24, net_income: 90000 },
  {
    donation: 5000,
    net_tax: 8800,
    marginal_savings: 0.24,
    net_income: 86200,
  },
  {
    donation: 10000,
    net_tax: 7600,
    marginal_savings: 0.24,
    net_income: 82400,
  },
  {
    donation: 15000,
    net_tax: 6400,
    marginal_savings: 0.22,
    net_income: 78600,
  },
  {
    donation: 20000,
    net_tax: 5300,
    marginal_savings: 0.2,
    net_income: 74700,
  },
];

describe("MarginalChart", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MarginalChart curve={mockCurve} currentDonation={5000} />,
    );
    expect(container).toBeTruthy();
  });

  it("renders a responsive container", () => {
    render(<MarginalChart curve={mockCurve} currentDonation={5000} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders US mode with a line (no areas)", () => {
    render(<MarginalChart curve={mockCurve} currentDonation={5000} />);
    expect(screen.getByTestId("line-marginal_pct")).toBeInTheDocument();
    expect(screen.queryByTestId("area-charity_gift_aid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("area-total_relief")).not.toBeInTheDocument();
    expect(screen.queryByTestId("legend")).not.toBeInTheDocument();
  });

  it("renders US mode y-axis label", () => {
    render(<MarginalChart curve={mockCurve} currentDonation={5000} />);
    const labels = screen.getAllByTestId("label");
    const labelTexts = labels.map((el) => el.textContent);
    expect(labelTexts).toContain("Tax savings per $1 donated (%)");
  });

  it("renders UK mode with areas and legend (no line)", () => {
    render(
      <MarginalChart
        curve={mockCurve}
        currentDonation={5000}
        currency="GBP"
      />,
    );
    expect(screen.getByTestId("area-charity_gift_aid")).toBeInTheDocument();
    expect(screen.getByTestId("area-total_relief")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
    expect(screen.queryByTestId("line-marginal_pct")).not.toBeInTheDocument();
  });

  it("renders UK mode y-axis label", () => {
    render(
      <MarginalChart
        curve={mockCurve}
        currentDonation={5000}
        currency="GBP"
      />,
    );
    const labels = screen.getAllByTestId("label");
    const labelTexts = labels.map((el) => el.textContent);
    expect(labelTexts).toContain("Tax relief per \u00a31 donated (%)");
  });

  it("renders a reference dot at the current donation (US)", () => {
    render(<MarginalChart curve={mockCurve} currentDonation={5000} />);
    const dot = screen.getByTestId("reference-dot");
    expect(dot).toBeInTheDocument();
    expect(dot.dataset.x).toBe("5000");
    // marginal_savings = 0.24 * 100 = 24
    expect(dot.dataset.y).toBe("24");
  });

  it("renders a reference dot at the current donation (UK, includes Gift Aid)", () => {
    render(
      <MarginalChart
        curve={mockCurve}
        currentDonation={5000}
        currency="GBP"
      />,
    );
    const dot = screen.getByTestId("reference-dot");
    expect(dot).toBeInTheDocument();
    expect(dot.dataset.x).toBe("5000");
    // marginal_savings(0.24)*100 + 25 Gift Aid = 49
    expect(dot.dataset.y).toBe("49");
  });

  it("handles empty curve gracefully", () => {
    const { container } = render(
      <MarginalChart curve={[]} currentDonation={0} />,
    );
    expect(container).toBeTruthy();
    expect(screen.queryByTestId("reference-dot")).not.toBeInTheDocument();
  });
});
