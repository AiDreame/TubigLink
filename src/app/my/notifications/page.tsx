"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Droplets,
  Truck,
  Package,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";

interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: string, title: string) => {
  if (title.toLowerCase().includes("cancelled")) {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  if (title.toLowerCase().includes("delivered")) {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (title.toLowerCase().includes("out for delivery") || title.toLowerCase().includes("on the way")) {
    return <Truck className="h-5 w-5 text-blue-500" />;
  }
  if (title.toLowerCase().includes("preparing") || title.toLowerCase().includes("accepted")) {
    return <Package className="h-5 w-5 text-yellow-500" />;
  }
  if (title.toLowerCase().includes("pending") || title.toLowerCase().includes("received")) {
    return <Clock className="h-5 w-5 text-amber-500" />;
  }
  return <Bell className="h-5 w-5 text-muted-foreground" />;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      } else {
        throw new Error(json.error || "Failed to load notifications");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
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

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClickNotification = async (notif: AppNotification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationIds: [notif.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {}
    }
    // Navigate to order if applicable
    try {
      const data = notif.data ? JSON.parse(notif.data) : null;
      if (data?.orderId) {
        router.push(`/orders/${data.orderId}`);
      }
    } catch {}
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card sticky top-0 z-30 border-b px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/my")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card sticky top-0 z-30 border-b px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full min-h-[44px] min-w-[44px]" onClick={() => router.push("/my")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        <main className="max-w-2xl mx-auto p-4">
          <ErrorState
            title="Failed to load notifications"
            message={error}
            onRetry={fetchNotifications}
          />
        </main>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card sticky top-0 z-30 border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full min-h-[44px] min-w-[44px]"
              onClick={() => router.push("/my")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 rounded-xl min-h-[44px]"
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              {isMarkingAll ? "Marking..." : "Mark all read"}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            message="You'll see order updates and other notifications here."
            action={{
              label: "Back to Dashboard",
              onClick: () => router.push("/my"),
            }}
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                className={`w-full text-left bg-card rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all flex items-start gap-3 ${
                  !notif.isRead ? "border-blue-200 bg-blue-50/30" : ""
                }`}
                onClick={() => handleClickNotification(notif)}
              >
                <div className="shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type, notif.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notif.isRead ? "font-semibold" : ""}`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {format(new Date(notif.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
