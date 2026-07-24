"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/hooks/use-cart";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Update viewport theme-color meta tag when theme changes
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      meta.setAttribute("content", isDark ? "#0f172a" : "#2563eb");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="aqualink-ph-theme"
        disableTransitionOnChange={false}
      >
        <CartProvider>{children}</CartProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}