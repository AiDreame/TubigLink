"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Crosshair, ChevronDown, Search } from "lucide-react";
import { SAMPLE_BARANGAYS } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface BarangayAutocompleteProps {
  value: string;
  onChange: (barangay: string) => void;
  selectedCity: string;
  placeholder?: string;
  onUseMyLocation?: () => void;
  isLocating?: boolean;
  className?: string;
}

export function BarangayAutocomplete({
  value,
  onChange,
  selectedCity,
  placeholder = "Enter your barangay...",
  onUseMyLocation,
  isLocating = false,
  className,
}: BarangayAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const debouncedQuery = useDebounce(searchQuery, 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get barangays for the selected city
  const barangays = selectedCity
    ? SAMPLE_BARANGAYS[selectedCity] || []
    : [];

  // Filter barangays based on search query
  const filteredBarangays = barangays.filter((b) =>
    b.toLowerCase().includes(debouncedQuery.toLowerCase())
  ).slice(0, 20); // Limit to 20 results for performance

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync internal value with external value
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleSelect = useCallback(
    (barangay: string) => {
      setSearchQuery(barangay);
      onChange(barangay);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchQuery(newValue);
      setIsOpen(true);
      // Only clear the parent value if the input is empty
      if (newValue === "") {
        onChange("");
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    if (barangays.length > 0) {
      setIsOpen(true);
    }
  }, [barangays.length]);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={!selectedCity}
          className={cn(
            "w-full bg-transparent outline-none text-sm",
            !selectedCity && "opacity-50 cursor-not-allowed",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500"
          )}
          aria-label="Enter your barangay"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label="Clear barangay"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && selectedCity && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search barangay..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          {/* Use my location button */}
          {onUseMyLocation && (
            <button
              type="button"
              onClick={() => {
                onUseMyLocation();
                setIsOpen(false);
              }}
              disabled={isLocating}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-b border-border transition-colors"
            >
              <Crosshair
                className={cn(
                  "h-4 w-4 shrink-0",
                  isLocating && "animate-spin"
                )}
              />
              <span>
                {isLocating
                  ? "Detecting your location..."
                  : "Use my current location"}
              </span>
            </button>
          )}

          {/* Barangay header */}
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>Barangays in {selectedCity}</span>
          </div>

          {/* Barangay list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredBarangays.length > 0 ? (
              filteredBarangays.map((barangay) => (
                <button
                  key={barangay}
                  type="button"
                  onClick={() => handleSelect(barangay)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-3",
                    value === barangay
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                      : "text-card-foreground hover:bg-muted"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      value === barangay
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1">{barangay}</span>
                  {value === barangay && (
                    <span className="text-[10px] text-blue-500 font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? `No barangay matching "${searchQuery}"`
                  : "No barangays available for this city"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}