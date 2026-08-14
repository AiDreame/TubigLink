"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "header" | "settings";
  /** For settings page — show as a row with label + switch */
  asSwitch?: boolean;
}

export function ThemeToggle({ variant = "header", asSwitch = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder to prevent layout shift
    if (variant === "settings") {
      return (
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
            <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-200">Dark Mode</span>
        </div>
      );
    }
    return <div className="h-8 w-[108px] rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  if (asSwitch || variant === "settings") {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            isDark ? "bg-yellow-50 text-yellow-600" : "bg-slate-50 text-slate-600"
          )}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-200">Dark Mode</p>
            <p className="text-[10px] text-gray-400">{isDark ? "On" : "Off"}</p>
          </div>
        </div>
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            isDark ? "bg-blue-600" : "bg-gray-200"
          )}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform",
              isDark ? "translate-x-[22px]" : "translate-x-[2px]"
            )}
          />
        </button>
      </div>
    );
  }

  // Header variant — three toggle buttons
  const modes = [
    { key: "light", icon: Sun, label: "Light mode" },
    { key: "dark", icon: Moon, label: "Dark mode" },
    { key: "system", icon: Monitor, label: "System theme" },
  ] as const;

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-full p-0.5" role="radiogroup" aria-label="Theme selector">
      {modes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
            theme === key
              ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-yellow-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
          aria-label={label}
          role="radio"
          aria-checked={theme === key}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}