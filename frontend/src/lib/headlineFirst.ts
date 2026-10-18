/**
 * Fetch the headline, show it, then fetch the full result with the curve.
 *
 * The headline (/api/savings) runs two simulations; the full result
 * (/api/calculate) adds the donation sweep. Showing the headline first puts
 * the answer on screen while the charts load.
 */

/** Where a request's full result stands: loading, failed, or settled. */
export type FullStatus = "loading" | "failed" | null;

export interface HeadlineFirst<H, F> {
  /** A headline already fetched for this request, if any. */
  cachedHeadline?: H;
  fetchHeadline: () => Promise<H>;
  fetchFull: () => Promise<F>;
  /** Store each result and status for this request, on screen or not. */
  storeHeadline: (headline: H) => void;
  storeFull: (full: F) => void;
  storeFullStatus: (status: FullStatus) => void;
  /** Show each result and status, called only while `isCurrent()` holds. */
  showHeadline: (headline: H) => void;
  showFull: (full: F) => void;
  showFullStatus: (status: FullStatus) => void;
  /** Whether the form still shows the request this call was made for. */
  isCurrent: () => boolean;
}

export async function fetchHeadlineFirst<H, F>(
  steps: HeadlineFirst<H, F>,
): Promise<void> {
  let headline = steps.cachedHeadline;
  if (headline === undefined) {
    headline = await steps.fetchHeadline();
    steps.storeHeadline(headline);
  }
  if (steps.isCurrent()) steps.showHeadline(headline);

  // The status belongs to this request, so a form shows its own curve's
  // status, not that of whichever request was made last.
  const setStatus = (status: FullStatus) => {
    steps.storeFullStatus(status);
    if (steps.isCurrent()) steps.showFullStatus(status);
  };
  setStatus("loading");
  let full: F;
  try {
    full = await steps.fetchFull();
  } catch (error) {
    setStatus("failed");
    throw error;
  }
  steps.storeFull(full);
  if (steps.isCurrent()) steps.showFull(full);
  setStatus(null);
}
