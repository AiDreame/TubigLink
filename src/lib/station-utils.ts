// Shared helpers for the customer "find stations" experience.
// Pure functions — no dependencies, safe to import anywhere client-side.

export interface FinderStation {
  id: string;
  slug?: string | null;
  name: string;
  barangay?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  totalReviews?: number | null;
  deliveryFee?: number | null;
  minOrder?: number | null;
  isFeatured?: boolean | null;
  openingTime?: string | null;
  closingTime?: string | null;
  products?: { type?: string | null }[] | null;
  _count?: { reviews?: number } | null;
}

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** "1.2 km" / "850 m" / "—" when location is unknown. */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !isFinite(km)) return "—";
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Current HH:MM in Asia/Manila as minutes since midnight. */
function manilaNowMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (h % 24) * 60 + m;
}

/**
 * Open-now check from openingTime/closingTime ("HH:MM" strings).
 * Handles overnight windows (e.g. 18:00–02:00). Null hours = unknown → true
 * (don't hide a station just because hours are missing).
 */
export function isOpenNow(
  openingTime?: string | null,
  closingTime?: string | null,
  now = new Date()
): boolean | null {
  const open = openingTime ? toMinutes(openingTime) : null;
  const close = closingTime ? toMinutes(closingTime) : null;
  if (open == null || close == null) return null;
  if (open === close) return true; // 24h
  const t = manilaNowMinutes(now);
  if (close > open) return t >= open && t < close;
  return t >= open || t < close; // overnight
}

/** Distinct uppercased water types from a station's products. */
export function stationWaterTypes(station: FinderStation): string[] {
  const set = new Set<string>();
  for (const p of station.products || []) {
    if (p?.type) set.add(String(p.type).toUpperCase());
  }
  return Array.from(set);
}

export const WATER_TYPE_LABELS: Record<string, string> = {
  PURIFIED: "Purified",
  MINERAL: "Mineral",
  ALKALINE: "Alkaline",
};
