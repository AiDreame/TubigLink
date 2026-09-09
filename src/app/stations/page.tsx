"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, X, Loader2, ArrowLeft, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { StationCard } from "@/components/customer/StationCard";
import { StationWithProducts } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { CitySelector } from "@/components/shared/CitySelector";
import { useCityStore } from "@/hooks/use-city";
import {
  haversineKm,
  isStationSortKey,
  sortStations,
  type StationSortKey,
} from "@/lib/station-utils";

// Drawer sort options in display order: label + shared sort key.
const STATION_SORT_OPTIONS: { label: string; key: StationSortKey }[] = [
  { label: "Recommended", key: "recommended" },
  { label: "Nearest", key: "nearest" },
  { label: "Top Rated", key: "rated" },
  { label: "Lowest Delivery Fee", key: "fee" },
  { label: "Open Now First", key: "open" },
  { label: "Featured First", key: "featured" },
  { label: "Name A–Z", key: "name" },
];

export default function StationsPage() {
  const router = useRouter();
  const { selectedCity, selectedProvince, setCity, setProvince } = useCityStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [stations, setStations] = useState<StationWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<StationSortKey>("recommended");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Honor deep links: ?province=X selects the whole province (clearing any
  // city), ?city=X selects a city (clearing any province). Runs when the
  // page mounts with URL params.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const prov = sp.get("province");
    const city = sp.get("city");
    if (prov) setProvince(prov);
    else if (city) setCity(city === "Nationwide" ? "" : city);
    const sort = sp.get("sort");
    if (isStationSortKey(sort)) setSortKey(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request the device position once; cached for "Nearest" sorting via
  // haversineKm. If denied/unavailable, sortStations degrades gracefully.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 300000, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    fetchStations();
  }, [selectedCity, selectedProvince, activeFilter]);

  // "All of {province}" label for province selections, else the city (or nationwide).
  const areaLabel = selectedProvince
    ? `All of ${selectedProvince}`
    : selectedCity || "Nationwide";
  // Short copy for "N stations in {area}" headings.
  const areaShort = selectedProvince || selectedCity || "the Philippines";

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (activeFilter) params.append("type", activeFilter);
      if (selectedProvince) params.append("province", selectedProvince);
      else if (selectedCity) params.append("city", selectedCity);

      const res = await fetch(`/api/stations?${params.toString()}`);
      const data = await res.json();
      setStations(data.data || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch stations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStations();
  };

  const distances = useMemo(() => {
    const d: Record<string, number> = {};
    if (!userLoc) return d;
    for (const st of stations) {
      if (st.latitude != null && st.longitude != null) {
        d[st.id] = haversineKm(userLoc.lat, userLoc.lng, st.latitude, st.longitude);
      }
    }
    return d;
  }, [stations, userLoc]);

  // Client-side re-sort of the fetched list (API order = "recommended").
  const sortedStations = useMemo(
    () => sortStations(stations, sortKey, { distances }),
    [stations, sortKey, distances]
  );

  const handleSortSelect = (key: StationSortKey) => {
    setSortKey(key);
    if (window.innerWidth < 768) setShowFilters(false);
  };

  const waterTypes = ["PURIFIED", "MINERAL", "ALKALINE"];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Header */}
      <div className="bg-card sticky top-0 z-30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full min-h-[44px] min-w-[44px] shrink-0"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find a water station..."
                  className="pl-10 rounded-xl bg-muted border-none h-11 focus-visible:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="rounded-xl h-11 w-11 p-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              </Button>
            </form>
            <Link href="/" aria-label="Home" className="shrink-0 hidden sm:block">
              <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <NotificationBell className="hidden sm:block shrink-0" />
          </div>

          {/* City Selector + Quick Filter Pills */}
          <div className="flex items-center gap-2 mt-3">
            {/* CitySelector rendered OUTSIDE overflow container so dropdown isn't clipped */}
            <CitySelector onChange={(city) => {
              setCity(city);
            }} />
            
            {/* Scrollable filter pills — overflow-x-auto only on the badges, not the dropdown */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="h-5 w-px bg-border shrink-0" />

              <Badge 
                variant={activeFilter === null ? "default" : "outline"}
                className={`cursor-pointer rounded-full px-4 py-1.5 whitespace-nowrap shrink-0 ${activeFilter === null ? "bg-blue-600" : "text-muted-foreground"}`}
                onClick={() => setActiveFilter(null)}
              >
                All
              </Badge>
              {waterTypes.map((type) => (
                <Badge 
                  key={type}
                  variant={activeFilter === type ? "default" : "outline"}
                  className={`cursor-pointer rounded-full px-4 py-1.5 whitespace-nowrap shrink-0 ${activeFilter === type ? "bg-blue-600" : "text-muted-foreground"}`}
                  onClick={() => setActiveFilter(type)}
                >
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">
            {isLoading ? "Searching..." : `${totalCount} station${totalCount !== 1 ? 's' : ''} in ${areaShort}`}
          </h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{areaShort}, PH</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedStations.length > 0 ? (
          <div>
            {/* Featured stations section */}
            {sortedStations.filter(s => s.isFeatured).length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-[10px]">★</span>
                  Featured Stations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedStations.filter(s => s.isFeatured).map((station) => (
                    <StationCard key={station.id} station={station} />
                  ))}
                </div>
              </div>
            )}
            {/* Regular stations section */}
            {sortedStations.filter(s => !s.isFeatured).length > 0 && (
              <div>
                {sortedStations.filter(s => s.isFeatured).length > 0 && (
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-1 w-4 rounded-full bg-muted-foreground/30" />
                    All Stations
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedStations.filter(s => !s.isFeatured).map((station) => (
                    <StationCard key={station.id} station={station} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground">No stations found in {areaShort}</h2>
            <p className="text-muted-foreground mt-1">
              {selectedCity === "Manila" && !selectedProvince
                ? "Try adjusting your filters or search terms" 
                : `We're expanding! Try selecting a different area above.`}
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter(null);
                }}
              >
                Clear filters
              </Button>
              <Button 
                variant="link" 
                className="text-blue-600 dark:text-blue-400"
                onClick={() => window.location.href = "/"}
              >
                Back to home
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Filter Sidebar/Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowFilters(false)}
          />
          <div className="relative w-full max-w-xs bg-card h-full shadow-xl flex flex-col border-l border-border">
            <div className="flex items-center justify-between px-6 py-5 pb-4 border-b border-border">
              <h2 className="text-xl font-bold text-card-foreground">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-6 py-6">
              <div>
                <h3 className="font-semibold mb-3 text-card-foreground">Sort By</h3>
                <div className="grid grid-cols-1 gap-2">
                  {STATION_SORT_OPTIONS.map((opt) => {
                    const active = sortKey === opt.key;
                    return (
                      <Button
                        key={opt.key}
                        variant={active ? "default" : "outline"}
                        onClick={() => handleSortSelect(opt.key)}
                        aria-pressed={active}
                        className={`justify-start rounded-xl font-normal ${active ? "bg-blue-600" : "text-muted-foreground"}`}
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-card-foreground">Service area</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  Currently browsing: <strong className="text-card-foreground">{areaLabel}</strong>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={() => setShowFilters(false)}
              >
                Close
              </Button>
              <Button 
                className="flex-1 rounded-xl"
                onClick={() => setShowFilters(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}