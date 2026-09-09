"use client";

// Searchable city/municipality picker over the full PH PSGC dataset
// (src/lib/ph-locations.ts). Used by station onboarding and dashboard
// settings. The picker panel is also exported so the homepage CitySelector
// reuses the same search + grouped-list behaviour with its own trigger.

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, MapPin, Check, ChevronRight } from "lucide-react";
import {
  PH_PROVINCES,
  PH_REGIONS,
  citiesByProvince,
  getCitiesGroupedByRegion,
  normalizeSearchKey,
  provinceRegion,
  searchCities,
  type CityLocation,
  type CitySearchResult,
} from "@/lib/ph-locations";
import { cn } from "@/lib/utils";

export interface CitySelection {
  name: string;
  province: string;
  region: string;
  isCity: boolean;
  /**
   * Set when the user picked a whole province ("All of {province}"),
   * either by clicking a province header or a province search result.
   * When set, `province` holds the province name and `name` is "".
   */
  provinceSelect?: string;
}

interface CityComboboxProps {
  /** Currently selected city display name (e.g. "Makati", "Buenavista"). */
  value?: string;
  /** Called with the selected city (or null when cleared). */
  onChange?: (city: CitySelection | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Height for the trigger, matching form inputs (default min-h-[44px]). */
  triggerClassName?: string;
  /**
   * Optional province filter: when set, the panel only lists/search shows
   * cities/municipalities of that province (e.g. "Bohol"). Leave unset for
   * the full national dataset.
   */
  province?: string;
}

export function CityCombobox({
  value,
  onChange,
  placeholder = "Search city or municipality…",
  disabled = false,
  className,
  triggerClassName,
  province,
}: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors flex items-center justify-between gap-2",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          disabled && "opacity-50 cursor-not-allowed hover:bg-background",
          triggerClassName ?? "min-h-[44px]"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={cn("flex items-center gap-2 truncate", !value && "text-muted-foreground")}>
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{value || placeholder}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50">
          <CityPickerPanel
            selectedName={value}
            provinceFilter={province}
            onSelect={(city) => {
              onChange?.(city);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

interface CityPickerPanelProps {
  selectedName?: string;
  /** Currently selected province ("all cities in this province"), if any. */
  selectedProvince?: string;
  onSelect?: (city: CitySelection) => void;
  /** Extra classes for sizing (default w-80). */
  className?: string;
  /** When set, restrict the panel to this province's cities/municipalities. */
  provinceFilter?: string;
}

/**
 * Provinces whose name matches the query (prefix first, then substring),
 * capped at 5, each with its region id and city count. Rendered as
 * "All of {province}" selectable rows above the city results.
 */
function provinceSearchMatches(query: string): { province: string; region: string; cityCount: number }[] {
  const q = normalizeSearchKey(query);
  if (!q) return [];
  const scored: { name: string; score: number }[] = [];
  for (const p of PH_PROVINCES) {
    const key = normalizeSearchKey(p.name);
    if (key === q || key.startsWith(q)) scored.push({ name: p.name, score: 0 });
    else if (key.includes(q)) scored.push({ name: p.name, score: 1 });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map(({ name }) => ({
      province: name,
      region: provinceRegion(name),
      cityCount: citiesByProvince(name).length,
    }));
}

/**
 * Searchable, region→province grouped picker panel. Idle state shows
 * "Metro Manila" expanded (NCR first) and the other regions collapsed;
 * typing switches to flat ranked results across city/province/region.
 * With a `provinceFilter`, the panel becomes a flat list of that province's
 * cities (search stays within the province).
 */
export function CityPickerPanel({ selectedName, selectedProvince, onSelect, className, provinceFilter }: CityPickerPanelProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ncr"]));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the search box when the panel opens (small delay for layout).
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const provinceCities = provinceFilter
    ? citiesByProvince(provinceFilter).slice().sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const q = query.trim();
  // Idle (no query): with provinceFilter, flat list of that province's cities.
  // With a query: city results + matching provinces as "All of {province}" rows.
  const results: CitySearchResult[] = q
    ? searchCities(q, 60).filter((r) => !provinceFilter || r.province === provinceFilter)
    : [];
  const provinceMatches: { province: string; region: string; cityCount: number }[] = q && !provinceFilter
    ? provinceSearchMatches(q)
    : [];
  const grouped = getCitiesGroupedByRegion();

  const pick = (city: CityLocation) => {
    onSelect?.({ name: city.name, province: city.province, region: city.region, isCity: city.isCity });
  };

  const pickProvince = (province: string, region: string) => {
    onSelect?.({ name: "", province, region, isCity: false, provinceSelect: province });
  };

  const toggleRegion = (regionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  };

  return (
    <div className={cn("w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden", className)}>
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search city, province, or region…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {q ? (
          results.length === 0 && provinceMatches.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No city found for “{query}”
            </p>
          ) : (
            <>
              {provinceMatches.map((pm) => (
                <button
                  key={`prov:${pm.province}`}
                  type="button"
                  onClick={() => pickProvince(pm.province, pm.region)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2",
                    selectedProvince === pm.province
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "text-card-foreground hover:bg-muted"
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">All of {pm.province}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      Province · {pm.cityCount} {pm.cityCount === 1 ? "city/municipality" : "cities & municipalities"}
                    </span>
                  </span>
                  {selectedProvince === pm.province && (
                    <Check className="h-4 w-4 shrink-0 text-blue-500" />
                  )}
                </button>
              ))}
              {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pick(r)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2",
                  selectedName === r.name
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-card-foreground hover:bg-muted"
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{r.label}</span>
                </span>
                {selectedName === r.name && (
                  <Check className="h-4 w-4 shrink-0 text-blue-500" />
                )}
              </button>
              ))}
            </>
          )
        ) : provinceFilter ? (
          <div className="space-y-0.5">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {provinceFilter}
            </div>
            {provinceCities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => pick(city)}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                  selectedName === city.name
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-card-foreground hover:bg-muted"
                )}
              >
                <span className="truncate">{city.name}</span>
                {!city.isCity && (
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">mun.</span>
                )}
                {selectedName === city.name && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        ) : (
          grouped.map((group) => {
            const isExpanded = expanded.has(group.regionId);
            return (
              <div key={group.regionId}>
                <button
                  type="button"
                  onClick={() => toggleRegion(group.regionId)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-between",
                    isExpanded
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span>{group.regionName}</span>
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                </button>
                {isExpanded &&
                  group.provinces.map((prov) => (
                    <div key={prov.province} className="pl-2">
                      <button
                        type="button"
                        onClick={() => pickProvince(prov.province, group.regionId)}
                        title={`All of ${prov.province}`}
                        className={cn(
                          "w-full text-left px-2 py-1 text-[10px] font-semibold rounded-md transition-colors flex items-center gap-1",
                          selectedProvince === prov.province
                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                            : "text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{prov.province}</span>
                        <span className="ml-auto shrink-0 font-normal opacity-70">
                          All{selectedProvince === prov.province ? " ✓" : ""}
                        </span>
                      </button>
                      {prov.cities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => pick(city)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                            selectedName === city.name
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                              : "text-card-foreground hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{city.name}</span>
                          {!city.isCity && (
                            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">mun.</span>
                          )}
                          {selectedName === city.name && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{PH_REGIONS.length} regions · 82 provinces</span>
        <span>1,634 cities & municipalities</span>
      </div>
    </div>
  );
}
