"""Imported once by the simulation workers' server process.

Workers fork from that process (see ``api.simulations.start_workers``), so
they start with PolicyEngine imported and warmed instead of paying for it on
a user's request.

Forked workers share the server's memory until they write to it, and a
garbage collection writes to every object it scans. Following the ``gc``
module's advice for fork without exec, the server loads with collection
off, collects the warm-up's garbage once, and freezes the rest, so the
workers' collections skip it (``api.simulations._start_worker`` turns
collection back on). On Modal this cut the container from 11.8 to about
7.4 GiB.
"""

import gc

gc.disable()

from api.warmup import warm_up  # noqa: E402

warm_up()
gc.collect()
gc.freeze()
