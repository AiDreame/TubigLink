"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABEL: Record<string, string> = {
  ORDER_PROBLEM: "Order problem",
  PAYMENT: "Payment",
  DELIVERY: "Delivery",
  ACCOUNT: "Account",
  APP_BUG: "App bug",
  OTHER: "Other",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  RESOLVED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  CLOSED: "bg-muted text-muted-foreground",
};

export default function SupportListPage() {
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/support-tickets");
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) { window.location.href = "/auth/login"; return; }
          throw new Error(data.error || "Unable to load");
        }
        setTickets(data.data || []);
      } catch (err: any) {
        setError(err.message || "Unable to load your support tickets");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Support tickets</h1>
      </header>

      <div className="max-w-xl mx-auto p-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        {!tickets && !error && (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}
        {tickets && tickets.length === 0 && (
          <p className="text-center text-muted-foreground py-16">
            No support tickets yet. Use the &quot;Report an issue&quot; button to get help.
          </p>
        )}
        <div className="space-y-2">
          {tickets?.map((t: any) => {
            const last = t.messages?.[0];
            return (
              <Link key={t.id} href={`/support/${t.id}`} className="block rounded-2xl border bg-card p-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-sm truncate">
                      {CATEGORY_LABEL[t.category] || t.category}
                    </span>
                  </div>
                  <Badge className={`border-none ${STATUS_STYLE[t.status] || ""}`}>{t.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-card-foreground line-clamp-2">{t.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(t.createdAt), "MMM d, h:mm a")}
                  {last ? ` · last reply ${format(new Date(last.createdAt), "MMM d, h:mm a")}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
