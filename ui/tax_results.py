import streamlit as st
from visualization import create_tax_plot, create_marginal_savings_plot
from constants import TEAL_ACCENT, MARGIN


def render_tax_results(
    df, baseline_metrics, income, donation_amount, current_donation_metrics, current_donation_plus100_metrics
):
    """Render the tax calculation results section."""
    if st.button("Calculate tax implications", type="primary"):
        # Get current donation effects
        tax_reduction = (
            baseline_metrics["baseline_income_tax"][0] - current_donation_metrics["baseline_income_tax"][0]
        )
        marginal_savings = current_donation_metrics["baseline_income_tax"][0] - current_donation_plus100_metrics["baseline_income_tax"][0]

        # Show tax impact chart with highlighted numbers
        st.markdown(
            f"""
    <h3 style="font-family: Roboto; font-weight: normal;">
        Your <span style="color: {TEAL_ACCENT}; font-weight: bold;">${donation_amount:,.0f}</span> donation 
        will lower your taxes by 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">${tax_reduction:,.0f}</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_tax_plot(df, income, donation_amount, current_donation_metrics["baseline_income_tax"][0]),
            use_container_width=True,
        )

        # Show marginal giving discount chart
        st.markdown(
            f"""
    <h3 style="font-family: Roboto; font-weight: normal;">
        Giving an extra <span style="color: {TEAL_ACCENT}; font-weight: bold;">$100</span> would lower your taxes by another 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">${round(marginal_savings)}</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_marginal_savings_plot(df, donation_amount, marginal_savings / MARGIN),
            use_container_width=True,
        )
