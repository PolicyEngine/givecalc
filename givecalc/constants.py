try:
    from importlib.metadata import PackageNotFoundError, version
except ImportError:
    from importlib_metadata import PackageNotFoundError, version

# Get PolicyEngine-US version
try:
    PE_VERSION = version("policyengine-us")
except PackageNotFoundError:
    PE_VERSION = "unknown"

CURRENT_YEAR = 2025  # Year for all calculations

# PolicyEngine brand colors (matching policyengine-app-v2)
TEAL_PRIMARY = "#319795"  # Primary brand color (teal/500)
TEAL_ACCENT = "#39C6C0"  # Legacy accent color (kept for compatibility)
BLUE_PRIMARY = "#026AA2"  # Chart color (blue/700)
BACKGROUND_SIDEBAR = "#F5F9FF"  # Sidebar background
BORDER_LIGHT = "#E2E8F0"  # Light border color (gray/200)
TEXT_PRIMARY = "#000000"  # Primary text color

DEFAULT_AGE = 30  # Default age for all calculations
MARGIN = 100  # Margin for all calculations
