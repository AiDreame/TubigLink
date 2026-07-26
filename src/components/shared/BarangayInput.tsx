"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MapPin, X } from "lucide-react";
import { SAMPLE_BARANGAYS } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────

interface BarangaySuggestion {
  barangay: string;
  city: string;
}

export interface BarangayInputProps {
  /** Current barangay value (controlled) */
  value: string;
  /** Called when barangay changes (select or free-text commit on blur) */
  onChange: (barangay: string) => void;
  /** Optional: auto-fill city when user picks a suggestion */
  onCityChange?: (city: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  id?: string;
  disabled?: boolean;
}

// ─── Flat searchable index (built once at module level) ──

function buildFlatBarangayList(): BarangaySuggestion[] {
  const results: BarangaySuggestion[] = [];
  const seen = new Set<string>();
  for (const [city, barangays] of Object.entries(SAMPLE_BARANGAYS)) {
    for (const brgy of barangays) {
      const key = `${brgy.toLowerCase()}||${city.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ barangay: brgy, city });
      }
    }
  }
  // Sort alphabetically by barangay name
  results.sort((a, b) => a.barangay.localeCompare(b.barangay));
  return results;
}

const FLAT_BARANGAYS = buildFlatBarangayList();

// ─── Component ────────────────────────────────────

export function BarangayInput({
  value,
  onChange,
  onCityChange,
  placeholder = "Enter your barangay...",
  className,
  error,
  id,
  disabled = false,
}: BarangayInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(inputValue, 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef(false); // true when user picked from dropdown

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtered suggestions based on debounced query
  const suggestions = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    return FLAT_BARANGAYS
      .filter((b) => b.barangay.toLowerCase().includes(q))
      .slice(0, 15);
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

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Select a suggestion from dropdown
  const handleSelect = useCallback(
    (suggestion: BarangaySuggestion) => {
      selectedRef.current = true;
      setInputValue(suggestion.barangay);
      onChange(suggestion.barangay);
      if (onCityChange) onCityChange(suggestion.city);
      setIsOpen(false);
    },
    [onChange, onCityChange]
  );

  // Free-text typing — update local state only, commit on blur
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      selectedRef.current = false;
      setInputValue(e.target.value);
      setIsOpen(true);
    },
    []
  );

  // On blur: commit free-text value (unless user just selected from dropdown)
  const handleBlur = useCallback(() => {
    // Small delay so dropdown click registers before blur fires
    setTimeout(() => {
      if (!selectedRef.current) {
        // Commit whatever the user typed as free-text
        onChange(inputValue);
      }
      setIsOpen(false);
    }, 150);
  }, [inputValue, onChange]);

  const handleClear = useCallback(() => {
    selectedRef.current = true;
    setInputValue("");
    onChange("");
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
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
            aria-label="Clear barangay"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-1">
            {suggestions.map((s, i) => (
              <button
                key={`${s.barangay}-${s.city}-${i}`}
                type="button"
                onClick={() => handleSelect(s)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-3",
                  "text-card-foreground hover:bg-muted",
                  value === s.barangay &&
                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                )}
              >
                <MapPin
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    value === s.barangay
                      ? "text-blue-500"
                      : "text-muted-foreground"
                  )}
                />
                <span className="flex-1">
                  <strong
                    className={
                      value === s.barangay
                        ? "text-blue-600 dark:text-blue-400"
                        : ""
                    }
                  >
                    {s.barangay}
                  </strong>
                  <span className="text-muted-foreground">
                    , {s.city}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
