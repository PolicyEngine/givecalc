"""Modal app for GiveCalc - serves the entire FastAPI backend.

Deploy with: modal deploy modal_app.py
This serves the full API on Modal, no GCP needed.

The PolicyEngine versions are pinned to the ones in uv.lock. Modal caches
the pip layer, so an unpinned requirement silently keeps whatever version
was newest when the layer was first built. Bump these pins (and uv.lock)
in a PR to move the deployed model.
"""

import modal

# Create Modal image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.13")
    .pip_install(
        "policyengine-us==2.49.2",
        "policyengine-uk==2.134.6",
        "policyengine-core==3.33.4",
        "numpy==2.1.3",
        "pandas==3.0.6",
        "scipy==1.16.2",
        "fastapi==0.124.2",
        "pyyaml==6.0.3",
    )
    .env(
        {
            "NUMEXPR_MAX_THREADS": "4",
            "USE_MODAL": "false",
            "PYTHONPATH": "/root",
        }
    )
    .workdir("/root")
    .add_local_file("config.yaml", "/root/config.yaml")
    .add_local_dir("givecalc", "/root/givecalc")
    .add_local_dir("api", "/root/api")
)

app = modal.App("givecalc")


@app.function(
    image=image,
    timeout=300,
    cpu=2.0,
    memory=4096,
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def fastapi_app():
    """Serve the FastAPI app on Modal."""
    from api.main import app as api

    return api
