import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TaxChart from "../components/TaxChart";
import type { DonationDataPoint } from "../lib/types";

// Mock recharts to render testable output in jsdom
vi.mock("recharts", () => {
  const MockResponsiveContainer = ({
    children,
  }: {
    children: React.ReactElement;
  }) => <div data-testid="responsive-container">{children}</div>;

  const MockLineChart = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: unknown[];
  }) => (
    <div data-testid="line-chart" data-points={data.length}>
      {children}
    </div>
  );

  const MockLine = ({ dataKey, name }: { dataKey: string; name: string }) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
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

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    ReferenceDot: MockReferenceDot,
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

describe("TaxChart", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <TaxChart curve={mockCurve} currentDonation={5000} />,
    );
    expect(container).toBeTruthy();
  });

  it("renders a responsive container", () => {
    render(<TaxChart curve={mockCurve} currentDonation={5000} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders axis labels for donation amount and net taxes", () => {
    render(<TaxChart curve={mockCurve} currentDonation={5000} />);
    const labels = screen.getAllByTestId("label");
    const labelTexts = labels.map((el) => el.textContent);
    expect(labelTexts).toContain("Donation amount");
    expect(labelTexts).toContain("Net taxes");
  });

  it("renders the net_tax line", () => {
    render(<TaxChart curve={mockCurve} currentDonation={5000} />);
    expect(screen.getByTestId("line-net_tax")).toBeInTheDocument();
  });

  it("renders a reference dot at the current donation", () => {
    render(<TaxChart curve={mockCurve} currentDonation={5000} />);
    const dot = screen.getByTestId("reference-dot");
    expect(dot).toBeInTheDocument();
    expect(dot.dataset.x).toBe("5000");
    expect(dot.dataset.y).toBe("8800");
  });

  it("renders with GBP currency", () => {
    const { container } = render(
      <TaxChart curve={mockCurve} currentDonation={5000} currency="GBP" />,
    );
    expect(container).toBeTruthy();
  });

  it("handles empty curve gracefully", () => {
    const { container } = render(
      <TaxChart curve={[]} currentDonation={0} />,
    );
    expect(container).toBeTruthy();
    expect(screen.queryByTestId("reference-dot")).not.toBeInTheDocument();
  });

  it("passes correct data length to chart", () => {
    render(<TaxChart curve={mockCurve} currentDonation={5000} />);
    const chart = screen.getByTestId("line-chart");
    expect(chart.dataset.points).toBe("5");
  });
});
