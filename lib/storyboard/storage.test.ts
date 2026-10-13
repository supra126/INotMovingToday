import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Minimal IndexedDB double: a write request succeeds right away, but the transaction
 * decides at commit time whether it completes or aborts (as with QuotaExceededError).
 */
function fakeIndexedDb(commit: "complete" | "abort") {
  const rows = new Map<string, unknown>();
  const db = {
    createObjectStore: () => undefined,
    transaction: () => {
      const tx: Record<string, unknown> = { error: null };
      const request: Record<string, unknown> = { result: undefined };
      tx.objectStore = () => ({
        put: (value: { id: string }) => {
          queueMicrotask(() => {
            (request.onsuccess as () => void)?.();
            queueMicrotask(() => {
              if (commit === "complete") {
                rows.set(value.id, value);
                (tx.oncomplete as () => void)?.();
              } else {
                tx.error = new Error("QuotaExceededError");
                (tx.onabort as () => void)?.();
              }
            });
          });
          return request;
        },
      });
      return tx;
    },
  };
  vi.stubGlobal("indexedDB", {
    open: () => {
      const req: Record<string, unknown> = { result: db };
      queueMicrotask(() => {
        (req.onupgradeneeded as () => void)?.();
        (req.onsuccess as () => void)?.();
      });
      return req;
    },
  });
  return rows;
}

async function freshStorage() {
  vi.resetModules();
  return import("./storage");
}

afterEach(() => vi.unstubAllGlobals());

describe("saveProject", () => {
  const project = { id: "p1" } as never;

  it("resolves once the transaction commits", async () => {
    const rows = fakeIndexedDb("complete");
    const { saveProject } = await freshStorage();
    await expect(saveProject(project)).resolves.toBeUndefined();
    expect(rows.has("p1")).toBe(true);
  });

  it("rejects when the transaction aborts after the request succeeded", async () => {
    fakeIndexedDb("abort");
    const { saveProject } = await freshStorage();
    await expect(saveProject(project)).rejects.toThrow("QuotaExceededError");
  });
});
