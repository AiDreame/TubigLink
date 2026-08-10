"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: AppNotification[];
  unreadCount: number;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * In-app notification bell for every logged-in user (customer, provider,
 * admin). Shows an unread-count badge and a dropdown of the latest
 * notifications. Refreshes on open and every 30s while open; clicking an item
 * marks it read and navigates to its link.
 *
 * Variants:
 *  - "header": bell button for a top navigation bar (dropdown opens downward).
 *  - "bottom-nav": bell button for the mobile bottom nav (dropdown opens
 *    upward, centered above the bar).
 */
export function NotificationBell({
  variant = "header",
  className,
}: {
  variant?: "header" | "bottom-nav";
  className?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const json: NotificationsResponse = await res.json();
      setItems(json.items || []);
      setUnreadCount(json.unreadCount || 0);
    } catch (error) {
      console.error("[NotificationBell] fetch failed", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Seed the badge on mount / session ready, and keep polling while open.
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchNotifications();
    if (!open) return;
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status, open, fetchNotifications]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
        setUnreadCount(json.unreadCount ?? 0);
      }
    } catch (error) {
      console.error("[NotificationBell] mark all read failed", error);
    }
  };

  const markRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
        setUnreadCount(json.unreadCount ?? Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("[NotificationBell] mark read failed", error);
    }
  };

  const handleItemClick = (n: AppNotification) => {
    if (!n.readAt) {
      void markRead(n.id);
    }
    setOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const unreadItems = items.filter((n) => !n.readAt);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          if (!open) void fetchNotifications();
          setOpen((v) => !v);
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-colors",
          variant === "header"
            ? "h-10 w-10 hover:bg-muted dark:hover:bg-gray-800"
            : "h-12 w-12 rounded-xl touch-target"
        )}
      >
        <Bell
          className={cn(
            "h-5 w-5",
            variant === "header" ? "text-muted-foreground" : "text-muted-foreground"
          )}
        />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold shadow-sm",
              variant === "header"
                ? "-top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 text-[9px]"
                : "-top-0.5 -right-0.5 h-5 min-w-[20px] px-1 text-[10px]"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[100] w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
            variant === "header"
              ? "right-0 top-full mt-2"
              : "bottom-full left-1/2 mb-3 -translate-x-1/2"
          )}
          role="menu"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            {unreadItems.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    !n.readAt && "bg-blue-50/60 dark:bg-blue-900/10"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-blue-500"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/my/notifications");
              }}
              className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
