"""A worker's memory must stay bounded however many UK runs it serves.

A policyengine-uk run leaves about 340,000 objects of cyclic garbage, and
policyengine-core keeps the ~1,160 variable modules of every new
tax-benefit system in sys.modules (~14,000 objects). ``_in_worker`` drops
those modules and collects after every run.

The pool must also keep serving after bursts: recycling workers with
``max_tasks_per_child`` on Python 3.13 could leave it with no processes
(found in review of PolicyEngine/givecalc#89).
"""

import time
from concurrent.futures import wait

import pytest

from api import simulations
from api.simulations import (
    _in_worker,
    _new_pool,
    _run_point,
    _submit,
    _worker_census,
    start_workers,
    stop_workers,
)
from givecalc.uk import create_uk_situation

# The same preload as tests/test_workers.py: the forkserver is shared by the
# test session, and its preload is fixed when it starts.
PRELOAD = ("givecalc", "givecalc.uk", "api.simulations")
RUNS = 30


@pytest.fixture(scope="module")
def one_worker():
    start_workers(1, preload=PRELOAD)
    yield
    stop_workers()


def uk_run(i):
    situation = create_uk_situation(employment_income=40_000 + 997 * i)
    return _submit(_run_point, "uk", situation, 500).result()


def census():
    return simulations._executor.submit(_worker_census).result()


def test_uk_runs_leave_no_objects_or_modules_behind(one_worker):
    uk_run(0)
    first_pid, objects_after_one, modules_after_one = census()
    for i in range(1, RUNS + 1):
        uk_run(i)
    last_pid, objects_after_all, modules_after_all = census()

    assert last_pid == first_pid
    # Without the cleanup, 30 runs would add ~34,800 modules and ~414,000
    # objects; without the collections, about 10 million objects.
    assert modules_after_all == modules_after_one
    assert objects_after_all - objects_after_one < 5_000


def test_the_pool_keeps_serving_after_a_burst(one_worker):
    pool = _new_pool(1)
    try:
        wait([pool.submit(_in_worker, time.sleep, 0.05) for _ in range(3)])
        for _ in range(40):
            pool.submit(_in_worker, time.sleep, 0.01).result(timeout=10)
    finally:
        pool.shutdown()
