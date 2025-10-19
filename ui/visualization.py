import plotly.express as px
import plotly.graph_objects as go

# from policyengine_core.charts import format_fig
from givecalc.constants import TEAL_ACCENT


def create_tax_plot(
    df,
    income,
    donation_amount,
    tax_at_donation,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing taxes vs donation amount."""
    y_col = "income_tax_after_donations"

    fig = px.line(
        df,
        x=donation_column,
        y=y_col,
        labels={
            donation_column: "Donations",
            y_col: "Net taxes (taxes minus benefits)",
        },
    )

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate="Donations=$%{x:,.0f}<br>Net taxes=$%{y:,.0f}<br><extra></extra>",
    )

    # Add semi-transparent marker for current donation
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[tax_at_donation],
            mode="markers",
            marker=dict(
                color=TEAL_ACCENT, size=8, opacity=0.7, symbol="circle"
            ),
            showlegend=False,
            hovertemplate="Your donation: $%{x:,.0f}<br>Net taxes: $%{y:,.0f}<br><extra></extra>",
        )
    )

    # Set y-axis to start at 0 for taxes
    y_max = df[y_col].max()
    y_padding = y_max * 0.1  # 10% padding on top

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, income],
        yaxis_range=[0, y_max + y_padding],
        xaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        yaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        showlegend=False,
        plot_bgcolor="white",
        margin=dict(t=10),  # Reduce top margin since title is in markdown
    )

    return format_fig(fig)


def create_marginal_savings_plot(
    df,
    donation_amount,
    marginal_savings,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing the marginal giving discount."""
    fig = px.line(
        df,
        x=donation_column,
        y="marginal_savings",
        labels={
            donation_column: "Donations",
            "marginal_savings": "Marginal giving discount",
        },
    )

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate=(
            "Donations=$%{x:,.0f}<br>"
            "Marginal giving discount: $%{y:.2f}<br>"
            "<extra></extra>"
        ),
    )

    # Add semi-transparent marker for current donation
    fig.add_trace(
        go.Scatter(
            x=[donation_amount],
            y=[marginal_savings],
            mode="markers",
            marker=dict(
                color=TEAL_ACCENT, size=8, opacity=0.7, symbol="circle"
            ),
            showlegend=False,
            hovertemplate=(
                "Your donation: $%{x:,.0f}<br>"
                "Marginal giving discount: $%{y:.2f}<br>"
                "<extra></extra>"
            ),
        )
    )

    # Get actual max for better range
    max_marginal = df["marginal_savings"].max()
    y_max = min(max_marginal * 1.1, 1.0)  # Cap at 100% but add 10% padding

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat=".0%",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[0, y_max],
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
    initial_net_income,
    required_donation,
    required_donation_net_income,
    donation_column="charitable_cash_donations",
):
    """Creates a plot showing net income vs donation amount."""
    fig = px.line(
        df,
        x=donation_column,
        y="net_income",
        labels={
            donation_column: "Donations",
            "net_income": "Net income after taxes, transfers, and donations",
        },
    )

    # Update line style
    fig.update_traces(
        line_color="rgb(180, 180, 180)",  # Light gray line
        showlegend=False,
        hovertemplate=(
            "Donations=$%{x:,.0f}<br>"
            "Net income=$%{y:,.0f}<br>"
            "<extra></extra>"
        ),
    )

    # Add markers for initial and required donations
    points = [
        (
            initial_donation,
            initial_net_income,
            "rgb(120, 120, 120)",
            "Initial donation",
        ),  # Gray
        (
            required_donation,
            required_donation_net_income,
            TEAL_ACCENT,
            "Required donation",
        ),  # Teal
    ]

    # Calculate the donation that is closest to the required net income change.

    for donation, net_income, color, name in points:
        fig.add_trace(
            go.Scatter(
                x=[donation],
                y=[net_income],
                mode="markers",
                name=name,
                marker=dict(color=color, size=8, opacity=0.7, symbol="circle"),
                hovertemplate=(
                    f"{name}:<br>"
                    "Donation amount ($)=$%{x:,.0f}<br>"
                    "Net income ($)=$%{y:,.0f}<br>"
                    "<extra></extra>"
                ),
            )
        )

    fig.update_layout(
        xaxis_tickformat="$,",
        yaxis_tickformat="$,",
        xaxis_range=[0, max(df[donation_column])],
        yaxis_range=[
            min(df["net_income"]) * 0.95,
            max(df["net_income"]) * 1.05,
        ],
        xaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        yaxis=dict(zeroline=True, zerolinewidth=1, zerolinecolor="gray"),
        showlegend=True,
        legend=dict(
            yanchor="top",
            y=0.99,
            xanchor="right",
            x=0.99,
            bgcolor="rgba(255, 255, 255, 0.8)",
            itemsizing="constant",  # Added to ensure consistent marker size in legend
        ),
        plot_bgcolor="white",
        margin=dict(t=10),
    )

    return format_fig(fig)


def format_fig(fig: go.Figure) -> go.Figure:
    """Format a plotly figure to match the PolicyEngine style guide."""
    fig.update_layout(
        font=dict(
            family="Roboto Serif",
            color="black",
        ),
        margin=dict(
            l=50,  # Reduced left margin since we don't need space for left logo
            r=100,
            t=50,
            b=120,
            pad=4,
        ),
    )
    fig.add_layout_image(
        dict(
            source="https://raw.githubusercontent.com/PolicyEngine/policyengine-app/master/src/images/logos/policyengine/blue.png",
            xref="paper",
            yref="paper",
            x=1.0,
            y=-0.10,
            sizex=0.10,
            sizey=0.10,
            xanchor="right",
            yanchor="bottom",
        )
    )

    # Rest of the layout settings remain the same
    fig.update_layout(
        template="plotly_white",
        height=600,
        width=800,
    )
    fig.update_layout(
        modebar=dict(
            bgcolor="rgba(0,0,0,0)",
            color="rgba(0,0,0,0)",
        )
    )
    return fig
