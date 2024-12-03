# ui_results.py
import streamlit as st

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
