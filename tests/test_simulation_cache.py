"""The simulation caches must never change an answer.

Invariants:
- Key completeness: two situations get the same cache key only if they are
  identical, order included (the first person is the donor), so a cached
  result is always for the household and donor asked about.
- Determinism: a cached point result equals a fresh simulation of the same
  household and donation, whatever ran before it.
- LRU bounds: the cache holds at most ``maxsize`` entries and evicts the
  least recently used one.
- Single flight: concurrent requests for one missing key run it once; a
  run that fails caches nothing.
"""

import copy
import threading
import time
from concurrent.futures import CancelledError, Future

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from api import simulations
from api.simulations import (
    LRUCache,
    _run_point,
    clear_caches,
    donation_curve,
    point_key,
    point_metrics,
    point_metrics_many,
    situation_key,
)
from api.warmup import warm_up, warm_up_years
from givecalc import create_situation


def test_lru_evicts_least_recently_used():
    cache = LRUCache(maxsize=2)
    cache.get_or_compute("a", lambda: 1)
    cache.get_or_compute("b", lambda: 2)
    cache.get_or_compute("a", lambda: pytest.fail("a should be cached"))
    cache.get_or_compute("c", lambda: 3)  # evicts b, the least recent
    assert cache.get_or_compute("b", lambda: 20) == 20
    assert cache.info() == {"hits": 1, "misses": 4, "size": 2, "maxsize": 2}


@given(st.lists(st.integers(min_value=0, max_value=9), max_size=60))
def test_lru_never_exceeds_maxsize_and_returns_computed_values(keys):
    cache = LRUCache(maxsize=3)
    for key in keys:
        assert cache.get_or_compute(key, lambda key=key: key * 10) == key * 10
        assert cache.info()["size"] <= 3
    info = cache.info()
    assert info["hits"] + info["misses"] == len(keys)


def test_concurrent_misses_run_once():
    cache = LRUCache(maxsize=4)
    calls = []
    release = threading.Event()

    def slow():
        calls.append(1)
        release.wait(5)
        return "value"

    results = []
    threads = [
        threading.Thread(
            target=lambda: results.append(cache.get_or_compute("k", slow))
        )
        for _ in range(4)
    ]
    for thread in threads:
        thread.start()
    time.sleep(0.2)
    release.set()
    for thread in threads:
        thread.join(5)
    assert results == ["value"] * 4
    assert len(calls) == 1


def test_failed_run_is_not_cached_and_reaches_every_waiter():
    cache = LRUCache(maxsize=4)
    started = threading.Event()
    release = threading.Event()

    def failing():
        started.set()
        release.wait(5)
        raise ValueError("boom")

    errors = []

    def call():
        try:
            cache.get_or_compute("k", failing)
        except ValueError as error:
            errors.append(str(error))

    owner = threading.Thread(target=call)
    owner.start()
    started.wait(5)
    waiter = threading.Thread(target=call)
    waiter.start()
    time.sleep(0.2)
    release.set()
    owner.join(5)
    waiter.join(5)
    assert errors == ["boom", "boom"]
    assert cache.info()["size"] == 0
    assert cache.get_or_compute("k", lambda: "ok") == "ok"


def test_a_cancelled_run_releases_its_waiters_and_its_key():
    cache = LRUCache(maxsize=4)
    run = Future()
    shared = cache.get_or_submit("k", lambda: run)
    sharing = cache.get_or_submit("k", lambda: pytest.fail("in flight"))
    assert run.cancel()
    for future in (shared, sharing):
        with pytest.raises(CancelledError):
            future.result(timeout=1)
    assert cache._in_flight == {}
    assert cache.get_or_compute("k", lambda: 7) == 7


def test_a_cancelled_run_is_started_again():
    starts = []

    def start():
        starts.append(1)
        future = Future()
        if len(starts) == 1:
            future.cancel()
        else:
            future.set_result("answer")
        return future

    assert simulations._results([simulations._started(start)]) == ["answer"]
    assert len(starts) == 2


class DeadPool:
    """A pool whose every run is lost, as if its workers died."""

    _broken = "a worker died"

    def submit(self, *args):
        from concurrent.futures.process import BrokenProcessPool

        future = Future()
        future.set_exception(BrokenProcessPool("a worker died"))
        return future

    def shutdown(self, wait=True, cancel_futures=False):
        pass


def test_two_pool_generations_dying_in_one_request_still_answer(monkeypatch):
    """A request's runs survive their pool dying and its replacement dying
    too: the last try runs in the request's thread."""
    ran_here = []

    def fake_point(country, situation, donation):
        ran_here.append(donation)
        return simulations.PointMetrics(donation, -donation)

    def restart_dead(count, preload, epoch):
        simulations._executor = DeadPool()

    monkeypatch.setattr(simulations, "_run_point", fake_point)
    monkeypatch.setattr(simulations, "_restart_in_background", restart_dead)
    monkeypatch.setattr(simulations, "_executor", DeadPool())
    monkeypatch.setattr(
        simulations, "_worker_settings", {"count": 1, "preload": []}
    )
    clear_caches()
    situation = create_situation(wages_and_salaries=70_000, year=2026)
    assert point_metrics_many("us", [(situation, 0), (situation, 5)]) == [
        simulations.PointMetrics(0, 0),
        simulations.PointMetrics(5, -5),
    ]
    assert sorted(ran_here) == [0, 5]


def test_a_late_failure_does_not_retire_the_replacement(monkeypatch):
    replacement = object()
    monkeypatch.setattr(simulations, "_executor", replacement)
    monkeypatch.setattr(
        simulations, "_worker_settings", {"count": 1, "preload": []}
    )
    simulations._replace_broken_workers(DeadPool(), unusable=True)
    assert simulations._executor is replacement


INPUT_STRATEGIES = {
    "wages_and_salaries": st.sampled_from([0, 50_000, 50_001, 120_000]),
    "tips": st.sampled_from([0, 5_000]),
    "dividends": st.sampled_from([0, 4_000]),
    "qualified_dividends": st.sampled_from([0, 3_000]),
    "short_term_capital_gains": st.sampled_from([0, 2_000]),
    "long_term_capital_gains": st.sampled_from([0, 9_000]),
    "interest_income": st.sampled_from([0, 1_000]),
    "self_employment_income": st.sampled_from([0, 30_000]),
    "is_married": st.booleans(),
    "state_code": st.sampled_from(["CA", "NY", "TX"]),
    "num_children": st.integers(min_value=0, max_value=2),
    "mortgage_interest": st.sampled_from([0, 12_000]),
    "real_estate_taxes": st.sampled_from([0, 7_000]),
    "in_nyc": st.booleans(),
    "year": st.sampled_from([2025, 2026, 2027]),
}
inputs = st.fixed_dictionaries(INPUT_STRATEGIES)
FIELDS = sorted(INPUT_STRATEGIES)


@settings(max_examples=300, derandomize=True)
@given(inputs, inputs)
def test_key_is_equal_only_for_equal_situations(a, b):
    situation_a = create_situation(**a)
    situation_b = create_situation(**b)
    same_key = situation_key(situation_a) == situation_key(situation_b)
    # create_situation lists people in a fixed order, so here equal
    # situations are identical in order too.
    assert same_key == (situation_a == situation_b)


@settings(max_examples=100, derandomize=True)
@given(inputs, st.sampled_from(FIELDS))
def test_changing_any_input_that_reaches_the_model_changes_the_key(a, field):
    b = dict(a)
    if isinstance(a[field], bool):
        b[field] = not a[field]
    elif field == "state_code":
        b[field] = "WA" if a[field] != "WA" else "OR"
    else:
        b[field] = a[field] + 1
    situation_a = create_situation(**a)
    situation_b = create_situation(**b)
    if situation_a != situation_b:
        assert situation_key(situation_a) != situation_key(situation_b)


@settings(
    max_examples=5,
    deadline=None,
    derandomize=True,
    suppress_health_check=[HealthCheck.too_slow],
)
@given(
    inputs,
    st.sampled_from(FIELDS),
    st.sampled_from([0, 1_000, 7_500]),
)
def test_cached_point_equals_a_fresh_simulation(a, field, donation):
    """Run a neighbouring household first, then check the cache returns
    this household's own result, not the neighbour's."""
    clear_caches()
    neighbour = dict(a)
    if isinstance(a[field], bool):
        neighbour[field] = not a[field]
    elif field == "state_code":
        neighbour[field] = "WA"
    else:
        neighbour[field] = a[field] + 1_000
    point_metrics("us", create_situation(**neighbour), donation)

    situation = create_situation(**a)
    cached = point_metrics("us", situation, donation)
    again = point_metrics("us", situation, donation)
    assert again is cached
    assert cached == _run_point("us", situation, donation)


@settings(max_examples=200, derandomize=True)
@given(inputs, inputs)
def test_point_keys_ignore_only_the_axis_end(a, b):
    """A point run reads the situation without its axes, plus their year."""
    situation_a = create_situation(**a)
    situation_b = create_situation(**b)
    same_key = point_key("us", situation_a, 500) == point_key(
        "us", situation_b, 500
    )

    def point_input(situation):
        return (
            {k: v for k, v in situation.items() if k != "axes"},
            situation["axes"][0][0]["period"],
        )

    assert same_key == (point_input(situation_a) == point_input(situation_b))


def test_point_key_drops_the_axis_end_but_keeps_its_year():
    situation = create_situation(wages_and_salaries=60_000, year=2026)
    longer = copy.deepcopy(situation)
    longer["axes"][0][0]["max"] = 999_999
    assert point_key("us", situation, 0) == point_key("us", longer, 0)
    other_year = copy.deepcopy(situation)
    other_year["axes"][0][0]["period"] = 2027
    assert point_key("us", situation, 0) != point_key("us", other_year, 0)
    assert point_key("us", situation, 0) != point_key("us", situation, 1)
    assert point_key("us", situation, 0) != point_key("uk", situation, 0)


def wizard_fixtures():
    import json
    from pathlib import Path

    path = Path(__file__).parent / "fixtures" / "wizard_households.json"
    return json.loads(path.read_text())


def test_keys_tell_donors_apart():
    """The first person is the donor, so person order is part of the key;
    the axis's end still is not part of a point key."""
    from api.main import us_situation
    from api.schemas import CalculateRequest

    for fixture in wizard_fixtures():
        request = fixture["request"]
        people = request["household"]["people"]
        if len(people) < 2:
            continue
        swapped = copy.deepcopy(request)
        order = list(people)
        order[0], order[1] = order[1], order[0]
        swapped["household"]["people"] = {p: people[p] for p in order}
        original = us_situation(CalculateRequest(**request))
        reordered = us_situation(CalculateRequest(**swapped))
        assert original == reordered  # dict equality ignores order
        assert situation_key(original) != situation_key(reordered)
        assert point_key("us", original, 0) != point_key("us", reordered, 0)

        longer = us_situation(CalculateRequest(**request), top=123_456)
        assert point_key("us", original, 0) == point_key("us", longer, 0)
        assert situation_key(original) != situation_key(longer)


def test_curve_cache_returns_independent_copies():
    clear_caches()
    situation = create_situation(wages_and_salaries=60_000, year=2026)
    first = donation_curve("us", situation)
    first["scratch"] = 1.0
    second = donation_curve("us", situation)
    assert "scratch" not in second.columns
    assert simulations.CURVE_CACHE.info()["hits"] == 1


def test_warm_up_covers_offered_years_and_leaves_caches_empty(monkeypatch):
    from datetime import date

    from api import warmup

    assert warm_up_years(date(2026, 10, 16)) == [2025, 2026, 2027, 2028]

    runs = []
    monkeypatch.setattr(
        warmup,
        "point_metrics",
        lambda country, situation, donation: runs.append(
            (country, "point", situation["axes"][0][0]["period"])
        ),
    )
    monkeypatch.setattr(
        warmup,
        "donation_curve",
        lambda country, situation: runs.append(
            (country, "curve", situation["axes"][0][0]["period"])
        ),
    )
    simulations.POINT_CACHE.get_or_compute("leftover", lambda: 1)
    warm_up(date(2026, 10, 16))
    assert sorted(runs) == sorted(
        [("us", "point", year) for year in [2025, 2026, 2027, 2028]]
        + [("us", "curve", 2026), ("uk", "point", 2026), ("uk", "curve", 2026)]
    )
    assert simulations.POINT_CACHE.info()["size"] == 0
