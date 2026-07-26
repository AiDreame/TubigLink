"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin, Search, X } from "lucide-react";
import { ALL_SUPPORTED_CITIES, SAMPLE_BARANGAYS } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────

export interface LocationResult {
  barangay: string;
  city: string;
  province: string;
}

interface IndexedLocation extends LocationResult {
  searchKey: string;
}

interface AddressAutocompleteProps {
  /** Controlled display value (optional — defaults to building from defaults) */
  value?: string;
  /** Called when user selects a location */
  onChange: (result: LocationResult) => void;
  /** Pre-populate with existing barangay */
  defaultBarangay?: string;
  /** Pre-populate with existing city */
  defaultCity?: string;
  /** Pre-populate with existing province */
  defaultProvince?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
  disabled?: boolean;
}

// ─── Searchable Index (built once at module level) ──

function buildSearchableIndex(): IndexedLocation[] {
  const results: IndexedLocation[] = [];
  const seenKeys = new Set<string>();

  // Track seen provinces/cities to avoid duplicating province-only and city-only entries
  const seenProvinces = new Set<string>();
  const seenCities = new Set<string>();

  for (const city of ALL_SUPPORTED_CITIES) {
    const barangays = SAMPLE_BARANGAYS[city.id] || [];
    const cityName = city.label;
    const provinceName = city.province;

    // Add barangay-level entries (full path)
    for (const brgy of barangays) {
      const searchKey = `${brgy} ${cityName} ${provinceName}`.toLowerCase();
      if (!seenKeys.has(searchKey)) {
        seenKeys.add(searchKey);
        results.push({
          barangay: brgy,
          city: cityName,
          province: provinceName,
          searchKey,
        });
      }
    }

    // Add city-level entry (once per unique city+province combo)
    const cityComboKey = `${cityName}||${provinceName}`;
    if (!seenCities.has(cityComboKey)) {
      seenCities.add(cityComboKey);
      const searchKey = `${cityName} ${provinceName}`.toLowerCase();
      results.push({
        barangay: "",
        city: cityName,
        province: provinceName,
        searchKey,
      });
    }

    // Add province-only entry (once per province)
    if (!seenProvinces.has(provinceName)) {
      seenProvinces.add(provinceName);
      const searchKey = provinceName.toLowerCase();
      results.push({
        barangay: "",
        city: "",
        province: provinceName,
        searchKey,
      });
    }
  }

  return results;
}

const SEARCHABLE_LOCATIONS = buildSearchableIndex();

// ─── Component ────────────────────────────────────

export function AddressAutocomplete({
  value,
  onChange,
  defaultBarangay,
  defaultCity,
  defaultProvince,
  placeholder = "Search barangay, city, or province...",
  className,
  error,
  id,
  disabled = false,
}: AddressAutocompleteProps) {
  // Build initial display from defaults
  const buildInitialDisplay = () => {
    if (value) return value;
    const parts: string[] = [];
    if (defaultBarangay) parts.push(defaultBarangay);
    if (defaultCity) parts.push(defaultCity);
    if (defaultProvince) parts.push(defaultProvince);
    return parts.join(", ");
  };

  const [inputValue, setInputValue] = useState(buildInitialDisplay);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(inputValue, 300);

  // Filter results based on debounced query
  const filteredResults = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    if (!query || query.length < 2) return [];

    // Score and sort: exact substring matches first, then prefix matches
    const matches = SEARCHABLE_LOCATIONS
      .filter((loc) => loc.searchKey.includes(query))
      .map((loc) => {
        const idx = loc.searchKey.indexOf(query);
        return { loc, idx };
      })
      .sort((a, b) => {
        // Prefer earlier matches in the string
        if (a.idx !== b.idx) return a.idx - b.idx;
        // Then prefer barangay entries (most specific)
        const aHasBrgy = a.loc.barangay ? 0 : 1;
        const bHasBrgy = b.loc.barangay ? 0 : 1;
        return aHasBrgy - bHasBrgy;
      })
      .map((m) => m.loc)
      .slice(0, 15);

    return matches;
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (loc: IndexedLocation) => {
      const display = loc.barangay
        ? `${loc.barangay}, ${loc.city}, ${loc.province}`
        : loc.city
          ? `${loc.city}, ${loc.province}`
          : loc.province;
      setInputValue(display);
      onChange({
        barangay: loc.barangay,
        city: loc.city,
        province: loc.province,
      });
      setIsOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onChange({ barangay: "", city: "", province: "" });
    inputRef.current?.focus();
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  }, [inputValue]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-9 pr-8 py-2 text-sm rounded-xl border bg-background outline-none",
            "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
            "min-h-[44px]",
            error ? "border-red-500" : "border-input",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filteredResults.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredResults.map((loc, i) => {
              const isBrgy = !!loc.barangay;
              const isCity = !!loc.city && !loc.barangay;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-3",
                    "text-card-foreground hover:bg-muted"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isBrgy
                        ? "text-blue-500"
                        : isCity
                          ? "text-orange-500"
                          : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1">
                    {isBrgy ? (
                      <>
                        <strong className="text-blue-600 dark:text-blue-400">
                          {loc.barangay}
                        </strong>
                        <span className="text-muted-foreground">
                          , {loc.city}, {loc.province}
                        </span>
                      </>
                    ) : isCity ? (
                      <>
                        <strong>{loc.city}</strong>
                        <span className="text-muted-foreground">
                          , {loc.province}
                        </span>
                      </>
                    ) : (
                      <strong>{loc.province}</strong>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {isBrgy ? "Barangay" : isCity ? "City" : "Province"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
