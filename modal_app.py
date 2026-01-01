"""Modal app for GiveCalc - serves the entire FastAPI backend.

Deploy with: modal deploy modal_app.py
This serves the full API on Modal, no GCP needed.
"""

import modal

# Create Modal image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "policyengine-us>=1.155.0",
        "policyengine-uk>=2.45.4",
        "numpy",
        "pandas",
        "scipy",
        "fastapi>=0.124.2",
        "pyyaml",
    )
    .env({"NUMEXPR_MAX_THREADS": "4", "USE_MODAL": "false"})
    .copy_local_file("config.yaml", "/root/config.yaml")
    .copy_local_dir("givecalc", "/root/givecalc")
    .copy_local_dir("api", "/root/api")
    .workdir("/root")
)

app = modal.App("givecalc")


@app.function(
    image=image,
    timeout=300,
    keep_warm=1,
    memory=2048,
    allow_concurrent_inputs=100,
)
@modal.asgi_app()
def fastapi_app():
    """Serve the FastAPI app on Modal."""
    from api.main import app as api

    return api
