/**
 * Server Actions Entry Point
 *
 * This file provides a safe entry point for actions that can be used
 * in both static and server builds.
 */

// Check if we're in static build mode
const isStaticMode = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

/**
 * Check if server has API key configured
 * Safe to call in both static and server builds
 */
export async function hasServerApiKey(): Promise<boolean> {
  if (isStaticMode) {
    return false;
  }

  // Dynamic import to avoid loading server code in static build
  try {
    const { hasServerApiKey: serverHasApiKey } = await import("./server/script");
    return serverHasApiKey();
  } catch {
    return false;
  }
}
