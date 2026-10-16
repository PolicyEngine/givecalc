import { describe, it, expect, vi } from "vitest";
import { fetchHeadlineFirst } from "../headlineFirst";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function steps(overrides = {}) {
  const log: string[] = [];
  return {
    log,
    steps: {
      fetchHeadline: vi.fn(async () => {
        log.push("fetch headline");
        return "headline";
      }),
      fetchFull: vi.fn(async () => {
        log.push("fetch full");
        return "full";
      }),
      storeHeadline: vi.fn((h: string) => log.push(`store ${h}`)),
      storeFull: vi.fn((f: string) => log.push(`store ${f}`)),
      showHeadline: vi.fn((h: string) => log.push(`show ${h}`)),
      showFull: vi.fn((f: string) => log.push(`show ${f}`)),
      isCurrent: () => true,
      ...overrides,
    },
  };
}

describe("fetchHeadlineFirst", () => {
  it("shows the headline before it asks for the curve", async () => {
    const { log, steps: s } = steps();
    await fetchHeadlineFirst(s);
    expect(log).toEqual([
      "fetch headline",
      "store headline",
      "show headline",
      "fetch full",
      "store full",
      "show full",
    ]);
  });

  it("shows the headline while the curve is still loading", async () => {
    const full = deferred<string>();
    const { steps: s } = steps({ fetchFull: vi.fn(() => full.promise) });
    const done = fetchHeadlineFirst(s);
    await vi.waitFor(() => expect(s.fetchFull).toHaveBeenCalled());
    expect(s.showHeadline).toHaveBeenCalledWith("headline");
    expect(s.showFull).not.toHaveBeenCalled();
    full.resolve("full");
    await done;
    expect(s.showFull).toHaveBeenCalledWith("full");
  });

  it("reuses a cached headline and fetches only the curve", async () => {
    const { steps: s } = steps({ cachedHeadline: "cached" });
    await fetchHeadlineFirst(s);
    expect(s.fetchHeadline).not.toHaveBeenCalled();
    expect(s.storeHeadline).not.toHaveBeenCalled();
    expect(s.showHeadline).toHaveBeenCalledWith("cached");
    expect(s.showFull).toHaveBeenCalledWith("full");
  });

  it("stores but does not show results for a form that has changed", async () => {
    const { steps: s } = steps({ isCurrent: () => false });
    await fetchHeadlineFirst(s);
    expect(s.storeHeadline).toHaveBeenCalledWith("headline");
    expect(s.storeFull).toHaveBeenCalledWith("full");
    expect(s.showHeadline).not.toHaveBeenCalled();
    expect(s.showFull).not.toHaveBeenCalled();
  });

  it("asks for no curve when the headline fails", async () => {
    const { steps: s } = steps({
      fetchHeadline: vi.fn(async () => {
        throw new Error("headline failed");
      }),
    });
    await expect(fetchHeadlineFirst(s)).rejects.toThrow("headline failed");
    expect(s.fetchFull).not.toHaveBeenCalled();
    expect(s.showHeadline).not.toHaveBeenCalled();
  });

  it("keeps the headline on screen when the curve fails", async () => {
    const { steps: s } = steps({
      fetchFull: vi.fn(async () => {
        throw new Error("curve failed");
      }),
    });
    await expect(fetchHeadlineFirst(s)).rejects.toThrow("curve failed");
    expect(s.showHeadline).toHaveBeenCalledWith("headline");
    expect(s.storeFull).not.toHaveBeenCalled();
    expect(s.showFull).not.toHaveBeenCalled();
  });
});
