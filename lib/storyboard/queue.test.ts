import { describe, expect, it } from "vitest";
import { isRateLimitError, runQueue } from "./queue";

const noSleep = () => Promise.resolve();

describe("runQueue", () => {
  it("never runs more tasks than the concurrency limit", async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return i;
    });
    const results = await runQueue(tasks, { concurrency: 3 });
    expect(peak).toBe(3);
    expect(results.map((r) => (r.ok ? r.value : -1))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps going when a task fails", async () => {
    const results = await runQueue(
      [async () => 1, async () => { throw new Error("boom"); }, async () => 3],
      { concurrency: 2, sleep: noSleep }
    );
    expect(results[0]).toEqual({ ok: true, value: 1 });
    expect(results[1].ok).toBe(false);
    expect(results[2]).toEqual({ ok: true, value: 3 });
  });

  it("retries rate-limited tasks up to the limit", async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error("Too many requests"), { status: 429 });
      return "ok";
    };
    expect(await runQueue([flaky], { concurrency: 1, retries: 2, sleep: noSleep })).toEqual([{ ok: true, value: "ok" }]);

    let always = 0;
    const results = await runQueue(
      [async () => { always++; throw new Error("RESOURCE_EXHAUSTED"); }],
      { concurrency: 1, retries: 2, sleep: noSleep }
    );
    expect(results[0].ok).toBe(false);
    expect(always).toBe(3);
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    await runQueue([async () => { calls++; throw new Error("bad request"); }], { concurrency: 1, retries: 2, sleep: noSleep });
    expect(calls).toBe(1);
  });
});

describe("isRateLimitError", () => {
  it("detects 429s", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error("got status 429"))).toBe(true);
    expect(isRateLimitError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRateLimitError(new Error("errors.rateLimited"))).toBe(true);
    expect(isRateLimitError(new Error("invalid argument"))).toBe(false);
  });
});

describe("runQueue onSettled", () => {
  it("reports each task once, after its last retry", async () => {
    let attempts = 0;
    const settled: number[] = [];
    await runQueue(
      [
        async () => {
          attempts++;
          if (attempts < 3) throw Object.assign(new Error("429"), { status: 429 });
          return "ok";
        },
        async () => "ok",
      ],
      { concurrency: 1, sleep: async () => {}, onSettled: (index) => settled.push(index) }
    );
    expect(settled).toEqual([0, 1]);
  });
});
