"use client";

// Searchable province picker (type-and-fill) over the full PSGC province
// dataset (82 province-level units: 81 provinces + Metro Manila/NCR).
// Mirrors CityCombobox's trigger pattern; the panel is a flat, searchable
// list ("Metro Manila" first, then alphabetical). Typing narrows instantly
// (accent-insensitive), so there is no long scrollable select.

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, MapPin, Check } from "lucide-react";
import { PH_PROVINCES, normalizeCityName } from "@/lib/ph-locations";
import { cn } from "@/lib/utils";

export interface ProvinceComboboxProps {
  /** Currently selected province display name (e.g. "Bohol", "Metro Manila"). */
  value?: string;
  /** Called with the selected province name (or null when cleared). */
  onChange?: (province: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Height for the trigger, matching form inputs (default min-h-[44px]). */
  triggerClassName?: string;
  /** Red border when the parent form has a validation error. */
  error?: boolean;
}

// Metro Manila first, then alphabetical — matches the dataset ordering used
// by the Part 1 province select (dashboard settings / onboarding).
const PROVINCE_ORDER = [
  ...PH_PROVINCES.filter((p) => p.name === "Metro Manila"),
  ...PH_PROVINCES.filter((p) => p.name !== "Metro Manila").sort((a, b) =>
    a.name.localeCompare(b.name)
  ),
];

export function ProvinceCombobox({
  value,
  onChange,
  placeholder = "Type or select province…",
  disabled = false,
  className,
  triggerClassName,
  error = false,
}: ProvinceComboboxProps) {
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
          "w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors flex items-center justify-between gap-2",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          error ? "border-red-500" : "border-input",
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
          <ProvincePickerPanel
            selectedName={value}
            onSelect={(province) => {
              onChange?.(province);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

interface ProvincePickerPanelProps {
  selectedName?: string;
  onSelect?: (province: string) => void;
  /** Extra classes for sizing (default w-80). */
  className?: string;
}

/**
 * Searchable flat province panel. Idle state lists all 82 province-level
 * units (Metro Manila first); typing narrows to prefix/substring matches.
 */
export function ProvincePickerPanel({ selectedName, onSelect, className }: ProvincePickerPanelProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const q = normalizeCityName(query);
  const results = q
    ? PROVINCE_ORDER.filter((p) => {
        const key = normalizeCityName(p.name);
        return key.startsWith(q) || key.includes(q);
      })
    : PROVINCE_ORDER;

  return (
    <div className={cn("w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden", className)}>
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search province…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {results.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No province found for “{query}”
          </p>
        ) : (
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect?.(p.name)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center gap-2",
                selectedName === p.name
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-card-foreground hover:bg-muted"
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              {p.name === "Metro Manila" && (
                <span className="text-[10px] text-muted-foreground shrink-0">NCR</span>
              )}
              {selectedName === p.name && (
                <Check className="h-4 w-4 shrink-0 text-blue-500" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        82 provinces — 81 provinces + Metro Manila (NCR)
      </div>
    </div>
  );
}
