"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportIssueDialog } from "@/components/support/ReportIssueDialog";
import { FAQ_GROUPS } from "./faq";

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

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The ticket list requires a signed-in session; without one we show a
  // sign-in prompt instead of hard-redirecting so the FAQ always renders.
  const [needsAuth, setNeedsAuth] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Accordion — only one FAQ item open at a time.
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/support-tickets");
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to load");
        }
        setTickets(data.data || []);
      } catch (err: any) {
        setError(err.message || "Unable to load your support tickets");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Help & Support</h1>
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {/* ── Report an issue CTA ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-card-foreground">Need help?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Report an issue and we&apos;ll reply inside a support conversation linked to
              your ticket.
            </p>
          </div>
          <Button
            onClick={() => setReportOpen(true)}
            className="shrink-0 min-h-[44px]"
            aria-label="Report an issue"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Report an issue
          </Button>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section aria-label="Frequently asked questions">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-1.5 mb-2">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ_GROUPS.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
              >
                <h3 className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
                  {group.title}
                </h3>
                {group.items.map((item) => {
                  const isOpen = openFaqId === item.id;
                  return (
                    <div key={item.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-${item.id}`}
                        onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors min-h-[48px]"
                      >
                        <span className="text-sm font-medium text-card-foreground">{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {isOpen && (
                        <div id={`faq-${item.id}`} className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* ── Your tickets ───────────────────────────────────────────── */}
        <section aria-label="Your support tickets">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">
            Your tickets
          </h2>
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
          {!tickets && !needsAuth && !error && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {needsAuth && (
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                Sign in to see your support tickets and report an issue.
              </p>
              <Button asChild variant="outline" className="mt-3 min-h-[44px]">
                <Link href="/auth/login?callbackUrl=/support">Sign in</Link>
              </Button>
            </div>
          )}
          {tickets && tickets.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
              <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No support tickets yet. Use the &quot;Report an issue&quot; button to get help.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {tickets?.map((t: any) => {
              const last = t.messages?.[0];
              return (
                <Link
                  key={t.id}
                  href={`/support/${t.id}`}
                  className="block rounded-2xl border bg-card p-3 hover:bg-muted/40 transition-colors"
                >
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
        </section>
      </div>

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </main>
  );
}