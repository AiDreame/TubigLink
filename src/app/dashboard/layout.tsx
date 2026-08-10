"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  LogOut,
  Droplets,
  Store,
  Users,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";

const sidebarItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Orders", icon: ShoppingBag, href: "/dashboard/orders" },
  { label: "Disputes", icon: AlertTriangle, href: "/dashboard/disputes" },
  { label: "Products", icon: Package, href: "/dashboard/products" },
  { label: "Staff", icon: Users, href: "/dashboard/staff" },
  { label: "Earnings", icon: BarChart3, href: "/dashboard/earnings" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const driverSidebarItems = [
  { label: "My Deliveries", icon: Truck, href: "/dashboard/driver" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session, status } = useSession();

  const staffRole = (session?.user as any)?.staffRole;
  const isDriver = staffRole === "DRIVER";
  const isStaff = !!staffRole;
  const isDriverPage = pathname === "/dashboard/driver";

  // Redirect drivers to their page
  useEffect(() => {
    if (status === "loading") return;
    if (isDriver && !isDriverPage) {
      router.replace("/dashboard/driver");
    }
  }, [isDriver, isDriverPage, status, router]);

  // Driver sees a minimal layout
  if (isDriver && isDriverPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <header className="h-16 bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight dark:text-white">
              AquaLink <span className="text-blue-600">Driver</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm">
              {(session?.user?.name || "D")[0].toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 rounded-xl"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 z-50 transition-transform lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight dark:text-white">AquaLink <span className="text-blue-600">Pro</span></span>
          </div>

          <nav className="flex-1 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/30" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t dark:border-gray-800">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                {session?.user?.name?.[0] || "P"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate dark:text-white">{session?.user?.name || "Provider"}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">Station Owner</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden dark:text-gray-400"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="font-bold text-gray-800 dark:text-gray-100 hidden sm:block">Dashboard</h1>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800">
              Station Active
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button asChild variant="outline" size="sm" className="rounded-full hidden sm:flex dark:border-gray-700 dark:text-gray-300">
              <Link href={`/stations/${(session?.user as any)?.stationSlug || "my-station"}`}>View Store</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
