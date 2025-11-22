import streamlit as st

from givecalc import (
    BACKGROUND_SIDEBAR,
    BORDER_LIGHT,
    MARGIN,
    TEAL_ACCENT,
    TEAL_PRIMARY,
    add_net_income_columns,
    calculate_donation_effects,
    calculate_donation_metrics,
    calculate_target_donation,
    create_situation,
    load_config,
)
from ui.basic import (
    render_income_input,
    render_itemized_deductions,
    render_notes,
    render_personal_info,
    render_state_selector,
)
from ui.donations import render_initial_donation, render_policyengine_donate
from ui.target_donation import render_target_donation_section
from ui.tax_info import display_tax_programs
from ui.tax_results import render_tax_results


@st.cache_data(show_spinner=False)
def cached_calculate_effects(
    income,
    is_married,
    state_code,
    in_nyc,
    num_children,
    mortgage_interest,
    real_estate_taxes,
    medical_expenses,
    casualty_loss,
    donation_amount,
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
    plus100_metrics = calculate_donation_metrics(
        situation, donation_amount + MARGIN
    )
    df = calculate_donation_effects(situation)

    return situation, baseline_metrics, current_metrics, plus100_metrics, df


def main():
    st.set_page_config(page_title="GiveCalc", page_icon="💝")

    # Inject custom CSS with Inter font (PolicyEngine standard)
    st.markdown(
        """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        html, body, [class*="css"] {
            font-family: 'Inter', sans-serif;
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
    <h1 style="font-family: Inter;">
        <span style="color: {TEAL_PRIMARY}; font-weight: bold;">Give</span><span style="color: {TEAL_PRIMARY}; font-weight: normal;">Calc</span>
        <span style="color: #9CA3AF; font-weight: normal;"> by PolicyEngine</span>
    </h1>
    """,
        unsafe_allow_html=True,
    )
    st.markdown(
        f"Calculate how charitable giving affects your taxes. [Read our explainer to learn more.](https://policyengine.org/us/research/givecalc)"
    )

    # Load configuration
    config = load_config()

    # Sidebar for all inputs
    with st.sidebar:
        st.header("📋 Your Information")

        # Basic info section
        state, in_nyc = render_state_selector(config["states"])
        income = render_income_input()
        is_married, num_children = render_personal_info()
        deductions = render_itemized_deductions()

        # Mode selection - updates immediately
        calc_mode = st.radio(
            "How much would you like to donate?",
            options=[
                "I have an amount in mind",
                "I have a net income reduction target in mind",
            ],
            help="Choose whether you want to enter a specific donation amount or find the donation needed to achieve a target reduction in net income",
        )

        # Donation inputs based on mode
        if calc_mode == "I have an amount in mind":
            donation_amount = st.number_input(
                "Donation amount ($)",
                min_value=0,
                max_value=income,
                value=min(1000, income),
                step=100,
                help="Enter the amount of cash donations you plan to make to charity",
            )
            # Validate donation amount
            if donation_amount > income:
                st.warning(
                    "⚠️ Donation exceeds income. Results may not be realistic."
                )

            donation_in_mind = False
            reduction_amount = None
            reduction_type = None
        else:
            # Target reduction mode
            st.caption(
                "Find the donation needed to achieve your target reduction"
            )

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

        # Calculate button
        calculate_clicked = st.button(
            "🧮 Calculate",
            type="primary",
            use_container_width=True,
        )

    # Show results when form is submitted
    if not calculate_clicked:
        # Show instructions when no calculation has been done
        st.info(
            "👈 **Enter your information in the sidebar and click Calculate to see how charitable donations affect your taxes.**"
        )
    else:
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

        # If in target mode, calculate the required donation first
        if donation_in_mind and reduction_amount is not None:
            with st.spinner("🎯 Finding your target donation amount..."):
                df_with_net = add_net_income_columns(df, baseline_metrics)
                (
                    required_donation,
                    required_donation_net_income,
                    actual_reduction,
                    actual_percentage,
                ) = calculate_target_donation(
                    situation,
                    df_with_net,
                    baseline_metrics,
                    reduction_amount,
                    is_percentage=(reduction_type == "Percentage"),
                )

                # Use the target donation as the main donation amount
                donation_amount = required_donation

                # Recalculate metrics for the target donation
                current_donation_metrics = calculate_donation_metrics(
                    situation, donation_amount
                )
                current_donation_plus100_metrics = calculate_donation_metrics(
                    situation, donation_amount + MARGIN
                )

                # Show target donation section at the top
                render_target_donation_section(
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
                )

        # Render tax results
        render_tax_results(
            df,
            baseline_metrics,
            income,
            donation_amount,
            current_donation_metrics,
            current_donation_plus100_metrics,
        )

        # Display tax program information
        st.divider()
        display_tax_programs(config, state)

        # Display notes
        render_notes()
        render_policyengine_donate()


if __name__ == "__main__":
    main()
