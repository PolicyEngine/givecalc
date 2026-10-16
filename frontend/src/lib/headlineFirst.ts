/**
 * Fetch the headline, show it, then fetch the full result with the curve.
 *
 * The headline (/api/savings) runs two simulations; the full result
 * (/api/calculate) adds the donation sweep. Showing the headline first puts
 * the answer on screen while the charts load.
 */

export interface HeadlineFirst<H, F> {
  /** A headline already fetched for this request, if any. */
  cachedHeadline?: H;
  fetchHeadline: () => Promise<H>;
  fetchFull: () => Promise<F>;
  /** Store each result for this request, whether or not it is on screen. */
  storeHeadline: (headline: H) => void;
  storeFull: (full: F) => void;
  /** Show each result, called only while `isCurrent()` holds. */
  showHeadline: (headline: H) => void;
  showFull: (full: F) => void;
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

  const full = await steps.fetchFull();
  steps.storeFull(full);
  if (steps.isCurrent()) steps.showFull(full);
}
