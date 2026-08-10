/**
 * Normalize a Philippine mobile number into international dialing format
 * (tel: link friendly).
 *
 * - "09XXXXXXXXX"        → "+639XXXXXXXXX"
 * - "639XXXXXXXXX"       → "+639XXXXXXXXX"
 * - "+639XXXXXXXXX"      → "+639XXXXXXXXX" (pass-through)
 * - Anything else is returned trimmed as-is so we never corrupt a number we
 *   don't recognize.
 */
export function normalizePhoneForDialing(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("63") && trimmed.length >= 11) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+63${trimmed.slice(1)}`;
  return trimmed;
}
