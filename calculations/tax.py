import numpy as np
import pandas as pd
from policyengine_us import Simulation
from constants import CURRENT_YEAR
from donation_simulation import create_donation_simulation

import sys
from io import StringIO


def write_debug_trace(
    simulation, year, variable, output_file="debug_trace.txt"
):
    """
    Writes the computation trace to a file for debugging.

    Parameters:
    simulation: PolicyEngine simulation object
    year: int, year to compute for
    variable: str, variable to compute
    output_file: str, path to output file
    """
    # Enable tracing
    simulation.trace = True

    # Calculate the variable
    simulation.calculate(variable, year)

    # Capture stdout during print_computation_log
    old_stdout = sys.stdout
    string_buffer = StringIO()
    sys.stdout = string_buffer

    # Print to our captured buffer
    simulation.tracer.print_computation_log()

    # Restore stdout
    sys.stdout = old_stdout

    # Get the captured output
    trace_output = string_buffer.getvalue()

    # Write to file
    with open(output_file, "w") as f:
        f.write(f"Debug trace for {variable} in {year}\n")
        f.write("=" * 80 + "\n\n")
        f.write(trace_output)

    print(f"Debug trace written to {output_file}")


def calculate_donation_metrics(situation, donation_amount):
    """
    Calculate baseline metrics with specified donation.

    Args:
        situation (dict): Base situation dictionary
        donation_amount (float): Donation amount

    Returns:
        dict: Dictionary containing baseline metrics
    """
    baseline_simulation = create_donation_simulation(
        situation=situation, donation_amount=donation_amount
    )
    DEBUG = True
    if DEBUG and donation_amount == 60_000:
        write_debug_trace(
            baseline_simulation,
            2024,
            "federal_state_income_tax",
            "ctc_debug_trace.txt",
        )
    return {
        "baseline_income_tax": baseline_simulation.calculate(
            "federal_state_income_tax", CURRENT_YEAR, map_to="household"
        ),
        "baseline_net_income": baseline_simulation.calculate(
            "household_net_income", CURRENT_YEAR, map_to="household"
        ),
    }


def calculate_donation_effects(situation):
    """
    Calculate the effects of varying donation amounts.

    Args:
        situation (dict): Base situation dictionary

    Returns:
        pandas.DataFrame: DataFrame containing donation effects
    """
    simulation = Simulation(situation=situation)
    # Note: We add this as a column to enable non-cash donations in the future.
    donation_column = "charitable_cash_donations"
    donations = simulation.calculate(donation_column, map_to="household")
    income_tax_by_donation = simulation.calculate(
        "federal_state_income_tax", map_to="household"
    )

    return create_donation_dataframe(
        donations, income_tax_by_donation, donation_column
    )


def create_donation_dataframe(
    donations, income_tax_by_donation, donation_column
):
    """
    Create a DataFrame with donation effects analysis.

    Args:
        donations (numpy.ndarray): Array of donation amounts
        income_tax_by_donation (numpy.ndarray): Array of income tax amounts
        donation_column (str): Name of donation column

    Returns:
        pandas.DataFrame: DataFrame with analysis results
    """
    df = pd.DataFrame(
        {
            donation_column: donations,
            "income_tax": income_tax_by_donation,
        }
    )

    df["income_tax_after_donations"] = df.income_tax
    df["marginal_savings"] = -np.gradient(
        df.income_tax_after_donations
    ) / np.gradient(df[donation_column])

    return df
