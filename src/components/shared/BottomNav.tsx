"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User, LayoutDashboard, Map, Droplets } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { NotificationBell } from "@/components/shared/NotificationBell";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const role = (session?.user as any)?.role;
  const isProvider = role === "PROVIDER";
  const isAdmin = role === "ADMIN";
  const isCustomer = role === "CUSTOMER";

  // Hide on auth pages, dashboard, admin, and cart (cart has its own sticky checkout bar)
  const hiddenRoutes = ["/auth/", "/dashboard", "/admin", "/cart"];
  if (hiddenRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  // CUSTOMER-specific nav: Dashboard (home), Map (browse), Cart, Profile
  const customerNavItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/stations", label: "Map", icon: Map },
    { href: "/cart", label: "Cart", icon: ShoppingCart, requiresAuth: true },
    { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
  ];

  // Default nav for visitors / unauthenticated
  const defaultNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/stations", label: "Browse", icon: Search },
    { href: "/cart", label: "Cart", icon: ShoppingCart, requiresAuth: true },
    { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
  ];

  let items = isCustomer ? [...customerNavItems] : [...defaultNavItems];

  // Provider gets a Dashboard link
  if (isProvider) {
    items.splice(3, 0, { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresAuth: true });
  }
  // Admin gets an Admin link
  if (isAdmin) {
    items.splice(3, 0, { href: "/admin", label: "Admin", icon: LayoutDashboard, requiresAuth: true });
  }

  return (
    <nav className="md:hidden bottom-nav bg-background/95 backdrop-blur-md border-t" role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-around py-1">
        {session && (
          <NotificationBell variant="bottom-nav" />
        )}
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isCart = item.href === "/cart";
          return (
            <Link
              key={item.href}
              href={item.requiresAuth && !session ? "/auth/login" : item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors touch-target justify-center",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}