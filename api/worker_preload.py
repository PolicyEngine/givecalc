"""Imported once by the simulation workers' server process.

Workers fork from that process (see ``api.simulations.start_workers``), so
they start with PolicyEngine imported and warmed instead of paying for it on
a user's request.

Forked workers share the server's memory until they write to it, and a
garbage collection writes to every object it scans. The ``gc`` docs advise
disabling collection early, freezing right before the fork, and enabling it
in the children (``api.simulations._start_worker``). This module does that,
with one deliberate departure: it collects the warm-up's garbage once before
freezing. The docs warn that collecting before a fork can leave freed holes
that children then fill, unsharing those pages; without the collection, the
warm-up's garbage would be frozen and kept by every worker. On Modal the
container fell from 11.8 GiB to 7.3-7.5 GiB."""

import gc

gc.disable()

from api.warmup import warm_up  # noqa: E402

warm_up()
gc.collect()
gc.freeze()
