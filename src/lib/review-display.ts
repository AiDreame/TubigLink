/**
 * Display-safe reviewer identity for PUBLIC surfaces (N-09, owner direction:
 * no personal names on the public storefront).
 *
 * The DB rows keep the reviewer's real User.name untouched; this helper maps
 * it to a display-safe form at the API layer:
 *   - "Juan dela Cruz"  -> "Juan"
 *   - single-name users -> "Juan"
 *   - missing name      -> "Verified Customer"
 *
 * Verified customers keep a first name for a human touch; full personal names
 * (and phones) never leave the API.
 */
export function reviewDisplayName(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "Verified Customer";
  const first = trimmed.split(/\s+/)[0];
  if (!first) return "Verified Customer";
  // Keep the caller honest: a healthy first name is plain text. Strip control
  // chars / zero-width so nothing odd can render.
  return first.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, "").slice(0, 40) || "Verified Customer";
}

/** Default avatar-letter/avatar for a display name (used by the storefront). */
export function reviewAvatarLabel(displayName: string): string {
  return displayName.slice(0, 1).toUpperCase() || "U";
}