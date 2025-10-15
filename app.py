import streamlit as st
from givecalc import (
    load_config,
    TEAL_ACCENT,
    MARGIN,
    create_situation,
    calculate_donation_metrics,
    calculate_donation_effects,
)
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
from ui.tax_info import display_tax_programs


@st.cache_data(show_spinner=False)
def cached_calculate_effects(
    income, is_married, state_code, in_nyc, num_children,
    mortgage_interest, real_estate_taxes, medical_expenses, casualty_loss,
    donation_amount
):
    """Cache expensive calculations to improve performance."""
    situation = create_situation(
        income,
        is_married=is_married,
        state_code=state_code,
        in_nyc=in_nyc,
        num_children=num_children,
        mortgage_interest=mortgage_interest,
        real_estate_taxes=real_estate_taxes,
        medical_out_of_pocket_expenses=medical_expenses,
        casualty_loss=casualty_loss,
    )

    baseline_metrics = calculate_donation_metrics(situation, donation_amount=0)
    current_metrics = calculate_donation_metrics(situation, donation_amount)
    plus100_metrics = calculate_donation_metrics(situation, donation_amount + MARGIN)
    df = calculate_donation_effects(situation)

    return situation, baseline_metrics, current_metrics, plus100_metrics, df


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

    # Load configuration
    config = load_config()


    # Sidebar for all inputs wrapped in form
    with st.sidebar:
        with st.form(key="input_form"):
            st.header("📋 Your Information")

            state, in_nyc = render_state_selector(config["states"])
            income = render_income_input()
            is_married, num_children = render_personal_info()
            deductions = render_itemized_deductions()

            st.divider()

            # Mode selection
            calc_mode = st.radio(
                "Calculation mode:",
                options=["Enter donation amount", "Target net income reduction"],
                help="Choose how you want to calculate",
            )

            if calc_mode == "Enter donation amount":
                donation_amount = st.number_input(
                    "How much would you like to donate? ($)",
                    min_value=0,
                    max_value=income,
                    value=min(1000, income),
                    step=100,
                    help="Enter the amount of cash donations you plan to make to charity",
                )
                # Validate donation amount
                if donation_amount > income:
                    st.warning("⚠️ Donation exceeds income. Results may not be realistic.")

                donation_in_mind = False
                reduction_amount = None
                reduction_type = None
            else:
                # Target reduction mode
                st.caption("Find the donation needed to achieve your target reduction")

                reduction_type = st.radio(
                    "Reduce by:",
                    options=["Percentage", "Dollar amount"],
                    horizontal=True,
                    index=0,
                )

                if reduction_type == "Percentage":
                    reduction_amount = st.slider(
                        "Target reduction (%):",
                        min_value=0.0,
                        max_value=50.0,
                        value=10.0,
                        step=0.5,
                        format="%.1f%%",
                    )
                else:
                    reduction_amount = st.number_input(
                        "Target reduction ($):",
                        min_value=0,
                        max_value=int(income),
                        value=min(10000, int(income * 0.1)),
                        step=1000,
                        format="%d",
                    )

                donation_in_mind = True
                # Set a default donation amount for the calculations
                donation_amount = min(1000, income)

            st.divider()

            # Form submit button
            calculate_clicked = st.form_submit_button(
                "🧮 Calculate",
                type="primary",
                use_container_width=True,
            )

    # Show results when form is submitted
    if calculate_clicked:
        with st.spinner("🧮 Calculating your tax implications..."):
            # Use cached calculations for better performance
            (
                situation,
                baseline_metrics,
                current_donation_metrics,
                current_donation_plus100_metrics,
                df,
            ) = cached_calculate_effects(
                income,
                is_married,
                state,
                in_nyc,
                num_children,
                deductions["mortgage_interest"],
                deductions["real_estate_taxes"],
                deductions["medical_out_of_pocket_expenses"],
                deductions["casualty_loss"],
                donation_amount,
            )

        # Render main sections
        render_tax_results(
            df,
            baseline_metrics,
            income,
            donation_amount,
            current_donation_metrics,
            current_donation_plus100_metrics,
        )

        if donation_in_mind and reduction_amount is not None:
            with st.spinner("🎯 Finding your target donation amount..."):
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
