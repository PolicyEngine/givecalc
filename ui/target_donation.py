import streamlit as st

from givecalc import TEAL_PRIMARY, add_net_income_columns
from ui.visualization import create_net_income_plot


def render_target_donation_section(
    df,
    baseline_metrics,
    income,
    donation_amount,
    current_donation_metrics,
    situation,
    reduction_amount,
    reduction_type,
    required_donation,
    required_donation_net_income,
    actual_reduction,
    actual_percentage,
):
    """Render the target donation calculator section with pre-calculated values."""
    # Add net income calculations to DataFrame for the chart
    df_with_net = add_net_income_columns(df, baseline_metrics)

    # Display results
    target_text = (
        f"{reduction_amount:.1f}%"
        if reduction_type == "Percentage"
        else f"${reduction_amount:,.0f}"
    )

    st.markdown(
        f"""
<h4 style="font-family: Roboto; font-weight: normal; font-size: 22px;">
    To reduce your net income by
    <span style="color: {TEAL_PRIMARY}; font-weight: bold;">{target_text}</span>,
    donate
    <span style="color: {TEAL_PRIMARY}; font-weight: bold;">${required_donation:,.0f}</span>
</h4>
""",
        unsafe_allow_html=True,
    )

    if reduction_type == "Percentage":
        actual_text = f"{actual_percentage:.1f}%"
        target = reduction_amount
        actual = actual_percentage
    else:
        actual_text = f"${actual_reduction:,.0f}"
        target = reduction_amount
        actual = actual_reduction

    # TODO: Investigate why this is happening.
    show_warning = abs(actual - target) > (
        0.1 if reduction_type == "Percentage" else 1
    )
    show_warning = False  # Suppress warning for now
    if show_warning:
        st.info(
            f"Note: This donation will actually reduce your net income by {actual_text}. "
            "The exact target reduction may not be achievable due to tax bracket effects."
        )

    # Show net income plot
    st.plotly_chart(
        create_net_income_plot(
            df_with_net,
            required_donation,
            required_donation_net_income,
        ),
        use_container_width=True,
    )
