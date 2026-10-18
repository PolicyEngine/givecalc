"""Modal app for GiveCalc - serves the entire FastAPI backend.

Deploy with: modal deploy modal_app.py
This serves the full API on Modal, no GCP needed.

The PolicyEngine versions are pinned to the ones in uv.lock. Modal caches
the pip layer, so an unpinned requirement silently keeps whatever version
was newest when the layer was first built. Bump these pins (and uv.lock)
in a PR to move the deployed model.

Simulations run in SIMULATION_WORKERS processes (api.simulations), so a
request's simulations run at once and concurrent requests do not queue on
one GIL. Modal lets a container use more CPU than it requests and bills
the higher of request and use (modal.com/docs/guide/resources). Measured on
Modal, 2026-10-16: four processes each ran at 85% of one process's speed,
and the container used 6.6-7.5 GiB, flat across 144 UK simulations. Until
the workers are up (about 1.5 minutes after a cold start), simulations run
in the request's thread.

A cold start takes about a minute, so an answer in a few seconds needs a
warm container (``min_containers``). Max's call (d1650, 2026-10-18): keep one
container warm in giving season only, 15 November to 31 December, about $180
at Modal's list price. Modal resets ``min_containers`` to the decorator's
value on every deploy (``Function.update_autoscaler``), so the decorator reads
the season at deploy time and an hourly schedule re-applies it, which also
switches it on and off at the season's edges.
"""

from datetime import date, datetime, timezone

import modal

SIMULATION_WORKERS = 4


def warm_containers(day: date) -> int:
    """Containers to keep warm on ``day``: 1 from 15 Nov to 31 Dec, else 0."""
    in_season = (day.month == 11 and day.day >= 15) or day.month == 12
    return 1 if in_season else 0


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
        "pydantic==2.12.5",
        "pyyaml==6.0.3",
    )
    .env(
        {
            "NUMEXPR_MAX_THREADS": "4",
            # One household's arrays are tiny; thread pools only add
            # overhead, and threads must not be running when workers fork.
            "OMP_NUM_THREADS": "1",
            "OPENBLAS_NUM_THREADS": "1",
            "MKL_NUM_THREADS": "1",
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
    memory=8192,
    # Evaluated at deploy time; set_giving_season_warmth keeps it current.
    min_containers=warm_containers(datetime.now(timezone.utc).date()),
)
# Up to eight requests share the four workers. Eight headlines are 16
# simulations, four rounds on four workers (about 10 s at the 2.3 s per
# simulation measured), against about a minute for a new container, which
# also runs without workers until its own are up.
@modal.concurrent(max_inputs=8)
@modal.asgi_app()
def fastapi_app():
    """Serve the FastAPI app on Modal."""
    import threading

    from api.simulations import start_workers

    threading.Thread(
        target=start_workers, args=(SIMULATION_WORKERS,), daemon=True
    ).start()

    from api.main import app as api

    return api


@app.function(schedule=modal.Cron("7 * * * *"), timeout=60)
def set_giving_season_warmth():
    """Hourly: keep one API container warm in giving season, none otherwise."""
    target = warm_containers(datetime.now(timezone.utc).date())
    api = modal.Function.from_name("givecalc", "fastapi_app")
    api.update_autoscaler(min_containers=target)
    print(f"min_containers={target}")
