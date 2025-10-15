# tax_info.py
import streamlit as st


def display_tax_programs(config, state):
    """Displays federal and state-specific tax program information."""
    with st.expander(
        "Learn about state and federal tax programs for charitable giving"
    ):
        st.markdown(f"### {config['federal_info']['title']}")
        st.markdown(config["federal_info"]["description"])

        if state in config["state_programs"]:
            state_info = config["state_programs"][state]
            st.markdown(f"### {state_info['title']}")
            st.markdown(state_info["description"])

        st.divider()
        st.markdown(
            "*You can search for IRS-qualified tax-exempt organizations using the "
            "[Tax Exempt Organization Search Tool](https://apps.irs.gov/app/eos/).*",
            help="Use this IRS tool to verify if an organization is eligible to receive tax-deductible donations",
        )
