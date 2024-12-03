# app.py
import streamlit as st
from config import load_config
from constants import CURRENT_YEAR, TEAL_ACCENT
from ui_basic import (
    render_intro,
    render_state_selector,
    render_income_input,
    render_personal_info,
    render_itemized_deductions,
    render_notes,
)
from ui_donations import render_initial_donation, render_policyengine_donate
from calculations import calculate_baseline_metrics, calculate_donation_effects
from visualization import create_tax_plot, create_marginal_cost_plot
from tax_info import display_tax_programs
from situation import create_situation


def main():
    st.set_page_config(page_title="GiveCalc", page_icon="💝", layout="wide")

    # Inject custom CSS with Roboto font
    st.markdown(
        """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap');

        html, body, [class*="css"] {
            font-family: 'Roboto', sans-serif;
        }
        
        div[data-testid="stToolbar"] {
            visibility: hidden;
        }
        
        footer {
            visibility: hidden;
        }
    </style>
    """,
        unsafe_allow_html=True,
    )

    st.markdown(
        f"""
    <h1 style="font-family: Roboto;">
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">Give</span><span style="color: {TEAL_ACCENT}; font-weight: normal;">Calc</span>
        <span style="color: gray; font-weight: normal;"> by PolicyEngine</span>
    </h1>
    """,
        unsafe_allow_html=True,
    )
    st.markdown(
        f"""
        Calculate how charitable giving affects your taxes in {CURRENT_YEAR}.
        Enter your information below to see your tax savings and the cost of giving more.
        """
    )
    st.divider()

    # Load configuration
    config = load_config()

    # Basic information
    state = render_state_selector(config["states"], config)
    income = render_income_input()
    is_married, num_children = render_personal_info()
    deductions = render_itemized_deductions()
    donation_amount = render_initial_donation(income)

    # Calculate baseline metrics once
    situation = create_situation(
        income,
        is_married=is_married,
        state_code=state,
        num_children=num_children,
        **deductions,
    )
    baseline_metrics = calculate_baseline_metrics(situation)
    baseline_net_income = baseline_metrics["baseline_net_income"]
    df = calculate_donation_effects(situation, income)

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
        Your <span style="color: {TEAL_ACCENT}; font-weight: bold;">${donation_amount:,.0f}</span> donation 
        will lower your taxes by 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">${abs(tax_reduction):,.0f}</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_tax_plot(df, income, state, donation_amount, TEAL_ACCENT),
            use_container_width=True,
        )

        # Show marginal giving discount chart
        st.markdown(
            f"""
    <h3 style="font-family: Roboto; font-weight: normal;">
        Giving an extra <span style="color: {TEAL_ACCENT}; font-weight: bold;">$1</span> would lower your taxes by another 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">{round(marginal_cost * 100)}¢</span>
    </h3>
    """,
            unsafe_allow_html=True,
        )
        st.plotly_chart(
            create_marginal_cost_plot(df, donation_amount, TEAL_ACCENT),
            use_container_width=True,
        )

    # Target donation calculator section
    st.divider()
    st.markdown("### Calculate a target donation")

    reduction_amount = st.number_input(
        "How much would you like to reduce your net income by? ($)",
        min_value=0,
        max_value=income,
        value=min(5000, income),
        step=1000,
        help="Enter the amount you'd like to reduce your net income",
    )

    if st.button("Calculate required donation", type="primary"):
        # Calculate required donation amount
        # Calculate net income change at each donation point
        # Net income = Baseline income - Donation amount + Tax savings from donation
        df["net_income"] = (
            baseline_net_income
            - df["charitable_cash_donations"]
            - df["income_tax_after_donations"]
        )
        df["net_income_change"] = baseline_net_income - df["net_income"]

        # Find where net income reduction matches target
        idx = (df["net_income_change"] - reduction_amount).abs().idxmin()
        required_donation = df.loc[idx, "charitable_cash_donations"]

        # If we couldn't reduce by enough, set to max possible
        if df.loc[idx, "net_income_change"] < reduction_amount:
            required_donation = max(df["charitable_cash_donations"])

        st.markdown(
            f"""
    <h4 style="font-family: Roboto; font-weight: normal;">
        To reduce your net income by 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">${reduction_amount:,.0f}</span>, 
        donate 
        <span style="color: {TEAL_ACCENT}; font-weight: bold;">${required_donation:,.0f}</span>
    </h4>
    """,
            unsafe_allow_html=True,
        )

    # Display tax program information
    st.divider()
    display_tax_programs(config, state)

    # Display notes
    render_notes()
    render_policyengine_donate()


if __name__ == "__main__":
    main()
