# visualization.py
import plotly.express as px
import plotly.graph_objects as go
from policyengine_core.charts import format_fig


def create_tax_plot(
    df,
    income,
    state,
    donation_amount,
    accent_color,
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

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate="Donation Amount ($)=$%{x:,.0f}<br>Income Tax ($)=$%{y:,.0f}<br><extra></extra>",
    )

    # Find tax at donation amount
    donation_idx = (df[donation_column] - donation_amount).abs().idxmin()
    tax_at_donation = df.loc[donation_idx, "income_tax_after_donations"]

    # Add semi-transparent marker for current donation
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[tax_at_donation],
            mode="markers",
            marker=dict(
                color=accent_color, size=8, opacity=0.7, symbol="circle"
            ),
            showlegend=False,
            hovertemplate="Your donation: $%{x:,.0f}<br>Income tax: $%{y:,.0f}<br><extra></extra>",
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, income],
        yaxis_range=[0, max(df[y_col])],
        xaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        yaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        showlegend=False,
        plot_bgcolor="white",
        margin=dict(t=10),  # Reduce top margin since title is in markdown
    )

    return format_fig(fig)


def create_marginal_cost_plot(
    df,
    donation_amount,
    accent_color,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing the marginal giving discount."""
    fig = px.line(
        df,
        x=donation_column,
        y="marginal_cost",
        labels={
            donation_column: "Donation Amount ($)",
            "marginal_cost": "Tax Savings per Dollar ($)",
        },
    )

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate=(
            "Donation Amount ($)=$%{x:,.0f}<br>"
            "Tax Savings: $%{y:.2f} per dollar<br>"
            "<extra></extra>"
        ),
    )

    # Get marginal cost at donation amount
    donation_idx = (df[donation_column] - donation_amount).abs().idxmin()
    marginal_cost = df.loc[donation_idx, "marginal_cost"]

    # Add semi-transparent marker for current donation
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[marginal_cost],
            mode="markers",
            marker=dict(
                color=accent_color, size=8, opacity=0.7, symbol="circle"
            ),
            showlegend=False,
            hovertemplate=(
                "Your donation: $%{x:,.0f}<br>"
                "Tax savings: $%{y:.2f} per dollar<br>"
                "<extra></extra>"
            ),
        )
    )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=".2f",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[0, 1],
        xaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        yaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        showlegend=False,
        plot_bgcolor="white",
        margin=dict(t=10),  # Reduce top margin since title is in markdown
    )

    return format_fig(fig)


def create_net_income_plot(
    df,
    initial_donation,
    required_donation,
    accent_color,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing net income vs donation amount."""
    fig = px.line(
        df,
        x=donation_column,
        y="net_income",
        labels={
            donation_column: "Donation Amount ($)",
            "net_income": "Net Income ($)",
        },
    )

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate=(
            "Donation Amount ($)=$%{x:,.0f}<br>"
            "Net Income ($)=$%{y:,.0f}<br>"
            "<extra></extra>"
        ),
    )

    # Add markers for initial and required donations
    points = [
        (initial_donation, "rgb(120, 120, 120)", "Initial donation"),  # Gray
        (required_donation, accent_color, "Required donation"),  # Teal
    ]

    for donation, color, name in points:
        donation_idx = (df[donation_column] - donation).abs().idxmin()
        net_income = df.loc[donation_idx, "net_income"]

        fig.add_trace(
            go.Scatter(
                x=[donation],
                y=[net_income],
                mode="markers",
                name=name,
                marker=dict(color=color, size=8, opacity=0.7, symbol="circle"),
                hovertemplate=(
                    f"{name}:<br>"
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
        yaxis_range=[min(df["net_income"]), max(df["net_income"])],
        xaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        yaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="right",
            x=0.99,
            bgcolor="rgba(255, 255, 255, 0.8)",
        ),
        plot_bgcolor="white",
        margin=dict(t=10),
    )

    return format_fig(fig)
