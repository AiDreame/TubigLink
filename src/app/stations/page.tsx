"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, X, Loader2, ArrowLeft, Home, Navigation, Map, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { StationCard } from "@/components/customer/StationCard";
import { StationWithProducts } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { CitySelector } from "@/components/shared/CitySelector";
import { BarangayAutocomplete } from "@/components/shared/BarangayAutocomplete";
import { useCityStore } from "@/hooks/use-city";
import StationMap from "@/components/shared/StationMap";

function StationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCity, setCity } = useCityStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [stations, setStations] = useState<StationWithProducts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showBarangaySearch, setShowBarangaySearch] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Read barangay and city from URL query params on mount
  useEffect(() => {
    const cityParam = searchParams.get("city");
    const barangayParam = searchParams.get("barangay");
    const queryParam = searchParams.get("query");

    if (cityParam) {
      setCity(cityParam);
    }
    if (barangayParam) {
      setBarangayFilter(barangayParam);
    }
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [searchParams, setCity]);

  // Fetch stations whenever filters change
  useEffect(() => {
    fetchStations();
  }, [selectedCity, activeFilter, barangayFilter]);

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (activeFilter) params.append("type", activeFilter);
      if (selectedCity) params.append("city", selectedCity);
      if (barangayFilter) params.append("barangay", barangayFilter);

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

  const handleBarangayChange = useCallback((barangay: string) => {
    setBarangayFilter(barangay);
    // Update URL with barangay param
    const params = new URLSearchParams(searchParams.toString());
    if (barangay) {
      params.set("barangay", barangay);
    } else {
      params.delete("barangay");
    }
    router.replace(`/stations?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleClearBarangay = useCallback(() => {
    setBarangayFilter("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("barangay");
    router.replace(`/stations?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const waterTypes = ["PURIFIED", "MINERAL", "ALKALINE"];

  const hasAddressContext = barangayFilter || searchParams.get("barangay");

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
            <Link href="/" aria-label="Home" className="shrink-0">
              <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              className="rounded-xl h-9 gap-1.5 shrink-0"
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
            >
              {viewMode === "list" ? (
                <><Map className="h-4 w-4" /> Map</>
              ) : (
                <><List className="h-4 w-4" /> List</>
              )}
            </Button>
          </div>

          {/* City Selector + Barangay Filter + Quick Filter Pills */}
          <div className="flex items-center gap-2 mt-3">
            {/* CitySelector */}
            <CitySelector onChange={(city) => {
              setCity(city);
              setBarangayFilter(""); // Reset barangay when city changes
            }} />
            
            {/* Barangay filter toggle */}
            <button
              type="button"
              onClick={() => setShowBarangaySearch(!showBarangaySearch)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                barangayFilter
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
              }`}
            >
              <MapPin className="h-3 w-3" />
              {barangayFilter ? `Brgy. ${barangayFilter}` : "Barangay"}
              {barangayFilter && (
                <X
                  className="h-3 w-3 ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearBarangay();
                  }}
                />
              )}
            </button>
            
            {/* Scrollable filter pills */}
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

          {/* Barangay autocomplete panel (expanded) */}
          {showBarangaySearch && (
            <div className="mt-3 p-3 bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <div className="pl-9 pr-3 py-2">
                    <BarangayAutocomplete
                      value={barangayFilter}
                      onChange={handleBarangayChange}
                      selectedCity={selectedCity}
                      placeholder="Filter by barangay..."
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full h-9 text-xs"
                  onClick={() => {
                    setShowBarangaySearch(false);
                    if (!barangayFilter) {
                      handleClearBarangay();
                    }
                  }}
                >
                  Done
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                Showing stations in <strong>{selectedCity}</strong>
                {barangayFilter && <> → <strong>Brgy. {barangayFilter}</strong></>}
              </p>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Address context header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-bold text-foreground text-lg">
              {isLoading ? "Searching..." : `${totalCount} station${totalCount !== 1 ? 's' : ''}`}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {hasAddressContext ? (
                <>
                  Serving <strong>{barangayFilter ? `Brgy. ${barangayFilter}, ` : ""}{selectedCity}</strong>
                </>
              ) : (
                <>{selectedCity}, PH</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAddressContext && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={handleClearBarangay}
              >
                <X className="h-3 w-3 mr-1" />
                Clear barangay
              </Button>
            )}
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-full text-xs h-8">
                Change address
              </Button>
            </Link>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && !isLoading && (
          <div className="-mx-4">
            <StationMap stations={stations} selectedCity={selectedCity} />
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <>
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
        ) : stations.length > 0 ? (
          <div>
            {/* Featured stations section */}
            {stations.filter(s => s.isFeatured).length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-[10px]">★</span>
                  Featured Stations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stations.filter(s => s.isFeatured).map((station) => (
                    <StationCard key={station.id} station={station} />
                  ))}
                </div>
              </div>
            )}
            {/* Regular stations section */}
            {stations.filter(s => !s.isFeatured).length > 0 && (
              <div>
                {stations.filter(s => s.isFeatured).length > 0 && (
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-1 w-4 rounded-full bg-muted-foreground/30" />
                    All Stations
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stations.filter(s => !s.isFeatured).map((station) => (
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
            <h2 className="text-xl font-bold text-foreground">
              {hasAddressContext
                ? `No stations found in ${barangayFilter ? `Brgy. ${barangayFilter}, ` : ""}${selectedCity}`
                : `No stations found in ${selectedCity}`}
            </h2>
            <p className="text-muted-foreground mt-1">
              {hasAddressContext
                ? "Try searching a different barangay or clear the barangay filter."
                : selectedCity === "Manila"
                  ? "Try adjusting your filters or search terms"
                  : `We're expanding! Try selecting a different city above.`}
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter(null);
                  handleClearBarangay();
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
          </>
        )}
      </main>

      {/* Filter Sidebar/Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowFilters(false)}
          />
          <div className="relative w-full max-w-xs bg-card h-full shadow-xl p-6 flex flex-col border-l border-border">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-card-foreground">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-card-foreground">Sort By</h3>
                <div className="grid grid-cols-1 gap-2">
                  {["Recommended", "Top Rated", "Lowest Price", "Nearest"].map((sort) => (
                    <Button 
                      key={sort} 
                      variant="outline" 
                      className="justify-start rounded-xl font-normal text-muted-foreground"
                    >
                      {sort}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-card-foreground">Barangay</h3>
                <div className="text-sm">
                  <BarangayAutocomplete
                    value={barangayFilter}
                    onChange={handleBarangayChange}
                    selectedCity={selectedCity}
                    placeholder="Filter by barangay..."
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-card-foreground">City</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  Currently browsing: <strong className="text-card-foreground">{selectedCity}</strong>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border flex gap-3">
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

export default function StationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card sticky top-0 z-30 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-11 w-11 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 h-11 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <StationsContent />
    </Suspense>
  );
}