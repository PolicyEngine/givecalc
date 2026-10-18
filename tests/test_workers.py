"""Simulation workers must return exactly what an in-thread run returns.

Differential: the same households run through worker processes and in the
calling thread give equal results. A worker that dies, or a pool that
refuses work, is replaced, and the request it was serving still gets its
answer.
"""

import os
import signal
import threading
import time

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
    # A new pool comes up in the background and takes the next runs.
    deadline = time.monotonic() + 60
    while worker_count() == 0 and time.monotonic() < deadline:
        time.sleep(0.5)
    assert worker_count() == 2
    clear_caches()
    assert point_metrics_many("us", [(situation, 1_000)]) == [
        _run_point("us", situation, 1_000)
    ]


def test_a_pool_that_refuses_work_is_replaced(workers):
    clear_caches()
    simulations._executor.shutdown(wait=True)
    situation = us(98_765)
    assert point_metrics_many("us", [(situation, 2_000)]) == [
        _run_point("us", situation, 2_000)
    ]
    deadline = time.monotonic() + 60
    while worker_count() == 0 and time.monotonic() < deadline:
        time.sleep(0.5)
    assert worker_count() == 2


def wait_for_workers(count, timeout=60):
    deadline = time.monotonic() + timeout
    while worker_count() != count and time.monotonic() < deadline:
        time.sleep(0.5)
    assert worker_count() == count


def test_a_run_lost_mid_flight_reruns_in_this_thread(workers):
    wait_for_workers(2)
    pids = list(simulations._executor._processes)
    results = []

    def request():
        lost = simulations._started(
            lambda: simulations._submit(time.sleep, 1.0)
        )
        results.extend(simulations._results([lost]))

    thread = threading.Thread(target=request)
    thread.start()
    time.sleep(0.3)  # the run is on a worker now
    for pid in pids:
        os.kill(pid, signal.SIGKILL)
    thread.join(10)
    assert results == [None]
    wait_for_workers(2)


def test_stopping_with_runs_queued_settles_every_one(workers):
    wait_for_workers(2)
    cache = simulations.LRUCache(maxsize=16)
    shared = [
        cache.get_or_submit(
            ("queued", i), lambda: simulations._submit(time.sleep, 0.2)
        )
        for i in range(6)
    ]
    stop_workers()
    assert [future.result(timeout=5) for future in shared] == [None] * 6
    assert cache._in_flight == {}
    # Leave a pool for the module's teardown, as the fixture expects.
    start_workers(2, preload=PRELOAD)
