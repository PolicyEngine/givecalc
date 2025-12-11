"""UK-specific constants for GiveCalc."""

# Current UK tax year (2024/25 tax year - use 2025 as PolicyEngine convention)
UK_CURRENT_YEAR = 2025

# Default adult age
UK_DEFAULT_AGE = 30

# UK regions (from PolicyEngine-UK Region enum)
# Note: "England" is split into multiple regions in PolicyEngine-UK
UK_REGIONS = [
    "NORTH_EAST",
    "NORTH_WEST",
    "YORKSHIRE",
    "EAST_MIDLANDS",
    "WEST_MIDLANDS",
    "EAST_OF_ENGLAND",
    "LONDON",
    "SOUTH_EAST",
    "SOUTH_WEST",
    "WALES",
    "SCOTLAND",
    "NORTHERN_IRELAND",
]

# England regions (for grouping in UI)
ENGLAND_REGIONS = [
    "NORTH_EAST",
    "NORTH_WEST",
    "YORKSHIRE",
    "EAST_MIDLANDS",
    "WEST_MIDLANDS",
    "EAST_OF_ENGLAND",
    "LONDON",
    "SOUTH_EAST",
    "SOUTH_WEST",
]

# Default region (London as default for England)
UK_DEFAULT_REGION = "LONDON"

# PolicyEngine-UK color scheme (same as US for consistency)
TEAL_ACCENT = "#39C6C0"
BLUE_PRIMARY = "#2C6496"
