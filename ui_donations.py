# ui_donations.py
import streamlit as st

TEAL_ACCENT = "#39C6C0"


def render_initial_donation(income):
    return st.number_input(
        "How much would you like to donate? ($)",
        min_value=0,
        max_value=income,
        value=min(10000, income),
        step=1000,
        help="Enter the amount of cash donations you plan to make to charity",
    )


def render_reduction_inputs():
    st.markdown(
        "### Would you like to calculate how much to give in order to reduce your net income by a certain amount?"
    )

    reduction_type = st.radio(
        "Choose reduction type:",
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
        )
    else:
        reduction = st.number_input(
            "Desired reduction in net income ($)",
            min_value=0,
            max_value=1000000,
            value=10000,
            step=1000,
        )

    return reduction_type, reduction
