# ui_donations.py
import streamlit as st
from constants import TEAL_ACCENT


def render_initial_donation(income):
    """Renders the initial donation input field."""
    return st.number_input(
        "How much would you like to donate? ($)",
        min_value=0,
        max_value=income,
        value=min(10000, income),
        step=1000,
        help="Enter the amount of cash donations you plan to make to charity",
    )


def render_reduction_goal():
    """Renders inputs for the desired reduction in net income."""
    reduction_type = st.radio(
        "How would you like to reduce your net income?",
        ["Percentage", "Dollar amount"],
        horizontal=True,
    )

    if reduction_type == "Percentage":
        reduction = st.number_input(
            "Desired reduction in net income (%)",
            min_value=0.0,
            max_value=100.0,
            value=10.0,
            step=0.1,
            help="Enter the percentage by which you'd like to reduce your net income",
        )
    else:
        reduction = st.number_input(
            "Desired reduction in net income ($)",
            min_value=0,
            max_value=1000000,
            value=10000,
            step=1000,
            help="Enter the dollar amount by which you'd like to reduce your net income",
        )

    return reduction_type, reduction


def render_policyengine_donate():
    """Renders the PolicyEngine donation footer."""
    st.divider()
    st.markdown(
        f"<div style='text-align: center; padding: 20px;'>"
        f"<p><em>GiveCalc is a free tool from PolicyEngine.<br>"
        f"<a href='https://policyengine.org/us/donate' target='_blank' style='color: {TEAL_ACCENT};'>"
        f"Support our work with a tax-deductible donation</a>.</em></p>"
        "</div>",
        unsafe_allow_html=True,
    )
