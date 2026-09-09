"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Search, MapPin, Star, SlidersHorizontal, Navigation,
  Loader2, Droplets, ChevronRight, X, Map as MapIcon, List as ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatDistance, haversineKm, isOpenNow, stationWaterTypes,
  WATER_TYPE_LABELS, type FinderStation,
} from "@/lib/station-utils";
import { getUserGeoWithFallback, type UserGeo, type LocationStatus } from "@/components/shared/StationMap";

// Map stays lazy (never SSR) and only mounts when its pane is visible.
const StationMap = dynamic(() => import("@/components/shared/StationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] md:h-[560px] rounded-2xl border bg-muted/40 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
      <span className="sr-only">Loading map…</span>
    </div>
  ),
});

type SortKey = "nearest" | "rated" | "fee";

const WATER_FILTERS = ["PURIFIED", "MINERAL", "ALKALINE"] as const;

interface StationFinderProps {
  stations: FinderStation[];
  selectedCity: string;
  isLoading: boolean;
}

function openBadge(open: boolean | null) {
  if (open === true)
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 text-[10px]">Open now</Badge>;
  if (open === false)
    return <Badge variant="outline" className="text-red-600 border-red-200 dark:text-red-400 dark:border-red-900 text-[10px]">Closed</Badge>;
  return null;
}

export default function StationFinder({ stations, selectedCity, isLoading }: StationFinderProps) {
  const [query, setQuery] = useState("");
  const [waterType, setWaterType] = useState<string | null>(null);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("nearest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [userLoc, setUserLoc] = useState<UserGeo | null>(null);
  const [locStatus, setLocStatus] = useState<LocationStatus>({ state: "loading" });

  // Single geolocation request for the whole finder (map consumes it controlled).
  useEffect(() => {
    let cancelled = false;
    setLocStatus({ state: "loading" });
    setBannerDismissed(false);
    getUserGeoWithFallback(selectedCity).then(({ loc, status }) => {
      if (cancelled) return;
      setUserLoc(loc);
      setLocStatus(status);
    });
    return () => { cancelled = true; };
  }, [selectedCity]);

  const distances = useMemo(() => {
    const d: Record<string, number> = {};
    if (!userLoc) return d;
    for (const s of stations) {
      if (s.latitude != null && s.longitude != null) {
        d[s.id] = haversineKm(userLoc.lat, userLoc.lng, s.latitude, s.longitude);
      }
    }
    return d;
  }, [stations, userLoc]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = stations.filter((s) => {
      if (q) {
        const hay = `${s.name} ${s.barangay ?? ""} ${s.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (waterType && !stationWaterTypes(s).includes(waterType)) return false;
      if (featuredOnly && !s.isFeatured) return false;
      if (openNowOnly && isOpenNow(s.openingTime, s.closingTime) !== true) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "rated") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "fee") return (a.deliveryFee ?? 0) - (b.deliveryFee ?? 0);
      const da = distances[a.id] ?? Number.POSITIVE_INFINITY;
      const db = distances[b.id] ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return rows;
  }, [stations, query, waterType, featuredOnly, openNowOnly, sort, distances]);

  const hasActiveFilters = query.trim() !== "" || waterType !== null || featuredOnly || openNowOnly;
  const clearFilters = () => {
    setQuery("");
    setWaterType(null);
    setFeaturedOnly(false);
    setOpenNowOnly(false);
  };

  const focusStation = (id: string) => {
    setSelectedId(id);
    setFocusRequest({ id, nonce: Date.now() });
    if (window.innerWidth < 768) setMobilePane("map");
  };

  const showBanner = locStatus.state === "fallback" && !bannerDismissed;

  return (
    <section aria-label="Find water stations" className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Find water stations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading stations…" : `${filtered.length} station${filtered.length === 1 ? "" : "s"}${selectedCity ? ` near ${selectedCity}` : " nationwide"}`}
            {locStatus.state === "found" && userLoc && " · sorted nearest first"}
          </p>
        </div>
        {/* Mobile list/map toggle */}
        <div className="md:hidden flex rounded-full border border-border overflow-hidden" role="tablist" aria-label="List or map view">
          <button
            role="tab" aria-selected={mobilePane === "list"}
            onClick={() => setMobilePane("list")}
            className={`flex items-center gap-1 px-4 py-2 text-xs font-medium min-h-[40px] ${mobilePane === "list" ? "bg-blue-600 text-white" : "text-muted-foreground"}`}
          >
            <ListIcon className="h-4 w-4" aria-hidden /> List
          </button>
          <button
            role="tab" aria-selected={mobilePane === "map"}
            onClick={() => setMobilePane("map")}
            className={`flex items-center gap-1 px-4 py-2 text-xs font-medium min-h-[40px] ${mobilePane === "map" ? "bg-blue-600 text-white" : "text-muted-foreground"}`}
          >
            <MapIcon className="h-4 w-4" aria-hidden /> Map
          </button>
        </div>
      </div>

      {showBanner && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-200">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <p className="flex-1">{(locStatus as { message: string }).message} Enable location for exact distances.</p>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss location message"
            className="rounded p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 min-h-[28px] min-w-[28px] flex items-center justify-center"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Search + sort row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search station name, barangay, or city…"
            aria-label="Search stations by name, barangay, or city"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="station-sort">Sort stations</label>
          <select
            id="station-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground min-h-[44px] focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="nearest">Nearest first</option>
            <option value="rated">Top rated</option>
            <option value="fee">Lowest delivery fee</option>
          </select>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="station-filters"
            className="rounded-xl min-h-[44px]"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" aria-hidden />
            Filters
            {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-blue-600" aria-hidden />}
          </Button>
        </div>
      </div>

      {/* Collapsible filters */}
      {filtersOpen && (
        <div id="station-filters" className="rounded-xl border border-border bg-card p-3 mb-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2" id="filter-water-label">Water type</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-water-label">
              {WATER_FILTERS.map((t) => {
                const active = waterType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setWaterType(active ? null : t)}
                    aria-pressed={active}
                    className={`flex items-center gap-1 rounded-full px-4 py-2 text-xs font-medium border min-h-[40px] transition-colors focus:ring-2 focus:ring-blue-500 outline-none ${active ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-blue-400 hover:text-foreground"}`}
                  >
                    <Droplets className="h-3 w-3" aria-hidden />
                    {WATER_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFeaturedOnly((v) => !v)}
              aria-pressed={featuredOnly}
              className={`rounded-full px-4 py-2 text-xs font-medium border min-h-[40px] focus:ring-2 focus:ring-blue-500 outline-none ${featuredOnly ? "bg-yellow-400 text-yellow-950 border-yellow-400 font-bold" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              ★ Featured only
            </button>
            <button
              onClick={() => setOpenNowOnly((v) => !v)}
              aria-pressed={openNowOnly}
              className={`rounded-full px-4 py-2 text-xs font-medium border min-h-[40px] focus:ring-2 focus:ring-blue-500 outline-none ${openNowOnly ? "bg-green-600 text-white border-green-600" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              ● Open now
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-full px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline min-h-[40px]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Split view: list + map */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        {/* Station list */}
        <div className={`${mobilePane === "list" ? "block" : "hidden"} md:block`}>
          {isLoading ? (
            <div className="space-y-3" role="status" aria-label="Loading stations">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
                  <div className="h-4 w-2/3 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded mt-2" />
                  <div className="h-3 w-1/3 bg-muted rounded mt-2" />
                </div>
              ))}
              <span className="sr-only">Loading stations…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-2xl px-4">
              <Droplets className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" aria-hidden />
              <p className="text-muted-foreground text-sm">
                {hasActiveFilters
                  ? "No stations match your search or filters. Try widening them."
                  : `No stations found${selectedCity ? ` in ${selectedCity}` : ""}. Try selecting a different city.`}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={clearFilters}>
                  Clear search & filters
                </Button>
              )}
              <div className="mt-3">
                <Link href="/stations" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                  Browse all stations <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          ) : (
            <ol className="space-y-3 md:max-h-[560px] md:overflow-y-auto md:pr-1">
              {filtered.map((s) => {
                const dist = distances[s.id];
                const open = isOpenNow(s.openingTime, s.closingTime);
                const reviews = s.totalReviews ?? s._count?.reviews ?? 0;
                const selected = selectedId === s.id;
                return (
                  <li key={s.id}>
                    <div
                      className={`rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 ${selected ? "border-blue-500 ring-1 ring-blue-500" : "border-border"}`}
                    >
                      <button
                        onClick={() => focusStation(s.id)}
                        aria-label={`Show ${s.name} on the map`}
                        className="w-full text-left outline-none"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-card-foreground flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{s.name}</span>
                              {s.isFeatured && (
                                <span className="shrink-0 bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full">FEATURED</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                              {[s.barangay, s.city].filter(Boolean).join(", ") || "Philippines"}
                            </p>
                          </div>
                          {openBadge(open)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                          <span className="flex items-center gap-1 font-medium text-blue-700 dark:text-blue-300">
                            <Navigation className="h-3 w-3" aria-hidden />
                            {dist != null ? formatDistance(dist) : locStatus.state === "loading" ? "…" : "—"}
                          </span>
                          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                            <Star className="h-3 w-3 fill-current" aria-hidden />
                            {typeof s.rating === "number" && s.rating > 0 ? s.rating.toFixed(1) : "New"}
                            {reviews > 0 && <span className="text-muted-foreground">({reviews})</span>}
                          </span>
                          <span className={s.deliveryFee === 0 || s.deliveryFee == null ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                            {s.deliveryFee === 0 || s.deliveryFee == null ? "Free delivery" : `₱${s.deliveryFee} delivery`}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 mt-3">
                        <Button asChild size="sm" className="rounded-full flex-1 min-h-[40px]">
                          <Link href={`/stations/${s.slug || s.id}`}>Order now</Link>
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="rounded-full min-h-[40px]"
                          onClick={() => focusStation(s.id)}
                          aria-label={`Locate ${s.name} on map`}
                        >
                          <MapPin className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {filtered.length > 0 && (
            <Link
              href={`/stations?city=${encodeURIComponent(selectedCity)}`}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View all stations <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {/* Map pane: mobile toggles visibility; desktop always visible.
            `hidden md:block` keeps a single mounted map (lazy-loaded once). */}
        <div className={`${mobilePane === "map" ? "block" : "hidden"} md:block md:sticky md:top-20`}>
          <StationMap
            stations={filtered}
            selectedCity={selectedCity}
            userLocation={userLoc}
            locationStatus={locStatus}
            distances={distances}
            focusRequest={focusRequest}
            onMarkerSelect={setSelectedId}
            className="w-full h-[320px] md:h-[560px] rounded-2xl border shadow-md z-0"
          />
        </div>
      </div>
    </section>
  );
}
