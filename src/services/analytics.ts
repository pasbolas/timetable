import { track } from "@vercel/analytics";

/**
 * Safely track custom user interactions in Vercel Web Analytics
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  try {
    if (typeof window !== "undefined") {
      track(name, properties);
    }
  } catch {
    // Graceful silent fallback
  }
}
