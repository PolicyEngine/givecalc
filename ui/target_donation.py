import streamlit as st
from visualization import create_net_income_plot
from calculations.net_income import add_net_income_columns
from calculations.donations import calculate_target_donation


def render_target_donation_section(
    df, baseline_metrics, income, donation_amount, accent_color
):
    """Render the target donation calculator section."""
    st.divider()
    st.markdown("### Calculate a target donation")

    # Add radio button for percentage vs dollar amount
    reduction_type = st.radio(
        "How would you like to reduce your net income?",
        options=["Percentage", "Dollar amount"],
        horizontal=True,
        index=0,  # Default to percentage
    )

    # Condensed input field for reduction amount
    reduction_amount = st.number_input(
        f"Enter reduction amount ({'%' if reduction_type == 'Percentage' else '$'}):",
        min_value=0.0 if reduction_type == "Percentage" else 0,
        max_value=100.0 if reduction_type == "Percentage" else income,
        value=10.0 if reduction_type == "Percentage" else min(5000, income),
        step=0.1 if reduction_type == "Percentage" else 1000,
        help=f"Enter the reduction in {'percentage' if reduction_type == 'Percentage' else 'dollars'}.",
    )

    if st.button("Calculate required donation", type="primary"):
        # Add net income calculations to DataFrame
        df_with_net = add_net_income_columns(df, baseline_metrics)

        required_donation, actual_reduction, actual_percentage = (
            calculate_target_donation(
                df_with_net,
                baseline_metrics,
                reduction_amount,
                is_percentage=(reduction_type == "Percentage"),
            )
        )

        # Display results
        target_text = (
            f"{reduction_amount:.1f}%"
            if reduction_type == "Percentage"
            else f"${reduction_amount:,.0f}"
        )

        st.markdown(
            f"""
    <h4 style="font-family: Roboto; font-weight: normal;">
        To reduce your net income by 
        <span style="color: {accent_color}; font-weight: bold;">{target_text}</span>, 
        donate 
        <span style="color: {accent_color}; font-weight: bold;">${required_donation:,.0f}</span>
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
                df_with_net, donation_amount, required_donation, accent_color
            ),
            use_container_width=True,
        )
