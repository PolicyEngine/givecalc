"""The Modal image must install exactly the versions uv.lock pins.

CI tests the locked environment (``uv sync --locked``), and Modal caches its
image layers, so a pin that drifts from uv.lock deploys an untested version.
"""

import ast
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Packages the API imports directly, which must be pinned in the image.
REQUIRED = {
    "policyengine-us",
    "policyengine-uk",
    "policyengine-core",
    "numpy",
    "pandas",
    "scipy",
    "fastapi",
    "pydantic",
    "pyyaml",
}


def modal_pins() -> dict[str, str]:
    tree = ast.parse((ROOT / "modal_app.py").read_text())
    pins = {}
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "pip_install"
        ):
            for arg in node.args:
                match = re.fullmatch(r"([A-Za-z0-9_.-]+)==(\S+)", arg.value)
                assert match, f"unpinned in modal_app.py: {arg.value}"
                pins[match[1].lower()] = match[2]
    return pins


def locked_versions() -> dict[str, str]:
    lock = tomllib.loads((ROOT / "uv.lock").read_text())
    return {package["name"]: package["version"] for package in lock["package"]}


def test_modal_image_pins_match_uv_lock():
    pins = modal_pins()
    locked = locked_versions()
    assert REQUIRED <= set(pins), REQUIRED - set(pins)
    for name, version in pins.items():
        assert locked.get(name) == version, (name, version, locked.get(name))
