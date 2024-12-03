import streamlit as st
from visualization import create_tax_plot, create_marginal_cost_plot


TEAL_ACCENT = "#39C6C0"


def display_giving_results(donation_amount, tax_reduction, marginal_cost):
    """Displays the giving results with teal-colored metrics."""
    st.markdown(
        f"<h3 style='text-align: center;'>Your "
        f"<span style='color:{TEAL_ACCENT};'>${donation_amount:,.0f}</span> donation reduces your taxes by "
        f"<span style='color:{TEAL_ACCENT};'>${abs(tax_reduction):,.0f}</span></h3>",
        unsafe_allow_html=True,
    )


def display_net_income_text():
    """Displays the net income explanation text."""
    st.markdown(
        "<h3 style='text-align: center; margin: 2em 0;'>"
        "Another way of looking at this is net income after taxes, transfers, and donations. "
        "Here's how that changes depending on how much you give."
        "</h3>",
        unsafe_allow_html=True,
    )


def display_reduction_result(
    reduction_type, reduction_amount, required_donation
):
    """Displays the reduction calculation result."""
    reduction_text = (
        f"{reduction_amount}%"
        if reduction_type == "Percentage"
        else f"${reduction_amount:,.0f}"
    )
    st.markdown(
        f"<h3 style='text-align: center;'>To lower your net income by "
        f"<span style='color:{TEAL_ACCENT};'>{reduction_text}</span>, give "
        f"<span style='color:{TEAL_ACCENT};'>${required_donation:,.0f}</span></h3>",
        unsafe_allow_html=True,
    )


def render_tax_results(
    df, baseline_metrics, income, state, donation_amount, accent_color
):
    """Render the tax calculation results section."""
    if st.button("Calculate tax implications", type="primary"):
        # Get current donation effects
        donation_idx = (
            df["charitable_cash_donations"].sub(donation_amount).abs().idxmin()
        )
        tax_reduction = (
            baseline_metrics["baseline_income_tax"]
            - df.loc[donation_idx, "income_tax_after_donations"]
        )
        marginal_cost = df.loc[donation_idx, "marginal_cost"]

        # Show tax impact chart with highlighted numbers
        st.markdown(
            f"""
    <h3 style="font-family: Roboto; font-weight: normal;">
        Your <span style="color: {accent_color}; font-weight: bold;">${donation_amount:,.0f}</span> donation 
        will lower your taxes by 
        <span style="color: {accent_color}; font-weight: bold;">${abs(tax_reduction):,.0f}</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_tax_plot(df, income, state, donation_amount, accent_color),
            use_container_width=True,
        )

        # Show marginal giving discount chart
        st.markdown(
            f"""
    <h3 style="font-family: Roboto; font-weight: normal;">
        Giving an extra <span style="color: {accent_color}; font-weight: bold;">$1</span> would lower your taxes by another 
        <span style="color: {accent_color}; font-weight: bold;">{round(marginal_cost * 100)}¢</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_marginal_cost_plot(df, donation_amount, accent_color),
            use_container_width=True,
        )
