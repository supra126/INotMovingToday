export const IMAGE_CONCURRENCY = 4;
export const VIDEO_CONCURRENCY = 3;
export const DRAFT_CONCURRENCY = 4;

export type TaskResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export interface QueueOptions {
  concurrency: number;
  /** Extra attempts for rate-limited tasks */
  retries?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called once per task with its final result, after any retries */
  onSettled?: (index: number, result: TaskResult<unknown>) => void;
}

export function isRateLimitError(err: unknown): boolean {
  const status = (err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code;
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /429|rate.?limit|RESOURCE_EXHAUSTED|too many requests|errors\.rateLimited/i.test(message);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run tasks with a concurrency limit. A failing task never stops the others;
 * rate-limited tasks are retried with a growing delay.
 */
export async function runQueue<T>(tasks: (() => Promise<T>)[], options: QueueOptions): Promise<TaskResult<T>[]> {
  const { concurrency, retries = 2, sleep = defaultSleep } = options;
  const retryDelayMs = options.retryDelayMs ?? 5000;
  const results: TaskResult<T>[] = new Array(tasks.length);
  let next = 0;

  const runOne = async (task: () => Promise<T>): Promise<TaskResult<T>> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return { ok: true, value: await task() };
      } catch (error) {
        if (attempt >= retries || !isRateLimitError(error)) return { ok: false, error };
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  };

  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await runOne(tasks[index]);
      options.onSettled?.(index, results[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}
