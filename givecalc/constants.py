from datetime import date

try:
    from importlib.metadata import PackageNotFoundError, version
except ImportError:
    from importlib_metadata import PackageNotFoundError, version

# Get PolicyEngine-US version
try:
    PE_VERSION = version("policyengine-us")
except PackageNotFoundError:
    PE_VERSION = "unknown"

CURRENT_YEAR = date.today().year

# PolicyEngine brand colors (matching policyengine-app-v2)
# Primary colors
TEAL_PRIMARY = "#319795"  # Primary brand color (teal/500)
TEAL_ACCENT = "#39C6C0"  # Legacy accent color (kept for compatibility)
BLUE_PRIMARY = "#026AA2"  # Chart color (blue/700)

# Semantic colors (from policyengine-app-v2 design system)
SUCCESS_GREEN = "#22C55E"  # Success states, positive metrics
WARNING_YELLOW = "#FEC601"  # Warning states
ERROR_RED = "#EF4444"  # Error states
INFO_BLUE = "#1890FF"  # Informational elements

# Background colors
BACKGROUND_PRIMARY = "#FFFFFF"  # Main content areas
BACKGROUND_SIDEBAR = "#F5F9FF"  # Sidebar background (light blue tint)
BACKGROUND_TERTIARY = "#F1F5F9"  # Nested backgrounds

# Border colors
BORDER_LIGHT = "#E2E8F0"  # Light border color (gray/200)

# Text colors
TEXT_PRIMARY = "#000000"  # Main content text
TEXT_SECONDARY = "#5A5A5A"  # Supporting text
TEXT_TERTIARY = "#9CA3AF"  # Muted text

DEFAULT_AGE = 30  # Default age for all calculations
MARGIN = 100  # Margin for all calculations
