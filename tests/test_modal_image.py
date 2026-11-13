"""The Modal image's CA lists and pip stop trusting the eMudhra roots.

The private keys of eight eMudhra (emSign) intermediate CA certificates are
recoverable (https://emudhra.we-have-a-problem.com). Modal's debian_slim
Python 3.13 base carries a Debian ca-certificates package and a pip (through
its bundled certifi) that trust their root, "emSign ECC Root CA - G3".
"""

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODAL_APP = ROOT / "modal_app.py"
BOOTSTRAP_STEP = ".run_commands(PIP_BOOTSTRAP_COMMAND)"


def pip_bootstrap_command() -> str:
    """Evaluate modal_app's PIP_BOOTSTRAP_* assignments without importing it."""
    module = ast.parse(MODAL_APP.read_text())
    assignments = [
        statement
        for statement in module.body
        if isinstance(statement, ast.Assign)
        and len(statement.targets) == 1
        and isinstance(statement.targets[0], ast.Name)
        and statement.targets[0].id.startswith("PIP_BOOTSTRAP_")
    ]
    namespace: dict = {}
    exec(
        compile(
            ast.Module(body=assignments, type_ignores=[]),
            str(MODAL_APP),
            "exec",
        ),
        namespace,
    )
    return namespace["PIP_BOOTSTRAP_COMMAND"]


def test_ca_store_and_pip_are_replaced_before_any_package_install():
    source = MODAL_APP.read_text()
    ca_certificates_upgrade = source.index('.apt_install("ca-certificates")')
    pip_bootstrap = source.index(BOOTSTRAP_STEP)
    pip_install_steps = [
        match.start()
        for match in re.finditer(r"\.pip_install(_from_\w+)?\(", source)
    ]
    certifi_install = source.index('.pip_install("certifi==')
    certifi_version = re.search(
        r'\.pip_install\("certifi==(\d+)\.(\d+)\.(\d+)"\)', source
    )

    # pip 26.2.2 verifies HTTPS against the system CA store as well as its
    # own certifi, so the store is upgraded before pip downloads anything,
    # and the base's pip downloads only the hash-pinned pip that replaces it.
    assert pip_install_steps
    assert ca_certificates_upgrade < pip_bootstrap
    assert all(pip_bootstrap < step for step in pip_install_steps)
    assert certifi_install == max(pip_install_steps)
    assert tuple(int(part) for part in certifi_version.groups()) >= (
        2026,
        10,
        19,
    )
    assert pip_bootstrap_command() == (
        "printf '%s\\n' 'pip==26.2.2 --hash=sha256:"
        "fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70'"
        " > /tmp/pip-bootstrap.txt"
        " && python -m pip install --require-hashes --no-deps"
        " -r /tmp/pip-bootstrap.txt"
        " && rm /tmp/pip-bootstrap.txt"
    )
