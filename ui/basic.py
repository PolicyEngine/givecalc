# ui_basic.py
import streamlit as st
from constants import PE_VERSION, CURRENT_YEAR, TEAL_ACCENT


def render_intro():
    st.title("GiveCalc")
    st.markdown("*by [PolicyEngine](https://policyengine.org)*")
    st.markdown(
        f"""
        Calculate how charitable giving affects your taxes in {CURRENT_YEAR}. 
        Enter your information below to see your tax savings and the cost of giving more.
        """
    )
    st.divider()


def render_notes():
    with st.expander("See notes and assumptions", expanded=False):
        st.markdown(
            f"""
            **Notes:**
            - Calculations use PolicyEngine US version {PE_VERSION}

            **Assumptions:**
            - All income comes from the primary taxpayer's wages, salaries, and tips
            - All children are under 17
            - All donations are cash
            """
        )


def render_state_selector(states, config):
    """Renders the state selector dropdown with information about state programs."""
    state = st.selectbox("What state do you live in?", options=states)
    if state in config["state_programs"]:
        st.info(
            f"**{config['state_programs'][state]['title']}**\n\n"
            f"{config['state_programs'][state]['description']}"
        )
    return state


def render_income_input():
    return st.number_input(
        f"How much did you earn in {CURRENT_YEAR}?",
        min_value=0,
        max_value=1_000_000,
        value=50_000,
        step=1_000,
        help="Enter your total employment income (wages and salaries) before taxes",
    )


def render_personal_info():
    is_married = st.checkbox("Are you married?")
    num_children = st.number_input(
        "How many children under 17 do you have?",
        min_value=0,
        max_value=10,
        value=0,
        step=1,
        help="Enter the number of dependent children under 17",
    )
    return is_married, num_children


def render_itemized_deductions():
    with st.expander("Sources for other itemized deductions", expanded=False):
        deductions = {
            "mortgage_interest": st.number_input(
                "Mortgage interest ($)",
                min_value=0,
                max_value=100000,
                value=0,
                step=1000,
                help="Interest paid on your primary residence mortgage",
            ),
            "real_estate_taxes": st.number_input(
                "Real estate taxes ($)",
                min_value=0,
                max_value=50000,
                value=0,
                step=500,
                help="Property taxes paid on your residence",
            ),
            "medical_out_of_pocket_expenses": st.number_input(
                "Medical out-of-pocket expenses ($)",
                min_value=0,
                max_value=100000,
                value=0,
                step=500,
                help="Medical expenses not reimbursed by insurance",
            ),
            "casualty_loss": st.number_input(
                "Casualty and theft losses ($)",
                min_value=0,
                max_value=100000,
                value=0,
                step=500,
                help="Losses from federally declared disasters",
            ),
        }
        return deductions
