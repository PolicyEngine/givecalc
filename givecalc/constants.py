try:
    from importlib.metadata import version, PackageNotFoundError
except ImportError:
    from importlib_metadata import version, PackageNotFoundError

# Get PolicyEngine-US version
try:
    PE_VERSION = version("policyengine-us")
except PackageNotFoundError:
    PE_VERSION = "unknown"

CURRENT_YEAR = 2025  # Year for all calculations
BLUE_PRIMARY = "#2C6496"  # Chart color
TEAL_ACCENT = "#39C6C0"  # Text highlight color
DEFAULT_AGE = 30  # Default age for all calculations
MARGIN = 100  # Margin for all calculations
