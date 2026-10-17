"""PolicyEngine runs behind the API, with in-process caches.

Every figure /api/savings and /api/calculate (and their UK versions) report
comes from one of two runs (/api/target-donation also makes one direct,
uncached run, in givecalc.calculations.donations):

- ``point_metrics``: one simulation of the household at one donation.
- ``donation_curve``: one vectorized simulation of the household across the
  donation grid in its situation's axes.

Both are pure functions of the situation dict and the donation, so their
results are cached under a key made from the situation's canonical JSON:
two situations share a key only if every input in them is equal. The tax
model is fixed for the life of a process, so it needs no place in the key.

The caches live in each process. On Modal each container keeps its own, so
a repeat request is a hit only when it reaches the same container. A request
that arrives while an identical run is in progress waits for that run
instead of starting another.

A simulation of one household is pure-Python work that holds the GIL, so
threads run one at a time. ``start_workers`` moves the runs into worker
processes: a request's runs then go at once (``point_metrics_many``), and
concurrent requests do not queue behind one another. Without workers (tests,
local development) every run happens in the calling thread.
"""

import json
import multiprocessing
import os
import threading
from collections import OrderedDict
from concurrent.futures import CancelledError, Future, ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from dataclasses import dataclass
from typing import Callable, Hashable, Literal, Sequence, TypeVar

import pandas as pd

Country = Literal["us", "uk"]
T = TypeVar("T")


class LRUCache:
    """A thread-safe LRU cache that runs each missing key's value once.

    Requests for a key that is being computed share that computation. A
    computation that raises caches nothing, and everyone sharing it gets the
    exception.
    """

    def __init__(self, maxsize: int):
        self.maxsize = maxsize
        self._values: OrderedDict = OrderedDict()
        self._in_flight: dict = {}
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get_or_submit(
        self, key: Hashable, submit: Callable[[], Future]
    ) -> Future:
        """A future for the key's value; ``submit`` starts it on a miss."""
        with self._lock:
            if key in self._values:
                self._values.move_to_end(key)
                self.hits += 1
                done = Future()
                done.set_result(self._values[key])
                return done
            if key in self._in_flight:
                self.hits += 1
                return self._in_flight[key]
            self.misses += 1
            shared = Future()
            self._in_flight[key] = shared
        try:
            run = submit()
        except BaseException as error:
            run = Future()
            run.set_exception(error)
        run.add_done_callback(lambda done: self._settle(key, shared, done))
        return shared

    def get_or_compute(self, key: Hashable, compute: Callable[[], T]) -> T:
        """The key's value, computed in this thread on a miss."""
        return self.get_or_submit(key, lambda: _run_now(compute)).result()

    def _settle(self, key: Hashable, shared: Future, run: Future) -> None:
        # Always forget the run and resolve everyone sharing it, even if it
        # was cancelled (whose .exception() raises instead of returning).
        value, error = None, None
        try:
            if run.cancelled():
                error = CancelledError()
            else:
                error = run.exception()
                if error is None:
                    value = run.result()
        except BaseException as unexpected:
            error = unexpected
        with self._lock:
            self._in_flight.pop(key, None)
            if error is None:
                self._values[key] = value
                self._values.move_to_end(key)
                while len(self._values) > self.maxsize:
                    self._values.popitem(last=False)
        if error is None:
            shared.set_result(value)
        else:
            shared.set_exception(error)

    def clear(self) -> None:
        with self._lock:
            self._values.clear()
            self.hits = 0
            self.misses = 0

    def info(self) -> dict:
        with self._lock:
            return {
                "hits": self.hits,
                "misses": self.misses,
                "size": len(self._values),
                "maxsize": self.maxsize,
            }


def _run_now(compute: Callable[[], T]) -> Future:
    future = Future()
    try:
        future.set_result(compute())
    except BaseException as error:
        future.set_exception(error)
    return future


@dataclass(frozen=True)
class PointMetrics:
    """One simulation of a household at one donation."""

    # household_tax minus household_benefits.
    net_tax: float
    household_net_income: float


# A point result is two floats and a key of 0.9-3.3 KB (one adult to a
# married couple with 20 children), so 4,096 entries take under 15 MB. A
# curve is a 1,001-row frame of about 40 KB.
POINT_CACHE = LRUCache(maxsize=4096)
CURVE_CACHE = LRUCache(maxsize=128)


def situation_key(situation: dict) -> str:
    """Canonical JSON of a situation: equal only for equal inputs."""
    return json.dumps(situation, sort_keys=True, separators=(",", ":"))


def _run_point(
    country: Country, situation: dict, donation: float
) -> PointMetrics:
    if country == "uk":
        from givecalc.uk.tax import calculate_uk_donation_metrics

        result = calculate_uk_donation_metrics(situation, donation)
    else:
        from givecalc.calculations.tax import calculate_donation_metrics

        result = calculate_donation_metrics(situation, donation)
    return PointMetrics(
        net_tax=float(result["baseline_income_tax"][0]),
        household_net_income=float(result["baseline_net_income"][0]),
    )


def _run_curve(country: Country, situation: dict) -> pd.DataFrame:
    if country == "uk":
        from givecalc.uk.tax import calculate_uk_donation_effects

        return calculate_uk_donation_effects(situation)
    from givecalc.calculations.tax import calculate_donation_effects

    return calculate_donation_effects(situation)


# Worker processes. None means every run happens in the calling thread.
_executor: ProcessPoolExecutor | None = None
_executor_lock = threading.Lock()
_worker_settings: dict = {}
# Bumped by stop_workers, so a pool still starting in the background after
# a stop shuts itself down instead of taking over.
_pool_epoch = 0
GC_THRESHOLD_0 = 50_000
# Each worker is replaced after this many tasks, by a fresh fork of the
# warmed server process (about 0.05 s more on its first run, measured
# locally). This bounds what a leak can hold: policyengine-core registers
# every variable module of every new tax-benefit system in sys.modules, and
# policyengine-uk builds a new system per simulation, so each UK run leaves
# about 14,000 objects (9-13 MB) behind for good.
WORKER_TASKS = 20


def _start_worker() -> None:
    """Runs first in each worker.

    The server process loads with collection off (see api.worker_preload);
    turn it back on, with a higher first-generation threshold so a run
    collects less often while it works. ``_in_worker`` collects fully after
    each run instead: a policyengine-uk run leaves about 340,000 objects of
    cyclic garbage, which would otherwise pile up between full collections.
    """
    import gc

    gc.enable()
    gc.set_threshold(GC_THRESHOLD_0)


def _in_worker(function: Callable, *args):
    """Run ``function`` in a worker, then collect its garbage.

    The objects inherited from the server process are frozen, so a full
    collection scans only what this run left behind.
    """
    import gc

    try:
        return function(*args)
    finally:
        gc.collect()


def _worker_pid(_: int) -> int:
    import time

    # Hold each worker briefly, so the pool starts a new one per task.
    time.sleep(0.5)
    return os.getpid()


def _new_pool(count: int) -> ProcessPoolExecutor:
    return ProcessPoolExecutor(
        max_workers=count,
        mp_context=multiprocessing.get_context("forkserver"),
        initializer=_start_worker,
        max_tasks_per_child=WORKER_TASKS,
    )


def _worker_census() -> tuple[int, int]:
    """A worker's process id and tracked-object count (for tests)."""
    import gc

    return os.getpid(), len(gc.get_objects())


def start_workers(
    count: int,
    preload: Sequence[str] = ("api.worker_preload",),
    _epoch: int | None = None,
) -> list[int]:
    """Run simulations in ``count`` worker processes.

    Workers fork from a server process that imports ``preload`` first, so
    each starts with PolicyEngine loaded (and warmed, with the default
    module). Runs stay in the calling thread until every worker is up, so
    this can run in the background while the app serves its first
    requests. Returns the process ids that answered the start-up tasks
    (usually all ``count``).
    """
    global _executor
    multiprocessing.get_context("forkserver").set_forkserver_preload(
        list(preload)
    )
    pool = _new_pool(count)
    pids = sorted(set(pool.map(_worker_pid, range(count))))
    with _executor_lock:
        if _epoch is not None and _epoch != _pool_epoch:
            stale = True
        else:
            stale = False
            previous = _executor
            _executor = pool
            _worker_settings.update(count=count, preload=list(preload))
    if stale:
        pool.shutdown(wait=False)
        return []
    if previous is not None:
        # Without cancelling: every queued run has someone waiting on it.
        previous.shutdown(wait=False)
    return pids


def stop_workers() -> None:
    global _executor, _pool_epoch
    with _executor_lock:
        executor, _executor = _executor, None
        _worker_settings.clear()
        _pool_epoch += 1
    if executor is not None:
        executor.shutdown(wait=True)


def _replace_broken_workers(unusable: bool = False) -> None:
    """Drop a pool that lost a worker (killed, say, out of memory), or one
    that is ``unusable`` because it refused work.

    Runs go back to the calling thread at once, and a new pool starts in
    the background; it takes over once its workers are up.
    """
    global _executor
    with _executor_lock:
        broken = _executor
        if broken is None or not (
            unusable or getattr(broken, "_broken", False)
        ):
            return
        _executor = None
        count, preload = _worker_settings["count"], _worker_settings["preload"]
        epoch = _pool_epoch
    broken.shutdown(wait=False)
    threading.Thread(
        target=start_workers, args=(count, preload, epoch), daemon=True
    ).start()


def _submit(function: Callable, *args) -> Future:
    executor = _executor
    if executor is not None:
        try:
            return executor.submit(_in_worker, function, *args)
        except Exception:
            # A pool that cannot take work (broken, or shut down) must not
            # fail the request.
            _replace_broken_workers(unusable=True)
    return _run_now(lambda: function(*args))


# A run in progress: how to start it, and the future it was started as.
Started = tuple[Callable[[], Future], Future]


def _started(start: Callable[[], Future]) -> Started:
    return start, start()


def _results(runs: Sequence[Started]) -> list:
    """Wait for each started run.

    A run lost with its pool (a dead worker, or a pool shut down with work
    queued) is started once more: in this thread, or on the new pool once
    it is up. The cache forgets a failed run before reporting it, so
    starting it again runs it again.
    """
    results = []
    for start, future in runs:
        try:
            results.append(future.result())
        except (BrokenProcessPool, CancelledError):
            _replace_broken_workers()
            results.append(start().result())
    return results


def point_metrics_many(
    country: Country, runs: Sequence[tuple[dict, float]]
) -> list[PointMetrics]:
    """Net tax and net income from one simulation per (situation, donation).

    Every missing run starts before any is waited on, so with workers they
    run at the same time.
    """
    return _results(
        [
            _started(
                lambda situation=situation, donation=donation: (
                    POINT_CACHE.get_or_submit(
                        (country, situation_key(situation), float(donation)),
                        lambda: _submit(
                            _run_point, country, situation, donation
                        ),
                    )
                )
            )
            for situation, donation in runs
        ]
    )


def point_metrics(
    country: Country, situation: dict, donation: float
) -> PointMetrics:
    """Net tax and net income from one simulation at ``donation``."""
    return point_metrics_many(country, [(situation, donation)])[0]


def start_curve(country: Country, situation: dict) -> Started:
    """Start the donation sweep over the situation's axes.

    Wait for it with ``curve_result``.
    """
    key = (country, situation_key(situation))
    return _started(
        lambda: CURVE_CACHE.get_or_submit(
            key, lambda: _submit(_run_curve, country, situation)
        )
    )


def curve_result(started: Started) -> pd.DataFrame:
    """A started sweep's frame, copied so callers can add columns without
    touching the cache."""
    return _results([started])[0].copy()


def donation_curve(country: Country, situation: dict) -> pd.DataFrame:
    """The donation sweep over the situation's axes."""
    return curve_result(start_curve(country, situation))


def cache_info() -> dict:
    return {"points": POINT_CACHE.info(), "curves": CURVE_CACHE.info()}


def worker_count() -> int:
    """How many worker processes take runs now (0: the calling thread)."""
    return _worker_settings.get("count", 0) if _executor is not None else 0


def clear_caches() -> None:
    POINT_CACHE.clear()
    CURVE_CACHE.clear()
