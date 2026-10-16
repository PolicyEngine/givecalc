"""Imported once by the simulation workers' server process.

Workers fork from that process (see ``api.simulations.start_workers``), so
they start with PolicyEngine imported and warmed instead of paying for it on
a user's request.

Forked workers share the server's memory until they write to it, and a
garbage collection writes to every object it scans. So the server collects
nothing while it loads, then freezes what it loaded: collections in the
workers skip those objects, and their pages stay shared (see the ``gc``
module's documentation of ``gc.freeze``).
"""

import gc

gc.disable()

from api.warmup import warm_up  # noqa: E402

warm_up()
gc.collect()
gc.freeze()
