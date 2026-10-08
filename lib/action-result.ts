/**
 * Server Action result wrapper.
 *
 * In production builds Next.js replaces thrown Server Action errors with a generic
 * message, so the real cause (invalid key, quota, bad request) never reaches the UI.
 * Actions return errors as data instead, and the client re-throws them.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}
