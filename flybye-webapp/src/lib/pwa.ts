/**
 * Guarded service worker registration.
 *
 * NEVER register inside:
 *  - iframes (the Lovable preview runs in one)
 *  - lovable.app / lovableproject.com preview hosts
 *  - non-production builds
 *
 * Service workers in those contexts cause stale content and cache pollution.
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Skip if we're inside any iframe (preview)
  try {
    if (window.self !== window.top) return;
  } catch {
    return; // cross-origin frame access throws — definitely an iframe
  }

  // Skip Lovable preview hosts
  const host = window.location.hostname;
  if (
    host.endsWith("lovableproject.com") ||
    host.endsWith("lovable.app") === false &&
      (host.includes("id-preview--") || host.includes("--lovable"))
  ) {
    // Run only in true production: published lovable.app or custom domain
    // (id-preview--*.lovable.app is the live preview — skip it)
    if (host.startsWith("id-preview--")) return;
  }

  // Skip in dev mode
  if (import.meta.env.DEV) return;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("Service worker registration failed", err);
  }
}
