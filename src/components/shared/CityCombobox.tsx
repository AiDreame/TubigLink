"use client";

// Searchable city/municipality picker over the full PH PSGC dataset
// (src/lib/ph-locations.ts). Used by station onboarding and dashboard
// settings. The picker panel is also exported so the homepage CitySelector
// reuses the same search + grouped-list behaviour with its own trigger.

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, MapPin, Check, ChevronRight } from "lucide-react";
import {
  PH_REGIONS,
  getCitiesGroupedByRegion,
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
}

export function CityCombobox({
  value,
  onChange,
  placeholder = "Search city or municipality…",
  disabled = false,
  className,
  triggerClassName,
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
  onSelect?: (city: CitySelection) => void;
  /** Extra classes for sizing (default w-80). */
  className?: string;
}

/**
 * Searchable, region→province grouped picker panel. Idle state shows
 * "Metro Manila" expanded (NCR first) and the other regions collapsed;
 * typing switches to flat ranked results across city/province/region.
 */
export function CityPickerPanel({ selectedName, onSelect, className }: CityPickerPanelProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ncr"]));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the search box when the panel opens (small delay for layout).
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const results: CitySearchResult[] = query.trim() ? searchCities(query, 60) : [];
  const grouped = getCitiesGroupedByRegion();

  const pick = (city: CityLocation) => {
    onSelect?.({ name: city.name, province: city.province, region: city.region, isCity: city.isCity });
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
        {query.trim() ? (
          results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No city found for “{query}”
            </p>
          ) : (
            results.map((r) => (
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
            ))
          )
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
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        {prov.province}
                      </div>
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
