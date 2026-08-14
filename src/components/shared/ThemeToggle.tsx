"use client";

import { useTheme } from "next-themes";
import { Check, Moon, Monitor, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "header" | "settings";
  /** For settings page — show as a row with label + switch */
  asSwitch?: boolean;
}

const modes = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
] as const;

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
    return <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />;
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

  // Header variant — compact icon button with a theme dropdown
  const currentMode = modes.find((m) => m.key === theme) ?? modes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Select theme"
        >
          <CurrentIcon className="h-4 w-4 text-blue-600 dark:text-yellow-400" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-gray-400 font-medium">Theme</DropdownMenuLabel>
        {modes.map(({ key, icon: Icon, label }) => (
          <DropdownMenuItem key={key} onClick={() => setTheme(key)} className="gap-2.5 cursor-pointer">
            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {theme === key && <Check className="h-4 w-4 text-blue-600 dark:text-yellow-400" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
