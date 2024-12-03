# ui_basic.py
import streamlit as st
from constants import PE_VERSION, CURRENT_YEAR


def render_intro():
    st.title("Charity Donation Calculator")
    st.markdown(
        f"""
    This calculator shows how charitable giving affects your taxes and net income in {CURRENT_YEAR}. 
    It estimates both your immediate tax savings and the impact on your overall financial position.
    """
    )
    st.divider()


def render_notes():
    st.divider()
    st.markdown(
        f"""
    **Notes:**
    - All income is assumed to be from employment (wages and salaries)
    - All children are assumed to be under 17
    - All donations are assumed to be cash donations to qualified charities
    - Calculations use PolicyEngine US version {PE_VERSION}
    """
    )


def render_state_selector(states, config):
    state = st.selectbox("Select your state", options=states)
    if state in config["state_programs"]:
        st.info(
            f"**{config['state_programs'][state]['title']}**\n\n"
            f"{config['state_programs'][state]['description']}"
        )
    return state


def render_income_input():
    return st.number_input(
        f"{CURRENT_YEAR} annual employment income ($)",
        min_value=0,
        max_value=1000000,
        value=50000,
        step=1000,
        help="Enter your total employment income (wages and salaries) before taxes",
    )


def render_personal_info():
    is_married = st.checkbox("Are you married?")
    num_children = st.number_input(
        "Number of children under 17",
        min_value=0,
        max_value=10,
        value=0,
        step=1,
        help="Enter the number of dependent children under 17",
    )
    return is_married, num_children


def render_itemized_deductions():
    with st.expander("Sources for other itemized deductions", expanded=False):
        st.markdown("Enter your itemized deductions below:")

        deductions = {
            "mortgage_interest": st.number_input(
                "Annual mortgage interest ($)",
                min_value=0,
                max_value=100000,
                value=0,
                step=1000,
                help="Interest paid on your primary residence mortgage",
            ),
            "real_estate_taxes": st.number_input(
                "Annual real estate taxes ($)",
                min_value=0,
                max_value=50000,
                value=0,
                step=500,
                help="Property taxes paid on your residence",
            ),
            "medical_out_of_pocket_expenses": st.number_input(
                "Annual medical out-of-pocket expenses ($)",
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
