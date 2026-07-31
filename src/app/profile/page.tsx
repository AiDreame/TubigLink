"use client";

import { useState } from "react";
import { 
  ArrowLeft,
  User, 
  MapPin, 
  Bell, 
  CreditCard, 
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Mail,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MESSAGES, APP_NAME } from "@/lib/constants";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const user = session?.user;
  const isLoading = status === "loading";

  const menuItems = [
    { 
      label: MESSAGES.myAddresses, 
      icon: MapPin, 
      href: "/profile/addresses",
      color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
    },
    { 
      label: MESSAGES.orderHistory, 
      icon: History, 
      href: "/orders",
      color: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
    },
    { 
      label: MESSAGES.notifications, 
      icon: Bell, 
      href: "/profile/notifications",
      color: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
    },
    { 
      label: MESSAGES.paymentMethods, 
      icon: CreditCard, 
      href: "/profile/payments",
      color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
    },
  ];

  const supportItems = [
    { label: MESSAGES.settings, icon: Settings, href: "/profile/settings" },
    { label: MESSAGES.helpSupport, icon: ShieldCheck, href: "/help" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-24 rounded-full bg-muted mx-auto" />
          <div className="h-6 w-48 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-blue-200 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign in to view your profile</h1>
        <p className="text-muted-foreground mt-2">Log in to manage your addresses, orders, and settings.</p>
        <Button asChild className="mt-6 rounded-2xl px-8 h-12">
          <Link href="/auth/login">Log In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card px-6 pt-12 pb-6 rounded-b-[3rem] shadow-sm border-b border-border">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px] -ml-2" onClick={() => router.push("/")} aria-label="Go back home">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 border-4 border-blue-50 dark:border-blue-900/30 shadow-xl">
            <AvatarImage src={user?.image || ""} alt={user?.name || "Profile"} />
            <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
              {user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold text-foreground">{user?.name || "AquaLink User"}</h1>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
              <Smartphone className="h-3 w-3" aria-hidden="true" />
              {(user as any)?.phone || "No phone linked"}
            </p>
          </div>

          <div className="flex gap-4 mt-8 w-full max-w-xs">
            <div className="flex-1 bg-muted rounded-2xl p-3 text-center border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Orders</p>
              <p className="text-lg font-bold text-foreground">12</p>
            </div>
            <div className="flex-1 bg-muted rounded-2xl p-3 text-center border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Points</p>
              <p className="text-lg font-bold text-foreground">450</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Account</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            {menuItems.map((item, index) => (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center justify-between p-4 hover:bg-muted transition-colors min-h-[56px] ${
                  index !== menuItems.length - 1 ? "border-b border-border" : ""
                }`}
                aria-label={item.label}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-bold text-card-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">More</h2>
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
            {supportItems.map((item, index) => (
              <Link 
                key={item.label} 
                href={item.href}
                className={`flex items-center justify-between p-4 hover:bg-muted transition-colors min-h-[56px] ${
                  index !== supportItems.length - 1 ? "border-b border-border" : ""
                }`}
                aria-label={item.label}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-bold text-card-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 font-bold min-h-[44px]"
          onClick={() => {
            setIsSigningOut(true);
            signOut({ callbackUrl: "/auth/login" });
          }}
          disabled={isSigningOut}
          aria-label="Log out of your account"
        >
          <LogOut className="h-5 w-5 mr-2" aria-hidden="true" />
          {isSigningOut ? "Signing out..." : MESSAGES.logOut}
        </Button>

        <p className="text-center text-[10px] text-muted-foreground mt-8">
          {APP_NAME} v1.0.0 • Made with ❤️ in PH 🇵🇭
        </p>
      </main>
    </div>
  );
}