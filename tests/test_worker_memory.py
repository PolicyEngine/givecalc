"""A worker's memory must stay bounded however many UK runs it serves.

A policyengine-uk run leaves about 340,000 objects of cyclic garbage, which
``_in_worker`` collects after every run, and about 14,000 objects that a
policyengine-core leak keeps for good (every variable module of every new
tax-benefit system stays in sys.modules), which recycling the worker after
``WORKER_TASKS`` tasks bounds.
"""

import pytest

from api import simulations
from api.simulations import (
    WORKER_TASKS,
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


def test_uk_runs_leave_a_bounded_number_of_objects(one_worker):
    assert RUNS > WORKER_TASKS
    uk_run(0)
    first_pid, after_one_run = census()
    for i in range(1, RUNS + 1):
        uk_run(i)
    last_pid, after_all_runs = census()

    # Recycled: a fresh fork serves the last runs.
    assert last_pid != first_pid
    # Collected after each run, and recycled, the worker holds at most
    # WORKER_TASKS runs' leaked objects. Uncollected, 30 runs would hold
    # about 10 million objects; unrecycled, about 420,000 more than after
    # one run.
    assert after_all_runs - after_one_run < WORKER_TASKS * 15_000
