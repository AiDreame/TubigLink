"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Star,
  Package,
  Wallet,
  ShieldAlert,
  Info,
  Tag,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { format } from "date-fns";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────
interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────
function getNotificationIcon(type: string) {
  switch (type) {
    case "ORDER_NEW":
      return <Package className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    case "ORDER_STATUS":
      return <Package className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    case "PAYOUT":
      return <Wallet className="h-4 w-4 text-green-500" aria-hidden="true" />;
    case "DISPUTE":
      return <ShieldAlert className="h-4 w-4 text-red-500" aria-hidden="true" />;
    case "SYSTEM":
      return <Info className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    case "PROMO":
      return <Tag className="h-4 w-4 text-green-500" aria-hidden="true" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  }
}

function getNotificationBg(type: string, isRead: boolean) {
  if (isRead) return "bg-card";
  switch (type) {
    case "ORDER_NEW":
      return "bg-blue-50 dark:bg-blue-900/10";
    case "ORDER_STATUS":
      return "bg-blue-50 dark:bg-blue-900/10";
    case "PAYOUT":
      return "bg-green-50 dark:bg-green-900/10";
    case "DISPUTE":
      return "bg-red-50 dark:bg-red-900/10";
    case "SYSTEM":
      return "bg-gray-50 dark:bg-gray-900/10";
    case "PROMO":
      return "bg-green-50 dark:bg-green-900/10";
    default:
      return "bg-card";
  }
}

function getNotificationHref(notification: Notification): string | null {
  return notification.link || null;
}

// ─── Main Page ────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const fetchNotifications = async () => {
    if (sessionStatus !== "authenticated") return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      if (json && Array.isArray(json.items)) {
        setNotifications(json.items);
      } else {
        throw new Error(json.error || "Failed to fetch notifications");
      }
    } catch (err: any) {
      console.error("Notifications fetch error:", err);
      setError(err.message || "Hindi makuha ang notifications. Pakisubukan muli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchNotifications();
    } else if (sessionStatus === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/my/notifications");
    }
  }, [sessionStatus]);

  const handleMarkRead = async (id: string) => {
    setMarkingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n))
        );
      } else {
        throw new Error(json.error || "Failed to mark as read");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark notification as read");
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
        toast.success("All notifications marked as read");
      } else {
        throw new Error(json.error || "Failed to mark all as read");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark all as read");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.readAt) {
      handleMarkRead(notification.id);
    }
    // Navigate if there's a valid link
    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // ── Loading State ──
  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full min-h-[44px] min-w-[44px]"
              onClick={() => router.push("/my")}
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4">
          <ErrorState
            title="Hindi ma-load ang notifications"
            message={error}
            onRetry={fetchNotifications}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full min-h-[44px] min-w-[44px]"
              onClick={() => router.push("/my")}
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="rounded-full bg-blue-600 text-white text-xs px-2 py-0.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 text-xs font-medium rounded-xl min-h-[44px]"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {/* ── Empty State ── */}
        {notifications.length === 0 && (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            message="You'll see updates about your orders, reviews, and promotions here."
            action={{
              label: "Back to Dashboard",
              onClick: () => router.push("/my"),
            }}
          />
        )}

        {/* ── Notification List ── */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const href = getNotificationHref(notification);
              const isClickable = !!href;
              const isMarking = markingIds.has(notification.id);

              return (
                <div
                  key={notification.id}
                  className={`relative rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    isClickable ? "cursor-pointer hover:shadow-md" : ""
                  } ${getNotificationBg(notification.type, !!notification.readAt)}`}
                  onClick={() => isClickable && handleNotificationClick(notification)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={`${notification.title}: ${notification.body}`}
                  onKeyDown={(e) => {
                    if (isClickable && e.key === "Enter") {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Unread indicator */}
                    {!notification.readAt && (
                      <div className="absolute top-3 left-3 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    )}

                    {/* Icon */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        notification.readAt
                          ? "bg-muted"
                          : "bg-white dark:bg-gray-800 shadow-sm"
                      } ${!notification.readAt ? "ml-1" : ""}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm font-bold truncate ${
                            notification.readAt
                              ? "text-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {isClickable && (
                          <ChevronRight
                            className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5 uppercase tracking-wider">
                        {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Mark as read button for unread non-clickable notifications */}
                  {!notification.readAt && !isClickable && (
                    <div className="px-4 pb-3 pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 h-auto py-1 px-2 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification.id);
                        }}
                        disabled={isMarking}
                      >
                        {isMarking ? "Marking..." : "Mark as read"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
