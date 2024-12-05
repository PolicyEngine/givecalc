import streamlit as st
from config import load_config
from constants import TEAL_ACCENT, MARGIN
from ui.basic import (
    render_state_selector,
    render_income_input,
    render_personal_info,
    render_itemized_deductions,
    render_notes,
)
from ui.donations import render_initial_donation, render_policyengine_donate
from ui.tax_results import render_tax_results
from ui.target_donation import render_target_donation_section
from calculations.tax import (
    calculate_donation_metrics,
    calculate_donation_effects,
)
from tax_info import display_tax_programs
from situation import create_situation


def main():
    st.set_page_config(page_title="GiveCalc", page_icon="💝")

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
        <span style="color: #BDBDBD; font-weight: normal;"> by PolicyEngine</span>
    </h1>
    """,
        unsafe_allow_html=True,
    )
    st.markdown(
        f"Calculate how charitable giving affects your taxes. [Read our explainer to learn more.](https://policyengine.org/us/research/givecalc)"
    )
    st.divider()

    # Load configuration
    config = load_config()

    # Basic information
    state, in_nyc = render_state_selector(config["states"])
    income = render_income_input()
    is_married, num_children = render_personal_info()
    deductions = render_itemized_deductions()
    donation_amount = render_initial_donation(income)

    donation_in_mind = st.checkbox(
        "Would you like to target a donation level based on net income reduction?"
    )

    if donation_in_mind:
        st.expander("Calculate a target donation")
        # Add radio button for percentage vs dollar amount
        reduction_type = st.radio(
            "How would you like to reduce your net income?",
            options=["Percentage", "Dollar amount"],
            horizontal=True,
            index=0,  # Default to percentage
        )

        # Condensed input field for reduction amount with one decimal point
        reduction_amount = st.number_input(
            f"Enter reduction amount ({'%' if reduction_type == 'Percentage' else '$'}):",
            min_value=0.0,  # Always use float for min_value
            max_value=(
                100.0 if reduction_type == "Percentage" else float(income)
            ),  # Convert income to float
            value=(
                10.0 if reduction_type == "Percentage" else float(min(1000, income))
            ),  # Convert to float
            step=(
                0.1 if reduction_type == "Percentage" else 100.0
            ),  # Use float for step values
            format="%.1f",  # Consistent format for both cases
            help=f"Enter the reduction in {'percentage' if reduction_type == 'Percentage' else 'dollars'}.",
        )

    if st.button("Calculate tax implications", type="primary"):

        # Calculate baseline metrics once
        situation = create_situation(
            income,
            is_married=is_married,
            state_code=state,
            in_nyc=in_nyc,
            num_children=num_children,
            **deductions,
        )
        baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
        current_donation_metrics = calculate_donation_metrics(
            situation, donation_amount
        )
        current_donation_plus100_metrics = calculate_donation_metrics(
            situation, donation_amount + MARGIN
        )
        df = calculate_donation_effects(situation)
        # Render main sections
        render_tax_results(
            df,
            baseline_metrics,
            income,
            donation_amount,
            current_donation_metrics,
            current_donation_plus100_metrics,
        )
        if donation_in_mind:
            render_target_donation_section(
                df,
                baseline_metrics,
                income,
                donation_amount,
                current_donation_metrics,
                situation,
                reduction_amount,
                reduction_type,
            )

        # Display tax program information
        st.divider()
        display_tax_programs(config, state)

        # Display notes
        render_notes()
        render_policyengine_donate()


if __name__ == "__main__":
    main()
