import pkg_resources

# Get PolicyEngine-US version
try:
    PE_VERSION = pkg_resources.get_distribution("policyengine-us").version
except pkg_resources.DistributionNotFound:
    PE_VERSION = "unknown"

CURRENT_YEAR = 2024  # Year for all calculations
BLUE_PRIMARY = "#2C6496"  # Chart color
TEAL_ACCENT = "#39C6C0"  # Text highlight color
DEFAULT_AGE = 30  # Default age for all calculations
