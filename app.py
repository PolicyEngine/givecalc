# main.py
import streamlit as st
from config import load_config
from constants import CURRENT_YEAR
from ui_basic import (
    render_intro,
    render_state_selector,
    render_income_input,
    render_personal_info,
    render_itemized_deductions,
    render_notes,
)
from ui_donations import render_initial_donation
from ui_results import display_giving_results, display_net_income_text
from calculations import calculate_baseline_metrics, calculate_donation_effects
from visualization import (
    create_tax_plot,
    create_marginal_cost_plot,
    create_net_income_plot,
)
from tax_info import display_tax_programs
from situation import create_situation
from donation_simulation import create_donation_simulation
from policyengine_us import Simulation


def main():
    render_intro()

    # Load configuration
    config = load_config()

    # Render UI components
    state = render_state_selector(config["states"], config)
    income = render_income_input()
    is_married, num_children = render_personal_info()
    deductions = render_itemized_deductions()
    donation_amount = render_initial_donation(income)

    if st.button("Calculate"):
        # Create baseline situation and calculate metrics
        situation = create_situation(
            income,
            is_married=is_married,
            state_code=state,
            num_children=num_children,
            **deductions
        )

        # Calculate baseline metrics
        baseline_simulation = Simulation(situation=situation)
        baseline_income_tax = baseline_simulation.calculate(
            "federal_state_income_tax"
        )[0]
        baseline_net_income = baseline_simulation.calculate(
            "household_net_income", CURRENT_YEAR
        )[0]

        # Calculate tax with donation directly
        donation_simulation = create_donation_simulation(
            situation, donation_amount
        )
        tax_with_donation = donation_simulation.calculate(
            "federal_state_income_tax"
        )[0]
        tax_reduction = baseline_income_tax - tax_with_donation

        # Generate data for charts and marginal cost
        df = calculate_donation_effects(situation, income)
        donation_idx = (
            (df["charitable_cash_donations"] - donation_amount).abs().idxmin()
        )
        marginal_cost = df.loc[donation_idx, "marginal_cost"]

        # Display initial analysis
        display_giving_results(
            donation_amount=donation_amount,
            tax_reduction=tax_reduction,
            marginal_cost=marginal_cost,
        )

        # Show tax impact chart
        tax_plot = create_tax_plot(df, income, state, donation_amount)
        st.plotly_chart(tax_plot)

        # Show marginal giving discount chart
        marginal_plot, _ = create_marginal_cost_plot(
            df, donation_amount
        )  # We already have marginal_cost
        st.plotly_chart(marginal_plot)

        # Show net income analysis
        display_net_income_text()
        net_income_plot = create_net_income_plot(
            baseline_net_income, df, donation_amount
        )
        st.plotly_chart(net_income_plot)

    # Display tax program information
    st.divider()
    display_tax_programs(config, state)

    # Display notes
    render_notes()


if __name__ == "__main__":
    main()
