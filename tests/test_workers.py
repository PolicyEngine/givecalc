"""Simulation workers must return exactly what an in-thread run returns.

Differential: the same households run through worker processes and in the
calling thread give equal results. A worker that dies is replaced, and the
request it was serving still gets its answer.
"""

import os
import signal

import pytest

from api import simulations
from api.simulations import (
    _run_curve,
    _run_point,
    clear_caches,
    donation_curve,
    point_metrics_many,
    start_workers,
    stop_workers,
    worker_count,
)
from givecalc import create_situation
from givecalc.uk import create_uk_situation

# Import PolicyEngine once in the server process, without the warm-up, to
# keep the test short.
PRELOAD = ("givecalc", "givecalc.uk", "api.simulations")


@pytest.fixture(scope="module")
def workers():
    pids = start_workers(2, preload=PRELOAD)
    yield pids
    stop_workers()


def us(wages, **kwargs):
    return create_situation(
        wages_and_salaries=wages, state_code="NY", year=2026, **kwargs
    )


def test_workers_start_in_their_own_processes(workers):
    assert len(workers) == 2
    assert os.getpid() not in workers
    assert worker_count() == 2


def test_worker_results_equal_in_thread_results(workers):
    clear_caches()
    runs = [
        (us(150_000), 0),
        (us(150_000), 15_000),
        (us(200_000, is_married=True, mortgage_interest=20_000), 10_000),
    ]
    assert point_metrics_many("us", runs) == [
        _run_point("us", situation, donation) for situation, donation in runs
    ]
    uk = create_uk_situation(employment_income=70_000, year=2026)
    assert point_metrics_many("uk", [(uk, 2_000)]) == [
        _run_point("uk", uk, 2_000)
    ]
    curve = donation_curve("us", us(80_000))
    assert curve.equals(_run_curve("us", us(80_000)))


def test_a_killed_worker_is_replaced_and_the_request_answered(workers):
    clear_caches()
    os.kill(workers[0], signal.SIGKILL)
    # Whichever run lands on the dead worker breaks the pool; it reruns in
    # this thread and a new pool takes the next request.
    situation = us(123_456)
    result = point_metrics_many("us", [(situation, 0), (situation, 5_000)])
    assert result == [
        _run_point("us", situation, 0),
        _run_point("us", situation, 5_000),
    ]
    clear_caches()
    assert point_metrics_many("us", [(situation, 1_000)]) == [
        _run_point("us", situation, 1_000)
    ]
    assert simulations._executor is not None
