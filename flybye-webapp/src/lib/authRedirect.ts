/**
 * Reads the `next` query param and validates it as a same-origin relative path.
 * Used so OAuth consent (and other gated flows) return the user where they started.
 */
export function getNextPath(search: string = window.location.search): string | null {
  const raw = new URLSearchParams(search).get("next");
  if (!raw) return null;
  // Must be a relative path, not a protocol-relative or absolute URL.
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function nextRedirectUrl(search?: string): string {
  const next = getNextPath(search);
  return next ? `${window.location.origin}${next}` : window.location.origin;
}
