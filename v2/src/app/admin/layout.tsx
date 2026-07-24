"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldAlert, 
  Users, 
  Store, 
  BarChart3, 
  Settings, 
  Bell, 
  Menu, 
  X,
  LogOut,
  Droplets,
  CheckCircle,
  FileText,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";

const sidebarItems = [
  { label: "Overview", icon: BarChart3, href: "/admin" },
  { label: "Stations", icon: Store, href: "/admin/stations" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Verifications", icon: CheckCircle, href: "/admin/verification" },
  { label: "Documents", icon: FileText, href: "/admin/verification/documents" },
  { label: "Transactions", icon: ShoppingBag, href: "/admin/transactions" },
  { label: "Compliance", icon: ShieldAlert, href: "/admin/compliance" },
  { label: "Reports", icon: FileText, href: "/admin/compliance/reports" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 text-white z-50 transition-transform lg:translate-x-0 lg:static lg:block",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">AquaLink <span className="text-blue-500">Admin</span></span>
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
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
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
        <header className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden dark:text-slate-400"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-800 dark:text-slate-100 hidden sm:block uppercase text-xs tracking-widest">Admin Control Panel</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2 hidden md:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{session?.user?.name}</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border dark:border-slate-700">
              {session?.user?.name?.[0] || "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}