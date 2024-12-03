import plotly.express as px
import plotly.graph_objects as go
from policyengine_core.charts import format_fig
from constants import BLUE_PRIMARY


def create_tax_plot(
    df,
    income,
    state,
    donation_amount,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing taxes vs donation amount."""
    y_col = "income_tax_after_donations"

    fig = px.line(
        df,
        x=donation_column,
        y=y_col,
        labels={
            donation_column: "Donation Amount ($)",
            y_col: "Income Tax ($)",
        },
    )

    # Update line color and remove legend
    fig.update_traces(
        line_color=BLUE_PRIMARY,
        showlegend=False,
        hovertemplate="Donation Amount ($)=$%{x:,.0f}<br>Income Tax ($)=$%{y:,.0f}<br><extra></extra>",
    )

    donation_idx = (df[donation_column] - donation_amount).abs().idxmin()
    tax_at_donation = df.loc[donation_idx, "income_tax_after_donations"]

    # Add marker point for target donation
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[tax_at_donation],
            mode="markers",
            marker=dict(color=BLUE_PRIMARY, size=12, symbol="circle"),
            showlegend=False,
            hovertemplate="Donation Amount ($)=$%{x:,.0f}<br>Income Tax ($)=$%{y:,.0f}<br><extra></extra>",
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, income],
        yaxis_range=[0, max(df[y_col])],
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        showlegend=False,
    )

    return format_fig(fig)


def create_marginal_cost_plot(
    df, donation_amount, donation_column="charitable_cash_donations"
):
    """Creates a plot showing the marginal giving discount."""
    # Convert marginal cost to percentage
    df = df.copy()
    df["marginal_cost_pct"] = df["marginal_cost"] * 100

    fig = px.line(
        df,
        x=donation_column,
        y="marginal_cost_pct",
        labels={
            donation_column: "Donation Amount ($)",
            "marginal_cost_pct": "Tax Savings per Dollar Donated (%)",
        },
        title=f"If you donate an extra $1, it will lower your taxes by ${df.loc[df[donation_column].sub(donation_amount).abs().idxmin(), 'marginal_cost']:.2f}",
    )

    # Update line color and remove legend
    fig.update_traces(
        line_color=BLUE_PRIMARY,
        showlegend=False,
        hovertemplate=(
            "Donation Amount ($)=$%{x:,.0f}<br>"
            "Tax Savings: %{y:.1f}%<br>"
            "<extra></extra>"
        ),
    )

    # Get marginal cost at the donation point by interpolation
    donation_idx = (df[donation_column] - donation_amount).abs().idxmin()
    marginal_cost = df.loc[donation_idx, "marginal_cost"]
    marginal_cost_pct = marginal_cost * 100

    # Add marker point
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[marginal_cost_pct],
            mode="markers",
            marker=dict(color=BLUE_PRIMARY, size=12, symbol="circle"),
            showlegend=False,
            hovertemplate=(
                "Donation Amount ($)=$%{x:,.0f}<br>"
                "Tax Savings: %{y:.1f}%<br>"
                "<extra></extra>"
            ),
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=".1f",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[0, max(df["marginal_cost_pct"])],
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        showlegend=False,
    )

    return format_fig(fig), marginal_cost


def create_net_income_plot(
    baseline_net_income,
    df,
    donation_amount,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing net income after taxes, transfers, and donations."""
    df = df.copy()
    df["net_income"] = (
        baseline_net_income
        - df[donation_column]
        - df["income_tax_after_donations"]
    )

    fig = px.line(
        df,
        x=donation_column,
        y="net_income",
        labels={
            donation_column: "Donation Amount ($)",
            "net_income": "Net Income ($)",
        },
        title="Net Income After Taxes, Transfers, and Donations",
    )

    # Update line color and remove legend
    fig.update_traces(
        line_color=BLUE_PRIMARY,
        showlegend=False,
        hovertemplate=(
            "Donation Amount ($)=$%{x:,.0f}<br>"
            "Net Income ($)=$%{y:,.0f}<br>"
            "<extra></extra>"
        ),
    )

    # Add marker point
    donation_idx = (df[donation_column] - donation_amount).abs().idxmin()
    net_income_at_donation = df.loc[donation_idx, "net_income"]

    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[net_income_at_donation],
            mode="markers",
            marker=dict(color=BLUE_PRIMARY, size=12, symbol="circle"),
            showlegend=False,
            hovertemplate=(
                "Donation Amount ($)=$%{x:,.0f}<br>"
                "Net Income ($)=$%{y:,.0f}<br>"
                "<extra></extra>"
            ),
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[0, max(df["net_income"])],
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        yaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor="black"),
        showlegend=False,
    )

    return format_fig(fig)
